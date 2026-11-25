from rest_framework import serializers


class UniverseLoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=True, max_length=150)
    password = serializers.CharField(required=True, write_only=True, trim_whitespace=False)
