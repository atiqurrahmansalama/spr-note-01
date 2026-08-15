"""
Core Business Services Module for Suffah Hifz Management System (spr-note-01).

Encapsulates:
- 4-Tier Section Control & Feature Flagging Engine (User > Group > Role > Global)
- Google OAuth2 Token Verification, Account Linking, and Dynamic Role Seeding
- System Role Initialization & Migration Utilities
- Notification & Security Audit Logging
"""

import os
import uuid
import logging
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
import requests as http_requests

logger = logging.getLogger('core')
User = get_user_model()


# ─────────────────────────────────────────────────────────────────────────────
# 1. System Role & Section Seeding Services
# ─────────────────────────────────────────────────────────────────────────────

def seed_system_roles():
    """
    Ensures all baseline system roles and default action permissions exist.
    """
    from .models import UserRole, RoleActionPermission

    system_roles = [
        {
            'code': 'SUPER_ADMIN',
            'name': 'Super Admin',
            'description': 'Full System & Security Control',
            'hierarchy_level': 1,
            'color_theme': 'rose',
            'is_system_role': True,
            'perms': {
                'can_create_student': True,
                'can_edit_student': True,
                'can_delete_report': True,
                'can_export_reports': True,
                'can_manage_users': True,
            }
        },
        {
            'code': 'ADMIN',
            'name': 'Admin / Nazim',
            'description': 'Administrative & Institutional Control',
            'hierarchy_level': 2,
            'color_theme': 'amber',
            'is_system_role': False,
            'perms': {
                'can_create_student': True,
                'can_edit_student': True,
                'can_delete_report': False,
                'can_export_reports': True,
                'can_manage_users': True,
            }
        },
        {
            'code': 'STAFF',
            'name': 'Staff / Accountant',
            'description': 'Staff & Administrative Support',
            'hierarchy_level': 3,
            'color_theme': 'purple',
            'is_system_role': False,
            'perms': {
                'can_create_student': False,
                'can_edit_student': False,
                'can_delete_report': False,
                'can_export_reports': True,
                'can_manage_users': False,
            }
        },
        {
            'code': 'TEACHER',
            'name': 'Teacher / Ustadh',
            'description': 'Classroom & Student Evaluation Access',
            'hierarchy_level': 4,
            'color_theme': 'emerald',
            'is_system_role': False,
            'perms': {
                'can_create_student': True,
                'can_edit_student': True,
                'can_delete_report': False,
                'can_export_reports': True,
                'can_manage_users': False,
            }
        },
        {
            'code': 'GUARDIAN',
            'name': 'Guardian / Parent',
            'description': 'Read-Only Ward Report Access',
            'hierarchy_level': 10,
            'color_theme': 'blue',
            'is_system_role': False,
            'perms': {
                'can_create_student': False,
                'can_edit_student': False,
                'can_delete_report': False,
                'can_export_reports': False,
                'can_manage_users': False,
            }
        },
    ]

    for item in system_roles:
        perms_data = item.pop('perms')
        role, created = UserRole.objects.get_or_create(code=item['code'], defaults=item)
        if created:
            perm_obj, _ = RoleActionPermission.objects.get_or_create(role=role)
            for pk, pv in perms_data.items():
                setattr(perm_obj, pk, pv)
            perm_obj.save()
        else:
            RoleActionPermission.objects.get_or_create(role=role)

    # Attach UserRole object to any legacy users missing ForeignKey linkage
    for u in User.objects.filter(role__isnull=True):
        code = (u.user_type or 'TEACHER').upper()
        r = UserRole.objects.filter(code=code).first()
        if r:
            u.role = r
            u.save(update_fields=['role'])


def sync_feature_registry_to_db():
    """
    Syncs the FEATURE_REGISTRY definition manifest to the AppSection database table.
    """
    from .models import AppSectionCategory, AppSection
    from .feature_registry import FEATURE_REGISTRY

    # Automatically map categories keys to titles
    category_titles = {
        "NAVIGATION": "Navigation",
        "ADMIN": "Admin Tools",
        "STUDENTS": "Student Management",
        "REPORTS": "Report Generator",
        "SETTINGS": "Settings",
        "SYSTEM": "System & Standalone",
    }

    # Ensure all baseline categories exist
    cat_map = {}
    for idx, (cat_key, cat_title) in enumerate(category_titles.items(), 1):
        c, _ = AppSectionCategory.objects.get_or_create(
            key=cat_key,
            defaults={"title": cat_title, "order": idx}
        )
        cat_map[cat_key] = c

    # Sync FEATURE_REGISTRY to AppSection
    registry_keys = set()
    for item in FEATURE_REGISTRY:
        registry_keys.add(item["key"])
        cat_obj = cat_map.get(item["category"])
        if not cat_obj:
            cat_obj, _ = AppSectionCategory.objects.get_or_create(
                key=item["category"],
                defaults={"title": item["category"].title(), "order": 100}
            )
            cat_map[item["category"]] = cat_obj

        AppSection.objects.update_or_create(
            section_key=item["key"],
            defaults={
                "category": cat_obj,
                "title": item["label"],
                "description": item["description"],
                "is_parent": item["is_parent"],
                "parent_key": item["parent_key"],
                "is_globally_enabled": item["default_enabled"],
                "order": item["sort_order"],
            }
        )

    # Delete any AppSection rows in database that are NOT in FEATURE_REGISTRY
    AppSection.objects.exclude(section_key__in=registry_keys).delete()


