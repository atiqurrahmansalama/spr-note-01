from datetime import datetime, date
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Q, Count, F
from django.utils import timezone
from rest_framework import viewsets, permissions, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from core.models.finance import (
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
    AccountCategory,
    VoucherStatus,
    ReceiptStatus,
    InvoiceStatus,
)
from core.serializers.finance import (
    InstitutionalFundSerializer,
    FiscalYearSerializer,
    ChartOfAccountSerializer,
    FinancialVoucherSerializer,
    VoucherEntrySerializer,
    FeeHeadSerializer,
    FeeStructureSerializer,
    StudentFeeWaiverSerializer,
    StudentInvoiceSerializer,
    StudentInvoiceItemSerializer,
    MoneyReceiptSerializer,
    StaffPayHeadSerializer,
    StaffSalaryStructureItemSerializer,
    StaffSalaryAdvanceSerializer,
    StaffPayrollRunSerializer,
    StaffPayslipSerializer,
    DepartmentBudgetSerializer,
    FinancialAuditLogSerializer,
)
from core.services.finance_service import (
    FinanceLedgerService,
    FinanceBillingService,
    FinancePayrollService,
)
from core.models.students import Student


class TenantFinanceBaseMixin:
    """Ensures strict multi-tenant isolation for all finance operations"""
    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return self.queryset.none()
        institution = getattr(user, 'institution', None)
        if not institution:
            return self.queryset.none()
        return self.queryset.filter(institution=institution)

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(institution=user.institution)


