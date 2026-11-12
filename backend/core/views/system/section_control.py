import logging

from django.db import transaction
from django.db.models import Q
from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from core.models import (
    AppSection,
    AppSectionCategory,
    RoleSectionPermission,
    GroupSectionPermission,
    AcademySectionOverride,
    UserSectionOverride,
    FeatureFlagAuditLog,
    SystemSetting,
    AcademicInstitution,
)
from core.authentication import FlexibleJWTAuthentication

logger = logging.getLogger(__name__)
User = get_user_model()


class EvaluatedConfigView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [FlexibleJWTAuthentication]

    def get(self, request):
        from core.services import get_resolved_feature_flags_for_user, build_user_role_payload
        user = request.user if request.user and request.user.is_authenticated else None

        preview_role = None
        preview_tenant_id = None
        if user:
            role_code = (build_user_role_payload(user).get('code') or '').upper()
            if user.is_superuser or role_code == 'SUPER_ADMIN':
                raw_preview_role = (request.query_params.get('preview_role') or '').strip().upper()
                raw_preview_tenant = (
                    request.query_params.get('preview_tenant_id')
                    or request.headers.get('X-Tenant-ID')
                    or ''
                ).strip()
                if raw_preview_role:
                    preview_role = raw_preview_role
                if raw_preview_tenant:
                    preview_tenant_id = raw_preview_tenant

        resolved, origins = get_resolved_feature_flags_for_user(
            user,
            preview_role=preview_role,
            preview_tenant_id=preview_tenant_id,
        )

        default_google_role = SystemSetting.get_val('DEFAULT_GOOGLE_ROLE', 'GUARDIAN')
        response = Response({
            'flags': resolved,
            'config': resolved,
            'origins': origins,
            'default_google_role': default_google_role
        }, status=status.HTTP_200_OK)

        # Set strict anti-caching HTTP headers for cross-account isolation
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response


class ResetUserOverridesView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [FlexibleJWTAuthentication]

    def post(self, request):
        count, _ = UserSectionOverride.objects.all().delete()
        return Response({
            'message': 'Purged stale user overrides successfully',
            'count': count
        }, status=status.HTTP_200_OK)


