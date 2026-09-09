"""
Services Layer Package
Encapsulates transactional business mutations, multi-tenant workflows, domain operations,
and backward-compatible legacy service functions.
"""

# 1. Modular Enterprise Domain Services
from .auth_service import seed_system_roles_11_tier, create_security_session
from .tenant_service import provision_new_institution, update_tenant_taxonomy
from .student_service import register_student, promote_student_class
from .staff_service import onboard_staff_member, assign_teacher_periods
from .exam_service import calculate_exam_tabulation_stats
from .attendance_service import record_bulk_classroom_attendance

# 2. Re-export legacy core business services for 100% backward compatibility
from core.legacy_services import *  # noqa: F401, F403
