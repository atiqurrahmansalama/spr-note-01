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
