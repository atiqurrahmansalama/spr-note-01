# Dependency Inventory and Vulnerability Baseline

**Document Version:** 1.0.0  
**Project:** SPR Note (TaleemOS Enterprise)  
**Date:** 2026-09-14  

---

## 1. Backend Python Dependencies

| Package | Specifier | Installed Version | Category | Security Status |
| :--- | :--- | :--- | :--- | :--- |
| `Django` | `>=5.0,<6.0` | `5.2.17` | Core Framework | Up to date, stable |
| `djangorestframework` | unpinned | `3.17.1` | REST API | Up to date |
| `djangorestframework-simplejwt` | unpinned | `5.5.1` | JWT Auth | Up to date (Requires >=32 byte SECRET_KEY) |
| `django-cors-headers` | unpinned | `4.9.0` | CORS Middleware | Up to date |
| `dj-database-url` | unpinned | `3.1.2` | DB Configuration | Up to date |
| `psycopg2-binary` | unpinned | `2.9.12` | PostgreSQL Driver | Up to date |
| `whitenoise` | unpinned | `6.12.0` | Static Asset Serving | Up to date |
| `gunicorn` | unpinned | `26.0.0` | WSGI Server | Up to date |
| `python-dotenv` | unpinned | `1.2.2` | Environment Loading | Up to date |
| `requests` | unpinned | `2.34.2` | HTTP Client | Up to date |
| `google-auth` | unpinned | `2.56.3` | OAuth Token Verification | Up to date |
| `pyotp` | unpinned | `2.10.0` | TOTP 2FA Engine | Up to date |
| `webauthn` | unpinned | `3.0.0` | FIDO2 / Passkeys | Up to date |
| `qrcode` | unpinned | `8.2` | QR Code Generation | Up to date |
| `drf-spectacular` | unpinned | `0.30.0` | OpenAPI Schema | Up to date |
| `firebase-admin` | unpinned | `7.5.0` | Push Notifications | Up to date |
| `Pillow` | unpinned | `12.3.0` | Image Processing | Up to date |
| `celery` | `>=5.3.0` | `5.6.3` | Task Worker | Up to date |
| `redis` | `>=5.0.0` | `8.1.0` | Cache/Broker Client | Up to date |
| `django-redis` | `>=5.4.0` | `7.0.0` | Cache Backend | Up to date |
| `django-storages` | `>=1.14.0` | `1.14.6` | Cloud Storage | Up to date |
| `boto3` | `>=1.34.0` | `1.43.78` | AWS S3 SDK | Up to date |
| `daphne` | `>=4.1.0` | `4.1.0` | ASGI Server | Up to date |
| `channels` | `>=4.0.0` | `4.0.0` | WebSockets / Channels | Up to date |
| `channels-redis` | `>=4.2.0` | — | Redis Channel Layer | Configured |
| `sentry-sdk` | `>=1.40.0` | — | Observability | Configured |

---

## 2. Frontend Node Dependencies

### 2.1 Production Dependencies (`frontend/package.json`)

| Package | Version | Purpose | Vulnerability Audit Result |
| :--- | :--- | :--- | :--- |
| `react` | `^19.2.7` | Core UI Engine | Clean |
| `react-dom` | `^19.2.7` | DOM Renderer | Clean |
| `react-router-dom` | `^7.18.2` | Client-Side Routing | Clean |
| `axios` | `^1.19.0` | HTTP Client | Clean |
| `@react-oauth/google` | `^0.13.5` | Google Identity Services | Clean |
| `@simplewebauthn/browser` | `^13.3.0` | Passkeys / WebAuthn | Clean |
| `jwt-decode` | `^4.0.0` | Client-Side JWT Parser | Clean |
| `leaflet` | `^1.9.4` | Interactive Maps | Clean |
| `qrcode` | `^1.5.4` | QR Code Rendering | Clean |
| `qrcode.react` | `^4.2.0` | React QR Component | Clean |
| `html2canvas` | `^1.4.1` | DOM Screenshotting | Clean |
| `html2canvas-pro` | `^2.4.2` | Advanced Canvas Engine | Clean |
| `jspdf` | `^4.2.1` | PDF Generation | Clean |
| `jspdf-autotable` | `^5.0.8` | PDF Table Generator | Clean |

### 2.2 Development Dependencies & Transitive Vulnerabilities

| Package | Version | Advisory ID | Severity | Status |
| :--- | :--- | :--- | :--- | :--- |
| `brace-expansion` | `4.0.0 - 5.0.8` | GHSA-rgw5-rvv9-x895 | High | Patch scheduled in Phase 1 |
| `dompurify` | `<=3.4.12` | GHSA-55q2-fjhq-7xh7 | Moderate | Patch scheduled in Phase 1 |
| `nanoid` | `<3.3.18` | GHSA-2v37-7h3g-55p8 | High | Patch scheduled in Phase 1 |
| `vite` | `^8.1.1` | — | Clean | Up to date |
| `tailwindcss` | `^4.3.3` | — | Clean | Up to date |
| `typescript` | `^5.9.3` | — | Clean | Up to date |
| `eslint` | `^10.6.0` | — | Clean | Up to date |

---

## 3. Dependency Hardening Action Items

1. Pin unpinned backend dependencies in `requirements.txt` to exact tested minor versions to prevent unexpected upstream breaking changes.
2. Execute dependency audit remediation (`npm audit fix` / package version updates) for `brace-expansion`, `dompurify`, and `nanoid`.
3. Add automated vulnerability scanning (`pip-audit` / `safety` / `npm audit`) to CI workflow.
