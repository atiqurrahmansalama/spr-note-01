from rest_framework import serializers
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
)
from core.models.students import Student
from core.models.staff import StaffProfile


class InstitutionalFundSerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionalFund
        fields = '__all__'


class FiscalYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = FiscalYear
        fields = '__all__'


class ChartOfAccountSerializer(serializers.ModelSerializer):
    sub_accounts_count = serializers.SerializerMethodField()
    parent_account_name = serializers.CharField(source='parent_account.name_en', read_only=True)
    fund_name = serializers.CharField(source='fund.name', read_only=True)

    class Meta:
        model = ChartOfAccount
        fields = '__all__'

    def get_sub_accounts_count(self, obj):
        return obj.sub_accounts.count()


class VoucherEntrySerializer(serializers.ModelSerializer):
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name_en', read_only=True)
    fund_name = serializers.CharField(source='fund.name', read_only=True)

    class Meta:
        model = VoucherEntry
        fields = '__all__'


class FinancialVoucherSerializer(serializers.ModelSerializer):
    entries = VoucherEntrySerializer(many=True, read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = FinancialVoucher
        fields = '__all__'


class FeeHeadSerializer(serializers.ModelSerializer):
    gl_account_name = serializers.CharField(source='gl_account.name_en', read_only=True)

    class Meta:
        model = FeeHead
        fields = '__all__'


class FeeStructureSerializer(serializers.ModelSerializer):
    fee_head_name = serializers.CharField(source='fee_head.name', read_only=True)
    class_name = serializers.CharField(source='student_class.name', read_only=True)
    group_name = serializers.CharField(source='student_group.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = FeeStructure
        fields = '__all__'


class StudentFeeWaiverSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name_en', read_only=True)
    student_uniq_id = serializers.CharField(source='student.uniq_id', read_only=True)
    fee_head_name = serializers.CharField(source='fee_head.name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)

    class Meta:
        model = StudentFeeWaiver
        fields = '__all__'


class StudentInvoiceItemSerializer(serializers.ModelSerializer):
    fee_head_name = serializers.CharField(source='fee_head.name', read_only=True)
    fee_head_code = serializers.CharField(source='fee_head.code', read_only=True)

    class Meta:
        model = StudentInvoiceItem
        fields = '__all__'


class StudentInvoiceSerializer(serializers.ModelSerializer):
    items = StudentInvoiceItemSerializer(many=True, read_only=True)
    student_name = serializers.CharField(source='student.name_en', read_only=True)
    student_uniq_id = serializers.CharField(source='student.uniq_id', read_only=True)
    student_roll = serializers.IntegerField(source='student.roll_number', read_only=True)
    class_name = serializers.CharField(source='student.student_class.name', read_only=True)
    group_name = serializers.CharField(source='student.student_group.name', read_only=True)
    branch_name = serializers.CharField(source='student.branch.name', read_only=True)

    class Meta:
        model = StudentInvoice
        fields = '__all__'


class ReceiptItemAllocationSerializer(serializers.ModelSerializer):
    fee_head_name = serializers.CharField(source='invoice_item.fee_head.name', read_only=True)

    class Meta:
        model = ReceiptItemAllocation
        fields = '__all__'


class MoneyReceiptSerializer(serializers.ModelSerializer):
    allocations = ReceiptItemAllocationSerializer(many=True, read_only=True)
    student_name = serializers.CharField(source='student.name_en', read_only=True)
    student_uniq_id = serializers.CharField(source='student.uniq_id', read_only=True)
    student_roll = serializers.IntegerField(source='student.roll_number', read_only=True)
    class_name = serializers.CharField(source='student.student_class.name', read_only=True)
    group_name = serializers.CharField(source='student.student_group.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    collected_by_name = serializers.CharField(source='collected_by.get_full_name', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)

    class Meta:
        model = MoneyReceipt
        fields = '__all__'


class StaffPayHeadSerializer(serializers.ModelSerializer):
    gl_account_name = serializers.CharField(source='gl_account.name_en', read_only=True)

    class Meta:
        model = StaffPayHead
        fields = '__all__'


class StaffSalaryStructureItemSerializer(serializers.ModelSerializer):
    pay_head_name = serializers.CharField(source='pay_head.name', read_only=True)
    pay_head_type = serializers.CharField(source='pay_head.head_type', read_only=True)

    class Meta:
        model = StaffSalaryStructureItem
        fields = '__all__'


class StaffSalaryAdvanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.user.get_full_name', read_only=True)
    staff_employee_id = serializers.CharField(source='staff.employee_id', read_only=True)
    designation = serializers.CharField(source='staff.designation', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)

    class Meta:
        model = StaffSalaryAdvance
        fields = '__all__'


class StaffPayslipSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.user.get_full_name', read_only=True)
    staff_employee_id = serializers.CharField(source='staff.employee_id', read_only=True)
    designation = serializers.CharField(source='staff.designation', read_only=True)
    department_name = serializers.CharField(source='staff.department.name', read_only=True)

    class Meta:
        model = StaffPayslip
        fields = '__all__'


class StaffPayrollRunSerializer(serializers.ModelSerializer):
    payslips = StaffPayslipSerializer(many=True, read_only=True)
    processed_by_name = serializers.CharField(source='processed_by.get_full_name', read_only=True)
    voucher_number = serializers.CharField(source='voucher.voucher_number', read_only=True)

    class Meta:
        model = StaffPayrollRun
        fields = '__all__'


class DepartmentBudgetSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    fiscal_year_name = serializers.CharField(source='fiscal_year.name', read_only=True)
    remaining_budget = serializers.SerializerMethodField()

    class Meta:
        model = DepartmentBudget
        fields = '__all__'

    def get_remaining_budget(self, obj):
        return float(obj.allocated_amount - obj.spent_amount)


class FinancialAuditLogSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)

    class Meta:
        model = FinancialAuditLog
        fields = '__all__'
