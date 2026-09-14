# Role-Based Access Control (RBAC) & Permission Architecture

**Document Version:** 1.0.0  
**Enforcement Tier:** Backend DRF Permission Classes + Frontend Action Guards  

---

## 1. Role Hierarchy Matrix

```
SUPER_ADMIN (Platform Operator)
    └── INSTITUTION_ADMIN / PRINCIPAL (Full Institutional Authority)
            ├── NAZIM / ACADEMIC COORDINATOR (Curriculum, Routine, Class Management)
            ├── TEACHER / FACULTY (Daily Attendance, Lesson Plans, Mark Entry)
            ├── ACCOUNTANT / CASHIER (Billing, Invoices, Fees)
            ├── GUARDIAN / PARENT (Child Attendance Radar, Report Cards)
            └── STUDENT (Personal Schedule, Syllabus Progress, Results)
```

---

## 2. Action-Level Permission Enforcement Matrix

| Resource Domain | Action | SuperAdmin | Admin | Nazim | Teacher | Guardian / Student |
|---|---|---|---|---|---|---|
| **Institution Settings** | View / Update | Read/Write | Read/Write | Read Only | No Access | No Access |
| **Students** | Create / Edit | Read/Write | Read/Write | Read/Write | Read/Write | Read Only (Own) |
| **Students** | Delete / Transfer | Read/Write | Read/Write | Read/Write | 403 Blocked | No Access |
| **Attendance** | Take Daily Roster | Read/Write | Read/Write | Read/Write | Read/Write | Read Only |
| **Attendance** | Delete Historical | Read/Write | Read/Write | 403 Blocked | 403 Blocked | No Access |
| **Exams** | Create / Publish | Read/Write | Read/Write | Read/Write | Read Only | Read Only |
| **Mark Entry** | Input Scores | Read/Write | Read/Write | Read/Write | Read/Write | No Access |
| **Audit Logs** | View Audit Trail | Read/Write | Read Only | Read Only | 403 Blocked | No Access |

---

## 3. Backend Permission Classes

- `IsAuthenticated`: Enforces valid JWT token presence.
- `IsSuperUser`: Restricts platform-wide tenant creation and global configurations.
- `IsInstitutionAdmin`: Restricts institutional policy settings, document template definitions, and audit log querying to administrative roles.
- Action-level overrides: Implemented via `get_permissions()` in ViewSets to enforce strict rules (e.g. attendance deletion restricted to admins).
