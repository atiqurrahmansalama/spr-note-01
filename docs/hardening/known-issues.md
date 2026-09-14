# Known Issues and Security Findings Inventory

**Document Version:** 8.0.0 (Post-Phase 1 through Phase 7 Hardening & Documentation)  
**Status:** ALL HARDENING & ARCHITECTURE PHASES (0-7) COMPLETED & VERIFIED  

---

## 1. Security, Observability, Refactoring & Architecture Findings Status

### 1.1 Insecure JWT / Django SECRET_KEY Length
- **Status:** RESOLVED
- **Remediation:** `SECRET_KEY` updated to a 64-character high-entropy cryptographic key. `InsecureKeyLengthWarning` eliminated.

### 1.2 Frontend Dependency Vulnerabilities (CVEs)
- **Status:** RESOLVED
- **Remediation:** Executed `npm audit fix`. Upgraded `brace-expansion`, `dompurify`, and `nanoid`. `npm audit` reports 0 vulnerabilities.

### 1.3 Permissive Host and CORS Configuration
- **Status:** RESOLVED
- **Remediation:** `ALLOWED_HOSTS` dynamically loaded from environment variable. `CORS_ALLOW_ALL_ORIGINS` wildcard fallback disabled; explicit trusted origin list enforced.

### 1.4 Hardcoded Client Credentials in Frontend Auth Views
- **Status:** RESOLVED
- **Remediation:** Removed hardcoded Google OAuth client ID fallbacks in `LoginView.jsx` and `RegisterView.jsx`. Strictly consumes `import.meta.env.VITE_GOOGLE_CLIENT_ID`.

### 1.5 Excessive JWT Token Lifetimes
- **Status:** RESOLVED
- **Remediation:** Reduced access token lifetime from 30 days to 60 minutes, and refresh token from 90 days to 14 days, with sliding rotation and token blacklisting active.

### 1.6 Granular Backend Permission Enforcement & Attendance Deletion Defense
- **Status:** RESOLVED
- **Remediation:** `StudentAttendanceViewSet.destroy` explicitly restricted to `ADMIN` / `SUPER_ADMIN` (returning 403 Forbidden for Teachers/Staff). `AttendanceSlotViewSet`, `AttendancePolicyViewSet`, and `DocumentTemplateViewSet` mutations restricted strictly to `IsInstitutionAdmin`.

### 1.7 Biometric Gateway Ingestion Security
- **Status:** RESOLVED
- **Remediation:** `BiometricGatewayViewSet` enforces registered device serial identification and active device status, blocking unauthorized device payloads with 403 Forbidden.

### 1.8 Database Integrity, Constraints & Transaction Rollback Security
- **Status:** RESOLVED
- **Remediation:** Multi-tenant uniqueness constraints enforced on student ID cards, classes, sections, and dormitory beds. Date check constraints enforced on calendar events and staff leaves. Score range check constraints on lesson evaluations. Complete atomic rollback enforced across all bulk ingestion and mutation workflows.

### 1.9 Automated Testing Pyramid Coverage
- **Status:** RESOLVED
- **Remediation:** Implemented a full 3-layer automated testing pyramid: Layer 1 Unit Tests (`core.tests_unit_business_logic`), Layer 2 Integration Pipeline Tests (`core.tests_integration_pipeline`), and Layer 3 E2E Workflow Tests (`core.tests_e2e_workflows`). Total test suite expanded to 115 test cases with 100% pass rate.

### 1.10 Observability, Request Correlation Tracing & Immutable Audit Logging
- **Status:** RESOLVED
- **Remediation:** Implemented `RequestCorrelationMiddleware` injecting `X-Request-ID` across every inbound request, outbound response, and thread-local logging context. Added `StructuredJsonLogFormatter` for machine-parseable production logs. Implemented immutable `AuditLog` model with composite database indexes, automatic delta/state diff computation, and tenant-isolated `AuditLogViewSet` restricted to administrative roles.

### 1.11 Frontend Duplication, Cloned Modals & Barrel Standardization
- **Status:** RESOLVED
- **Remediation:** Consolidated duplicate QR modals into `QRCodeCardModal.tsx` in `components/common/`. Unified `PageRangeInput.tsx` in `components/ui/` and removed legacy report-builder clone. Centralized `useAcademicData` into `src/hooks/`. Migrated core selectors (`ClassSelect.tsx`, `SectionSelect.tsx`, `GroupSelect.tsx`) to strict TypeScript. Removed dead `DocumentStudioEngine.jsx` prototype.

### 1.12 Architecture Documentation & Decision Records (ADRs)
- **Status:** RESOLVED
- **Remediation:** Established complete 27-document architecture knowledge base: `docs/architecture/` (10 specifications), `docs/security/` (4 specifications), `docs/testing/` (2 specifications), `docs/operations/` (3 specifications), and `docs/adr/` (8 Architecture Decision Records).

---

## 2. Automated Test Suite Metrics
- **Layer 1: Business Logic Unit Tests (`core.tests_unit_business_logic`):** 6/6 PASSED (100%)
- **Layer 2: Integration Pipeline Tests (`core.tests_integration_pipeline`):** 4/4 PASSED (100%)
- **Layer 3: E2E Workflows & Multi-Tenant Tests (`core.tests_e2e_workflows`):** 2/2 PASSED (100%)
- **Observability & Audit Logging Suite (`core.tests_observability_audit`):** 9/9 PASSED (100%)
- **Database Integrity Suite (`core.tests_database_integrity`):** 11/11 PASSED (100%)
- **Multi-Tenant Isolation Suite (`core.tests_tenant_isolation`):** 13/13 PASSED (100%)
- **Total Backend Test Suite (`python manage.py test`):** 124/124 PASSED (100%)
- **Frontend Typecheck (`npm run typecheck`):** 0 errors
- **Frontend Production Build (`npm run build`):** Built in 1.48s
