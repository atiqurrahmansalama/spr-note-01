from rest_framework import serializers
from core.models.templates import SavedMessage

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
