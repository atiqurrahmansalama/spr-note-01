from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from .models import (
    User,
    AcademicBranch,
    ClassSection,
    ClassPeriodSlot,
    TeacherProfile,
    GuardianProfile,
    UserDevice,
    Student,
    AcademicDepartment,
    StudentClass,
    StudentDetail,
    StudentGroup,
    StudentAcademicHistory,
    Session,
    SavedMessage,
    StudentDailyReport,
    ReportStatus,
    ReportPortion,
    ReportErrorDetail,
    UserSession,
    ActivityLog,
    UserRole,
    RoleActionPermission,
    EmailVerificationToken,
    PasswordResetToken,
    UserLoginLog,
    UserActivityLog,
    Address,
    UserNotificationPreference,
    UserSecurity,
    AppSectionCategory,
    AppSection,
    RoleSectionPermission,
    GroupSectionPermission,
    UserSectionOverride,
    FeatureFlagAuditLog,
    UserPasskey,
    QRSessionTicket,
)

try:
    admin.site.unregister(Group)
except admin.sites.NotRegistered:
    pass


# ─────────────────────────────────────────────────────────────
# USER PROFILE INLINES & USER ADMIN
# ─────────────────────────────────────────────────────────────

class TeacherProfileInline(admin.StackedInline):
    model = TeacherProfile
    can_delete = False
    verbose_name = "Teacher Profile"
    verbose_name_plural = "Teacher Profile"


class GuardianProfileInline(admin.StackedInline):
    model = GuardianProfile
    can_delete = False
    filter_horizontal = ('students',)
    verbose_name = "Guardian Profile"
    verbose_name_plural = "Guardian Profile"


class UserDeviceInline(admin.TabularInline):
    model = UserDevice
    extra = 0
    readonly_fields = ('updated_at',)


class UserSessionInline(admin.TabularInline):
    model = UserSession
    extra = 0
    readonly_fields = ('login_at', 'last_activity', 'total_duration_minutes')
    fields = ('device_type', 'device_info', 'ip_address', 'login_at', 'last_activity', 'total_duration_minutes', 'is_active')
    ordering = ('-last_activity',)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('get_display_name', 'phone_number', 'email', 'user_type', 'role', 'is_active', 'is_staff', 'date_joined')
    list_filter = ('user_type', 'role', 'is_active', 'is_staff')
    search_fields = ('name', 'first_name', 'last_name', 'phone_number', 'email')
    ordering = ('-date_joined',)

    @admin.display(description='NAME', ordering='name')
    def get_display_name(self, obj):
        full = (obj.name or f"{obj.first_name or ''} {obj.last_name or ''}").strip()
        return full if full else (obj.phone_number or f"User #{obj.id}")

    fieldsets = (
        ('👤 Account Identity', {'fields': ('name', 'first_name', 'last_name', 'phone_number', 'email', 'avatar_url', 'password')}),
        ('🔑 Role & Permissions', {'fields': ('user_type', 'role', 'assigned_group', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('📅 Dates & Logs', {'fields': ('last_login', 'date_joined', 'last_login_ip', 'parent')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('name', 'phone_number', 'email', 'password1', 'password2', 'user_type'),
        }),
    )

    inlines = [TeacherProfileInline, GuardianProfileInline, UserDeviceInline, UserSessionInline]


@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'name_en', 'name_bn', 'designation')
    search_fields = ('user__phone_number', 'name_en', 'name_bn', 'designation')


@admin.register(GuardianProfile)
class GuardianProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'name_en', 'name_bn')
    search_fields = ('user__phone_number', 'name_en', 'name_bn')
    filter_horizontal = ('students',)


@admin.register(UserDevice)
class UserDeviceAdmin(admin.ModelAdmin):
    list_display = ('user', 'device_type', 'device_token', 'updated_at')
    list_filter = ('device_type',)
    search_fields = ('user__phone_number', 'device_token')
    readonly_fields = ('updated_at',)


# ─────────────────────────────────────────────────────────────
# SUPPORT TABLE ADMINS
# ─────────────────────────────────────────────────────────────

@admin.register(AcademicBranch)
class AcademicBranchAdmin(admin.ModelAdmin):
    list_display = ('branch_name', 'branch_code', 'branch_type', 'in_charge_staff', 'district', 'division', 'is_active', 'is_deleted', 'created_at')
    list_filter = ('branch_type', 'division', 'district', 'is_active', 'is_deleted')
    search_fields = ('branch_name', 'branch_code', 'address', 'district', 'division', 'contact_phone')
    ordering = ('branch_name',)


@admin.register(AcademicDepartment)
class AcademicDepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'department_head', 'has_quran_tracker', 'order_rank', 'is_active', 'is_deleted', 'created_at')
    list_filter = ('has_quran_tracker', 'is_active', 'is_deleted')
    search_fields = ('name', 'code')
    ordering = ('order_rank', 'name')


