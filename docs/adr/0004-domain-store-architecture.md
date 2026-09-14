# ADR-004: Domain Store & Window Event Bus Architecture

**Status:** ACCEPTED  
**Date:** 2026-09-14  
**Deciders:** Core Engineering Team  

---

## Context and Problem Statement
When institutional administrators modify academic years, classes, grading rules, or departments in settings/developer tools, all views across the application (Selectors, Drawers, Grids, Modals) must synchronize immediately without requiring a full browser reload.

## Decision Drivers
- Decoupled domain state management (`academicStore`, `staffStore`, `examStore`, `calendarStore`).
- Zero prop-drilling across deeply nested views.
- Synchronous hydration from local cache to prevent empty screen flashes.

## Decision
Implement standalone domain stores (`stores/`) that emit custom browser window events (`spr_classes_updated`, `spr_tenant_changed`, `spr_departments_updated`). Hooks and selectors subscribe to these events during lifecycle mounting and automatically trigger local re-renderings.

## Consequences
- **Positive:** Pristine, decoupled synchronization between developer settings, sidebars, and main dashboards.
- **Negative:** Event names must follow consistent naming conventions (e.g. `spr_<domain>_updated`).
