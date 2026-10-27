from rest_framework import serializers
from core.models import AppRelease, AppSection, AppSectionCategory, SystemSetting


class AppReleaseSerializer(serializers.ModelSerializer):
    published_by_name = serializers.CharField(source='published_by.name', read_only=True, default='')

    class Meta:
        model = AppRelease
        fields = [
            'id',
            'version',
            'build_number',
            'channel',
            'is_critical_update',
            'min_supported_version',
            'min_supported_build',
            'web_active',
            'android_apk_url',
            'desktop_installer_url',
            'ios_testflight_url',
            'title',
            'summary',
            'changelog_features',
            'changelog_improvements',
            'changelog_fixes',
            'changelog_security',
            'published_by',
            'published_by_name',
            'is_published',
            'published_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = ['id', 'key', 'value', 'description', 'updated_at']