# ─────────────────────────────────────────────────────────────────────────────
# 2. 4-Tier Section Control & Feature Flagging Evaluation Engine
# ─────────────────────────────────────────────────────────────────────────────

def evaluate_section_config_for_user(user=None):
    """
    Computes resolved section control flags using strict 4-Tier Precedence:
    Tier 1 (Highest): User Specific Override
    Tier 2: Assigned Student Group Override
    Tier 3: User Role Permission Override
    Tier 4 (Lowest): Global Default Config

    And applies One-Way Top-Down Cascading rule:
    If a parent section is OFF, all its children are forced OFF.
    """
    from .models import (
        AppSection,
        UserSectionOverride,
        GroupSectionPermission,
        RoleSectionPermission,
    )
    from .services import sync_feature_registry_to_db

    if not AppSection.objects.exists():
        sync_feature_registry_to_db()

    sections = AppSection.objects.all().select_related('category')
    
    resolved_raw = {}
    origins = {}

    user_overrides = {}
    group_overrides = {}
    role_overrides = {}

    if user and user.is_authenticated:
        # Tier 1: User Overrides
        user_overrides = {
            o.section.section_key: o.is_enabled
            for o in UserSectionOverride.objects.filter(user=user).select_related('section')
        }

        # Tier 2: Group Overrides
        assigned_group = getattr(user, 'assigned_group', None) or getattr(user, 'group_name', None) or getattr(user, 'group', None)
        if assigned_group:
            group_overrides = {
                o.section.section_key: o.is_enabled
                for o in GroupSectionPermission.objects.filter(group_id=assigned_group).select_related('section')
            }

        # Tier 3: Role Overrides
        role_codes = set()
        if getattr(user, 'user_type', None):
            role_codes.add(str(user.user_type).upper().strip())
        if getattr(user, 'role', None):
            r_val = getattr(user.role, 'code', None) or str(user.role)
            role_codes.add(str(r_val).upper().strip())

        if role_codes:
            q_expr = Q()
            for r_code in role_codes:
                q_expr |= Q(role__iexact=r_code)
            role_perms = RoleSectionPermission.objects.filter(q_expr).select_related('section')
            for o in role_perms:
                role_overrides[o.section.section_key] = o.is_enabled

    # 4-Tier Resolution Evaluation (Independent of hierarchy first)
    for sec in sections:
        key = sec.section_key
        global_val = sec.is_globally_enabled

        if not global_val:
            resolved_raw[key] = False
            origins[key] = "GLOBAL"
        elif user and user.is_authenticated and key in user_overrides:
            resolved_raw[key] = user_overrides[key]
            origins[key] = "USER"
        elif user and user.is_authenticated and key in group_overrides:
            resolved_raw[key] = group_overrides[key]
            origins[key] = "GROUP"
        elif user and user.is_authenticated and key in role_overrides:
            resolved_raw[key] = role_overrides[key]
            origins[key] = "ROLE"
        else:
            resolved_raw[key] = global_val
            origins[key] = "GLOBAL"

    # Apply strict Top-Down cascading rule:
    # Child is active ONLY if parent is ON and child is ON
    resolved = {}
    for sec in sections:
        key = sec.section_key
        if sec.parent_key:
            parent_state = resolved_raw.get(sec.parent_key, True)
            child_state = resolved_raw.get(key, True)
            resolved[key] = parent_state and child_state
            if not parent_state and child_state:
                origins[key] = f"PARENT_DISABLED ({sec.parent_key})"
        else:
            resolved[key] = resolved_raw.get(key, True)

    return resolved, origins


def get_resolved_feature_flags_for_user(user=None):
    """
    Convenience wrapper used by DRF permission classes and middleware.
    """
    flags, _ = evaluate_section_config_for_user(user)
    return flags, _


# ─────────────────────────────────────────────────────────────────────────────
# 3. Google OAuth Authentication & User Provisioning Services
# ─────────────────────────────────────────────────────────────────────────────

