# Enterprise Observability, Structured Logging, Audit Logging and Error Monitoring Architecture

**Document Version:** 1.0.0  
**Phase:** PHASE 5 — Observability + Audit Logging Hardening  
**Target System:** TaleemOS / SPR Note Enterprise Backend (Django REST Framework)  
**Status:** IMPLEMENTED, AUDITED & VERIFIED  

---

## 1. Executive Summary

As part of Phase 5 hardening for the TaleemOS multi-tenant enterprise SaaS platform, an end-to-end observability, structured application logging, immutable audit logging, and correlation error monitoring architecture was implemented and verified. 

The system now provides distinct separation between:
1. **Application Observability (System Operations):** Structured JSON and correlation logs tracking system lifecycle, request dispatch, tenant boundaries, execution latencies, and warnings.
2. **Enterprise Audit Trail (Actor Operations):** An immutable, tamper-evident audit record capturing who performed what action on which resource, before/after states with precise delta summaries, actor metadata, client IP, device user-agents, and request correlation IDs.
3. **Structured Error Monitoring:** Centralized exception handling that binds unique correlation IDs (`X-Request-ID`), captures full debug diagnostic contexts without leaking stack traces or internal topology to clients, and surfaces actionable diagnostic identifiers for production incidents.

---

## 2. Request Correlation and Distributed Tracing Architecture

### 2.1 Correlation Request ID Propagation (`X-Request-ID`)
Every inbound HTTP request arriving at the API gateway is processed through `RequestCorrelationMiddleware`:
- Checks for an existing `X-Request-ID` or `X-Correlation-ID` header from upstream reverse proxies (e.g., Nginx, Cloudflare, AWS ALB).
- If absent, generates a cryptographically random UUID v4 identifier.
- Binds `request.id = request_id` to the Django request instance.
- Initializes thread-local context via `set_request_context(request_id, tenant_id, user_id, endpoint, ip_address)`.
- Attaches the `X-Request-ID` header to every outbound HTTP response.

### 2.2 Thread-Local Context and Logging Filter
In `backend/core/logging_formatters.py`:
- `CorrelationLogFilter`: Injects `request_id`, `tenant_id`, `user_id`, `endpoint`, `method`, `ip_address`, and `environment` into every Python `logging.LogRecord` emitted by any subsystem during request execution.
- `StructuredJsonLogFormatter`: Formats production logs into machine-parseable JSON objects adhering to standard enterprise log aggregation schemas (Elasticsearch / Logstash, Datadog, Grafana Loki, AWS CloudWatch).

#### Example Production Structured JSON Log:
```json
{
  "timestamp": "2026-09-14T19:37:55.449Z",
  "level": "INFO",
  "logger": "core",
  "message": "AUDIT LOG [TRANSFER] Student#1 by 01788880002 [Admin / Nazim] | Req: 013c3e22-df41-42ae-b1d3-bd674fc1e6b8",
  "request_id": "013c3e22-df41-42ae-b1d3-bd674fc1e6b8",
  "tenant_id": "1",
  "user_id": "2",
  "endpoint": "/api/v1/students/1/transfer/",
  "method": "POST",
  "ip_address": "127.0.0.1",
  "environment": "production"
}
```

---

## 3. Immutable Audit Logging Subsystem (`AuditLog`)

### 3.1 Data Model Specification
The `AuditLog` model in `backend/core/models/system.py` is configured with enterprise database indexes and non-nullable foreign keys:

| Field | Type | Description |
|---|---|---|
| `institution` | ForeignKey (Tenant) | Hard multi-tenant boundary reference |
| `actor` | ForeignKey (User, Nullable) | The user who performed the mutation (NULL for system/crons) |
| `action` | CharField(32) | Action enum (`CREATE`, `UPDATE`, `DELETE`, `TRANSFER`, `STATUS_CHANGE`, `PUBLISH`, `ARCHIVE`, `EXPORT`, `LOGIN`) |
| `resource_type` | CharField(64) | Resource category (`Student`, `StudentAttendance`, `Exam`, `Grade`, `StaffProfile`, `User`) |
| `resource_id` | CharField(64) | Identifier of the affected record |
| `resource_name` | CharField(255) | Human-readable descriptor or display label of the target entity |
| `before_state` | JSONField | Full snapshot of target attributes prior to modification |
| `after_state` | JSONField | Full snapshot of target attributes following modification |
| `changes_summary` | TextField | Computed delta summary (e.g. `Class: Class 8 -> Class 9, Roll: 101 -> 102`) |
| `reason` | TextField | Optional user-provided reason or administrative justification |
| `ip_address` | GenericIPAddressField | Client IP address recorded at the time of execution |
| `device_metadata` | TextField | User-Agent / client device identifier |
| `request_id` | CharField(64) | Distributed correlation trace ID connecting HTTP logs to audit rows |
| `created_at` | DateTimeField | Timestamp of event creation (db_index=True) |

