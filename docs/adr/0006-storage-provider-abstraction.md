# ADR-006: Pluggable Storage Provider Abstraction

**Status:** ACCEPTED  
**Date:** 2026-09-14  
**Deciders:** Core Engineering Team  

---

## Context and Problem Statement
The platform must support deployment on private on-premise institutional servers (utilizing local filesystem storage) as well as global multi-tenant cloud deployments (utilizing S3 or Cloudflare R2 object storage).

## Decision Drivers
- Seamless portability between local development, self-hosted institutional nodes, and cloud SaaS.
- Cryptographically sanitized file naming to prevent directory traversal or remote execution vulnerabilities.

## Decision
Utilize Django's storage abstraction engine (`storages.backends.s3boto3.S3Boto3Storage` for cloud and `django.core.files.storage.FileSystemStorage` for local/on-premise), with tenant directory partitioning (`media/tenants/{tenant_id}/`).

## Consequences
- **Positive:** Zero code changes required between on-premise and cloud deployments; configured purely via environment variables (`DEFAULT_FILE_STORAGE`, `AWS_STORAGE_BUCKET_NAME`).
- **Negative:** Direct URL generation must handle both static local paths and signed S3 CDN URLs.
