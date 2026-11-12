import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class ApprovalRequest(models.Model):
    """
    Enterprise Unified Approval Request Model
    =========================================
    Single, canonical entity handling pending submissions, reviews, and post-approval transitions
    across all domains (Staff Onboarding, Student Admission, Staff Leave, Finance).
    """

    DOMAIN_CHOICES = (
        ('STAFF_ONBOARDING', 'Staff & Faculty Onboarding'),
        ('STUDENT_ADMISSION', 'Student Admission & Enrollment'),
        ('STAFF_LEAVE', 'Staff Leave & Absence Request'),
        ('FINANCE_REQUEST', 'Financial & Expense Approval'),
        ('ROLE_INVITE', 'User Role & Access Invitation'),
    )

    STATUS_CHOICES = (
        ('PENDING', 'Pending Review'),
        ('IN_REVIEW', 'Under Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CHANGES_REQUESTED', 'Changes Requested'),
        ('SCHEDULED', 'Approved (Scheduled Implementation)'),
        ('REVOKED', 'Revoked / Rolled Back'),
    )

    SOURCE_MODE_CHOICES = (
        ('ADMIN_QUICK', 'Admin Quick Entry'),
        ('ADMIN_WIZARD', 'Admin Full Wizard'),
        ('PUBLIC_PORTAL', 'Public Candidate Portal'),
        ('SYSTEM_TRIGGER', 'Automated System Event'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tracking_code = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="Public and audit tracking identifier (e.g. APR-2026-0042)"
    )
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='approval_requests',
        db_index=True
    )
    domain = models.CharField(
        max_length=32,
        choices=DOMAIN_CHOICES,
        default='STAFF_ONBOARDING',
        db_index=True
    )
    source_mode = models.CharField(
        max_length=32,
        choices=SOURCE_MODE_CHOICES,
        default='ADMIN_QUICK'
    )
    form_mode = models.CharField(
        max_length=32,
        default='QUICK',
        help_text="QUICK or FULL wizard mode submitted by candidate/operator"
    )
    status = models.CharField(
        max_length=32,
        choices=STATUS_CHOICES,
        default='PENDING',
        db_index=True
    )

    # Indexed Search & Duplicate Prevention Fields
    applicant_name = models.CharField(max_length=255, blank=True, db_index=True)
    email = models.CharField(max_length=255, blank=True, db_index=True)
    phone_number = models.CharField(max_length=64, blank=True, db_index=True)

    # Lightweight metadata for high-performance virtualized grids & card cards
    summary_meta = models.JSONField(
        default=dict,
        blank=True,
        help_text="Optimized $O(1)$ display tokens (e.g. designation, department, class, section, photo)"
    )

    # Full Canonical Form Submission Payload
    payload = models.JSONField(
        default=dict,
        help_text="Complete submitted form data payload including multilang names, addresses, credentials"
    )

    # Reviewer Overrides applied upon final approval
    reviewer_overrides = models.JSONField(
        default=dict,
        blank=True,
        help_text="Final overrides modified by reviewer prior to approval"
    )

    # Token Lineage Metadata
    source_token_type = models.CharField(max_length=64, blank=True, null=True)
    source_token_id = models.CharField(max_length=64, blank=True, null=True)

    # Target Entity Provisioned Upon Approval
    target_model = models.CharField(max_length=64, blank=True, default='')
    target_object_id = models.CharField(max_length=64, blank=True, default='', db_index=True)

    # Audit & Lifecycle Tracking
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='submitted_approvals'
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_approvals'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    effective_date = models.DateField(
        null=True,
        blank=True,
        help_text="Deferred effective implementation date (e.g. appointment takes effect on future date)"
    )

    rejection_reason = models.TextField(blank=True, default='')
    admin_remarks = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Approval Request"
        verbose_name_plural = "Approval Requests"
        indexes = [
            models.Index(fields=['institution', 'domain', 'status'], name='idx_appr_inst_dom_status'),
            models.Index(fields=['institution', 'created_at'], name='idx_appr_inst_created'),
            models.Index(fields=['email', 'phone_number'], name='idx_appr_contact'),
        ]

    def __str__(self):
        return f"[{self.tracking_code}] {self.get_domain_display()} - {self.applicant_name} ({self.get_status_display()})"


class ApprovalActionLog(models.Model):
    """
    Immutable Audit Trail for Every Approval Stage & Transition
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.ForeignKey(
        ApprovalRequest,
        on_delete=models.CASCADE,
        related_name='action_logs'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='approval_actions'
    )
    action = models.CharField(
        max_length=32,
        help_text="SUBMITTED, ASSIGNED, IN_REVIEW, APPROVED, REJECTED, SCHEDULED, REVOKED, OVERRIDE_UPDATED"
    )
    from_status = models.CharField(max_length=32, blank=True, default='')
    to_status = models.CharField(max_length=32, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = "Approval Action Log"
        verbose_name_plural = "Approval Action Logs"

    def __str__(self):
        return f"{self.action} on {self.request.tracking_code} at {self.created_at}"