@admin.register(StudentClass)
class StudentClassAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'department', 'department_type', 'class_teacher', 'order_rank', 'is_active', 'is_deleted', 'created_at')
    list_filter = ('department', 'department_type', 'is_active', 'is_deleted')
    search_fields = ('name', 'code')
    ordering = ('order_rank', 'name')


@admin.register(ClassSection)
class ClassSectionAdmin(admin.ModelAdmin):
    list_display = ('section_name', 'student_class', 'branch', 'section_type', 'room_number', 'max_capacity', 'class_teacher', 'is_active', 'is_deleted', 'created_at')
    list_filter = ('section_type', 'branch', 'student_class', 'is_active', 'is_deleted')
    search_fields = ('section_name', 'room_number', 'student_class__name')
    ordering = ('student_class', 'section_name')


@admin.register(ClassPeriodSlot)
class ClassPeriodSlotAdmin(admin.ModelAdmin):
    list_display = ('period_name', 'slot_type', 'period_order', 'start_time', 'end_time', 'duration_minutes', 'department', 'student_class', 'branch', 'is_active', 'is_deleted')
    list_filter = ('slot_type', 'department', 'student_class', 'branch', 'is_active', 'is_deleted')
    search_fields = ('period_name', 'department__name', 'student_class__name')
    ordering = ('period_order', 'start_time')


@admin.register(StudentGroup)
class StudentGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'student_class', 'mentor_teacher', 'capacity', 'is_active', 'is_deleted', 'created_at')
    list_filter = ('student_class', 'is_active', 'is_deleted')
    search_fields = ('name',)


@admin.register(StudentAcademicHistory)
class StudentAcademicHistoryAdmin(admin.ModelAdmin):
    list_display = ('student', 'student_class', 'student_group', 'start_date', 'end_date', 'is_current', 'transition_reason')
    list_filter = ('is_current', 'student_class', 'student_group')
    search_fields = ('student__name_en', 'student__uniq_id', 'transition_reason')


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)


@admin.register(SavedMessage)
class SavedMessageAdmin(admin.ModelAdmin):
    list_display = ('text', 'created_at')
    search_fields = ('text',)


# ─────────────────────────────────────────────────────────────
# STUDENT & STUDENT DETAIL ADMIN
# ─────────────────────────────────────────────────────────────

class StudentDetailInline(admin.StackedInline):
    model = StudentDetail
    can_delete = False
    verbose_name = "Student Detail Information"
    verbose_name_plural = "Student Detail Information (Extended Fields)"

    fieldsets = (
        ('👤 Personal Information (Bangla & Photo)', {
            'fields': (
                ('name_bn', 'photo'),
                ('category', 'date_of_birth', 'blood_group'),
            )
        }),
        ('👨‍👩‍👦 Family & Guardian Info', {
            'fields': (
                ('father_name', 'mother_name'),
                ('guardian_name', 'guardian_relation'),
                ('guardian_phone', 'emergency_phone'),
            )
        }),
        ('🏡 Address Details', {
            'fields': (
                'cur_address',
                'per_address',
            )
        }),
    )


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = (
        'roll_number',
        'uniq_id',
        'name_en',
        'group_name',
        'status',
        'education_status',
        'target_status',
        'admission_date',
        'created_at',
        'updated_at',
    )
    list_filter = (
        'group_name', 'status', 'education_status', 'admission_date',
    )
    search_fields = (
        'name_en', 'group_name', 'uniq_id', 'roll_number',
    )
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('🎓 Main Student Information', {
            'fields': (
                ('uniq_id', 'roll_number'),
                ('name_en', 'group_name'),
                ('status', 'education_status', 'target_status'),
                ('admission_date',),
            )
        }),
        ('📅 System Timestamps', {
            'fields': (
                ('created_at', 'updated_at'),
            ),
            'classes': ('collapse',),
        }),
    )

    inlines = [StudentDetailInline]


