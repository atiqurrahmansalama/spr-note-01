from django.db import transaction
from django.db.models import Sum, Q, F, DecimalField, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import datetime, date
import uuid
import secrets
from decimal import Decimal

from core.models.finance import (
    AccountCategory,
    FundType,
    VoucherType,
    VoucherStatus,
    EntryType,
    PaymentMethod,
    FeeFrequency,
    InvoiceStatus,
    ReceiptStatus,
    WaiverType,
    AdvanceStatus,
    PayrollStatus,
    InstitutionalFund,
    FiscalYear,
    ChartOfAccount,
    FinancialVoucher,
    VoucherEntry,
    FeeHead,
    FeeStructure,
    StudentFeeWaiver,
    StudentInvoice,
    StudentInvoiceItem,
    MoneyReceipt,
    ReceiptItemAllocation,
    StaffPayHead,
    StaffSalaryStructureItem,
    StaffSalaryAdvance,
    StaffPayrollRun,
    StaffPayslip,
    DepartmentBudget,
    FinancialAuditLog,
    generate_receipt_security_hash,
)
from core.models.students import Student
from core.models.staff import StaffProfile
from core.models.institutions import AcademicInstitution


class FinanceLedgerService:
    """Core General Ledger, Double-Entry Voucher, and Statement Calculations"""

    @staticmethod
    def ensure_default_accounts(institution: AcademicInstitution):
        """Seed default 5-Tier Chart of Accounts for new or existing institution"""
        default_funds = [
            ("GEN-01", "General Institutional Fund", FundType.GENERAL),
            ("ZAKAT-01", "Zakat & Sadaqah Fund", FundType.ZAKAT_SADAQAH),
            ("WAQF-01", "Waqf & Construction Fund", FundType.WAQF_BUILDING),
            ("WELFARE-01", "Student Welfare & Scholarship Fund", FundType.STUDENT_WELFARE),
        ]
        fund_map = {}
        for code, name, ftype in default_funds:
            fund, _ = InstitutionalFund.objects.get_or_create(
                institution=institution,
                fund_code=code,
                defaults={"name": name, "fund_type": ftype}
            )
            fund_map[code] = fund

        gen_fund = fund_map.get("GEN-01")

        # Default Chart of Accounts Hierarchy
        accounts_data = [
            # 1. Assets (1000)
            ("1000", "Assets", AccountCategory.ASSET, None, True),
            ("1100", "Current Assets", AccountCategory.ASSET, "1000", True),
            ("1110", "Cash in Hand (Counter Treasury)", AccountCategory.ASSET, "1100", False),
            ("1120", "Main Bank Account", AccountCategory.ASSET, "1100", False),
            ("1130", "bKash / Mobile Money Gateway", AccountCategory.ASSET, "1100", False),
            ("1140", "Student Accounts Receivable (Dues)", AccountCategory.ASSET, "1100", False),
            ("1200", "Fixed Assets", AccountCategory.ASSET, "1000", True),
            ("1210", "Campus Furniture & Equipment", AccountCategory.ASSET, "1200", False),
            ("1220", "Books & Library Assets", AccountCategory.ASSET, "1200", False),
            
            # 2. Liabilities (2000)
            ("2000", "Liabilities", AccountCategory.LIABILITY, None, True),
            ("2100", "Current Liabilities", AccountCategory.LIABILITY, "2000", True),
            ("2110", "Staff Salary Payable", AccountCategory.LIABILITY, "2100", False),
            ("2120", "Advance Student Fees Received", AccountCategory.LIABILITY, "2100", False),
            ("2130", "Accounts Payable (Suppliers/Vendors)", AccountCategory.LIABILITY, "2100", False),
            
            # 3. Equity / Funds (3000)
            ("3000", "Equity & Institutional Funds", AccountCategory.EQUITY, None, True),
            ("3100", "General Institutional Capital", AccountCategory.EQUITY, "3000", False),
            ("3200", "Zakat & Sadaqah Reserve", AccountCategory.EQUITY, "3000", False),
            ("3300", "Waqf & Mosque/Campus Endowment", AccountCategory.EQUITY, "3000", False),
            
            # 4. Revenue / Income (4000)
            ("4000", "Revenue & Income", AccountCategory.REVENUE, None, True),
            ("4100", "Academic & Tuition Fees", AccountCategory.REVENUE, "4000", False),
            ("4200", "Admission & Registration Fees", AccountCategory.REVENUE, "4000", False),
            ("4300", "Residential & Boarding/Mess Fees", AccountCategory.REVENUE, "4000", False),
            ("4400", "Examination & Certificate Fees", AccountCategory.REVENUE, "4000", False),
            ("4500", "Late Fines & Penalties", AccountCategory.REVENUE, "4000", False),
            ("4600", "Institutional Donations & Grants", AccountCategory.REVENUE, "4000", False),
            ("4700", "Miscellaneous Income", AccountCategory.REVENUE, "4000", False),
            
            # 5. Expenses (5000)
            ("5000", "Operational Expenses", AccountCategory.EXPENSE, None, True),
            ("5100", "Staff Salaries & Honorariums", AccountCategory.EXPENSE, "5000", False),
            ("5200", "Campus Rent & Utilities", AccountCategory.EXPENSE, "5000", False),
            ("5300", "Mess & Food Supplies", AccountCategory.EXPENSE, "5000", False),
            ("5400", "Academic & Office Stationery", AccountCategory.EXPENSE, "5000", False),
            ("5500", "Campus Repairs & Maintenance", AccountCategory.EXPENSE, "5000", False),
            ("5600", "Scholarships & Fee Waivers Granted", AccountCategory.EXPENSE, "5000", False),
            ("5700", "Miscellaneous Expenses", AccountCategory.EXPENSE, "5000", False),
        ]

        created_accs = {}
        for code, name, category, parent_code, is_group in accounts_data:
            parent_acc = created_accs.get(parent_code)
            acc, _ = ChartOfAccount.objects.get_or_create(
                institution=institution,
                code=code,
                defaults={
                    "name_en": name,
                    "category": category,
                    "parent_account": parent_acc,
                    "is_group": is_group,
                    "fund": gen_fund,
                    "is_system_default": True,
                }
            )
            created_accs[code] = acc

        return created_accs

    @staticmethod
    def get_financial_kpis(institution: AcademicInstitution, start_date=None, end_date=None):
        """Aggregate high-level real-time KPI metrics for executive overview"""
        today = timezone.localdate()
        if not start_date:
            start_date = today.replace(day=1)
        if not end_date:
            end_date = today

        # 1. Total Collections Today & Month
        today_receipts = MoneyReceipt.objects.filter(
            institution=institution,
            payment_date=today,
            status=ReceiptStatus.VALID
        ).aggregate(total=Coalesce(Sum('amount_paid'), Value(Decimal('0.00'))))['total']

        month_receipts = MoneyReceipt.objects.filter(
            institution=institution,
            payment_date__gte=start_date,
            payment_date__lte=end_date,
            status=ReceiptStatus.VALID
        ).aggregate(total=Coalesce(Sum('amount_paid'), Value(Decimal('0.00'))))['total']

        # 2. Total Outstanding Student Dues
        total_dues = StudentInvoice.objects.filter(
            institution=institution,
            status__in=[InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE]
        ).aggregate(total=Coalesce(Sum('due_amount'), Value(Decimal('0.00'))))['total']

        # 3. Total Monthly Expenses
        month_expenses = VoucherEntry.objects.filter(
            voucher__institution=institution,
            voucher__date__gte=start_date,
            voucher__date__lte=end_date,
            voucher__status=VoucherStatus.POSTED,
            account__category=AccountCategory.EXPENSE,
            entry_type=EntryType.DEBIT
        ).aggregate(total=Coalesce(Sum('amount'), Value(Decimal('0.00'))))['total']

        # 4. Total Cash & Bank Balances
        cash_accounts = ChartOfAccount.objects.filter(
            institution=institution,
            category=AccountCategory.ASSET,
            code__in=['1110', '1120', '1130']
        )
        total_cash_bank = sum([acc.current_balance for acc in cash_accounts]) if cash_accounts.exists() else month_receipts - month_expenses

        # 5. Net Surplus / Deficit
        net_surplus = month_receipts - month_expenses

        return {
            "today_collection": float(today_receipts),
            "month_collection": float(month_receipts),
            "total_outstanding_dues": float(total_dues),
            "month_expenses": float(month_expenses),
            "cash_bank_balance": float(total_cash_bank),
            "net_surplus": float(net_surplus),
        }

    @staticmethod
    @transaction.atomic
    def create_voucher(institution, voucher_type, date_val, narration, entries_data, created_by=None, reference_no='', branch=None):
        """Create and post a validated Double-Entry financial voucher"""
        total_debit = Decimal('0.00')
        total_credit = Decimal('0.00')

        for entry in entries_data:
            amount = Decimal(str(entry['amount']))
            if entry['entry_type'] == EntryType.DEBIT:
                total_debit += amount
            elif entry['entry_type'] == EntryType.CREDIT:
                total_credit += amount

        if total_debit != total_credit:
            raise ValueError(f"Debit ({total_debit}) and Credit ({total_credit}) amounts must be strictly equal.")

        prefix = voucher_type
        rand_id = secrets.token_hex(3).upper()
        voucher_no = f"{prefix}-{timezone.localdate().strftime('%Y%m')}-{rand_id}"

        voucher = FinancialVoucher.objects.create(
            institution=institution,
            branch=branch,
            voucher_number=voucher_no,
            voucher_type=voucher_type,
            date=date_val or timezone.localdate(),
            reference_no=reference_no,
            narration=narration,
            total_amount=total_debit,
            status=VoucherStatus.POSTED,
            created_by=created_by
        )

        for entry in entries_data:
            acc_id = entry['account_id']
            account = ChartOfAccount.objects.get(id=acc_id, institution=institution)
            amount = Decimal(str(entry['amount']))
            
            VoucherEntry.objects.create(
                voucher=voucher,
                account=account,
                entry_type=entry['entry_type'],
                amount=amount,
                fund_id=entry.get('fund_id'),
                description=entry.get('description', ''),
                subledger_type=entry.get('subledger_type', ''),
                subledger_id=entry.get('subledger_id', '')
            )

            # Update live balance on Chart of Account
            if account.category in [AccountCategory.ASSET, AccountCategory.EXPENSE]:
                if entry['entry_type'] == EntryType.DEBIT:
                    account.current_balance = F('current_balance') + amount
                else:
                    account.current_balance = F('current_balance') - amount
            else: # LIABILITY, EQUITY, REVENUE
                if entry['entry_type'] == EntryType.CREDIT:
                    account.current_balance = F('current_balance') + amount
                else:
                    account.current_balance = F('current_balance') - amount
            account.save()

        # Audit Log
        FinancialAuditLog.objects.create(
            institution=institution,
            entity_type="VOUCHER",
            entity_id=str(voucher.id),
            action="CREATED",
            performed_by=created_by,
            details={"voucher_number": voucher_no, "total_amount": str(total_debit)}
        )

        return voucher


