import uuid
from django.db import models
from django.utils import timezone

class SavedMessage(models.Model):
    """
    Universal Reusable Text Template / Canned Remarks Model.

    Supports per-field/domain namespace isolation via category
    (e.g., exam_mark_entry_remarks, report_builder_comments, etc.).
    """
    text = models.TextField()
    category = models.CharField(max_length=100, default='general', blank=True, null=True, db_index=True)
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='created_messages'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'core'
        db_table = 'core_savedmessage'
        verbose_name = 'Saved Template'
        verbose_name_plural = 'Saved Templates'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.category}] {self.text[:30]}"


class CustomDocxTemplate(models.Model):
    """
    Enterprise Custom DocLab / DOCX Template Model.
    Stores user-authored and institution-shared print studio document templates,
    including paper dimensions, layout parameters, rich HTML markup, and dynamic field tags.
    """
    id = models.CharField(max_length=128, primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    scope_id = models.CharField(max_length=100, blank=True, default='', db_index=True)
    raw_html = models.TextField(blank=True, default='')
    detected_placeholders = models.JSONField(default=list, blank=True)
    
    is_table_document = models.BooleanField(default=False)
    sample_columns = models.JSONField(default=list, blank=True)
    sample_data = models.JSONField(default=list, blank=True)
    template_type = models.CharField(max_length=50, default='template', blank=True)
    records_count = models.IntegerField(default=0, blank=True)
    source_template_id = models.CharField(max_length=128, blank=True, default='')
    
    page_properties = models.JSONField(default=dict, blank=True)
    page_size = models.CharField(max_length=50, default='A4', blank=True)
    orientation = models.CharField(max_length=50, default='PORTRAIT', blank=True)
    margin = models.CharField(max_length=50, default='NORMAL', blank=True)
    meta_payload = models.JSONField(default=dict, blank=True)
    
    # Ownership and multi-tenant scoping
    user = models.ForeignKey(
        'core.User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='custom_docx_templates'
    )
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='custom_docx_templates'
    )
    is_shared = models.BooleanField(default=False, db_index=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'core'
        db_table = 'core_customdocxtemplate'
        verbose_name = 'Custom DocLab Template'
        verbose_name_plural = 'Custom DocLab Templates'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.name} ({self.id})"