class FinanceDashboardKpiView(views.APIView):
    """Aggregate high-level financial KPIs and metrics"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        institution = getattr(request.user, 'institution', None)
        if not institution:
            return Response({"error": "No associated institution found."}, status=status.HTTP_400_BAD_REQUEST)
        
        FinanceLedgerService.ensure_default_accounts(institution)
        kpis = FinanceLedgerService.get_financial_kpis(institution)
        return Response(kpis, status=status.HTTP_200_OK)


class InstitutionalFundViewSet(TenantFinanceBaseMixin, viewsets.ModelViewSet):
    queryset = InstitutionalFund.objects.all()
    serializer_class = InstitutionalFundSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['fund_type', 'is_active']
    search_fields = ['name', 'fund_code']


class FiscalYearViewSet(TenantFinanceBaseMixin, viewsets.ModelViewSet):
    queryset = FiscalYear.objects.all()
    serializer_class = FiscalYearSerializer
    permission_classes = [IsAuthenticated]


class ChartOfAccountViewSet(TenantFinanceBaseMixin, viewsets.ModelViewSet):
    queryset = ChartOfAccount.objects.all().select_related('parent_account', 'fund')
    serializer_class = ChartOfAccountSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['category', 'fund', 'is_group', 'is_active']
    search_fields = ['code', 'name_en', 'name_bn']

    @action(detail=False, methods=['get'], url_path='tree-structure')
    def tree_structure(self, request):
        """Return hierarchical COA tree grouped by 5 Core Categories"""
        institution = request.user.institution
        FinanceLedgerService.ensure_default_accounts(institution)
        accounts = ChartOfAccount.objects.filter(institution=institution, is_active=True)
        serializer = self.get_serializer(accounts, many=True)
        return Response(serializer.data)


class FinancialVoucherViewSet(TenantFinanceBaseMixin, viewsets.ModelViewSet):
    queryset = FinancialVoucher.objects.all().select_related('branch', 'created_by').prefetch_related('entries__account')
    serializer_class = FinancialVoucherSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['voucher_type', 'status', 'branch', 'date']
    search_fields = ['voucher_number', 'reference_no', 'narration']

    def create(self, request, *args, **kwargs):
        institution = request.user.institution
        voucher_type = request.data.get('voucher_type', 'JV')
        date_val = request.data.get('date', timezone.localdate())
        narration = request.data.get('narration', '')
        reference_no = request.data.get('reference_no', '')
        entries = request.data.get('entries', [])
        branch_id = request.data.get('branch')

        if not entries or len(entries) < 2:
            return Response({"error": "A double-entry voucher must contain at least two entries."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            voucher = FinanceLedgerService.create_voucher(
                institution=institution,
                voucher_type=voucher_type,
                date_val=date_val,
                narration=narration,
                entries_data=entries,
                created_by=request.user,
                reference_no=reference_no,
                branch_id=branch_id
            )
            serializer = self.get_serializer(voucher)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FeeHeadViewSet(TenantFinanceBaseMixin, viewsets.ModelViewSet):
    queryset = FeeHead.objects.all().select_related('gl_account')
    serializer_class = FeeHeadSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['frequency', 'is_optional', 'is_active']
    search_fields = ['name', 'code']


class FeeStructureViewSet(TenantFinanceBaseMixin, viewsets.ModelViewSet):
    queryset = FeeStructure.objects.all().select_related('fee_head', 'student_class', 'student_group', 'department', 'branch')
    serializer_class = FeeStructureSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['fee_head', 'student_class', 'student_group', 'branch', 'is_active']


class StudentFeeWaiverViewSet(viewsets.ModelViewSet):
    queryset = StudentFeeWaiver.objects.all().select_related('student', 'fee_head', 'approved_by')
    serializer_class = StudentFeeWaiverSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['waiver_type', 'fee_head', 'is_active']
    search_fields = ['student__name_en', 'student__uniq_id', 'reason']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not user.institution:
            return self.queryset.none()
        return self.queryset.filter(student__institution=user.institution)

    def perform_create(self, serializer):
        serializer.save(approved_by=self.request.user)


class StudentInvoiceViewSet(TenantFinanceBaseMixin, viewsets.ModelViewSet):
    queryset = StudentInvoice.objects.all().select_related('student', 'academic_session').prefetch_related('items__fee_head')
    serializer_class = StudentInvoiceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['billing_month', 'status', 'student__student_class', 'student__branch']
    search_fields = ['invoice_number', 'student__name_en', 'student__uniq_id']

    @action(detail=False, methods=['post'], url_path='batch-generate')
    def batch_generate(self, request):
        """1-Click Automated Batch Billing Generation"""
        institution = request.user.institution
        billing_month = request.data.get('billing_month')
        due_date_str = request.data.get('due_date')
        class_id = request.data.get('class_id')
        group_id = request.data.get('group_id')
        branch_id = request.data.get('branch_id')

        if not billing_month or not due_date_str:
            return Response({"error": "Billing month and due date are required."}, status=status.HTTP_400_BAD_REQUEST)

        due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()

        result = FinanceBillingService.generate_batch_invoices(
            institution=institution,
            billing_month=billing_month,
            due_date=due_date,
            class_id=class_id,
            group_id=group_id,
            branch_id=branch_id,
            created_by=request.user
        )

        return Response({
            "message": f"Batch invoicing completed. Created {result['created_count']} invoices. (Skipped: {result['skipped_count']})",
            "created_count": result['created_count'],
            "skipped_count": result['skipped_count']
        }, status=status.HTTP_200_OK)


class MoneyReceiptViewSet(TenantFinanceBaseMixin, viewsets.ModelViewSet):
    queryset = MoneyReceipt.objects.all().select_related('student', 'invoice', 'collected_by', 'branch').prefetch_related('allocations__invoice_item__fee_head')
    serializer_class = MoneyReceiptSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['payment_method', 'status', 'payment_date', 'branch']
    search_fields = ['receipt_number', 'student__name_en', 'student__uniq_id', 'transaction_ref']

    @action(detail=False, methods=['post'], url_path='collect-pos-payment')
    def collect_pos_payment(self, request):
        """Fast Keyboard-Driven Cash Desk Collection Endpoint"""
        institution = request.user.institution
        student_id = request.data.get('student_id')
        amount_paid = request.data.get('amount_paid')
        payment_method = request.data.get('payment_method', 'CASH')
        invoice_id = request.data.get('invoice_id')
        transaction_ref = request.data.get('transaction_ref', '')
        cashier_shift = request.data.get('cashier_shift', 'Morning')
        remarks = request.data.get('remarks', '')

        if not student_id or not amount_paid:
            return Response({"error": "Student ID and Amount are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            receipt = FinanceBillingService.collect_fee_payment(
                institution=institution,
                student_id=student_id,
                amount_paid=amount_paid,
                payment_method=payment_method,
                invoice_id=invoice_id,
                transaction_ref=transaction_ref,
                collected_by=request.user,
                cashier_shift=cashier_shift,
                remarks=remarks
            )
            serializer = self.get_serializer(receipt)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='record-print')
    def record_print(self, request, pk=None):
        """Audit print count increment on thermal or multi-copy printing"""
        receipt = self.get_object()
        receipt.print_count = F('print_count') + 1
        receipt.last_printed_at = timezone.now()
        receipt.save(update_fields=['print_count', 'last_printed_at'])
        return Response({"status": "Print audit updated", "print_count": receipt.print_count + 1})


class PublicReceiptVerificationView(views.APIView):
    """Public Unauthenticated Endpoint for QR Code Receipt Verification"""
    permission_classes = [AllowAny]

    def get(self, request, receipt_number):
        token = request.query_params.get('token')
        receipt = MoneyReceipt.objects.filter(receipt_number=receipt_number).select_related('institution', 'student', 'invoice').first()
        
        if not receipt:
            return Response({
                "is_valid": False,
                "verification_status": "NOT_FOUND",
                "message": "Receipt not found in institutional records."
            }, status=status.HTTP_404_NOT_FOUND)

        is_genuine = True
        if token and receipt.qr_verification_token != token:
            is_genuine = False

        return Response({
            "is_valid": is_genuine and receipt.status == ReceiptStatus.VALID,
            "verification_status": receipt.status,
            "receipt_number": receipt.receipt_number,
            "institution_name": receipt.institution.name,
            "student_name": receipt.student.name_en or receipt.student.uniq_id,
            "student_id": receipt.student.uniq_id,
            "class_name": receipt.student.student_class.name if receipt.student.student_class else "N/A",
            "amount_paid": float(receipt.amount_paid),
            "payment_date": receipt.payment_date,
            "payment_method": receipt.payment_method,
            "transaction_ref": receipt.transaction_ref,
            "security_hash": receipt.security_hash,
            "print_count": receipt.print_count,
        }, status=status.HTTP_200_OK)


class StaffPayHeadViewSet(TenantFinanceBaseMixin, viewsets.ModelViewSet):
    queryset = StaffPayHead.objects.all().select_related('gl_account')
    serializer_class = StaffPayHeadSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['head_type', 'is_active']
    search_fields = ['name', 'code']


class StaffSalaryStructureItemViewSet(viewsets.ModelViewSet):
    queryset = StaffSalaryStructureItem.objects.all().select_related('staff', 'pay_head')
    serializer_class = StaffSalaryStructureItemSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['staff', 'pay_head', 'calculation_type', 'is_active']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not user.institution:
            return self.queryset.none()
        return self.queryset.filter(staff__institution=user.institution)


class StaffSalaryAdvanceViewSet(TenantFinanceBaseMixin, viewsets.ModelViewSet):
    queryset = StaffSalaryAdvance.objects.all().select_related('staff', 'approved_by')
    serializer_class = StaffSalaryAdvanceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'staff']
    search_fields = ['staff__employee_id', 'purpose']

    @action(detail=True, methods=['post'], url_path='disburse')
    def disburse(self, request, pk=None):
        advance = self.get_object()
        advance.status = 'DISBURSED'
        advance.approved_by = request.user
        advance.save()
        return Response({"message": "Salary advance approved and marked disbursed."})


class StaffPayrollRunViewSet(TenantFinanceBaseMixin, viewsets.ModelViewSet):
    queryset = StaffPayrollRun.objects.all().select_related('processed_by', 'voucher').prefetch_related('payslips__staff__department')
    serializer_class = StaffPayrollRunSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['payroll_month', 'status']

    @action(detail=False, methods=['post'], url_path='process-month')
    def process_month(self, request):
        institution = request.user.institution
        payroll_month = request.data.get('payroll_month')

        if not payroll_month:
            return Response({"error": "Payroll month is required (e.g. 2026-09)."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            run = FinancePayrollService.process_monthly_payroll(
                institution=institution,
                payroll_month=payroll_month,
                processed_by=request.user
            )
            serializer = self.get_serializer(run)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class StaffPayslipViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StaffPayslip.objects.all().select_related('payroll_run', 'staff__department', 'staff__user')
    serializer_class = StaffPayslipSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['payroll_run', 'staff', 'payment_status']
    search_fields = ['payslip_number', 'staff__employee_id']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated or not user.institution:
            return self.queryset.none()
        return self.queryset.filter(payroll_run__institution=user.institution)


class DepartmentBudgetViewSet(TenantFinanceBaseMixin, viewsets.ModelViewSet):
    queryset = DepartmentBudget.objects.all().select_related('department', 'branch', 'fiscal_year')
    serializer_class = DepartmentBudgetSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['department', 'branch', 'fiscal_year', 'is_active']


class FinancialStatementReportsView(views.APIView):
    """Generate Trial Balance, Profit & Loss, Balance Sheet, and Aging Dues Statements"""
    permission_classes = [IsAuthenticated]

    def get(self, request, statement_type):
        institution = request.user.institution
        if not institution:
            return Response({"error": "Institution not found."}, status=status.HTTP_400_BAD_REQUEST)

        FinanceLedgerService.ensure_default_accounts(institution)

        if statement_type == 'trial-balance':
            accounts = ChartOfAccount.objects.filter(institution=institution, is_active=True).order_by('code')
            data = []
            total_dr = Decimal('0.00')
            total_cr = Decimal('0.00')

            for acc in accounts:
                bal = acc.current_balance
                if acc.category in [AccountCategory.ASSET, AccountCategory.EXPENSE]:
                    dr = bal if bal > 0 else Decimal('0.00')
                    cr = abs(bal) if bal < 0 else Decimal('0.00')
                else:
                    cr = bal if bal > 0 else Decimal('0.00')
                    dr = abs(bal) if bal < 0 else Decimal('0.00')

                total_dr += dr
                total_cr += cr
                data.append({
                    "id": str(acc.id),
                    "code": acc.code,
                    "name": acc.name_en,
                    "category": acc.category,
                    "debit": float(dr),
                    "credit": float(cr),
                })

            return Response({
                "accounts": data,
                "total_debit": float(total_dr),
                "total_credit": float(total_cr),
                "is_balanced": total_dr == total_cr
            })

        elif statement_type == 'dues-aging':
            today = timezone.localdate()
            invoices = StudentInvoice.objects.filter(
                institution=institution,
                status__in=[InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE]
            ).select_related('student__student_class')

            aging = {
                "days_0_30": {"count": 0, "amount": 0.0},
                "days_31_60": {"count": 0, "amount": 0.0},
                "days_61_90": {"count": 0, "amount": 0.0},
                "days_90_plus": {"count": 0, "amount": 0.0},
                "total_due": 0.0
            }

            for inv in invoices:
                due_amt = float(inv.due_amount)
                days_overdue = max(0, (today - inv.due_date).days) if today > inv.due_date else 0
                aging["total_due"] += due_amt

                if days_overdue <= 30:
                    aging["days_0_30"]["count"] += 1
                    aging["days_0_30"]["amount"] += due_amt
                elif days_overdue <= 60:
                    aging["days_31_60"]["count"] += 1
                    aging["days_31_60"]["amount"] += due_amt
                elif days_overdue <= 90:
                    aging["days_61_90"]["count"] += 1
                    aging["days_61_90"]["amount"] += due_amt
                else:
                    aging["days_90_plus"]["count"] += 1
                    aging["days_90_plus"]["amount"] += due_amt

            return Response(aging)

        return Response({"error": f"Invalid statement type {statement_type}"}, status=status.HTTP_400_BAD_REQUEST)


class FinancialAuditLogViewSet(TenantFinanceBaseMixin, viewsets.ReadOnlyModelViewSet):
    queryset = FinancialAuditLog.objects.all().select_related('performed_by')
    serializer_class = FinancialAuditLogSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['entity_type', 'action']
    search_fields = ['entity_id']