class FinanceBillingService:
    """Student Fee Billing, Batch Invoicing, Waivers & Money Receipt Collections"""

    @staticmethod
    @transaction.atomic
    def generate_batch_invoices(institution, billing_month, due_date, class_id=None, group_id=None, branch_id=None, created_by=None):
        """Automated 1-Click Batch Invoicing for Students with Waiver Engine Integration"""
        students_qs = Student.objects.filter(
            institution=institution,
            is_deleted=False
        )
        if class_id:
            students_qs = students_qs.filter(student_class_id=class_id)
        if group_id:
            students_qs = students_qs.filter(student_group_id=group_id)
        if branch_id:
            students_qs = students_qs.filter(branch_id=branch_id)

        created_invoices = []
        skipped_count = 0

        for student in students_qs:
            # Prevent duplicate invoices for same month and student
            existing = StudentInvoice.objects.filter(
                institution=institution,
                student=student,
                billing_month=billing_month
            ).first()
            if existing:
                skipped_count += 1
                continue

            # Find matching fee structures
            fee_structures = FeeStructure.objects.filter(
                institution=institution,
                is_active=True
            ).filter(
                Q(student_class=student.student_class) | Q(student_class__isnull=True)
            )

            if not fee_structures.exists():
                # Fallback to standard active fee heads
                fee_heads = FeeHead.objects.filter(institution=institution, is_active=True, frequency=FeeFrequency.MONTHLY)
                items_to_bill = [(head, head.default_amount) for head in fee_heads]
            else:
                items_to_bill = [(struct.fee_head, struct.amount) for struct in fee_structures]

            if not items_to_bill:
                continue

            # Fetch active student waivers
            today = timezone.localdate()
            waivers = StudentFeeWaiver.objects.filter(
                student=student,
                is_active=True,
                valid_from__lte=today
            ).filter(Q(valid_until__isnull=True) | Q(valid_until__gte=today))

            invoice_number = f"INV-{billing_month.replace('-', '')}-{student.uniq_id or student.id.hex[:6].upper()}-{secrets.token_hex(2).upper()}"
            
            subtotal = Decimal('0.00')
            total_waiver = Decimal('0.00')

            invoice = StudentInvoice.objects.create(
                institution=institution,
                invoice_number=invoice_number,
                student=student,
                billing_month=billing_month,
                issue_date=today,
                due_date=due_date,
                subtotal_amount=0,
                waiver_amount=0,
                total_payable=0,
                due_amount=0,
                status=InvoiceStatus.UNPAID,
                created_by=created_by
            )

            for fee_head, gross_amount in items_to_bill:
                gross = Decimal(str(gross_amount))
                subtotal += gross
                
                # Check fee-specific waiver or global waiver
                head_waiver = waivers.filter(Q(fee_head=fee_head) | Q(fee_head__isnull=True)).first()
                waiver_val = Decimal('0.00')
                if head_waiver:
                    if head_waiver.waiver_type == WaiverType.FULL_SCHOLARSHIP:
                        waiver_val = gross
                    elif head_waiver.waiver_type == WaiverType.PERCENTAGE:
                        waiver_val = (gross * Decimal(str(head_waiver.discount_value))) / Decimal('100.00')
                    elif head_waiver.waiver_type == WaiverType.FIXED_AMOUNT:
                        waiver_val = min(gross, Decimal(str(head_waiver.discount_value)))

                total_waiver += waiver_val
                net = max(Decimal('0.00'), gross - waiver_val)

                StudentInvoiceItem.objects.create(
                    invoice=invoice,
                    fee_head=fee_head,
                    gross_amount=gross,
                    waiver_amount=waiver_val,
                    net_amount=net,
                    paid_amount=0
                )

            total_payable = max(Decimal('0.00'), subtotal - total_waiver)
            invoice.subtotal_amount = subtotal
            invoice.waiver_amount = total_waiver
            invoice.total_payable = total_payable
            invoice.due_amount = total_payable
            invoice.status = InvoiceStatus.WAIVED if total_payable == 0 else InvoiceStatus.UNPAID
            invoice.save()

            created_invoices.append(invoice)

        return {
            "created_count": len(created_invoices),
            "skipped_count": skipped_count,
            "invoices": created_invoices
        }

    @staticmethod
    @transaction.atomic
    def collect_fee_payment(institution, student_id, amount_paid, payment_method, invoice_id=None, transaction_ref='', collected_by=None, cashier_shift='Morning', remarks='', branch=None):
        """Counter POS Fee Collection, Tamper-Proof QR Receipt & Automated GL Voucher Posting"""
        student = Student.objects.get(id=student_id, institution=institution)
        amount = Decimal(str(amount_paid))

        if amount <= 0:
            raise ValueError("Payment amount must be greater than zero.")

        # If specific invoice provided, apply to it; otherwise apply FIFO to oldest unpaid invoices
        target_invoices = []
        if invoice_id:
            target_invoices = [StudentInvoice.objects.get(id=invoice_id, student=student)]
        else:
            target_invoices = list(StudentInvoice.objects.filter(
                student=student,
                status__in=[InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE]
            ).order_by('issue_date'))

        primary_invoice = target_invoices[0] if target_invoices else None

        # 1. Create Money Receipt with Tamper-Proof Cryptographic Hash
        receipt = MoneyReceipt.objects.create(
            institution=institution,
            branch=branch or student.branch,
            invoice=primary_invoice,
            student=student,
            amount_paid=amount,
            payment_method=payment_method,
            transaction_ref=transaction_ref,
            collected_by=collected_by,
            cashier_shift=cashier_shift,
            status=ReceiptStatus.VALID,
            remarks=remarks
        )

        # 2. Allocate payment across invoice items
        remaining_to_allocate = amount
        for inv in target_invoices:
            if remaining_to_allocate <= 0:
                break
            
            for item in inv.items.all():
                item_due = item.net_amount - item.paid_amount
                if item_due > 0 and remaining_to_allocate > 0:
                    alloc_amt = min(remaining_to_allocate, item_due)
                    item.paid_amount += alloc_amt
                    item.save()

                    ReceiptItemAllocation.objects.create(
                        receipt=receipt,
                        invoice_item=item,
                        allocated_amount=alloc_amt
                    )
                    remaining_to_allocate -= alloc_amt

            inv.paid_amount = sum([it.paid_amount for it in inv.items.all()])
            inv.recalculate_balances()

        # 3. Post Automatic General Ledger Voucher (Dr Cash/Bank, Cr Tuition Revenue / Accounts Receivable)
        FinanceLedgerService.ensure_default_accounts(institution)
        
        cash_acc_code = '1110' if payment_method == PaymentMethod.CASH else '1120'
        if payment_method in [PaymentMethod.BKASH, PaymentMethod.NAGAD, PaymentMethod.ROCKET]:
            cash_acc_code = '1130'

        debit_account = ChartOfAccount.objects.filter(institution=institution, code=cash_acc_code).first()
        credit_account = ChartOfAccount.objects.filter(institution=institution, code='4100').first() # Academic Revenue

        if debit_account and credit_account:
            voucher = FinanceLedgerService.create_voucher(
                institution=institution,
                voucher_type=VoucherType.RECEIPT,
                date_val=timezone.localdate(),
                narration=f"Student Fee Collection - Receipt #{receipt.receipt_number} for {student.name_en or student.uniq_id}",
                entries_data=[
                    {"account_id": debit_account.id, "entry_type": EntryType.DEBIT, "amount": amount, "description": f"Receipt #{receipt.receipt_number}"},
                    {"account_id": credit_account.id, "entry_type": EntryType.CREDIT, "amount": amount, "description": f"Fee income from {student.uniq_id}"},
                ],
                created_by=collected_by,
                reference_no=receipt.receipt_number,
                branch=branch or student.branch
            )
            receipt.voucher = voucher
            receipt.save()

        # Audit Log
        FinancialAuditLog.objects.create(
            institution=institution,
            entity_type="RECEIPT",
            entity_id=str(receipt.id),
            action="CREATED",
            performed_by=collected_by,
            details={"receipt_number": receipt.receipt_number, "amount": str(amount), "student_id": str(student.id)}
        )

        return receipt


