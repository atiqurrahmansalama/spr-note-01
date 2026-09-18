from django.test import TestCase
from django.utils import timezone
from decimal import Decimal
from datetime import date

from core.models.institutions import AcademicInstitution
from core.models.students import Student
from core.models.staff import StaffProfile
from core.models.finance import (
    InstitutionalFund,
    ChartOfAccount,
    AccountCategory,
    FeeHead,
    StudentInvoice,
    MoneyReceipt,
    ReceiptStatus,
    InvoiceStatus,
    generate_receipt_security_hash,
)
from core.services.finance_service import (
    FinanceLedgerService,
    FinanceBillingService,
    FinancePayrollService,
)


class FinanceEngineTestCase(TestCase):
    def setUp(self):
        self.institution = AcademicInstitution.objects.create(
            name="Darul Uloom Test Academy",
            slug="dut-test",
        )
        self.student = Student.objects.create(
            institution=self.institution,
            uniq_id="STU-9901",
            name_en="Abdullah Al Mamun",
            status="Active"
        )
        self.staff = StaffProfile.objects.create(
            institution=self.institution,
            employee_id="DUT-EMP-01",
            designation="Senior Lecturer",
            base_salary=Decimal('25000.00'),
            employment_status="PERMANENT"
        )

    def test_default_accounts_seeding_and_kpis(self):
        accounts = FinanceLedgerService.ensure_default_accounts(self.institution)
        self.assertIn("1000", accounts)
        self.assertIn("4100", accounts)
        self.assertIn("5100", accounts)

        kpis = FinanceLedgerService.get_financial_kpis(self.institution)
        self.assertIn("today_collection", kpis)
        self.assertIn("net_surplus", kpis)

    def test_student_batch_billing_and_pos_collection(self):
        # Create monthly tuition fee head
        FeeHead.objects.create(
            institution=self.institution,
            code="TUIT-01",
            name="Monthly Tuition Fee",
            default_amount=Decimal('1500.00'),
            frequency="MONTHLY"
        )

        res = FinanceBillingService.generate_batch_invoices(
            institution=self.institution,
            billing_month="2026-09",
            due_date=date(2026, 9, 20)
        )
        self.assertEqual(res["created_count"], 1)

        invoice = StudentInvoice.objects.get(student=self.student, billing_month="2026-09")
        self.assertEqual(invoice.total_payable, Decimal('1500.00'))
        self.assertEqual(invoice.due_amount, Decimal('1500.00'))
        self.assertEqual(invoice.status, InvoiceStatus.UNPAID)

        # Collect Payment
        receipt = FinanceBillingService.collect_fee_payment(
            institution=self.institution,
            student_id=self.student.id,
            amount_paid=Decimal('1500.00'),
            payment_method="CASH",
            invoice_id=invoice.id
        )

        self.assertEqual(receipt.status, ReceiptStatus.VALID)
        self.assertTrue(len(receipt.security_hash) > 16)
        self.assertTrue(len(receipt.qr_verification_token) > 8)

        invoice.refresh_from_db()
        self.assertEqual(invoice.paid_amount, Decimal('1500.00'))
        self.assertEqual(invoice.due_amount, Decimal('0.00'))
        self.assertEqual(invoice.status, InvoiceStatus.PAID)

    def test_staff_payroll_run(self):
        payroll_run = FinancePayrollService.process_monthly_payroll(
            institution=self.institution,
            payroll_month="2026-09"
        )
        self.assertEqual(payroll_run.total_staff_count, 1)
        self.assertEqual(payroll_run.total_net_disbursed, Decimal('25000.00'))
        self.assertEqual(payroll_run.payslips.count(), 1)
