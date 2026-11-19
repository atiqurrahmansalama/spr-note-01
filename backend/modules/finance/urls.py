"""
Finance Module Routing Table.
Provides RESTful endpoints for funds, fiscal years, accounts, vouchers,
fee structures, invoices, receipts, payroll, and financial reports.
"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter

from .views import (
    FinanceDashboardKpiView,
    InstitutionalFundViewSet,
    FiscalYearViewSet,
    ChartOfAccountViewSet,
    FinancialVoucherViewSet,
    FeeHeadViewSet,
    FeeStructureViewSet,
    StudentFeeWaiverViewSet,
    StudentInvoiceViewSet,
    MoneyReceiptViewSet,
    PublicReceiptVerificationView,
    StaffPayHeadViewSet,
    StaffSalaryStructureItemViewSet,
    StaffSalaryAdvanceViewSet,
    StaffPayrollRunViewSet,
    StaffPayslipViewSet,
    DepartmentBudgetViewSet,
    FinancialStatementReportsView,
    FinancialAuditLogViewSet,
)

router = SimpleRouter()
router.register(r'funds', InstitutionalFundViewSet, basename='finance-funds')
router.register(r'fiscal-years', FiscalYearViewSet, basename='finance-fiscal-years')
router.register(r'accounts', ChartOfAccountViewSet, basename='finance-accounts')
router.register(r'vouchers', FinancialVoucherViewSet, basename='finance-vouchers')
router.register(r'fee-heads', FeeHeadViewSet, basename='finance-fee-heads')
router.register(r'fee-structures', FeeStructureViewSet, basename='finance-fee-structures')
router.register(r'waivers', StudentFeeWaiverViewSet, basename='finance-waivers')
router.register(r'invoices', StudentInvoiceViewSet, basename='finance-invoices')
router.register(r'receipts', MoneyReceiptViewSet, basename='finance-receipts')
router.register(r'pay-heads', StaffPayHeadViewSet, basename='finance-pay-heads')
router.register(r'salary-structures', StaffSalaryStructureItemViewSet, basename='finance-salary-structures')
router.register(r'salary-advances', StaffSalaryAdvanceViewSet, basename='finance-salary-advances')
router.register(r'payroll-runs', StaffPayrollRunViewSet, basename='finance-payroll-runs')
router.register(r'payslips', StaffPayslipViewSet, basename='finance-payslips')
router.register(r'budgets', DepartmentBudgetViewSet, basename='finance-budgets')
router.register(r'audit-logs', FinancialAuditLogViewSet, basename='finance-audit-logs')

urlpatterns = [
    # KPIs, financial statements & public verification
    path('kpis/', FinanceDashboardKpiView.as_view(), name='finance_kpis'),
    path('statements/<str:statement_type>/', FinancialStatementReportsView.as_view(), name='finance_statements'),
    path('receipts/verify/<str:receipt_number>/', PublicReceiptVerificationView.as_view(), name='finance_receipt_verify'),
    
    # ViewSet routes
    path('', include(router.urls)),
]
