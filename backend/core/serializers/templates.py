from rest_framework import serializers
from core.models.templates import SavedMessage, CustomDocxTemplate

class SavedMessageSerializer(serializers.ModelSerializer):
    """
    Universal Text Template Serializer.
    Supports comment/text alias compatibility and strict category isolation.
    """
    class Meta:
        model = SavedMessage
        fields = '__all__'

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'comment' in mutable_data and 'text' not in mutable_data:
            mutable_data['text'] = mutable_data['comment']
        return super().to_internal_value(mutable_data)


class CustomDocxTemplateSerializer(serializers.ModelSerializer):
    """
    Enterprise Custom DocLab / DOCX Template Serializer.
    Supports seamless bidirectional mapping between TypeScript camelCase frontend contracts
    and Django snake_case database fields.
    """
    scopeId = serializers.CharField(source='scope_id', required=False, allow_blank=True)
    rawHtml = serializers.CharField(source='raw_html', required=False, allow_blank=True)
    detectedPlaceholders = serializers.ListField(source='detected_placeholders', required=False)
    isTableDocument = serializers.BooleanField(source='is_table_document', required=False)
    sampleColumns = serializers.ListField(source='sample_columns', required=False)
    sampleData = serializers.ListField(source='sample_data', required=False)
    templateType = serializers.CharField(source='template_type', required=False, allow_blank=True)
    recordsCount = serializers.IntegerField(source='records_count', required=False)
    sourceTemplateId = serializers.CharField(source='source_template_id', required=False, allow_blank=True)
    pageProperties = serializers.DictField(source='page_properties', required=False)
    pageSize = serializers.CharField(source='page_size', required=False, allow_blank=True)
    isShared = serializers.BooleanField(source='is_shared', required=False)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    userName = serializers.SerializerMethodField()

    class Meta:
        model = CustomDocxTemplate
        fields = [
            'id',
            'name',
            'description',
            'scope_id',
            'scopeId',
            'raw_html',
            'rawHtml',
            'detected_placeholders',
            'detectedPlaceholders',
            'is_table_document',
            'isTableDocument',
            'sample_columns',
            'sampleColumns',
            'sample_data',
            'sampleData',
            'template_type',
            'templateType',
            'records_count',
            'recordsCount',
            'source_template_id',
            'sourceTemplateId',
            'page_properties',
            'pageProperties',
            'page_size',
            'pageSize',
            'orientation',
            'margin',
            'meta_payload',
            'user',
            'userName',
            'institution',
            'is_shared',
            'isShared',
            'created_at',
            'createdAt',
            'updated_at',
            'updatedAt',
        ]
        extra_kwargs = {
            'id': {'read_only': False, 'required': False},
            'user': {'read_only': True},
            'institution': {'read_only': True},
        }

    def get_userName(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username or 'Staff Member'
        return 'System'