class FinancePayrollService:
    """Staff Payroll Processing, Allowances, Deductions & Salary Advances"""

    @staticmethod
    @transaction.atomic
    def process_monthly_payroll(institution, payroll_month, processed_by=None):
        """1-Click Institutional Payroll Batch Processor with Attendance and Advance Deductions"""
        staff_qs = StaffProfile.objects.filter(
            institution=institution,
            employment_status__in=['PERMANENT', 'FULL_TIME', 'PROBATION', 'CONTRACT']
        )

        # Check existing payroll run
        existing_run = StaffPayrollRun.objects.filter(
            institution=institution,
            payroll_month=payroll_month
        ).first()
        if existing_run and existing_run.status == PayrollStatus.DISBURSED:
            raise ValueError(f"Payroll for {payroll_month} has already been disbursed.")

        payroll_run, _ = StaffPayrollRun.objects.get_or_create(
            institution=institution,
            payroll_month=payroll_month,
            defaults={
                "processed_date": timezone.localdate(),
                "status": PayrollStatus.DRAFT,
                "processed_by": processed_by
            }
        )

        total_gross_batch = Decimal('0.00')
        total_deductions_batch = Decimal('0.00')
        total_net_batch = Decimal('0.00')

        # Clean existing draft payslips
        payroll_run.payslips.all().delete()

        for staff in staff_qs:
            base_salary = Decimal(str(staff.base_salary or 0.00))
            if base_salary <= 0:
                continue

            # Allowances and deductions from salary structure
            allocations = staff.salary_structure_items.filter(is_active=True)
            allowances = Decimal('0.00')
            deductions = Decimal('0.00')

            for item in allocations:
                val = Decimal(str(item.amount_or_percent))
                amt = val if item.calculation_type == 'FIXED' else (base_salary * val) / Decimal('100.00')
                if item.pay_head.head_type == 'EARNING':
                    allowances += amt
                else:
                    deductions += amt

            # Check active salary advances for monthly installment deduction
            advances = staff.salary_advances.filter(status=AdvanceStatus.DISBURSED, remaining_balance__gt=0)
            advance_deduction = Decimal('0.00')
            for adv in advances:
                inst_amt = min(adv.remaining_balance, adv.monthly_installment)
                advance_deduction += inst_amt
                adv.remaining_balance -= inst_amt
                adv.total_repaid += inst_amt
                if adv.remaining_balance <= 0:
                    adv.status = AdvanceStatus.REPAID
                adv.save()

            gross = base_salary + allowances
            total_staff_deductions = deductions + advance_deduction
            net_payable = max(Decimal('0.00'), gross - total_staff_deductions)

            payslip = StaffPayslip.objects.create(
                payroll_run=payroll_run,
                staff=staff,
                base_salary=base_salary,
                total_allowances=allowances,
                total_deductions=total_staff_deductions,
                attendance_penalty=0,
                advance_deduction=advance_deduction,
                net_payable=net_payable,
                payment_status='PAID',
                bank_account_no=staff.bank_account_no or '',
                bank_name=staff.bank_name or 'Institutional Bank Transfer'
            )

            total_gross_batch += gross
            total_deductions_batch += total_staff_deductions
            total_net_batch += net_payable

        payroll_run.total_gross = total_gross_batch
        payroll_run.total_deductions = total_deductions_batch
        payroll_run.total_net_disbursed = total_net_batch
        payroll_run.total_staff_count = payroll_run.payslips.count()
        payroll_run.status = PayrollStatus.DISBURSED
        payroll_run.save()

        # Post Salary Expense GL Voucher (Dr 5100 Staff Salary Expense, Cr 1120 Bank)
        FinanceLedgerService.ensure_default_accounts(institution)
        salary_exp_acc = ChartOfAccount.objects.filter(institution=institution, code='5100').first()
        bank_acc = ChartOfAccount.objects.filter(institution=institution, code='1120').first()

        if salary_exp_acc and bank_acc and total_net_batch > 0:
            voucher = FinanceLedgerService.create_voucher(
                institution=institution,
                voucher_type=VoucherType.PAYMENT,
                date_val=timezone.localdate(),
                narration=f"Monthly Staff Payroll Disbursement for {payroll_month} ({payroll_run.total_staff_count} Staff)",
                entries_data=[
                    {"account_id": salary_exp_acc.id, "entry_type": EntryType.DEBIT, "amount": total_net_batch, "description": f"Staff Payroll {payroll_month}"},
                    {"account_id": bank_acc.id, "entry_type": EntryType.CREDIT, "amount": total_net_batch, "description": f"Bank Payout {payroll_month}"},
                ],
                created_by=processed_by,
                reference_no=f"PAYROLL-{payroll_month}"
            )
            payroll_run.voucher = voucher
            payroll_run.save()

        return payroll_run