@admin.register(StudentDetail)
class StudentDetailAdmin(admin.ModelAdmin):
    list_display = (
        'student',
        'name_bn',
        'category',
        'date_of_birth',
        'blood_group',
        'father_name',
        'mother_name',
        'guardian_name',
        'guardian_phone',
        'emergency_phone',
        'cur_address',
        'per_address',
    )
    search_fields = (
        'student__uniq_id', 'student__name_en', 'name_bn',
        'guardian_name', 'guardian_phone', 'father_name',
    )
    list_filter = ('category', 'blood_group', 'guardian_relation')

    fieldsets = (
        ('🔗 Linked Student', {
            'fields': ('student',)
        }),
        ('👤 Personal Information', {
            'fields': (
                ('name_bn', 'photo'),
                ('category', 'date_of_birth', 'blood_group'),
            )
        }),
        ('👨‍👩‍👦 Family & Guardian Information', {
            'fields': (
                ('father_name', 'mother_name'),
                ('guardian_name', 'guardian_relation'),
                ('guardian_phone', 'emergency_phone'),
            )
        }),
        ('🏡 Address Details', {
            'fields': (
                'cur_address',
                'per_address',
            )
        }),
    )


# ─────────────────────────────────────────────────────────────
# REPORT INLINE ADMINS
# ─────────────────────────────────────────────────────────────

class ReportStatusInline(admin.StackedInline):
    model = ReportStatus
    extra = 0
    can_delete = False
    verbose_name = "Report Status"
    verbose_name_plural = "Report Status"
    readonly_fields = ('edit_time', 'lock_time', 'delete_time', 'created_at', 'updated_at')
    fields = (
        ('is_edited', 'edit_time'),
        ('is_locked', 'lock_time'),
        ('is_deleted', 'delete_time'),
        'created_at', 'updated_at',
    )


class ReportPortionInline(admin.TabularInline):
    model = ReportPortion
    extra = 0
    fields = (
        'start_juz', 'start_page', 'start_surah_number', 'start_ayah',
        'end_juz',   'end_page',   'end_surah_number',   'end_ayah',
    )
    verbose_name = "Portion (Juz/Page Range)"
    verbose_name_plural = "Portions (Juz/Page Ranges)"


class ReportErrorDetailInline(admin.TabularInline):
    model = ReportErrorDetail
    extra = 0
    fields = ('type', 'juz', 'page', 'surah_number', 'ayah')
    verbose_name = "Error Detail (Mistake / Stuck)"
    verbose_name_plural = "Error Details (Mistakes & Stucks)"


# ─────────────────────────────────────────────────────────────
# MAIN REPORT ADMIN
# ─────────────────────────────────────────────────────────────

@admin.register(StudentDailyReport)
class StudentDailyReportAdmin(admin.ModelAdmin):
    list_display = (
        'report_unique_id',
        'student_name',
        'session_name',
        'date',           # Report Date
        'created_at',     # Generate Date
        'total_page',
        'total_mistake',
        'total_stuck',
        'score',
        'status',
        'teacher_id',
    )
    list_filter = (
        'status', 'session_name', 'date',
    )
    search_fields = (
        'report_unique_id', 'student_name', 'student__name', 'comment',
    )
    readonly_fields = (
        'report_unique_id', 'created_at', 'updated_at',
    )
    inlines = [ReportStatusInline, ReportPortionInline, ReportErrorDetailInline]

    fieldsets = (
        ('🗂 Report Identity', {
            'fields': (
                'report_unique_id',
                'student',
                'student_name',
                'session_name',
                'status',
                'score',
                'teacher_id',
            )
        }),
        ('📅 Dates', {
            'fields': (
                'date',        # Report Date
                'created_at',  # Generate Date (auto)
                'updated_at',
            )
        }),
        ('📊 Summary Counts', {
            'fields': (
                'total_page',
                'total_mistake',
                'total_stuck',
            )
        }),
        ('💬 Comment & Raw JSON', {
            'fields': ('comment', 'juz_and_pages'),
            'classes': ('collapse',),
        }),
        ('⚙️ Metadata', {
            'fields': ('created_by',),
            'classes': ('collapse',),
        }),
    )