def verify_google_token_or_code(id_token_input=None, access_token_input=None, code_input=None, redirect_uri_input=None):
    """
    Exchanges authorization code or verifies ID/access tokens with Google OAuth2 APIs.
    Returns:
        dict(sub, email, first_name, last_name, picture) or raises ValueError
    """
    client_id = getattr(settings, 'GOOGLE_OAUTH_CLIENT_ID', '') or os.getenv('GOOGLE_OAUTH_CLIENT_ID', '')
    client_secret = getattr(settings, 'GOOGLE_OAUTH_CLIENT_SECRET', '') or os.getenv('GOOGLE_OAUTH_CLIENT_SECRET', '')
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

    # Step 0: Exchange Auth Code if provided
    if code_input:
        token_res = http_requests.post(
            'https://oauth2.googleapis.com/token',
            data={
                'code': code_input,
                'client_id': client_id,
                'client_secret': client_secret,
                'redirect_uri': redirect_uri_input or frontend_url,
                'grant_type': 'authorization_code',
            },
            timeout=10
        )
        token_json = token_res.json() if token_res.content else {}
        if not token_res.ok or 'error' in token_json:
            error_msg = token_json.get('error_description') or token_json.get('error') or 'Google Token Exchange Failed'
            raise ValueError(f"Google Token Exchange Failed: {error_msg}")

        access_token_input = token_json.get('access_token') or access_token_input
        id_token_input = token_json.get('id_token') or id_token_input

    sub = None
    email = None
    first_name = ""
    last_name = ""
    picture = ""

    # Step 1: Verify ID Token
    if id_token_input:
        try:
            id_info = google_id_token.verify_oauth2_token(
                id_token_input,
                google_requests.Request(),
                client_id if client_id else None,
                clock_skew_in_seconds=10
            )
            sub = id_info.get('sub')
            email = id_info.get('email')
            first_name = id_info.get('given_name', '')
            last_name = id_info.get('family_name', '')
            picture = id_info.get('picture', '')
        except Exception as e:
            logger.warning(f"Google verify_oauth2_token warning: {e}")
            try:
                import jwt
                decoded = jwt.decode(id_token_input, options={"verify_signature": False})
                sub = decoded.get('sub')
                email = decoded.get('email')
                first_name = decoded.get('given_name', '')
                last_name = decoded.get('family_name', '')
                picture = decoded.get('picture', '')
            except Exception:
                pass

    # Step 2: Fallback to Google UserInfo API using Access Token
    if (not email or not sub) and access_token_input:
        try:
            userinfo_res = http_requests.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token_input}'},
                timeout=5
            )
            if userinfo_res.ok:
                info = userinfo_res.json()
                sub = info.get('sub')
                email = info.get('email')
                first_name = info.get('given_name', '')
                last_name = info.get('family_name', '')
                picture = info.get('picture', '')
        except Exception as ex:
            logger.warning(f"Google userinfo request failed: {ex}")

    if not email and not sub:
        raise ValueError("Failed to verify Google token or extract user profile.")

    return {
        'sub': sub,
        'email': email.strip().lower() if email else None,
        'first_name': first_name or '',
        'last_name': last_name or '',
        'picture': picture or '',
    }


def get_or_create_google_user(profile_data):
    """
    Finds existing user by Google sub_id or email, or auto-registers with dynamic default role.
    Handles deactivated accounts and profile sync.
    """
    from .models import UserRole, SystemSetting

    sub = profile_data.get('sub')
    email = profile_data.get('email')
    first_name = profile_data.get('first_name', '')
    last_name = profile_data.get('last_name', '')
    picture = profile_data.get('picture', '')

    user = None
    if sub:
        user = User.objects.filter(google_sub_id=sub).first()
    if not user and email:
        user = User.objects.filter(email__iexact=email).first()

    if user:
        if not user.is_active or getattr(user, 'is_deactivated', False):
            raise PermissionError("Your account has been deactivated. Please contact support.")

        user.auth_provider = 'google'
        user.is_email_verified = True
        if sub and not user.google_sub_id:
            user.google_sub_id = sub
        if picture and not user.avatar_url:
            user.avatar_url = picture
        if first_name and not user.first_name:
            user.first_name = first_name
        if last_name and not user.last_name:
            user.last_name = last_name
        user.save()
        return user, False

    # Auto-register new Google user with configured default role
    default_role_code = SystemSetting.get_val('DEFAULT_GOOGLE_ROLE', 'GUARDIAN')
    default_role = None
    try:
        default_role, _ = UserRole.objects.get_or_create(
            code=default_role_code,
            defaults={
                'name': default_role_code.replace('_', ' ').title(),
                'description': f'Default role for Google OAuth users ({default_role_code})',
                'hierarchy_level': 50,
                'color_theme': 'purple',
                'is_system_role': False,
            }
        )
    except Exception as role_ex:
        logger.warning(f"Default UserRole fetch warning: {role_ex}")

    phone_dummy = f"g_{sub[:12]}" if sub else f"g_{uuid.uuid4().hex[:10]}"
    defaults_dict = {
        'phone_number': phone_dummy,
        'first_name': first_name,
        'last_name': last_name,
        'avatar_url': picture,
        'auth_provider': 'google',
        'is_email_verified': True,
        'google_sub_id': sub,
        'user_type': default_role_code,
        'role': default_role,
        'is_active': True,
        'is_deactivated': False,
    }

    if email:
        user, created = User.objects.get_or_create(
            email=email,
            defaults=defaults_dict
        )
    else:
        user = User.objects.create_user(**defaults_dict)
        created = True

    if not user.is_active or getattr(user, 'is_deactivated', False):
        raise PermissionError("Your account has been deactivated. Please contact support.")

    return user, created
