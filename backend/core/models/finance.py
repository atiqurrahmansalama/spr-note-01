from django.db import models
from django.db.models import Sum, Q, Count
from django.utils import timezone
import uuid
import hashlib
import hmac
import secrets


class AccountCategory(models.TextChoices):
    ASSET = 'ASSET', 'Asset'
    LIABILITY = 'LIABILITY', 'Liability'
    EQUITY = 'EQUITY', 'Equity / Fund Capital'
    REVENUE = 'REVENUE', 'Revenue / Income'
    EXPENSE = 'EXPENSE', 'Expense'


class FundType(models.TextChoices):
    GENERAL = 'GENERAL', 'General Institutional Fund'
    ZAKAT_SADAQAH = 'ZAKAT_SADAQAH', 'Zakat & Sadaqah Fund'
    WAQF_BUILDING = 'WAQF_BUILDING', 'Waqf & Infrastructure Fund'
    STUDENT_WELFARE = 'STUDENT_WELFARE', 'Student Welfare & Scholarship'
    EXAMINATION = 'EXAMINATION', 'Examination & Library Fund'
    ORPHAN_SUPPORT = 'ORPHAN_SUPPORT', 'Orphan & Needy Student Fund'
    CUSTOM = 'CUSTOM', 'Custom Special Purpose Fund'


class VoucherType(models.TextChoices):
    JOURNAL = 'JV', 'Journal Voucher (JV)'
    PAYMENT = 'PV', 'Payment Voucher (PV)'
    RECEIPT = 'RV', 'Receipt Voucher (RV)'
    CONTRA = 'CV', 'Contra Voucher (CV - Cash/Bank Transfer)'


class VoucherStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    POSTED = 'POSTED', 'Posted'
    CANCELLED = 'CANCELLED', 'Cancelled'
    REVERSED = 'REVERSED', 'Reversed'


class EntryType(models.TextChoices):
    DEBIT = 'DEBIT', 'Debit (Dr)'
    CREDIT = 'CREDIT', 'Credit (Cr)'


class PaymentMethod(models.TextChoices):
    CASH = 'CASH', 'Cash in Hand'
    BANK = 'BANK', 'Bank Transfer / Deposit'
    CHEQUE = 'CHEQUE', 'Bank Cheque'
    BKASH = 'BKASH', 'bKash Mobile Money'
    NAGAD = 'NAGAD', 'Nagad Mobile Money'
    ROCKET = 'ROCKET', 'Rocket (DBBL)'
    UPAY = 'UPAY', 'Upay'
    CARD = 'CARD', 'Debit / Credit Card'
    ONLINE_GATEWAY = 'ONLINE', 'Online Gateway (SSLCommerz/Stripe)'


class FeeFrequency(models.TextChoices):
    ONCE = 'ONCE', 'One-time (Admission/Registration)'
    MONTHLY = 'MONTHLY', 'Monthly Recurring'
    TERMLY = 'TERMLY', 'Term / Semester-wise'
    ANNUAL = 'ANNUAL', 'Annual / Yearly'
    AD_HOC = 'AD_HOC', 'Ad-hoc / Special Event'


class WaiverType(models.TextChoices):
    PERCENTAGE = 'PERCENTAGE', 'Percentage Discount (%)'
    FIXED_AMOUNT = 'FIXED_AMOUNT', 'Fixed Amount Discount'
    FULL_SCHOLARSHIP = 'FULL_SCHOLARSHIP', '100% Full Scholarship / Free-ship'


class InvoiceStatus(models.TextChoices):
    UNPAID = 'UNPAID', 'Unpaid'
    PARTIAL = 'PARTIAL', 'Partially Paid'
    PAID = 'PAID', 'Fully Paid'
    OVERDUE = 'OVERDUE', 'Overdue'
    WAIVED = 'WAIVED', 'Fully Waived'
    CANCELLED = 'CANCELLED', 'Cancelled'


