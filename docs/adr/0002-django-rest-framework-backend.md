# ADR-002: Django 5.x and Django REST Framework for API Backend

**Status:** ACCEPTED  
**Date:** 2026-09-14  
**Deciders:** Core Engineering Team  

---

## Context and Problem Statement
The backend requires robust relational data modeling, enterprise-grade multi-tenant migrations, declarative serializers, out-of-the-box administrative tooling, and proven cryptographic authentication primitives.

## Decision Drivers
- Robust relational database schema migration engine.
- Built-in protection against SQL injection, CSRF, and timing attacks.
- High-productivity serializer and viewset abstraction.
- Rich ecosystem for SimpleJWT and third-party biometric device integrations.

## Considered Options
1. **Node.js / Express / NestJS:** Requires hand-crafted ORM migrations and authentication boilerplate.
2. **FastAPI:** Fast async I/O, but lacks Django's mature database migration ecosystem and declarative ORM constraints.
3. **Django 5.x + Django REST Framework [SELECTED]:** Proven battle-tested framework with mature migration history and rock-solid relational integrity.

## Consequences
- **Positive:** Robust ORM check constraints, transaction rollbacks, composite index management, and automatic migration histories.
- **Negative:** Synchronous WSGI execution model (mitigated via multi-worker Gunicorn and database connection pooling).
