# ADR-003: Shared Database with Row-Level Multi-Tenant Isolation

**Status:** ACCEPTED  
**Date:** 2026-09-14  
**Deciders:** Core Engineering Team  

---

## Context and Problem Statement
TaleemOS must serve thousands of educational institutions cost-effectively while providing absolute, uncompromised isolation between tenant datasets.

## Decision Drivers
- Operational simplicity and automated migration management across all tenants simultaneously.
- Cost efficiency (avoiding provisioning separate database instances for smaller madrasahs and schools).
- High scalability with composite multi-tenant indexes.

## Considered Options
1. **Database-Per-Tenant:** Maximum isolation, but massive operational complexity (managing 10,000 separate DB migrations).
2. **Schema-Per-Tenant (PostgreSQL Schemas):** High connection pool fragmentation and migration bottlenecks.
3. **Shared Database with Discriminator Column (`institution_id`) [SELECTED]:** Proven SaaS architecture. Enforces row-level isolation via middleware and querysets, backed by multi-tenant composite indexes and automated boundary tests.

## Consequences
- **Positive:** Instantaneous onboarding of new institutions; zero migration fragmentation; single connection pool.
- **Negative:** Requires rigorous automated regression testing (`core.tests_tenant_isolation`) to prevent developer oversights in query filtering.
