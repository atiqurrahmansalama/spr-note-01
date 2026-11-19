"""
IAM Domain Models.
Re-exported from core domain models for module encapsulation while maintaining
100% database schema compatibility (app_label='core', db_table='core_...').
"""
from core.models.iam import (
    CustomUserManager,
    UserRole,
    RoleActionPermission,
    User,
    EmailVerificationToken,
    PasswordResetToken,
    UserSession,
    TeacherProfile,
    GuardianProfile,
    UserDevice,
    UserLoginLog,
    UserActivityLog,
    ActivityLog,
    UserNotificationPreference,
    UserSecurity,
    UserPasskey,
    QRSessionTicket,
    RoleInviteToken,
)

__all__ = [
    'CustomUserManager',
    'UserRole',
    'RoleActionPermission',
    'User',
    'EmailVerificationToken',
    'PasswordResetToken',
    'UserSession',
    'TeacherProfile',
    'GuardianProfile',
    'UserDevice',
    'UserLoginLog',
    'UserActivityLog',
    'ActivityLog',
    'UserNotificationPreference',
    'UserSecurity',
    'UserPasskey',
    'QRSessionTicket',
    'RoleInviteToken',
]
