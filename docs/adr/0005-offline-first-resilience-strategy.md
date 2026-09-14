# ADR-005: Client-Side Local Caching and Resilient Hydration Strategy

**Status:** ACCEPTED  
**Date:** 2026-09-14  
**Deciders:** Core Engineering Team  

---

## Context and Problem Statement
Teachers and staff working in remote educational institutions frequently experience momentary network latency or intermittent connectivity drops while taking classroom attendance or entering exam marks.

## Decision Drivers
- Zero loss of entered form drafts during network drops or accidental page navigation.
- Instant initial view rendering by reading from local cache before network resolution completes.

## Decision
1. Implement `useFormAutoSave` with localized draft persistence keys (`staff_invite_edit_{id}`, `lesson_plan_draft_{date}`).
2. Implement synchronous cache hydration in `useAcademicData` via `readJSON` / `writeJSON` scoped by `activeTenantId`.
3. Auto-populate inputs from active draft storage upon drawer or modal re-mounting.

## Consequences
- **Positive:** Immune to accidental data loss; zero screen flicker upon route transitions.
- **Negative:** Form submission handlers must explicitly invoke `clearDraft()` upon successful API response.
