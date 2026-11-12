import json
import logging

from django.utils import timezone
from django.db import transaction
from django.db.models import F

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.models import (
    SystemSetting,
    AcademicInstitution,
    TenantTaxonomySetting,
)
from core.services import get_scoped_tenant_id

logger = logging.getLogger(__name__)


class DashboardWorkspaceConfigView(APIView):
    """
    Cloud-synchronized storage for Institutional Role Default Workspace Layout Templates
    (widget ordering, column spans, and user/default layout presets).
    All dashboard widget feature access & role/academy permissions live strictly in
    App Management -> Feature & Module Control (EvaluatedConfigView).
    """
    permission_classes = [IsAuthenticated]

    GLOBAL_TEMPLATES_KEY = 'DASHBOARD_ROLE_TEMPLATES_GLOBAL'
    TENANT_TEMPLATES_KEY = 'dashboard_role_templates'

    @staticmethod
    def _parse_json_setting(setting_key, default_val):
        raw = SystemSetting.get_val(setting_key, '')
        if not raw:
            return default_val
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, type(default_val)) or (default_val is None and isinstance(parsed, dict)):
                return parsed
        except Exception:
            pass
        return default_val

    @staticmethod
    def _resolve_target_institution(request, explicit_tenant_id=None, is_super=False):
        raw_tid = str(explicit_tenant_id or get_scoped_tenant_id(request) or '').strip()
        if not is_super:
            inst = getattr(request.user, 'institution', None)
            if not inst and getattr(request.user, 'staff_profile', None):
                inst = getattr(request.user.staff_profile, 'institution', None)
            return inst

        if raw_tid and raw_tid.upper() not in ('ALL', 'GLOBAL', 'DEFAULT', 'NONE', 'NULL', 'UNDEFINED'):
            inst = AcademicInstitution.objects.filter(pk=raw_tid, is_deleted=False).first()
            if inst:
                return inst
        return getattr(request.user, 'institution', None)

    def _build_response_payload(self, request, explicit_tenant_id=None):
        from core.services import build_user_role_payload
        role_code = (build_user_role_payload(request.user).get('code') or '').upper()
        is_super = bool(request.user.is_superuser or role_code == 'SUPER_ADMIN')

        inst = self._resolve_target_institution(request, explicit_tenant_id=explicit_tenant_id, is_super=is_super)
        global_templates = self._parse_json_setting(self.GLOBAL_TEMPLATES_KEY, {})

        tenant_templates = {}
        if inst:
            tpl_row = TenantTaxonomySetting.objects.filter(
                institution=inst, taxonomy_key=self.TENANT_TEMPLATES_KEY
            ).first()
            if tpl_row and isinstance(tpl_row.data, dict):
                tenant_templates = tpl_row.data

        merged_templates = {**global_templates, **tenant_templates}

        return {
            'status': 'success',
            'tenant_id': str(inst.id) if inst else 'GLOBAL',
            'role_templates': merged_templates,
            'updated_at': timezone.now().isoformat(),
        }

    def get(self, request):
        explicit_tid = request.query_params.get('tenant_id')
        payload = self._build_response_payload(request, explicit_tenant_id=explicit_tid)
        response = Response(payload, status=status.HTTP_200_OK)
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response

    def post(self, request):
        from core.services import build_user_role_payload, is_user_academy_admin
        role_code = (build_user_role_payload(request.user).get('code') or '').upper()
        is_super = bool(request.user.is_superuser or role_code == 'SUPER_ADMIN')
        if not (is_super or is_user_academy_admin(request.user)):
            return Response(
                {'error': 'Only administrators can save default workspace layout templates.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data if isinstance(request.data, dict) else {}
        explicit_tid = data.get('tenant_id') or request.query_params.get('tenant_id')
        action_name = str(data.get('action') or '').strip().lower()

        if action_name == 'reset_template':
            target_role = str(data.get('role') or '').strip().upper()
            inst = self._resolve_target_institution(request, explicit_tenant_id=explicit_tid, is_super=is_super)
            if inst:
                tpl_row = TenantTaxonomySetting.objects.filter(
                    institution=inst, taxonomy_key=self.TENANT_TEMPLATES_KEY
                ).first()
                if tpl_row and isinstance(tpl_row.data, dict) and target_role in tpl_row.data:
                    next_data = {k: v for k, v in tpl_row.data.items() if k != target_role}
                    tpl_row.data = next_data
                    tpl_row.version = F('version') + 1
                    tpl_row.save()
            if is_super:
                global_tpl = self._parse_json_setting(self.GLOBAL_TEMPLATES_KEY, {})
                if target_role in global_tpl:
                    global_tpl.pop(target_role, None)
                    SystemSetting.set_val(self.GLOBAL_TEMPLATES_KEY, json.dumps(global_tpl))
            return Response(self._build_response_payload(request, explicit_tenant_id=explicit_tid), status=status.HTTP_200_OK)

        with transaction.atomic():
            if 'role_template' in data and isinstance(data['role_template'], dict):
                tpl_payload = data['role_template']
                tpl_role = str(tpl_payload.get('role') or '').strip().upper()
                tpl_items = tpl_payload.get('items')
                tpl_scope = str(tpl_payload.get('scope') or 'tenant').strip().lower()
                if tpl_role and isinstance(tpl_items, list):
                    if tpl_scope == 'global':
                        if not is_super:
                            return Response({'error': 'Super Admin permission required for global role templates.'}, status=status.HTTP_403_FORBIDDEN)
                        global_tpl = self._parse_json_setting(self.GLOBAL_TEMPLATES_KEY, {})
                        global_tpl[tpl_role] = tpl_items
                        SystemSetting.set_val(
                            self.GLOBAL_TEMPLATES_KEY,
                            json.dumps(global_tpl),
                            description='Global default workspace layout templates per role',
                        )
                    else:
                        inst = self._resolve_target_institution(request, explicit_tenant_id=explicit_tid, is_super=is_super)
                        if inst:
                            setting, created = TenantTaxonomySetting.objects.get_or_create(
                                institution=inst,
                                taxonomy_key=self.TENANT_TEMPLATES_KEY,
                                defaults={'data': {tpl_role: tpl_items}, 'version': 1},
                            )
                            if not created:
                                existing_dict = setting.data if isinstance(setting.data, dict) else {}
                                existing_dict[tpl_role] = tpl_items
                                setting.data = existing_dict
                                setting.version = F('version') + 1
                                setting.save()
                        elif is_super:
                            global_tpl = self._parse_json_setting(self.GLOBAL_TEMPLATES_KEY, {})
                            global_tpl[tpl_role] = tpl_items
                            SystemSetting.set_val(self.GLOBAL_TEMPLATES_KEY, json.dumps(global_tpl))

        return Response(self._build_response_payload(request, explicit_tenant_id=explicit_tid), status=status.HTTP_200_OK)

    def put(self, request):
        return self.post(request)

    def patch(self, request):
        return self.post(request)

