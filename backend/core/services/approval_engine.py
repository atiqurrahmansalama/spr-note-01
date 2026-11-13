"""
Enterprise Unified Approval Workflow Engine
===========================================
Provides a pluggable, tenant-isolated, transactional engine for submitting,
reviewing, overriding, and provisioning requests across domains:
- STAFF_ONBOARDING
- STUDENT_ADMISSION
- STAFF_LEAVE
- FINANCE_REQUEST
"""

import json
import secrets
import uuid
from abc import ABC, abstractmethod
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional, Type

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction
from django.db.models import Count, F, Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from core.models import (
    AcademicDepartment,
    AcademicInstitution,
    ApprovalActionLog,
    ApprovalRequest,
    GeneralStaffDetail,
    StaffOnboardingToken,
    StaffProfile,
    TeacherDetail,
    UserRole,
)

User = get_user_model()


class BaseApprovalHandler(ABC):
    """Abstract domain adapter interface registered with ApprovalService."""

    domain: str = ""
    target_model: str = ""

    @abstractmethod
    def validate_submission(
        self,
        institution: AcademicInstitution,
        payload: Dict[str, Any],
        token_obj: Optional[Any] = None,
    ) -> None:
        """Raise ValidationError if payload violates domain rules or creates duplicates."""

    @abstractmethod
    def build_summary_meta(self, payload: Dict[str, Any], token_obj: Optional[Any] = None) -> Dict[str, Any]:
        """Return lightweight display dictionary for table rows and review cards."""

    @abstractmethod
    def on_approve(
        self,
        approval_request: ApprovalRequest,
        reviewer: Any,
        overrides: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Atomically provision or mutate domain records upon approval."""

    def on_reject(
        self,
        approval_request: ApprovalRequest,
        reviewer: Any,
        reason: str = "",
    ) -> None:
        """Optional hook for cleanup or notifications when a request is rejected."""
        return None


class StaffOnboardingApprovalHandler(BaseApprovalHandler):
    """
    Domain handler for Staff & Faculty Onboarding.
    Provisions User, Employee ID, StaffProfile, and role-specific Teacher/General detail.
    """

    domain = "STAFF_ONBOARDING"
    target_model = "StaffProfile"

    def validate_submission(
        self,
        institution: AcademicInstitution,
        payload: Dict[str, Any],
        token_obj: Optional[StaffOnboardingToken] = None,
    ) -> None:
        email = str(payload.get("email") or "").strip()
        phone = str(payload.get("phone_number") or "").strip()

        if not email and not phone and not payload.get("user_id"):
            raise ValidationError({"error": "Either email, phone number, or user account is required."})

        validation_errors: Dict[str, str] = {}

        # 1. Check duplicate against existing active StaffProfile records strictly within THIS institution
        # Duplicate check is strictly driven by phone_number and email (never leaks employee IDs or other institutions)
        if phone:
            phone_user = User.objects.filter(phone_number=phone).first()
            if phone_user:
                sp_phone = (
                    StaffProfile.objects.filter(user=phone_user, institution=institution, is_deleted=False)
                    .first()
                )
                if sp_phone:
                    validation_errors["phone_number"] = (
                        "This mobile number is already registered for an active staff member in this institution."
                    )

        if email:
            email_user = User.objects.filter(email__iexact=email).first()
            if email_user:
                sp_email = (
                    StaffProfile.objects.filter(user=email_user, institution=institution, is_deleted=False)
                    .first()
                )
                if sp_email:
                    validation_errors["email"] = (
                        "This email address is already registered for an active staff member in this institution."
                    )

        # 2. Check duplicate against active pending onboarding requests in THIS institution
        if phone and "phone_number" not in validation_errors:
            pending_phone_req = ApprovalRequest.objects.filter(
                institution=institution,
                domain="STAFF_ONBOARDING",
                status__in=["PENDING", "IN_REVIEW"],
                phone_number=phone,
            ).first()
            if pending_phone_req:
                validation_errors["phone_number"] = (
                    "An onboarding application with this mobile number is already pending administrative review."
                )

        if email and "email" not in validation_errors:
            pending_email_req = ApprovalRequest.objects.filter(
                institution=institution,
                domain="STAFF_ONBOARDING",
                status__in=["PENDING", "IN_REVIEW"],
                email__iexact=email,
            ).first()
            if pending_email_req:
                validation_errors["email"] = (
                    "An onboarding application with this email address is already pending administrative review."
                )

        if validation_errors:
            raise ValidationError(validation_errors)

        if token_obj:
            permitted_designations = list(token_obj.allowed_designations or [])
            if not permitted_designations and token_obj.designation:
                permitted_designations = [token_obj.designation]

            submitted_designation = str(payload.get("designation") or "").strip()
            if permitted_designations:
                permitted_lower = {str(d).strip().lower() for d in permitted_designations if d}
                if not submitted_designation or submitted_designation in ('Faculty Member', 'Staff'):
                    payload["designation"] = permitted_designations[0]
                elif submitted_designation.lower() not in permitted_lower:
                    raise ValidationError(
                        {"designation": "Selected designation is not permitted for this onboarding link."}
                    )
            elif not submitted_designation:
                payload["designation"] = token_obj.designation or "Faculty Member"

    def build_summary_meta(self, payload: Dict[str, Any], token_obj: Optional[Any] = None) -> Dict[str, Any]:
        return {
            "designation": payload.get("designation") or (token_obj.designation if token_obj else ""),
            "staff_type": payload.get("staff_type") or (token_obj.staff_type if token_obj else "TEACHING"),
            "joining_date": payload.get("joining_date") or "",
            "department_id": payload.get("department") or "",
            "photo_url": payload.get("photo_url") or "",
            "name_i18n": payload.get("name_i18n") or {},
        }

    def on_approve(
        self,
        approval_request: ApprovalRequest,
        reviewer: Any,
        overrides: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        from core.services import StaffOnboardingService

        data = {**(approval_request.payload or {}), **(overrides or {})}
        institution = approval_request.institution

        token_obj = None
        if approval_request.source_token_type == "StaffOnboardingToken" and approval_request.source_token_id:
            token_obj = StaffOnboardingToken.objects.filter(id=approval_request.source_token_id).first()

        dept = None
        dept_id = data.get("department") or (
            str(token_obj.department.id) if token_obj and token_obj.department else None
        )
        if dept_id:
            dept = AcademicDepartment.objects.filter(id=dept_id, institution=institution).first()

        # 1. Resolve or Create User
        user = None
        email = str(data.get("email") or "").strip()
        phone = str(data.get("phone_number") or "").strip() or f"staff_{uuid.uuid4().hex[:8]}"

        if data.get("user_id"):
            matched_user = User.objects.filter(id=data["user_id"]).first()
            if matched_user:
                u_phone = (matched_user.phone_number or "").strip()
                u_email = (matched_user.email or "").strip().lower()
                submitted_raw_phone = str(data.get("phone_number") or "").strip()
                phone_matches = bool(submitted_raw_phone and u_phone == submitted_raw_phone)
                email_matches = bool(email and u_email == email.lower())
                if phone_matches or email_matches or (not submitted_raw_phone and not email):
                    user = matched_user
        elif approval_request.submitted_by and approval_request.source_mode == "PUBLIC_PORTAL":
            # Only bind submitted_by if it wasn't an admin submitting on behalf of someone else
            candidate_email = str(data.get("email") or "").strip().lower()
            submitter_email = str(getattr(approval_request.submitted_by, "email", "") or "").strip().lower()
            if candidate_email and submitter_email and candidate_email == submitter_email:
                user = approval_request.submitted_by

        if not user:
            user = User.objects.filter(
                Q(phone_number=phone) | (Q(email__iexact=email) & ~Q(email=""))
            ).first()

        if not user:
            temp_pwd = secrets.token_urlsafe(8)
            full_name = str(data.get("name", "") or "").strip()
            name_parts = full_name.split(None, 1) if full_name else []
            user = User.objects.create_user(
                phone_number=phone,
                password=temp_pwd,
                name=full_name,
                first_name=name_parts[0] if len(name_parts) > 0 else "",
                last_name=name_parts[1] if len(name_parts) > 1 else "",
                name_bn=data.get("bangla_name", "") or None,
                email=email,
                institution=institution,
                user_type="TEACHER" if data.get("staff_type") == "TEACHING" else "STAFF",
                is_staff=True,
            )

        existing_sp = (
            StaffProfile.objects.filter(user=user, institution=institution, is_deleted=False)
            .first()
        )
        if existing_sp:
            err_map: Dict[str, str] = {}
            if phone:
                err_map["phone_number"] = (
                    "This mobile number is already registered for an active staff member in this institution."
                )
            if email:
                err_map["email"] = (
                    "This email address is already registered for an active staff member in this institution."
                )
            if not err_map:
                err_map["error"] = "An active staff profile already exists for this user in this institution."
            raise ValidationError(err_map)

        staff_type = data.get("staff_type") or (token_obj.staff_type if token_obj else "TEACHING")

        # Sync user attributes safely (updated name always takes precedence)
        user_update_fields = []
        submitted_name = str(data.get("name") or "").strip()
        submitted_name_bn = str(data.get("bangla_name") or "").strip()
        submitted_phone = str(data.get("phone_number") or "").strip()
        submitted_email = str(data.get("email") or "").strip()
        submitted_photo = str(data.get("photo_url") or "").strip()

        if not user.institution_id and institution:
            user.institution = institution
            user_update_fields.append("institution")

        if submitted_name and user.name != submitted_name:
            user.name = submitted_name
            user_update_fields.append("name")
            parts = submitted_name.split(None, 1)
            user.first_name = parts[0]
            user_update_fields.append("first_name")
            user.last_name = parts[1] if len(parts) > 1 else ""
            user_update_fields.append("last_name")

        if submitted_name_bn and user.name_bn != submitted_name_bn:
            user.name_bn = submitted_name_bn
            user_update_fields.append("name_bn")

        current_phone = (user.phone_number or "").strip()
        if submitted_phone and (
            not current_phone or current_phone.startswith("g_") or current_phone.startswith("user_")
        ):
            if not User.objects.filter(phone_number=submitted_phone).exclude(pk=user.pk).exists():
                user.phone_number = submitted_phone
                user_update_fields.append("phone_number")

        if submitted_email and not (user.email or "").strip():
            if not User.objects.filter(email__iexact=submitted_email).exclude(pk=user.pk).exists():
                user.email = submitted_email
                user_update_fields.append("email")

        if submitted_photo.startswith(("http://", "https://")) and not (user.avatar_url or "").strip():
            user.avatar_url = submitted_photo
            user_update_fields.append("avatar_url")

        protected_roles = {"SUPER_ADMIN", "ADMIN", "PRINCIPAL", "DIRECTOR", "HEADMASTER"}
        current_role_code = (getattr(getattr(user, "role", None), "code", "") or "").strip().upper()
        current_user_type = (user.user_type or "").strip().upper()
        if (
            not user.is_superuser
            and current_role_code not in protected_roles
            and current_user_type not in protected_roles
            and current_user_type in ("", "GUARDIAN", "USER", "STUDENT")
        ):
            target_role_code = "TEACHER" if staff_type == "TEACHING" else "STAFF"
            target_role_name = "Teacher" if staff_type == "TEACHING" else "Staff"
            target_role, _ = UserRole.objects.get_or_create(
                code=target_role_code,
                defaults={"name": target_role_name, "is_system_role": False},
            )
            user.user_type = target_role_code
            user.role = target_role
            user.is_staff = True
            user_update_fields.extend(["user_type", "role", "is_staff"])

        if user_update_fields:
            user.save(update_fields=list(dict.fromkeys(user_update_fields)))

        emp_id = StaffOnboardingService.generate_employee_id(institution, staff_type)

        base_salary_raw = data.get("base_salary")
        try:
            base_salary = Decimal(str(base_salary_raw)) if base_salary_raw not in (None, "") else Decimal("0.00")
        except Exception:
            base_salary = Decimal("0.00")

        staff_profile = StaffProfile.objects.create(
            user=user,
            institution=institution,
            employee_id=emp_id,
            staff_type=staff_type,
            designation=data.get("designation") or (token_obj.designation if token_obj else "Faculty Member"),
            rank_order=(
                data.get("rank_order", 99)
                if data.get("rank_order") is not None
                else (token_obj.rank_order if token_obj else 99)
            ),
            department=dept,
            employment_status=data.get("employment_status", "PERMANENT"),
            joining_date=data.get("joining_date") or timezone.localdate(),
            nid_no=data.get("nid_no", ""),
            blood_group=data.get("blood_group", ""),
            emergency_contact=data.get("emergency_contact", ""),
            address=data.get("address", ""),
            division=data.get("division", ""),
            district=data.get("district", ""),
            upazila_thana=data.get("upazila_thana", ""),
            postal_code=data.get("postal_code", ""),
            salary_type=data.get("salary_type", "MONTHLY_FIXED"),
            base_salary=base_salary,
            bank_name=data.get("bank_name", ""),
            bank_account_no=data.get("bank_account_no", ""),
            mobile_banking_no=data.get("mobile_banking_no", ""),
            is_active=True,
        )

        if staff_type == "TEACHING":
            TeacherDetail.objects.create(
                staff=staff_profile,
                highest_degree=data.get("highest_degree", ""),
                specialization=data.get("specialization", ""),
                max_daily_periods=data.get("max_daily_periods", 4),
            )
        else:
            GeneralStaffDetail.objects.create(
                staff=staff_profile,
                assigned_zone=data.get("division", "") or "Campus Main",
            )

        if token_obj:
            token_obj.applied_count = F("applied_count") + 1
            token_obj.save(update_fields=["applied_count", "updated_at"])

        submitted_name = (
            str(data.get("name") or "").strip()
            or str(data.get("name_en") or "").strip()
            or str(getattr(user, "name", "") or "").strip()
        )
        submitted_name_bn = (
            str(data.get("bangla_name") or "").strip()
            or str(getattr(user, "name_bn", "") or "").strip()
        )

        return {
            "target_model": "StaffProfile",
            "target_object_id": str(staff_profile.id),
            "employee_id": emp_id,
            "staff": {
                "id": str(staff_profile.id),
                "employee_id": emp_id,
                "tracking_code": approval_request.tracking_code,
                "name": submitted_name,
                "bangla_name": submitted_name_bn,
                "name_i18n": data.get("name_i18n", {}),
                "designation": staff_profile.designation,
                "rank_order": staff_profile.rank_order,
                "staff_type": staff_profile.staff_type,
                "institution_name": institution.name,
                "department_name": dept.name if dept else None,
                "joining_date": str(staff_profile.joining_date),
                "user_id": str(user.id) if user else None,
                "is_pending_review": False,
            },
        }


class StudentAdmissionApprovalHandler(BaseApprovalHandler):
    """
    Domain adapter for Student Admission & Enrollment.
    Validates admission submission, creates summary meta, and upon approval provisions
    Student, Address, and StudentGuardian records.
    """

    domain = "STUDENT_ADMISSION"
    target_model = "Student"

    def validate_submission(
        self,
        institution: AcademicInstitution,
        payload: Dict[str, Any],
        token_obj: Optional[Any] = None,
    ) -> None:
        name = str(payload.get("name") or payload.get("name_en") or "").strip()
        if not name:
            raise ValidationError({"name": "Student name is required for admission."})

    def build_summary_meta(self, payload: Dict[str, Any], token_obj: Optional[Any] = None) -> Dict[str, Any]:
        return {
            "applicant_name": payload.get("name") or payload.get("name_en") or "Unnamed Student",
            "bangla_name": payload.get("bangla_name", ""),
            "gender": payload.get("gender", "MALE"),
            "blood_group": payload.get("blood_group", ""),
            "target_class": payload.get("class_name") or payload.get("target_class_name") or "General",
            "target_group": payload.get("group_name") or payload.get("target_group_name") or "",
            "session_year": payload.get("session_year") or (token_obj.session_year if token_obj else ""),
            "guardian_name": payload.get("primary_guardian_name") or payload.get("father_name") or "",
            "guardian_phone": payload.get("primary_guardian_phone") or payload.get("guardian_phone") or payload.get("father_phone") or "",
            "admission_mode": payload.get("admission_mode", "ONLINE"),
        }

    def on_approve(
        self,
        approval_request: ApprovalRequest,
        reviewer: Any,
        overrides: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        from core.models import Student, Address, StudentGuardian, GuardianProfile

        data = {**approval_request.payload, **(overrides or {})}
        inst = approval_request.institution

        # Address handling
        present_address_data = data.get("present_address") or {}
        permanent_address_data = data.get("permanent_address") or {}

        present_addr = None
        if present_address_data and any(present_address_data.values()):
            present_addr = Address.objects.create(
                address_type="PRESENT",
                street_address=present_address_data.get("street_address", ""),
                post_office=present_address_data.get("post_office", ""),
                post_code=present_address_data.get("post_code", ""),
                thana_or_upazila=present_address_data.get("thana_or_upazila", ""),
                district=present_address_data.get("district", ""),
                division=present_address_data.get("division", ""),
                created_by=reviewer,
            )

        perm_addr = None
        if permanent_address_data and any(permanent_address_data.values()):
            perm_addr = Address.objects.create(
                address_type="PERMANENT",
                street_address=permanent_address_data.get("perm_street") or permanent_address_data.get("street_address", ""),
                post_office=permanent_address_data.get("perm_post_office") or permanent_address_data.get("post_office", ""),
                post_code=permanent_address_data.get("perm_post_code") or permanent_address_data.get("post_code", ""),
                thana_or_upazila=permanent_address_data.get("perm_thana") or permanent_address_data.get("thana_or_upazila", ""),
                district=permanent_address_data.get("perm_district") or permanent_address_data.get("district", ""),
                division=permanent_address_data.get("perm_division") or permanent_address_data.get("division", ""),
                created_by=reviewer,
            )

        student_name = (data.get("name") or data.get("name_en") or "").strip()
        student_class_id = data.get("student_class_id") or data.get("target_class_id")
        student_group_id = data.get("student_group_id") or data.get("target_group_id")
        section_id = data.get("section_id") or data.get("student_section_id")

        student = Student.objects.create(
            institution=inst,
            name=student_name,
            name_en=student_name,
            bangla_name=data.get("bangla_name", "").strip(),
            gender=data.get("gender", "MALE"),
            dob=data.get("dob") or None,
            blood_group=data.get("blood_group", ""),
            birth_certificate_no=data.get("birth_certificate_no", ""),
            nid_no=data.get("nid_no", ""),
            student_class_id=student_class_id,
            student_group_id=student_group_id,
            section_id=section_id,
            present_address=present_addr,
            permanent_address=perm_addr,
            admission_date=approval_request.effective_date or timezone.now().date(),
            admission_mode=data.get("admission_mode", "FULL"),
            status="Active",
            created_by=reviewer or approval_request.submitted_by,
        )

        # Create Guardian
        guardian_data = data.get("guardian") or data
        StudentGuardian.objects.create(
            student=student,
            father_name=guardian_data.get("father_name", ""),
            father_phone=guardian_data.get("father_phone", ""),
            father_occupation=guardian_data.get("father_occupation", ""),
            mother_name=guardian_data.get("mother_name", ""),
            mother_phone=guardian_data.get("mother_phone", ""),
            mother_occupation=guardian_data.get("mother_occupation", ""),
            primary_guardian_name=guardian_data.get("primary_guardian_name", "") or guardian_data.get("father_name", ""),
            primary_guardian_phone=guardian_data.get("primary_guardian_phone") or guardian_data.get("guardian_phone", "") or guardian_data.get("father_phone", ""),
            guardian_relation=guardian_data.get("guardian_relation", "Father"),
            guardian_nid=guardian_data.get("guardian_nid", ""),
            emergency_contact_phone=guardian_data.get("emergency_contact_phone", "") or guardian_data.get("guardian_phone", ""),
            created_by=reviewer or approval_request.submitted_by,
        )

        return {
            "target_model": "Student",
            "target_object_id": str(student.id),
            "summary": {
                "student_id": student.id,
                "uniq_id": student.uniq_id,
                "name": student.name_en or student.name,
                "bangla_name": student.bangla_name,
                "status": student.status,
                "admission_date": str(student.admission_date),
            },
        }


class ApprovalService:
    """Central Orchestrator for Domain-Agnostic Approval Workflows."""

    _handlers: Dict[str, Type[BaseApprovalHandler]] = {
        "STAFF_ONBOARDING": StaffOnboardingApprovalHandler,
        "STUDENT_ADMISSION": StudentAdmissionApprovalHandler,
    }

    @classmethod
    def register_handler(cls, domain: str, handler_cls: Type[BaseApprovalHandler]) -> None:
        cls._handlers[domain] = handler_cls

    @classmethod
    def get_handler(cls, domain: str) -> BaseApprovalHandler:
        handler_cls = cls._handlers.get(domain)
        if not handler_cls:
            raise ValidationError({"domain": f"No approval handler registered for domain '{domain}'."})
        return handler_cls()

    @classmethod
    def _generate_tracking_code(cls, domain: str) -> str:
        year = timezone.now().year
        prefix_map = {
            "STAFF_ONBOARDING": "STF",
            "STUDENT_ADMISSION": "STD",
            "STAFF_LEAVE": "LVE",
            "FINANCE_REQUEST": "FIN",
        }
        code_prefix = prefix_map.get(domain, "APR")
        random_hex = uuid.uuid4().hex[:6].upper()
        return f"APR-{code_prefix}-{year}-{random_hex}"

    @classmethod
    def _sanitize_json(cls, data: Any) -> Any:
        """Converts date, datetime, Decimal, and UUID objects into pure JSON-safe primitives."""
        if data is None:
            return None
        return json.loads(json.dumps(data, cls=DjangoJSONEncoder))

    @classmethod
    @transaction.atomic
    def submit_request(
        cls,
        *,
        institution: AcademicInstitution,
        domain: str,
        payload: Dict[str, Any],
        submitted_by: Optional[Any] = None,
        source_mode: str = "ADMIN_QUICK",
        form_mode: str = "QUICK",
        source_token_type: Optional[str] = None,
        source_token_id: Optional[str] = None,
        token_obj: Optional[Any] = None,
        auto_approve: bool = False,
        effective_date: Optional[Any] = None,
    ) -> Dict[str, Any]:
        handler = cls.get_handler(domain)
        clean_payload = cls._sanitize_json(payload)
        handler.validate_submission(institution, clean_payload, token_obj=token_obj)

        summary_meta = cls._sanitize_json(handler.build_summary_meta(clean_payload, token_obj=token_obj))
        tracking_code = cls._generate_tracking_code(domain)

        req = ApprovalRequest.objects.create(
            tracking_code=tracking_code,
            institution=institution,
            domain=domain,
            source_mode=source_mode,
            form_mode=form_mode,
            status="PENDING",
            applicant_name=str(clean_payload.get("name") or "").strip()[:255],
            email=str(clean_payload.get("email") or "").strip()[:255],
            phone_number=str(clean_payload.get("phone_number") or "").strip()[:64],
            summary_meta=summary_meta,
            payload=clean_payload,
            source_token_type=source_token_type,
            source_token_id=str(source_token_id) if source_token_id else None,
            submitted_by=submitted_by if getattr(submitted_by, "is_authenticated", False) else None,
            effective_date=effective_date,
        )

        ApprovalActionLog.objects.create(
            request=req,
            actor=req.submitted_by,
            action="SUBMITTED",
            from_status="",
            to_status="PENDING",
            notes=f"Submitted via {source_mode} ({form_mode})",
        )

        if auto_approve:
            return cls.approve_request(
                approval_request_id=req.id,
                reviewer=req.submitted_by,
                admin_remarks="Auto-approved by system policy",
            )

        dept_name = None
        dept_id = clean_payload.get("department") or (
            str(token_obj.department.id) if token_obj and token_obj.department else None
        )
        if dept_id:
            dept_obj = AcademicDepartment.objects.filter(id=dept_id, institution=institution).first()
            if dept_obj:
                dept_name = dept_obj.name

        submitted_name = (
            str(clean_payload.get("name") or "").strip()
            or str(clean_payload.get("name_en") or "").strip()
            or req.applicant_name
        )

        return {
            "status": "pending",
            "approval_status": req.status,
            "approval_request_id": str(req.id),
            "tracking_code": req.tracking_code,
            "employee_id": req.tracking_code,
            "message": "Your application has been submitted and is pending administrative review.",
            "staff": {
                "id": str(req.id),
                "employee_id": req.tracking_code,
                "tracking_code": req.tracking_code,
                "name": submitted_name,
                "bangla_name": clean_payload.get("bangla_name", ""),
                "name_i18n": clean_payload.get("name_i18n", {}),
                "designation": clean_payload.get("designation") or (token_obj.designation if token_obj else "Faculty Member"),
                "rank_order": clean_payload.get("rank_order") or (token_obj.rank_order if token_obj else 99),
                "staff_type": clean_payload.get("staff_type") or (token_obj.staff_type if token_obj else "TEACHING"),
                "institution_name": institution.name,
                "department_name": dept_name,
                "joining_date": str(clean_payload.get("joining_date") or timezone.localdate()),
                "is_pending_review": True,
            },
        }

    @classmethod
    @transaction.atomic
    def approve_request(
        cls,
        *,
        approval_request_id: Any,
        reviewer: Optional[Any] = None,
        overrides: Optional[Dict[str, Any]] = None,
        admin_remarks: str = "",
        effective_date: Optional[Any] = None,
    ) -> Dict[str, Any]:
        req = ApprovalRequest.objects.select_for_update().filter(id=approval_request_id).first()
        if not req:
            raise ValidationError({"error": "Approval request not found."})

        if req.status not in ("PENDING", "IN_REVIEW", "CHANGES_REQUESTED"):
            raise ValidationError({"error": f"Request is already '{req.status}' and cannot be approved again."})

        prev_status = req.status
        handler = cls.get_handler(req.domain)

        # Check if implementation is deferred to a future date
        today = timezone.localdate()
        parsed_eff_date = effective_date or req.effective_date
        if isinstance(parsed_eff_date, str) and parsed_eff_date.strip():
            parsed_eff_date = datetime.strptime(parsed_eff_date.strip(), "%Y-%m-%d").date()

        if parsed_eff_date and parsed_eff_date > today:
            req.status = "SCHEDULED"
            req.effective_date = parsed_eff_date
            req.reviewer_overrides = overrides or {}
            req.reviewed_by = reviewer if getattr(reviewer, "is_authenticated", False) else None
            req.reviewed_at = timezone.now()
            req.admin_remarks = admin_remarks
            req.save()

            ApprovalActionLog.objects.create(
                request=req,
                actor=req.reviewed_by,
                action="SCHEDULED",
                from_status=prev_status,
                to_status="SCHEDULED",
                notes=admin_remarks or f"Scheduled for implementation on {parsed_eff_date}",
                metadata={"overrides": overrides or {}, "effective_date": str(parsed_eff_date)},
            )
            return {
                "status": "scheduled",
                "approval_status": req.status,
                "approval_request_id": str(req.id),
                "tracking_code": req.tracking_code,
                "effective_date": str(parsed_eff_date),
                "message": f"Request approved and scheduled for implementation on {parsed_eff_date}.",
            }

        # Immediate Execution
        provision_result = handler.on_approve(req, reviewer, overrides=overrides)

        req.status = "APPROVED"
        req.reviewer_overrides = overrides or {}
        req.reviewed_by = reviewer if getattr(reviewer, "is_authenticated", False) else None
        req.reviewed_at = timezone.now()
        req.admin_remarks = admin_remarks
        req.target_model = provision_result.get("target_model", handler.target_model)
        req.target_object_id = str(provision_result.get("target_object_id", ""))
        req.save()

        ApprovalActionLog.objects.create(
            request=req,
            actor=req.reviewed_by,
            action="APPROVED",
            from_status=prev_status,
            to_status="APPROVED",
            notes=admin_remarks or "Approved and provisioned",
            metadata={"overrides": overrides or {}, "target_id": req.target_object_id},
        )

        return {
            "status": "success",
            "approval_status": req.status,
            "approval_request_id": str(req.id),
            "tracking_code": req.tracking_code,
            **provision_result,
        }

    @classmethod
    @transaction.atomic
    def reject_request(
        cls,
        *,
        approval_request_id: Any,
        reviewer: Optional[Any] = None,
        reason: str = "",
        admin_remarks: str = "",
    ) -> Dict[str, Any]:
        req = ApprovalRequest.objects.select_for_update().filter(id=approval_request_id).first()
        if not req:
            raise ValidationError({"error": "Approval request not found."})

        if req.status in ("APPROVED", "REJECTED", "REVOKED"):
            raise ValidationError({"error": f"Request is already '{req.status}'."})

        prev_status = req.status
        handler = cls.get_handler(req.domain)
        handler.on_reject(req, reviewer, reason=reason)

        req.status = "REJECTED"
        req.reviewed_by = reviewer if getattr(reviewer, "is_authenticated", False) else None
        req.reviewed_at = timezone.now()
        req.rejection_reason = reason
        req.admin_remarks = admin_remarks
        req.save()

        ApprovalActionLog.objects.create(
            request=req,
            actor=req.reviewed_by,
            action="REJECTED",
            from_status=prev_status,
            to_status="REJECTED",
            notes=reason or admin_remarks or "Request rejected",
        )

        return {
            "status": "rejected",
            "approval_status": req.status,
            "approval_request_id": str(req.id),
            "tracking_code": req.tracking_code,
            "message": "Request has been rejected.",
        }

    @classmethod
    def get_summary_counts(cls, institution: AcademicInstitution) -> Dict[str, Any]:
        qs = ApprovalRequest.objects.filter(institution=institution)
        pending_qs = qs.filter(status__in=["PENDING", "IN_REVIEW", "CHANGES_REQUESTED"])
        by_domain = pending_qs.values("domain").annotate(count=Count("id"))
        domain_counts = {item["domain"]: item["count"] for item in by_domain}
        total_pending = sum(domain_counts.values())

        status_counts = qs.values("status").annotate(count=Count("id"))
        status_map = {item["status"]: item["count"] for item in status_counts}

        return {
            "total_pending": total_pending,
            "staff_pending": domain_counts.get("STAFF_ONBOARDING", 0),
            "student_pending": domain_counts.get("STUDENT_ADMISSION", 0),
            "finance_pending": domain_counts.get("FINANCE_REQUEST", 0),
            "leave_pending": domain_counts.get("STAFF_LEAVE", 0),
            "total_approved": status_map.get("APPROVED", 0),
            "total_rejected": status_map.get("REJECTED", 0),
            "total_scheduled": status_map.get("SCHEDULED", 0),
            "by_domain": domain_counts,
        }