class ReceiptStatus(models.TextChoices):
    VALID = 'VALID', 'Valid & Genuine'
    CANCELLED = 'CANCELLED', 'Cancelled / Void'
    REFUNDED = 'REFUNDED', 'Refunded'


class PayHeadType(models.TextChoices):
    EARNING = 'EARNING', 'Earning / Allowance'
    DEDUCTION = 'DEDUCTION', 'Deduction / Penalty'


class CalculationType(models.TextChoices):
    FIXED = 'FIXED', 'Fixed Monthly Amount'
    PERCENTAGE_OF_BASIC = 'PERCENTAGE_OF_BASIC', 'Percentage of Basic Salary'


class AdvanceStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Approval'
    APPROVED = 'APPROVED', 'Approved'
    DISBURSED = 'DISBURSED', 'Disbursed'
    REPAID = 'REPAID', 'Fully Repaid'
    REJECTED = 'REJECTED', 'Rejected'


class PayrollStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    APPROVED = 'APPROVED', 'Approved'
    DISBURSED = 'DISBURSED', 'Disbursed / Paid'
    CANCELLED = 'CANCELLED', 'Cancelled'


# ─────────────────────────────────────────────────────────────────────────────
# 1. CHART OF ACCOUNTS & MULTI-FUND GENERAL LEDGER
# ─────────────────────────────────────────────────────────────────────────────

class InstitutionalFund(models.Model):
    """Multi-purpose institutional funds (General, Zakat, Waqf, Welfare, etc.)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='financial_funds'
    )
    fund_code = models.CharField(max_length=32)
    name = models.CharField(max_length=150)
    fund_type = models.CharField(max_length=32, choices=FundType.choices, default=FundType.GENERAL)
    description = models.TextField(blank=True, default='')
    current_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = ('institution', 'fund_code')

    def __str__(self):
        return f"{self.name} ({self.fund_code})"


class FiscalYear(models.Model):
    """Institutional accounting fiscal year definition and closing locks"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='fiscal_years'
    )
    name = models.CharField(max_length=64, help_text="e.g. FY 2026-2027")
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    is_closed = models.BooleanField(default=False)
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='closed_fiscal_years'
    )

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.name} ({self.start_date} to {self.end_date})"


class ChartOfAccount(models.Model):
    """5-Tier hierarchical Chart of Accounts (COA) for double-entry bookkeeping"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='chart_of_accounts'
    )
    code = models.CharField(max_length=32, db_index=True)
    name_en = models.CharField(max_length=150)
    name_bn = models.CharField(max_length=150, blank=True, default='')
    category = models.CharField(max_length=20, choices=AccountCategory.choices, db_index=True)
    parent_account = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='sub_accounts'
    )
    fund = models.ForeignKey(
        InstitutionalFund,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='accounts'
    )
    is_group = models.BooleanField(default=False, help_text="Group accounts hold sub-accounts and no direct vouchers")
    is_system_default = models.BooleanField(default=False)
    is_reconcilable = models.BooleanField(default=False, help_text="For Bank and Cash accounts needing reconciliation")
    is_active = models.BooleanField(default=True)
    current_balance = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']
        unique_together = ('institution', 'code')

    def __str__(self):
        return f"{self.code} - {self.name_en}"


class FinancialVoucher(models.Model):
    """Double-entry Journal, Payment, Receipt, and Contra Vouchers"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='financial_vouchers'
    )
    branch = models.ForeignKey(
        'core.AcademicBranch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='financial_vouchers'
    )
    fiscal_year = models.ForeignKey(
        FiscalYear,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vouchers'
    )
    voucher_number = models.CharField(max_length=64, db_index=True)
    voucher_type = models.CharField(max_length=10, choices=VoucherType.choices, default=VoucherType.JOURNAL)
    date = models.DateField(default=timezone.localdate)
    reference_no = models.CharField(max_length=100, blank=True, default='', help_text="Cheque no, invoice no, or bill ref")
    narration = models.TextField(help_text="Detailed transaction memo / note")
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=VoucherStatus.choices, default=VoucherStatus.POSTED)
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_financial_vouchers'
    )
    approved_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_financial_vouchers'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        unique_together = ('institution', 'voucher_number')

    def __str__(self):
        return f"{self.voucher_number} ({self.voucher_type}) - {self.total_amount}"


