from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import AcademicInstitution, ApprovalRequest
from core.permissions import HasSectionAccess, IsAdminUserRole
from core.serializers.approvals import (
    ApprovalDecisionSerializer,
    ApprovalRequestDetailSerializer,
    ApprovalRequestListSerializer,
)
from core.services import get_scoped_tenant_id
from core.services.approval_engine import ApprovalService


class ApprovalRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Enterprise Unified Approval Request ViewSet
    Handles queue listings, filtering, domain summaries, and approve/reject actions.
    """

    permission_classes = [IsAuthenticated, IsAdminUserRole, HasSectionAccess]
    required_section_key = "staff_management"

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ApprovalRequestDetailSerializer
        return ApprovalRequestListSerializer

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return ApprovalRequest.objects.none()

        qs = ApprovalRequest.objects.select_related(
            "institution", "submitted_by", "reviewed_by"
        ).prefetch_related("action_logs")

        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            qs = qs.filter(institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, "user_type", "").upper() == "SUPER_ADMIN"):
            target_inst_id = user.institution_id
            if not target_inst_id and hasattr(user, "staff_profile") and user.staff_profile:
                target_inst_id = user.staff_profile.institution_id
            if not target_inst_id:
                return ApprovalRequest.objects.none()
            qs = qs.filter(institution_id=target_inst_id)

        # Filters
        domain = self.request.query_params.get("domain")
        if domain and domain != "ALL":
            qs = qs.filter(domain=domain)

        status_param = self.request.query_params.get("status")
        if status_param and status_param != "ALL":
            qs = qs.filter(status=status_param)

        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(applicant_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone_number__icontains=search)
                | Q(tracking_code__icontains=search)
            )

        return qs.order_by("-created_at")

    def _resolve_institution(self) -> AcademicInstitution:
        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            inst = AcademicInstitution.objects.filter(id=tenant_id).first()
            if inst:
                return inst
        if self.request.user.institution:
            return self.request.user.institution
        return AcademicInstitution.objects.first()

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """Returns pending review counts aggregated by domain."""
        inst = self._resolve_institution()
        if not inst:
            return Response({"total_pending": 0, "by_domain": {}})
        counts = ApprovalService.get_summary_counts(inst)
        return Response(counts)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        """Approve an individual request with optional overrides and remarks."""
        serializer = ApprovalDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = ApprovalService.approve_request(
            approval_request_id=pk,
            reviewer=request.user,
            overrides=serializer.validated_data.get("overrides"),
            admin_remarks=serializer.validated_data.get("admin_remarks", ""),
            effective_date=serializer.validated_data.get("effective_date"),
        )
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        """Reject an individual request with reason and remarks."""
        serializer = ApprovalDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = ApprovalService.reject_request(
            approval_request_id=pk,
            reviewer=request.user,
            reason=serializer.validated_data.get("rejection_reason", ""),
            admin_remarks=serializer.validated_data.get("admin_remarks", ""),
        )
        return Response(result, status=status.HTTP_200_OK)

