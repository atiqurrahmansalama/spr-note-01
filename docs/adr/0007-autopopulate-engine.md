# ADR-007: Declarative AutoPopulate Generation & Dry-Run Engine

**Status:** ACCEPTED  
**Date:** 2026-09-14  
**Deciders:** Core Engineering Team  

---

## Context and Problem Statement
Setting up a new academic year or exam routine involves allocating hundreds of interconnected subject periods, room allocations, teacher shifts, and invigilation duties. Manual entry is error-prone and leads to routine collisions.

## Decision Drivers
- Administrative efficiency (one-click timetable population).
- Strict conflict detection before database persistence.
- Complete previewability (dry-run simulation before commit).

## Decision
Implement a 2-stage AutoPopulate architecture:
1. **Simulation Stage (Dry-Run):** Evaluates rules in memory, checks teacher and room availability, and produces a proposed delta diff with warnings.
2. **Execution Stage (Atomic Commit):** Wrapped in `transaction.atomic()`; writes all validated records in a single database transaction or rolls back completely if any constraint is breached.

## Consequences
- **Positive:** Zero partial or corrupted routine allocations; administrators can inspect changes before applying them.
- **Negative:** Rule generators must be maintained for each supported domain.