class VoucherEntry(models.Model):
    """Individual Debit / Credit line items in a financial voucher"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    voucher = models.ForeignKey(
        FinancialVoucher,
        on_delete=models.CASCADE,
        related_name='entries'
    )
    account = models.ForeignKey(
        ChartOfAccount,
        on_delete=models.PROTECT,
        related_name='voucher_entries'
    )
    entry_type = models.CharField(max_length=10, choices=EntryType.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    fund = models.ForeignKey(
        InstitutionalFund,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='voucher_entries'
    )
    description = models.CharField(max_length=255, blank=True, default='')
    subledger_type = models.CharField(max_length=32, blank=True, default='', help_text="STUDENT, STAFF, VENDOR")
    subledger_id = models.CharField(max_length=64, blank=True, default='')

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.entry_type} {self.amount} -> {self.account.name_en}"


# ─────────────────────────────────────────────────────────────────────────────
# 2. STUDENT BILLING, FEES & SCHOLARSHIP WAIVERS
# ─────────────────────────────────────────────────────────────────────────────

class FeeHead(models.Model):
    """Fee category definition (Tuition, Admission, Residential, Exam, etc.)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='fee_heads'
    )
    code = models.CharField(max_length=32)
    name = models.CharField(max_length=120)
    name_bn = models.CharField(max_length=120, blank=True, default='')
    frequency = models.CharField(max_length=20, choices=FeeFrequency.choices, default=FeeFrequency.MONTHLY)
    gl_account = models.ForeignKey(
        ChartOfAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='associated_fee_heads',
        help_text="Linked Revenue COA account"
    )
    default_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_optional = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = ('institution', 'code')

    def __str__(self):
        return f"{self.name} ({self.frequency})"


class FeeStructure(models.Model):
    """Specific fee schedule for a Class / Group / Residential Category"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='fee_structures'
    )
    academic_session = models.ForeignKey(
        'core.Session',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fee_structures'
    )
    branch = models.ForeignKey(
        'core.AcademicBranch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fee_structures'
    )
    department = models.ForeignKey(
        'core.AcademicDepartment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fee_structures'
    )
    student_class = models.ForeignKey(
        'core.StudentClass',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fee_structures'
    )
    student_group = models.ForeignKey(
        'core.StudentGroup',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fee_structures'
    )
    fee_head = models.ForeignKey(
        FeeHead,
        on_delete=models.CASCADE,
        related_name='structures'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['fee_head__name']

    def __str__(self):
        class_name = self.student_class.name if self.student_class else 'All Classes'
        return f"{self.fee_head.name} - {class_name}: {self.amount}"


class StudentFeeWaiver(models.Model):
    """Scholarships, sibling concessions, orphan free-ships, and special discounts"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        'core.Student',
        on_delete=models.CASCADE,
        related_name='fee_waivers'
    )
    fee_head = models.ForeignKey(
        FeeHead,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='granted_waivers',
        help_text="Leave empty for universal waiver across all fee heads"
    )
    waiver_type = models.CharField(max_length=20, choices=WaiverType.choices, default=WaiverType.PERCENTAGE)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="e.g. 50 for 50% or 500 for 500 BDT")
    reason = models.CharField(max_length=255, help_text="Merit, Sibling, Orphan, Need-based, Staff Child")
    approved_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_student_waivers'
    )
    valid_from = models.DateField(default=timezone.localdate)
    valid_until = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.name_en or self.student.uniq_id} - {self.waiver_type} ({self.discount_value})"


