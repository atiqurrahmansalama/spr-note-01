from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from .models import User, Student, StudentDailyReport

admin.site.unregister(Group)

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'parent', 'is_active_user', 'last_login')
    list_filter = ('role', 'is_active_user')
    
    # 🎯 এডমিন ফর্মে রোল ও প্যারেন্ট ড্রপডাউন নিশ্চিত করা
    fieldsets = UserAdmin.fieldsets + (
        ('Role & Hierarchy Settings', {'fields': ('role', 'parent', 'is_active_user')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Role & Hierarchy Settings', {'fields': ('role', 'parent', 'is_active_user')}),
    )

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('name', 'group', 'is_active', 'created_at')
    search_fields = ('name', 'group')
    list_filter = ('group', 'is_active')

@admin.register(StudentDailyReport)
class StudentDailyReportAdmin(admin.ModelAdmin):
    list_display = ('get_student_name', 'get_student_group', 'created_by', 'report_date', 'is_locked', 'created_at')
    list_filter = ('is_locked', 'is_deleted', 'report_date', 'created_by')
    search_fields = ('student__name', 'created_by__username')

    def get_student_name(self, obj):
        return obj.student.name
    get_student_name.short_description = 'Student Name'

    def get_student_group(self, obj):
        return obj.student.group
    get_student_group.short_description = 'Student Group'