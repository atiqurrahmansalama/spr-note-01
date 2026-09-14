# Tenant Isolation & Multi-Tenant Boundary Security

**Document Version:** 1.0.0  
**Classification:** Critical Security Standard  

---

## 1. Zero-Leakage Policy

In TaleemOS, the boundary between distinct academic institutions is impenetrable. Under no circumstances can a user belonging to Institution A view, update, delete, search, or export data belonging to Institution B.

```
Institution A (Data Perimeter)
       ❌ Cross-Access Strictly Blocked (404 / 403)
Institution B (Data Perimeter)
```

---

## 2. Multi-Layer Defense Architecture

1. **Layer 1: JWT Claim Token Binding:** Every issued JWT token encapsulates the user's authentic `institution_id`.
2. **Layer 2: Middleware Scoping:** `TenantResolutionMiddleware` extracts and establishes the thread-safe tenant context.
3. **Layer 3: ViewSet QuerySet Scoping:** Every ViewSet forces `get_queryset()` to filter by the scoped `institution_id`.
4. **Layer 4: Relational Foreign Key Binding:** Multi-tenant uniqueness constraints in the database guarantee that duplicate IDs cannot cross tenant boundaries.

---

## 3. Automated Boundary Test Cases

The test suite in `backend/core/tests_tenant_isolation.py` enforces 13 automated boundary test cases across all core models:

| Test Case | Scenario | Expected Outcome |
|---|---|---|
| `test_student_list_tenant_isolation` | Tenant A requests student list | Receives only Tenant A students |
| `test_student_detail_cross_tenant_blocked` | Tenant A requests Tenant B student by ID | HTTP 404 Not Found |
| `test_student_update_cross_tenant_blocked` | Tenant A attempts PATCH on Tenant B student | HTTP 404 Not Found |
| `test_student_delete_cross_tenant_blocked` | Tenant A attempts DELETE on Tenant B student | HTTP 404 Not Found |
| `test_attendance_tenant_isolation` | Tenant A requests attendance records | Zero Tenant B records returned |
| `test_exam_marks_cross_tenant_blocked` | Tenant A attempts mark entry on Tenant B exam | HTTP 404 / 403 Forbidden |
| `test_audit_log_cross_tenant_blocked` | Tenant A requests audit logs | Receives only Tenant A audit rows |