class StudentInvoice(models.Model):
    """Institutional student fee bill / invoice for a billing cycle"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='student_invoices'
    )
    invoice_number = models.CharField(max_length=64, db_index=True)
    student = models.ForeignKey(
        'core.Student',
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    academic_session = models.ForeignKey(
        'core.Session',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='student_invoices'
    )
    billing_month = models.CharField(max_length=20, help_text="e.g. 2026-09 or September 2026")
    issue_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField()
    subtotal_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    waiver_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    late_fine_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_payable = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    due_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.UNPAID, db_index=True)
    remarks = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_invoices'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-issue_date', '-created_at']
        unique_together = ('institution', 'invoice_number')

    def __str__(self):
        return f"{self.invoice_number} - {self.student.name_en or self.student.uniq_id} ({self.status})"

    def recalculate_balances(self):
        """Recalculate invoice payable, paid and remaining dues"""
        self.due_amount = max(0, float(self.total_payable) - float(self.paid_amount))
        if self.paid_amount <= 0:
            if timezone.localdate() > self.due_date and self.due_amount > 0:
                self.status = InvoiceStatus.OVERDUE
            else:
                self.status = InvoiceStatus.UNPAID
        elif self.paid_amount < self.total_payable:
            self.status = InvoiceStatus.PARTIAL
        else:
            self.status = InvoiceStatus.PAID
        self.save()


class StudentInvoiceItem(models.Model):
    """Itemized breakdown of fee heads in a student invoice"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        StudentInvoice,
        on_delete=models.CASCADE,
        related_name='items'
    )
    fee_head = models.ForeignKey(
        FeeHead,
        on_delete=models.PROTECT,
        related_name='invoice_items'
    )
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2)
    waiver_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.fee_head.name}: {self.net_amount}"


# ─────────────────────────────────────────────────────────────────────────────
# 3. MONEY RECEIPTS, POS COUNTER & ANTI-FRAUD VERIFICATION
# ─────────────────────────────────────────────────────────────────────────────

def generate_receipt_security_hash(receipt_number, student_id, amount, date_str):
    """Generate tamper-proof cryptographic verification hash for receipts"""
    salt = "SPR_FINANCE_SECURE_TOKEN_2026"
    raw_payload = f"{receipt_number}|{student_id}|{amount}|{date_str}|{salt}"
    return hashlib.sha256(raw_payload.encode('utf-8')).hexdigest()[:32]


class MoneyReceipt(models.Model):
    """Official payment receipt with tamper-proof QR verification"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='money_receipts'
    )
    branch = models.ForeignKey(
        'core.AcademicBranch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='money_receipts'
    )
    receipt_number = models.CharField(max_length=64, db_index=True)
    invoice = models.ForeignKey(
        StudentInvoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='receipts'
    )
    student = models.ForeignKey(
        'core.Student',
        on_delete=models.CASCADE,
        related_name='money_receipts'
    )
    voucher = models.OneToOneField(
        FinancialVoucher,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='receipt'
    )
    payment_date = models.DateField(default=timezone.localdate)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    transaction_ref = models.CharField(max_length=100, blank=True, default='', help_text="bKash TrxID, Bank scroll no, Cheque no")
    collected_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='collected_receipts'
    )
    cashier_shift = models.CharField(max_length=64, blank=True, default='Morning')
    
    # Tamper-Proof Cryptographic Verification Token
    security_hash = models.CharField(max_length=64, db_index=True, blank=True)
    qr_verification_token = models.CharField(max_length=64, unique=True, db_index=True, blank=True)
    verification_url = models.CharField(max_length=255, blank=True, default='')
    
    status = models.CharField(max_length=20, choices=ReceiptStatus.choices, default=ReceiptStatus.VALID)
    print_count = models.IntegerField(default=0)
    last_printed_at = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-payment_date', '-created_at']
        unique_together = ('institution', 'receipt_number')

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            rand_suffix = secrets.token_hex(3).upper()
            self.receipt_number = f"REC-{timezone.localdate().strftime('%Y%m')}-{rand_suffix}"
        
        if not self.qr_verification_token:
            self.qr_verification_token = f"VRF-{uuid.uuid4().hex[:16].upper()}"
            
        if not self.security_hash:
            student_id = str(self.student.uniq_id or self.student.id)
            self.security_hash = generate_receipt_security_hash(
                self.receipt_number,
                student_id,
                str(self.amount_paid),
                str(self.payment_date)
            )
            
        if not self.verification_url:
            self.verification_url = f"/verify-receipt/{self.receipt_number}?token={self.qr_verification_token}"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.receipt_number} - {self.student.name_en or self.student.uniq_id}: {self.amount_paid}"


class ReceiptItemAllocation(models.Model):
    """Detailed allocation of paid receipt amount across specific invoice items"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    receipt = models.ForeignKey(
        MoneyReceipt,
        on_delete=models.CASCADE,
        related_name='allocations'
    )
    invoice_item = models.ForeignKey(
        StudentInvoiceItem,
        on_delete=models.CASCADE,
        related_name='receipt_allocations'
    )
    allocated_amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.receipt.receipt_number} -> {self.invoice_item.fee_head.name}: {self.allocated_amount}"


