# Web API Service Architecture

This service acts as the modular REST API gateway for enterprise applications.

## Multi-Project & Reusable Architecture

By decoupling shared utilities into `backend/packages/` and domain models/views/serializers into `backend/modules/`, any new application or project within the ecosystem can:

1. Import core utilities from `packages` (e.g. `packages.tenancy`, `packages.iam`, `packages.common`, `packages.notifications`, `packages.document_studio`).
2. Mount only the required domain modules in `urls.py` (e.g., an admission portal might only mount `modules.student_management.urls` and `modules.iam.urls`).
3. Deploy independently as a dedicated microservice or run alongside the consolidated monolithic service.
