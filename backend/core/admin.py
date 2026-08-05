from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from .models import (
    User, 
    Student, 
    StudentGroup,
    Session,
    SavedMessage,
    StudentDailyReport, 
    MistakeDetail, 
    StuckDetail
)

try:
    admin.site.unregister(Group)
except admin.sites.NotRegistered:
    pass

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'parent', 'is_active_user', 'last_login')
    list_filter = ('role', 'is_active_user')
    
    fieldsets = UserAdmin.fieldsets + (
        ('Role & Hierarchy Settings', {'fields': ('role', 'parent', 'is_active_user')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Role & Hierarchy Settings', {'fields': ('role', 'parent', 'is_active_user')}),
    )

@admin.register(StudentGroup)
class StudentGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)

@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)

@admin.register(SavedMessage)
class SavedMessageAdmin(admin.ModelAdmin):
    list_display = ('text', 'created_at')
    search_fields = ('text',)

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('roll', 'unique_id', 'name', 'group_name', 'is_active', 'created_at')
    search_fields = ('name', 'group_name', 'unique_id')
    list_filter = ('group_name', 'is_active')

class MistakeDetailInline(admin.TabularInline):
    model = MistakeDetail
    extra = 0

class StuckDetailInline(admin.TabularInline):
    model = StuckDetail
    extra = 0

@admin.register(StudentDailyReport)
class StudentDailyReportAdmin(admin.ModelAdmin):
    list_display = ('report_unique_id', 'student_name', 'session_name', 'date', 'total_mistake', 'total_stuck', 'created_at')
    list_filter = ('is_locked', 'is_deleted', 'date', 'session_name')
    search_fields = ('report_unique_id', 'student_name', 'student__name')
    inlines = [MistakeDetailInline, StuckDetailInline]

@admin.register(MistakeDetail)
class MistakeDetailAdmin(admin.ModelAdmin):
    list_display = ('report', 'juz', 'page', 'ayah')

@admin.register(StuckDetail)
class StuckDetailAdmin(admin.ModelAdmin):
    list_display = ('report', 'juz', 'page', 'ayah')