# ─────────────────────────────────────────────────────────────────────────────
# 4. STAFF PAYROLL, COMPENSATION & SALARY ADVANCES
# ─────────────────────────────────────────────────────────────────────────────

class StaffPayHead(models.Model):
    """Salary components (Basic, HRA, Medical, Bonus, PF, Tax, Loan EMI)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='staff_pay_heads'
    )
    code = models.CharField(max_length=32)
    name = models.CharField(max_length=120)
    name_bn = models.CharField(max_length=120, blank=True, default='')
    head_type = models.CharField(max_length=20, choices=PayHeadType.choices, default=PayHeadType.EARNING)
    gl_account = models.ForeignKey(
        ChartOfAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='associated_pay_heads',
        help_text="Linked Expense/Liability COA account"
    )
    is_taxable = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['head_type', 'name']
        unique_together = ('institution', 'code')

    def __str__(self):
        return f"{self.name} ({self.head_type})"


class StaffSalaryStructureItem(models.Model):
    """Individual pay head allocation for a staff member's salary package"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(
        'core.StaffProfile',
        on_delete=models.CASCADE,
        related_name='salary_structure_items'
    )
    pay_head = models.ForeignKey(
        StaffPayHead,
        on_delete=models.CASCADE,
        related_name='staff_allocations'
    )
    calculation_type = models.CharField(
        max_length=30,
        choices=CalculationType.choices,
        default=CalculationType.FIXED
    )
    amount_or_percent = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['pay_head__head_type', 'pay_head__name']
        unique_together = ('staff', 'pay_head')

    def __str__(self):
        return f"{self.staff.employee_id} - {self.pay_head.name}: {self.amount_or_percent}"


class StaffSalaryAdvance(models.Model):
    """Salary advances and institutional loans with monthly installment auto-deduction"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='staff_salary_advances'
    )
    staff = models.ForeignKey(
        'core.StaffProfile',
        on_delete=models.CASCADE,
        related_name='salary_advances'
    )
    request_date = models.DateField(default=timezone.localdate)
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)
    monthly_installment = models.DecimalField(max_digits=10, decimal_places=2)
    total_repaid = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2)
    purpose = models.CharField(max_length=255, blank=True, default='')
    status = models.CharField(max_length=20, choices=AdvanceStatus.choices, default=AdvanceStatus.PENDING)
    approved_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_staff_advances'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-request_date']

    def save(self, *args, **kwargs):
        if not self.remaining_balance:
            self.remaining_balance = self.principal_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.staff.employee_id} Advance: {self.principal_amount} (Rem: {self.remaining_balance})"


class StaffPayrollRun(models.Model):
    """Monthly institutional payroll batch processing record"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='payroll_runs'
    )
    payroll_month = models.CharField(max_length=20, help_text="e.g. 2026-09 or September 2026")
    processed_date = models.DateField(default=timezone.localdate)
    total_gross = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_deductions = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_net_disbursed = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_staff_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=PayrollStatus.choices, default=PayrollStatus.DRAFT)
    voucher = models.OneToOneField(
        FinancialVoucher,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payroll_run'
    )
    processed_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_payroll_runs'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-payroll_month', '-processed_date']
        unique_together = ('institution', 'payroll_month')

    def __str__(self):
        return f"Payroll {self.payroll_month} - Net: {self.total_net_disbursed} ({self.status})"


