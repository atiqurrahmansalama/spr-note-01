"""
Domain-Driven Subsystem Modules
Rule 16: Progressive Modular Backend Architecture Standard.

Available Domain Modules:
1. iam: Identity, Authentication, Passkeys, 2FA, RBAC.
2. academic_structure: Institutions, Campuses, Sections, Periods, Dorms, Taxonomies.
3. student_management: Students, Admissions, Documents, Custom Templates.
4. staff_management: Staff, Teachers, Duties, Attendance, Leaves, Onboarding.
5. daily_classroom: Daily Reports, Hifz/Memorization, Attendance, Routines, Goals.
6. finance: Accounts, Funds, Fiscal Years, Vouchers, Invoices, Receipts, Payroll.
7. helpdesk: Notifications, In-App, Gateway Configs, Broadcasts, Tickets.
8. system_control: 4-Tier Feature Control, Diagnostics, Audits, Backups, Releases.
"""

__all__ = [
    'iam',
    'academic_structure',
    'student_management',
    'staff_management',
    'daily_classroom',
    'finance',
    'helpdesk',
    'system_control',
]
