# ADR-008: Role-Based Access Control and Action-Level Enforcement

**Status:** ACCEPTED  
**Date:** 2026-09-14  
**Deciders:** Core Engineering Team  

---

## Context and Problem Statement
Different organizational tiers within an institution (Principals, Academic Nazims, Teachers, Cashiers, Students, Parents) require distinct operational permissions. UI-level element hiding alone is insufficient to prevent API tampering.

## Decision Drivers
- Strict defense-in-depth: Permission evaluation must occur at the API controller tier on every request.
- Critical mutations (e.g. attendance record deletion, policy alteration, audit log inspection) must be strictly restricted to verified Administrators.

## Decision
1. Implement declarative DRF permission classes (`IsInstitutionAdmin`, `IsSuperUser`, `IsAuthenticated`).
2. Utilize `get_permissions()` overrides on ViewSets to enforce distinct permissions per action (e.g. `list` is open to authenticated staff, but `destroy` requires `IsInstitutionAdmin`).
3. Return standard `403 Forbidden` with descriptive diagnostic details when unauthorized access is attempted.

## Consequences
- **Positive:** Immune to client-side bypasses or URL parameter manipulation.
- **Negative:** ViewSet permission overrides must be explicitly verified with automated integration tests.