class StaffPayslip(models.Model):
    """Individual printable and digital payslip with security token"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payroll_run = models.ForeignKey(
        StaffPayrollRun,
        on_delete=models.CASCADE,
        related_name='payslips'
    )
    staff = models.ForeignKey(
        'core.StaffProfile',
        on_delete=models.CASCADE,
        related_name='payslips'
    )
    payslip_number = models.CharField(max_length=64, db_index=True)
    base_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    attendance_penalty = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    advance_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    net_payable = models.DecimalField(max_digits=12, decimal_places=2)
    payment_status = models.CharField(max_length=20, default='PAID')
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.BANK)
    bank_account_no = models.CharField(max_length=64, blank=True, default='')
    bank_name = models.CharField(max_length=100, blank=True, default='')
    
    # Security Token for Payslip Verification
    security_hash = models.CharField(max_length=64, blank=True)
    qr_verification_token = models.CharField(max_length=64, unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['staff__employee_id']
        unique_together = ('payroll_run', 'staff')

    def save(self, *args, **kwargs):
        if not self.payslip_number:
            self.payslip_number = f"PAY-{self.payroll_run.payroll_month}-{self.staff.employee_id}"
        if not self.qr_verification_token:
            self.qr_verification_token = f"PAYVRF-{uuid.uuid4().hex[:16].upper()}"
        if not self.security_hash:
            self.security_hash = hashlib.sha256(
                f"{self.payslip_number}|{self.staff.employee_id}|{self.net_payable}|SPR_PAYROLL_SECURE".encode('utf-8')
            ).hexdigest()[:32]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.payslip_number}: {self.net_payable}"


# ─────────────────────────────────────────────────────────────────────────────
# 5. BUDGETING & FINANCIAL AUDIT LOGS
# ─────────────────────────────────────────────────────────────────────────────

class DepartmentBudget(models.Model):
    """Annual / Quarterly budget caps for campus departments and branches"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='department_budgets'
    )
    branch = models.ForeignKey(
        'core.AcademicBranch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='department_budgets'
    )
    department = models.ForeignKey(
        'core.AcademicDepartment',
        on_delete=models.CASCADE,
        related_name='budgets'
    )
    fiscal_year = models.ForeignKey(
        FiscalYear,
        on_delete=models.CASCADE,
        related_name='department_budgets'
    )
    allocated_amount = models.DecimalField(max_digits=14, decimal_places=2)
    spent_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    alert_threshold_percent = models.IntegerField(default=80, help_text="Warning trigger %")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['department__name']
        unique_together = ('department', 'fiscal_year')

    def __str__(self):
        return f"{self.department.name} ({self.fiscal_year.name}): {self.spent_amount}/{self.allocated_amount}"


class FinancialAuditLog(models.Model):
    """Immutable log of all financial modifications, voucher reversals, and waivers"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='financial_audit_logs'
    )
    entity_type = models.CharField(max_length=64, help_text="VOUCHER, INVOICE, RECEIPT, WAIVER, PAYROLL")
    entity_id = models.CharField(max_length=64)
    action = models.CharField(max_length=32, help_text="CREATED, UPDATED, CANCELLED, REVERSED, APPROVED")
    performed_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='performed_financial_audits'
    )
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M')}] {self.action} on {self.entity_type} #{self.entity_id}"