# ─────────────────────────────────────────────────────────────
# REPORT STATUS ADMIN (standalone view)
# ─────────────────────────────────────────────────────────────

@admin.register(ReportStatus)
class ReportStatusAdmin(admin.ModelAdmin):
    list_display = (
        'report',
        'is_edited', 'edit_time',
        'is_locked',  'lock_time',
        'is_deleted', 'delete_time',
        'updated_at',
    )
    list_filter = ('is_edited', 'is_locked', 'is_deleted')
    search_fields = ('report__report_unique_id', 'report__student_name')
    readonly_fields = ('edit_time', 'lock_time', 'delete_time', 'created_at', 'updated_at')

    fieldsets = (
        ('🔗 Report', {'fields': ('report',)}),
        ('✏️ Edit Status', {
            'fields': (('is_edited', 'edit_time'),),
            'description': 'edit_time is auto-set when is_edited becomes True.'
        }),
        ('🔒 Lock Status', {
            'fields': (('is_locked', 'lock_time'),),
            'description': 'lock_time is auto-set when is_locked becomes True.'
        }),
        ('🗑️ Delete Status', {
            'fields': (('is_deleted', 'delete_time'),),
            'description': 'delete_time is auto-set when is_deleted becomes True.'
        }),
        ('📅 Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


# ─────────────────────────────────────────────────────────────
# NORMALIZED CHILD TABLE ADMINS
# ─────────────────────────────────────────────────────────────

@admin.register(ReportPortion)
class ReportPortionAdmin(admin.ModelAdmin):
    list_display = (
        'report',
        'start_juz', 'start_page', 'start_surah_number', 'start_ayah',
        'end_juz',   'end_page',   'end_surah_number',   'end_ayah',
    )
    list_filter = ('start_juz', 'end_juz')
    search_fields = ('report__report_unique_id', 'report__student_name')


@admin.register(ReportErrorDetail)
class ReportErrorDetailAdmin(admin.ModelAdmin):
    list_display = (
        'report', 'type', 'juz', 'page', 'surah_number', 'ayah',
    )
    list_filter = ('type', 'juz')
    search_fields = ('report__report_unique_id', 'report__student_name')


# ─────────────────────────────────────────────────────────────
# ARCHITECTURE TRACKING MODEL ADMINS
# ─────────────────────────────────────────────────────────────

@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user', 'device_type', 'device_info',
        'ip_address', 'login_at', 'last_activity',
        'logout_at', 'total_duration_minutes', 'is_active'
    )
    list_filter = ('device_type', 'is_active', 'login_at')
    search_fields = ('user__phone_number', 'user__email', 'ip_address', 'device_info')
    readonly_fields = ('login_at', 'last_activity', 'total_duration_minutes')
    ordering = ('-last_activity',)

    fieldsets = (
        ('👤 User & Device', {'fields': ('user', 'device_type', 'device_info', 'ip_address')}),
        ('⏱️ Session Timeline', {'fields': ('login_at', 'last_activity', 'logout_at', 'total_duration_minutes')}),
        ('🟢 Status', {'fields': ('is_active',)}),
    )


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'action_name', 'http_method', 'endpoint', 'ip_address', 'timestamp')
    list_filter = ('http_method', 'timestamp')
    search_fields = ('user__phone_number', 'action_name', 'endpoint', 'ip_address')
    readonly_fields = ('user', 'action_name', 'endpoint', 'http_method', 'ip_address', 'timestamp')
    ordering = ('-timestamp',)

    fieldsets = (
        ('👤 User Details', {'fields': ('user', 'ip_address')}),
        ('📝 Action & Endpoint', {'fields': ('action_name', 'http_method', 'endpoint')}),
        ('📅 Timestamp', {'fields': ('timestamp',)}),
    )


# ─────────────────────────────────────────────────────────────
# ADDITIONAL CORE & ACCESS CONTROL ADMINS
# ─────────────────────────────────────────────────────────────

@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'hierarchy_level', 'color_theme', 'is_system_role', 'created_at')
    list_filter = ('is_system_role', 'color_theme')
    search_fields = ('name', 'code')