class ControlPanelRulesView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [FlexibleJWTAuthentication]

    def get(self, request):
        response_data = self._handle_get(request)
        response = Response(response_data, status=status.HTTP_200_OK)
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response

    def _handle_get(self, request):
        scope = request.query_params.get('scope', 'global').upper()
        target_id = request.query_params.get('target_id', '')

        user_obj = None
        if scope == 'USER' and target_id:
            user_obj = User.objects.filter(Q(pk=target_id) | Q(phone_number=target_id)).first()

        categories_map = {}

        db_sections = AppSection.objects.all().select_related('category').order_by('category__order', 'order', 'title')

        # Fetch overrides
        user_overrides = {}
        if scope == 'USER' and user_obj:
            user_overrides = {o.section.section_key: o.is_enabled for o in UserSectionOverride.objects.filter(user=user_obj).select_related('section')}

        group_overrides = {}
        if scope == 'GROUP' and target_id:
            group_overrides = {o.section.section_key: o.is_enabled for o in GroupSectionPermission.objects.filter(group_id=target_id).select_related('section')}

        role_overrides = {}
        if scope == 'ROLE' and target_id:
            role_overrides = {o.section.section_key: o.is_enabled for o in RoleSectionPermission.objects.filter(role__iexact=target_id).select_related('section')}

        academy_overrides = {}
        if scope in ['ACADEMY', 'INSTITUTION'] and target_id:
            inst_query = Q(code=target_id)
            if str(target_id).isdigit():
                inst_query |= Q(institution_id=int(target_id))
            academy_overrides = {o.section.section_key: o.is_enabled for o in AcademySectionOverride.objects.filter(inst_query).select_related('section')}

        # 4-Tier Resolution Evaluation (Independent of hierarchy first)
        resolved_raw = {}
        origins = {}
        for sec in db_sections:
            key = sec.section_key
            global_val = sec.is_globally_enabled

            if not global_val:
                resolved_raw[key] = False
                origins[key] = "GLOBAL"
            elif scope == 'USER' and key in user_overrides:
                resolved_raw[key] = user_overrides[key]
                origins[key] = "USER"
            elif scope == 'GROUP' and key in group_overrides:
                resolved_raw[key] = group_overrides[key]
                origins[key] = "GROUP"
            elif scope == 'ROLE' and key in role_overrides:
                resolved_raw[key] = role_overrides[key]
                origins[key] = "ROLE"
            elif scope in ['ACADEMY', 'INSTITUTION'] and key in academy_overrides:
                resolved_raw[key] = academy_overrides[key]
                origins[key] = "ACADEMY"
            else:
                resolved_raw[key] = global_val
                origins[key] = "GLOBAL"

        # Apply strict Top-Down cascading rule:
        # Child is active ONLY if parent is ON and child is ON
        resolved_effective = {}
        for sec in db_sections:
            key = sec.section_key
            if sec.parent_key:
                parent_state = resolved_raw.get(sec.parent_key, True)
                child_state = resolved_raw.get(key, True)
                resolved_effective[key] = parent_state and child_state
                if not parent_state and child_state:
                    origins[key] = f"PARENT_DISABLED ({sec.parent_key})"
            else:
                resolved_effective[key] = resolved_raw.get(key, True)

        for sec in db_sections:
            key = sec.section_key
            cat_obj = sec.category
            cat_title = cat_obj.title if cat_obj else "System & Standalone"
            cat_key = cat_obj.key if cat_obj else "SYSTEM"

            if cat_title not in categories_map:
                categories_map[cat_title] = {
                    "id": cat_obj.id if cat_obj else 999,
                    "key": cat_key,
                    "title": cat_title,
                    "sections": []
                }

            categories_map[cat_title]["sections"].append({
                "id": sec.id,
                "section_key": key,
                "title": sec.title,
                "description": sec.description,
                "is_globally_enabled": sec.is_globally_enabled,
                "effective_enabled": resolved_effective[key],
                "raw_enabled": resolved_raw[key],
                "inheritance_origin": origins[key],
                "is_parent": sec.is_parent,
                "parent_key": sec.parent_key,
            })

        result = sorted(categories_map.values(), key=lambda c: c["id"])
        return {"categories": result}


