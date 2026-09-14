# REST API Specification & Endpoint Catalog

**Document Version:** 1.0.0  
**Base URL:** `/api/v1/`  
**Authentication:** Bearer JWT Header (`Authorization: Bearer <access_token>`)  

---

## 1. REST Conventions & Standards

- **HTTP Verbs:** Standard semantics (`GET` for retrieval, `POST` for creation, `PUT` for complete replacement, `PATCH` for partial update, `DELETE` for soft/hard deletion).
- **Pagination:** Standard limit-offset query parameters (`?page=1&page_size=50`).
- **Filtering & Search:** URL query parameters (`?academic_year=2026&search=Rahman`).
- **Response Headers:** `X-Request-ID` correlation identifier present on 100% of responses.

---

## 2. Core API Endpoint Matrix

| Domain | Method | Endpoint Path | Access Control | Description |
|---|---|---|---|---|
| **IAM** | `POST` | `/api/v1/token/` | Public | Obtain JWT token pair |
| **IAM** | `POST` | `/api/v1/token/refresh/` | Public | Rotate refresh token for access token |
| **IAM** | `POST` | `/api/v1/auth/google/` | Public | Google OAuth2 token exchange |
| **Tenancy** | `GET` | `/api/v1/institutions/` | Authenticated | List accessible institutions |
| **Tenancy** | `POST` | `/api/v1/institutions/register/` | Public | Register new academic institution |
| **Students** | `GET, POST` | `/api/v1/students/` | Admin, Teacher | List or enroll students |
| **Students** | `POST` | `/api/v1/students/{id}/transfer/` | Admin | Transfer student class with audit log |
| **Classes** | `GET, POST` | `/api/v1/classes/` | Admin, Teacher | Manage class curriculum levels |
| **Sections** | `GET, POST` | `/api/v1/academy/sections/` | Admin, Teacher | Manage class sections & rooms |
| **Attendance**| `GET, POST` | `/api/v1/attendance/students/` | Admin, Teacher | Record daily class attendance |
| **Attendance**| `DELETE` | `/api/v1/attendance/students/{id}/` | Admin Only | Delete attendance record (audited) |
| **Attendance**| `POST` | `/api/v1/attendance/biometric/push/` | Biometric Device | Ingest hardware punch logs |
| **Exams** | `GET, POST` | `/api/v1/exams/` | Admin, Teacher | Manage exam schedules & rules |
| **Audit Logs**| `GET` | `/api/v1/audit-logs/` | Admin Only | Query immutable audit trails |
| **Reports** | `GET` | `/api/v1/hifz/verify-report/{code}/`| Public | Verifiable public transcript lookup |