@admin.register(RoleActionPermission)
class RoleActionPermissionAdmin(admin.ModelAdmin):
    list_display = ('role', 'can_create_student', 'can_edit_student', 'can_delete_report', 'can_export_reports', 'can_manage_users')
    list_filter = ('can_create_student', 'can_edit_student', 'can_delete_report', 'can_export_reports', 'can_manage_users')
    search_fields = ('role__name', 'role__code')


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'token', 'expires_at', 'created_at')
    search_fields = ('user__phone_number', 'user__email', 'token')
    readonly_fields = ('token', 'created_at')


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'token', 'is_used', 'expires_at', 'created_at')
    list_filter = ('is_used',)
    search_fields = ('user__phone_number', 'user__email', 'token')
    readonly_fields = ('token', 'created_at')


@admin.register(UserLoginLog)
class UserLoginLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'ip_address', 'country', 'city', 'timestamp')
    list_filter = ('status', 'timestamp')
    search_fields = ('user__phone_number', 'user__email', 'ip_address', 'country', 'city')
    readonly_fields = ('user', 'status', 'ip_address', 'country', 'city', 'timestamp')


@admin.register(UserActivityLog)
class UserActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'timestamp')
    list_filter = ('status', 'timestamp')
    search_fields = ('user__phone_number', 'user__email')
    readonly_fields = ('user', 'status', 'timestamp')


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ('address_type', 'street_address', 'thana_or_upazila', 'district', 'division', 'country', 'created_by', 'created_at')
    list_filter = ('address_type', 'country', 'created_at')
    search_fields = ('street_address', 'post_office', 'thana_or_upazila', 'district', 'division', 'created_by__phone_number')


@admin.register(UserNotificationPreference)
class UserNotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'email_notifications', 'push_notifications', 'sms_notifications')
    list_filter = ('email_notifications', 'push_notifications', 'sms_notifications')
    search_fields = ('user__phone_number', 'user__email')


@admin.register(UserSecurity)
class UserSecurityAdmin(admin.ModelAdmin):
    list_display = ('user', 'is_2fa_enabled')
    list_filter = ('is_2fa_enabled',)
    search_fields = ('user__phone_number', 'user__email')


@admin.register(AppSectionCategory)
class AppSectionCategoryAdmin(admin.ModelAdmin):
    list_display = ('title', 'key', 'order')
    search_fields = ('title', 'key')


@admin.register(AppSection)
class AppSectionAdmin(admin.ModelAdmin):
    list_display = ('title', 'section_key', 'category', 'is_globally_enabled', 'order')
    list_filter = ('category', 'is_globally_enabled')
    search_fields = ('title', 'section_key')


@admin.register(RoleSectionPermission)
class RoleSectionPermissionAdmin(admin.ModelAdmin):
    list_display = ('section', 'role', 'is_enabled')
    list_filter = ('role', 'is_enabled')
    search_fields = ('section__title', 'section__section_key')


@admin.register(GroupSectionPermission)
class GroupSectionPermissionAdmin(admin.ModelAdmin):
    list_display = ('section', 'group_id', 'is_enabled')
    list_filter = ('is_enabled',)
    search_fields = ('section__title', 'section__section_key', 'group_id')


@admin.register(UserSectionOverride)
class UserSectionOverrideAdmin(admin.ModelAdmin):
    list_display = ('user', 'section', 'is_enabled')
    list_filter = ('is_enabled',)
    search_fields = ('user__phone_number', 'user__email', 'section__title', 'section__section_key')


@admin.register(FeatureFlagAuditLog)
class FeatureFlagAuditLogAdmin(admin.ModelAdmin):
    list_display = ('changed_by', 'scope_type', 'target_identifier', 'section_key', 'previous_state', 'new_state', 'timestamp')
    list_filter = ('scope_type', 'timestamp')
    search_fields = ('target_identifier', 'section_key')
    readonly_fields = ('changed_by', 'scope_type', 'target_identifier', 'section_key', 'previous_state', 'new_state', 'timestamp')


@admin.register(UserPasskey)
class UserPasskeyAdmin(admin.ModelAdmin):
    list_display = ('user', 'device_name', 'credential_id', 'sign_count', 'created_at')
    search_fields = ('user__phone_number', 'user__email', 'device_name')
    readonly_fields = ('created_at',)


@admin.register(QRSessionTicket)
class QRSessionTicketAdmin(admin.ModelAdmin):
    list_display = ('ticket_id', 'status', 'authorized_user', 'expires_at', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('authorized_user__phone_number', 'authorized_user__email')
    readonly_fields = ('created_at',)