class ControlPanelSectionTreeView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [FlexibleJWTAuthentication]

    def get(self, request):
        scope = (request.query_params.get('scope') or request.query_params.get('scope_type') or 'global').upper()
        target_id = request.query_params.get('target_id', '')

        # 0. Ensure feature registry is fully synced into AppSection database table
        from core.services import sync_feature_registry_to_db
        from core.feature_registry import FEATURE_REGISTRY
        registry_keys = {item["key"] for item in FEATURE_REGISTRY}
        widget_group_map = {item["key"]: item.get("widget_group", "") for item in FEATURE_REGISTRY}
        db_keys = set(AppSection.objects.values_list('section_key', flat=True))
        needs_dashboard_parent_upgrade = AppSection.objects.filter(section_key='nav_dashboard', is_parent=False).exists()
        if not registry_keys.issubset(db_keys) or not AppSectionCategory.objects.exists() or needs_dashboard_parent_upgrade:
            sync_feature_registry_to_db()

        user_obj = None
        if scope == 'USER' and target_id:
            user_query = Q(phone_number=target_id)
            if str(target_id).isdigit():
                user_query |= Q(pk=int(target_id))
            user_obj = User.objects.filter(user_query).first()

        # 1. Fetch all sections
        sections = AppSection.objects.all().select_related('category').order_by('category__order', 'order', 'title')

        # 2. Fetch overrides
        user_overrides = {}
        if scope == 'USER' and user_obj:
            user_overrides = {o.section.section_key: o.is_enabled for o in UserSectionOverride.objects.filter(user=user_obj).select_related('section')}

        group_overrides = {}
        if scope == 'GROUP' and target_id:
            group_overrides = {o.section.section_key: o.is_enabled for o in GroupSectionPermission.objects.filter(group_id=target_id).select_related('section')}

        role_overrides = {}
        if scope == 'ROLE' and target_id:
            role_overrides = {o.section.section_key: o.is_enabled for o in RoleSectionPermission.objects.filter(role__iexact=target_id).select_related('section')}

        academy_overrides = {}
        if scope in ['ACADEMY', 'INSTITUTION'] and target_id:
            academy_overrides = {o.section.section_key: o.is_enabled for o in AcademySectionOverride.objects.filter(institution_id=target_id).select_related('section')}

        # 3. Resolve raw values (independent of hierarchy)
        resolved_raw = {}
        origins = {}
        for sec in sections:
            key = sec.section_key
            global_val = sec.is_globally_enabled

            if not global_val:
                resolved_raw[key] = False
                origins[key] = "GLOBAL"
            elif scope == 'USER' and key in user_overrides:
                resolved_raw[key] = user_overrides[key]
                origins[key] = "USER"
            elif scope == 'GROUP' and key in group_overrides:
                resolved_raw[key] = group_overrides[key]
                origins[key] = "GROUP"
            elif scope == 'ROLE' and key in role_overrides:
                resolved_raw[key] = role_overrides[key]
                origins[key] = "ROLE"
            elif scope in ['ACADEMY', 'INSTITUTION'] and key in academy_overrides:
                resolved_raw[key] = academy_overrides[key]
                origins[key] = "ACADEMY"
            else:
                resolved_raw[key] = global_val
                origins[key] = "GLOBAL"

        # 4. Resolve effective values with Top-Down cascading (Supports N-tier recursive hierarchy)
        parent_map = {sec.section_key: sec.parent_key for sec in sections}

        def is_ancestor_active(k):
            p_key = parent_map.get(k)
            if not p_key:
                return True
            if not resolved_raw.get(p_key, True):
                return False
            return is_ancestor_active(p_key)

        def get_disabled_ancestor(k):
            p_key = parent_map.get(k)
            if not p_key:
                return None
            if not resolved_raw.get(p_key, True):
                return p_key
            return get_disabled_ancestor(p_key)

        resolved_effective = {}
        for sec in sections:
            key = sec.section_key
            child_state = resolved_raw.get(key, True)
            ancestor_ok = is_ancestor_active(key)
            resolved_effective[key] = ancestor_ok and child_state
            if not ancestor_ok and child_state:
                disabled_parent = get_disabled_ancestor(key) or sec.parent_key
                origins[key] = f"PARENT_DISABLED ({disabled_parent})"

        # 5. Build hierarchical tree: Category -> Parent Section -> Child Sections
        categories_dict = {}
        for sec in sections:
            cat = sec.category
            cat_key = cat.key if cat else "SYSTEM"
            cat_title = cat.title if cat else "System & Standalone"
            cat_order = cat.order if cat else 999

            if cat_key not in categories_dict:
                categories_dict[cat_key] = {
                    "id": cat.id if cat else 999,
                    "key": cat_key,
                    "title": cat_title,
                    "order": cat_order,
                    "sections": []
                }

            sec_data = {
                "id": sec.id,
                "section_key": sec.section_key,
                "title": sec.title,
                "description": sec.description,
                "widget_group": widget_group_map.get(sec.section_key) or "",
                "is_parent": sec.is_parent,
                "parent_key": sec.parent_key,
                "is_globally_enabled": sec.is_globally_enabled,
                "effective_enabled": resolved_effective[sec.section_key],
                "raw_enabled": resolved_raw[sec.section_key],
                "inheritance_origin": origins[sec.section_key],
                "children": []
            }
            categories_dict[cat_key]["sections"].append(sec_data)

        # Nest children under their parents recursively
        for cat_key, cat_data in categories_dict.items():
            all_sec_list = cat_data["sections"]
            sec_lookup = {s["section_key"]: s for s in all_sec_list}
            parent_keys_with_children = {s["parent_key"] for s in all_sec_list if s["parent_key"]}
            for p_key in parent_keys_with_children:
                if p_key in sec_lookup:
                    sec_lookup[p_key]["is_parent"] = True
            
            roots = []
            for s in all_sec_list:
                p_key = s["parent_key"]
                if p_key and p_key in sec_lookup:
                    sec_lookup[p_key]["children"].append(s)
                else:
                    roots.append(s)
            
            cat_data["sections"] = roots

        categories_tree = sorted(categories_dict.values(), key=lambda c: c["order"])
        return Response({"categories": categories_tree}, status=status.HTTP_200_OK)


