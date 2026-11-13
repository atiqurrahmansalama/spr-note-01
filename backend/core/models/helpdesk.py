import uuid
from django.db import models
from django.conf import settings


class HelpdeskTicket(models.Model):
    """
    Enterprise Institutional Helpdesk & Issue Reporting
    ===================================================
    Tracks internal service requests, maintenance issues, grievances, and inquiries
    across academy branches and departments.
    """

    CATEGORY_CHOICES = (
        ('FACILITY', 'Facility & Dormitory Maintenance'),
        ('ACADEMIC', 'Academic & Curriculum Support'),
        ('GRIEVANCE', 'Discipline & Grievance (Confidential)'),
        ('ADMINISTRATIVE', 'Administrative & Payroll Query'),
        ('GENERAL', 'General Inquiry & Assistance'),
    )

    PRIORITY_CHOICES = (
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent / Critical'),
    )

    STATUS_CHOICES = (
        ('OPEN', 'Open'),
        ('IN_PROGRESS', 'In Progress'),
        ('WAITING', 'Waiting on Reporter'),
        ('RESOLVED', 'Resolved'),
        ('CLOSED', 'Closed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_number = models.CharField(max_length=64, unique=True, db_index=True)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='helpdesk_tickets',
        db_index=True
    )
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default='GENERAL', db_index=True)
    priority = models.CharField(max_length=16, choices=PRIORITY_CHOICES, default='MEDIUM', db_index=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='OPEN', db_index=True)

    subject = models.CharField(max_length=255)
    description = models.TextField()
    is_confidential = models.BooleanField(default=False)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='created_helpdesk_tickets'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_helpdesk_tickets'
    )

    resolution_notes = models.TextField(blank=True, default='')
    resolved_at = models.DateTimeField(null=True, blank=True)

    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Helpdesk Ticket"
        verbose_name_plural = "Helpdesk Tickets"

    def __str__(self):
        return f"[{self.ticket_number}] {self.subject} ({self.get_status_display()})"


class TicketMessage(models.Model):
    """Activity and conversation thread for Helpdesk Tickets."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(HelpdeskTicket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='ticket_messages'
    )
    message = models.TextField()
    is_internal_note = models.BooleanField(default=False)
    attachments = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = "Ticket Message"
        verbose_name_plural = "Ticket Messages"


class InstitutionalCommunication(models.Model):
    """
    Enterprise In-App Communications & Memos
    ========================================
    Internal notices, administrative memos, and official announcements.
    """

    AUDIENCE_CHOICES = (
        ('ALL', 'All Institutional Members'),
        ('TEACHERS', 'Teaching Faculty Only'),
        ('STAFF', 'All Staff & Faculty'),
        ('STUDENTS', 'Students & Guardians'),
        ('ADMINS', 'Administrative Leadership'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='communications',
        db_index=True
    )
    title = models.CharField(max_length=255)
    body = models.TextField()
    audience = models.CharField(max_length=32, choices=AUDIENCE_CHOICES, default='ALL')
    is_pinned = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='sent_communications'
    )
    attachments = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']
        verbose_name = "Institutional Communication"
        verbose_name_plural = "Institutional Communications"

    def __str__(self):
        return f"{self.title} ({self.get_audience_display()})"


class SystemBugReport(models.Model):
    """
    Enterprise System Bug & IT Feedback
    ===================================
    Allows institutional operators to report software issues with diagnostic client metadata.
    """

    SEVERITY_CHOICES = (
        ('LOW', 'Minor Visual / Cosmetic'),
        ('MEDIUM', 'Functional Inconvenience'),
        ('HIGH', 'Major Feature Malfunction'),
        ('BLOCKER', 'System Crashing / Blocker'),
    )

    STATUS_CHOICES = (
        ('NEW', 'New / Triaged'),
        ('INVESTIGATING', 'Under Investigation'),
        ('IN_PROGRESS', 'Fix In Progress'),
        ('RESOLVED', 'Resolved & Deployed'),
        ('CLOSED', 'Closed / Won\'t Fix'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report_code = models.CharField(max_length=64, unique=True, db_index=True)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='bug_reports',
        db_index=True
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reported_bugs'
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    steps_to_reproduce = models.TextField(blank=True, default='')
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES, default='MEDIUM')
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='NEW')

    client_metadata = models.JSONField(default=dict, blank=True, help_text="Browser, OS, Screen, Sync Engine state")
    screenshot_url = models.CharField(max_length=512, blank=True, default='')

    admin_notes = models.TextField(blank=True, default='')
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "System Bug Report"
        verbose_name_plural = "System Bug Reports"

    def __str__(self):
        return f"[{self.report_code}] {self.title} ({self.get_severity_display()})"