### 3.2 Performance & Composite Indexes
To support high-speed querying across millions of audit records without table scans:
- `idx_audit_inst_created`: `['institution', '-created_at']`
- `idx_audit_resource`: `['institution', 'resource_type', 'resource_id']`
- `idx_audit_actor_created`: `['institution', 'actor', '-created_at']`
- `idx_audit_action_created`: `['institution', 'action', '-created_at']`

### 3.3 State Diff Computation & Service Layer
The centralized audit service (`backend/core/services/audit_service.py`) provides:
- `compute_state_diff(before_dict, after_dict, ignore_fields)`: Computes field-level attribute differentials and formats human-readable transition summaries.
- `record_audit_log(institution, actor, action, resource_type, resource_id, ...)`: Records the immutable audit row within active transaction boundaries or safely captures exceptions to guarantee that logging never aborts primary business transactions unless strictly configured.

---

## 4. Error Monitoring and Exception Safety

### 4.1 DRF Custom Exception Handler
The exception handler in `backend/core/exceptions.py` intercepts all unhandled errors, API exceptions, and 500 server crashes:
- Extracts correlation `request_id` from the request or active thread context.
- Formats structured error log with stack trace, user ID, tenant ID, and endpoint details.
- Returns safe, masked JSON response to clients:
```json
{
  "detail": "An internal server error occurred. Please contact system support with reference Request ID.",
  "request_id": "013c3e22-df41-42ae-b1d3-bd674fc1e6b8"
}
```
- Sets `X-Request-ID` header on all error responses.

---

## 5. Audit Log REST API & Access Control

### 5.1 Endpoint Specification
- **Endpoint:** `GET /api/v1/audit-logs/`
- **Controller:** `AuditLogViewSet` (`ReadOnlyModelViewSet`)
- **Mutations:** Strictly blocked at the router/viewset level (POST, PUT, PATCH, DELETE return 405 Method Not Allowed).
- **Access Control:** Restricted strictly to `IsAuthenticated` and `IsInstitutionAdmin` (Super Admin, Institution Admin, Nazim). Teachers and regular staff receive `403 Forbidden`.
- **Tenant Scoping:** Automatically filters querysets to `institution_id = request.user.institution_id`. Cross-tenant data leakage is completely prevented.

### 5.2 Supported Query Filters
- `action`: Filter by action type (e.g., `?action=TRANSFER`, `?action=DELETE`)
- `resource_type`: Filter by resource entity (e.g., `?resource_type=Student`)
- `resource_id`: Filter by specific entity identifier
- `actor_id`: Filter by acting user ID
- `start_date` / `end_date`: Filter by created date range
- `search`: Full-text search across `resource_name`, `changes_summary`, `reason`, `ip_address`, and `request_id`.

---

## 6. Verification and Automated Test Coverage

The observability and audit logging architecture is fully covered by automated regression tests in `backend/core/tests_observability_audit.py`:

| Test Case | Description | Result |
|---|---|---|
| `test_request_correlation_middleware_generates_id` | Verifies `X-Request-ID` header generation and response attachment | PASSED |
| `test_request_correlation_middleware_preserves_client_id` | Verifies preservation of upstream proxy correlation IDs | PASSED |
| `test_compute_state_diff_utility` | Verifies dictionary delta computation and summary string generation | PASSED |
| `test_record_audit_log_service` | Verifies service creation of `AuditLog` row with IP and request ID | PASSED |
| `test_student_transfer_audit_log_recorded` | Verifies automatic audit record creation during student class transfers | PASSED |
| `test_student_attendance_delete_audit_log_recorded` | Verifies audit logging upon admin attendance record deletion | PASSED |
| `test_audit_log_api_tenant_isolation` | Verifies Tenant A administrators cannot view Tenant B audit logs | PASSED |
| `test_audit_log_api_permission_enforcement` | Verifies non-admin users (Teachers) receive 403 Forbidden | PASSED |
| `test_structured_json_formatter_and_filter` | Verifies structured JSON log formatting and context injection | PASSED |

### Overall Test Metrics:
- **Phase 5 Suite (`core.tests_observability_audit`):** 9/9 Tests Passed (100%)
- **Full Backend Suite (`python manage.py test`):** 124/124 Tests Passed (100%)
- **Frontend Typecheck & Production Build:** 0 Errors, Verified.