class SectionControlVersionView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [FlexibleJWTAuthentication]

    def get(self, request):
        version = int(SystemSetting.get_val('SYSTEM_FEATURE_VERSION', '1'))
        return Response({'version': version}, status=status.HTTP_200_OK)


class ControlPanelBatchUpdateView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [FlexibleJWTAuthentication]

    def post(self, request):
        try:
            scope_type = (request.data.get('scope_type') or request.data.get('scope') or 'GLOBAL').upper()
            target_identifier = str(request.data.get('target_identifier') or request.data.get('target_id') or request.data.get('target_user_id') or request.data.get('target_role') or request.data.get('target_group_id') or '').strip()
            updates = request.data.get('updates', [])
            # When True, a GLOBAL save will also purge any conflicting Role/User overrides for those keys
            cascade_clear_overrides = bool(request.data.get('cascade_clear_overrides', False))

            if not isinstance(updates, list) or len(updates) == 0:
                section_key = request.data.get('section_key')
                is_enabled = request.data.get('is_enabled')
                if section_key is not None and is_enabled is not None:
                    updates = [{'section_key': section_key, 'is_enabled': is_enabled}]

            if not updates:
                return Response({'message': 'No updates provided', 'changed_count': 0}, status=status.HTTP_200_OK)

            # 1. Ensure all features in registry exist in the database table
            from core.services import sync_feature_registry_to_db
            from core.feature_registry import FEATURE_REGISTRY
            registry_map = {item["key"]: item for item in FEATURE_REGISTRY}
            db_keys = set(AppSection.objects.values_list('section_key', flat=True))
            if not set(registry_map.keys()).issubset(db_keys) or not AppSectionCategory.objects.exists():
                sync_feature_registry_to_db()

            # Guaranteed fallback category for any ad-hoc/custom section key
            default_cat, _ = AppSectionCategory.objects.get_or_create(
                key="SYSTEM",
                defaults={"title": "System & Standalone", "order": 999}
            )

            # Safe user validation for audit log
            safe_user = None
            if request.user and request.user.is_authenticated:
                try:
                    if User.objects.filter(pk=request.user.pk).exists():
                        safe_user = request.user
                except Exception:
                    safe_user = None

            changed_count = 0
            cleared_overrides = 0

            with transaction.atomic():
                for item in updates:
                    s_key = item.get('section_key')
                    enabled = bool(item.get('is_enabled', True))
                    if not s_key:
                        continue

                    # Safe section retrieval/creation with guaranteed non-null Category
                    sec = AppSection.objects.filter(section_key=s_key).first()
                    if not sec:
                        reg_item = registry_map.get(s_key)
                        if reg_item:
                            cat_key = reg_item.get("category", "SYSTEM")
                            cat_obj, _ = AppSectionCategory.objects.get_or_create(
                                key=cat_key,
                                defaults={"title": cat_key.title(), "order": 100}
                            )
                            sec = AppSection.objects.create(
                                category=cat_obj,
                                section_key=s_key,
                                title=reg_item.get("label", s_key.replace('_', ' ').title()),
                                description=reg_item.get("description", ""),
                                is_parent=reg_item.get("is_parent", False),
                                parent_key=reg_item.get("parent_key", None),
                                is_globally_enabled=enabled if scope_type == 'GLOBAL' else reg_item.get("default_enabled", True),
                                order=reg_item.get("sort_order", 999),
                            )
                        else:
                            sec = AppSection.objects.create(
                                category=default_cat,
                                section_key=s_key,
                                title=s_key.replace('_', ' ').title(),
                                is_globally_enabled=enabled if scope_type == 'GLOBAL' else True,
                            )

                    prev_state = sec.is_globally_enabled

                    if scope_type == 'GLOBAL':
                        if sec.is_globally_enabled != enabled:
                            AppSection.objects.filter(section_key=s_key).update(is_globally_enabled=enabled)
                            sec.refresh_from_db()
                        changed_count += 1

                        # Cascade: optionally purge conflicting higher-tier overrides so the global default
                        # actually takes effect for ALL accounts with Role or User overrides for this key.
                        if cascade_clear_overrides:
                            r_del, _ = RoleSectionPermission.objects.filter(section=sec).delete()
                            u_del, _ = UserSectionOverride.objects.filter(section=sec).delete()
                            cleared_overrides += r_del + u_del

                    elif scope_type == 'ROLE':
                        role_code = (target_identifier or request.data.get('selected_role', 'TEACHER')).upper().strip()
                        perm, created = RoleSectionPermission.objects.update_or_create(
                            section=sec, role=role_code,
                            defaults={'is_enabled': enabled}
                        )
                        prev_state = not enabled if created else (not perm.is_enabled)
                        changed_count += 1

                    elif scope_type == 'GROUP':
                        group_id = target_identifier or request.data.get('selected_group', 'All Groups')
                        perm, created = GroupSectionPermission.objects.update_or_create(
                            section=sec, group_id=group_id,
                            defaults={'is_enabled': enabled}
                        )
                        prev_state = not enabled if created else (not perm.is_enabled)
                        changed_count += 1

                    elif scope_type in ['ACADEMY', 'INSTITUTION']:
                        target_inst_id = target_identifier or request.data.get('target_institution_id', '') or request.data.get('selected_academy', '')
                        inst_obj = AcademicInstitution.objects.filter(
                            Q(pk=target_inst_id) | Q(code=target_inst_id)
                        ).first() if target_inst_id else None
                        if inst_obj:
                            perm, created = AcademySectionOverride.objects.update_or_create(
                                section=sec, institution=inst_obj,
                                defaults={'is_enabled': enabled}
                            )
                            prev_state = not enabled if created else (not perm.is_enabled)
                            changed_count += 1

                    elif scope_type == 'USER':
                        target_user_id = target_identifier or request.data.get('target_user_id', '')
                        user_obj = User.objects.filter(
                            Q(pk=target_user_id) | Q(phone_number=target_user_id)
                        ).first()
                        if user_obj:
                            perm, created = UserSectionOverride.objects.update_or_create(
                                section=sec, user=user_obj,
                                defaults={'is_enabled': enabled}
                            )
                            prev_state = not enabled if created else (not perm.is_enabled)
                            changed_count += 1

                    FeatureFlagAuditLog.objects.create(
                        changed_by=safe_user,
                        scope_type=scope_type,
                        target_identifier=target_identifier or "GLOBAL",
                        section_key=s_key,
                        previous_state=prev_state,
                        new_state=enabled
                    )

                # Increment global feature version so all polling clients re-fetch immediately
                current_version = int(SystemSetting.get_val('SYSTEM_FEATURE_VERSION', '1'))
                SystemSetting.set_val('SYSTEM_FEATURE_VERSION', str(current_version + 1))

            msg = f'Updated {changed_count} section rule(s)'
            if cleared_overrides:
                msg += f'; cleared {cleared_overrides} higher-tier override(s) for clean global inheritance'

            return Response({
                'message': msg,
                'version': current_version + 1,
                'cleared_overrides': cleared_overrides,
                'changed_count': changed_count
            }, status=status.HTTP_200_OK)

        except Exception as exc:
            import traceback
            logger.error(f"[ControlPanelBatchUpdateView] Error saving batch rules: {exc}\n{traceback.format_exc()}")
            return Response({
                'success': False,
                'error': str(exc),
                'message': f'Failed to save section rule updates: {str(exc)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class ClearSectionOverridesView(APIView):
    """
    DELETE Role and/or User overrides for specific section_keys so those sections
    cleanly fall back to the Tier-4 Global Default.

    POST body:
      {
        "section_keys": ["sessionSelect", "juzPageInput"],   // required; use ["*"] for all
        "clear_role_overrides": true,
        "clear_user_overrides": true,
        "role_code": "TEACHER"   // optional: limit role deletion to a specific role
      }
    """
    permission_classes = [AllowAny]
    authentication_classes = [FlexibleJWTAuthentication]

    def post(self, request):
        raw_keys = request.data.get('section_keys', [])
        clear_role = bool(request.data.get('clear_role_overrides', True))
        clear_user = bool(request.data.get('clear_user_overrides', True))
        role_code = str(request.data.get('role_code') or '').upper().strip()

        if not isinstance(raw_keys, list) or len(raw_keys) == 0:
            return Response({'error': 'section_keys must be a non-empty list'}, status=status.HTTP_400_BAD_REQUEST)

        all_sections = raw_keys == ['*']
        role_deleted = 0
        user_deleted = 0

        if all_sections:
            sections_qs = AppSection.objects.all()
        else:
            sections_qs = AppSection.objects.filter(section_key__in=raw_keys)

        if clear_role:
            role_qs = RoleSectionPermission.objects.filter(section__in=sections_qs)
            if role_code:
                role_qs = role_qs.filter(role__iexact=role_code)
            role_deleted, _ = role_qs.delete()

        if clear_user:
            user_qs = UserSectionOverride.objects.filter(section__in=sections_qs)
            user_deleted, _ = user_qs.delete()

        # Bump version so live clients re-evaluate immediately
        current_version = int(SystemSetting.get_val('SYSTEM_FEATURE_VERSION', '1'))
        SystemSetting.set_val('SYSTEM_FEATURE_VERSION', str(current_version + 1))

        return Response({
            'message': f'Cleared {role_deleted} role override(s) and {user_deleted} user override(s). All affected sections now inherit Global Defaults.',
            'role_overrides_deleted': role_deleted,
            'user_overrides_deleted': user_deleted,
            'version': current_version + 1,
        }, status=status.HTTP_200_OK)


class ControlPanelResetRulesView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [FlexibleJWTAuthentication]

    def post(self, request):
        scope = str(request.data.get('scope') or '').lower()
        target_id = str(request.data.get('target_id') or '').strip()

        if scope == 'role' and target_id:
            RoleSectionPermission.objects.filter(role=target_id).delete()
            return Response({'message': f'Reset all role overrides for "{target_id}" back to global defaults'}, status=status.HTTP_200_OK)
        elif scope == 'group' and target_id:
            GroupSectionPermission.objects.filter(group_id=target_id).delete()
            return Response({'message': f'Reset all group overrides for "{target_id}" back to global defaults'}, status=status.HTTP_200_OK)
        elif scope in ['academy', 'institution'] and target_id:
            AcademySectionOverride.objects.filter(institution_id=target_id).delete()
            return Response({'message': f'Reset all academy overrides for academy #{target_id} back to global defaults'}, status=status.HTTP_200_OK)
        elif scope == 'user' and target_id:
            user_obj = User.objects.filter(Q(pk=target_id) | Q(phone_number=target_id)).first()
            if user_obj:
                UserSectionOverride.objects.filter(user=user_obj).delete()
            return Response({'message': f'Reset all user overrides for user #{target_id} back to global defaults'}, status=status.HTTP_200_OK)
        else:
            AppSection.objects.all().update(is_globally_enabled=True)
            RoleSectionPermission.objects.all().delete()
            GroupSectionPermission.objects.all().delete()
            AcademySectionOverride.objects.all().delete()
            UserSectionOverride.objects.all().delete()
            return Response({'message': 'All section control rules reset to global defaults'}, status=status.HTTP_200_OK)


class ControlPanelAuditLogView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [FlexibleJWTAuthentication]

    def get(self, request):
        qs = FeatureFlagAuditLog.objects.all().select_related('changed_by')
        scope = request.query_params.get('scope') or request.GET.get('scope')
        if scope and scope.upper() != 'ALL':
            qs = qs.filter(scope_type__iexact=scope)
        search = request.query_params.get('search') or request.GET.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(section_key__icontains=search) |
                Q(target_identifier__icontains=search) |
                Q(changed_by__name__icontains=search) |
                Q(changed_by__phone_number__icontains=search)
            )
        logs = qs.order_by('-timestamp')[:250]
        data = []
        for log in logs:
            data.append({
                'id': log.id,
                'changed_by': log.changed_by.name or log.changed_by.phone_number if log.changed_by else "System",
                'scope_type': log.scope_type,
                'target_identifier': log.target_identifier,
                'section_key': log.section_key,
                'previous_state': log.previous_state,
                'new_state': log.new_state,
                'timestamp': log.timestamp.strftime("%Y-%m-%d %I:%M:%S %p"),
                'raw_timestamp': log.timestamp.isoformat(),
            })
        return Response({'logs': data}, status=status.HTTP_200_OK)

