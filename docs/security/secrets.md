# Secrets Management & Cryptographic Security Policy

**Document Version:** 1.0.0  
**Compliance Standard:** Enterprise Zero-Hardcoded Secrets Standard  

---

## 1. Secrets Inventory & Storage Model

All sensitive operational keys and credentials are strictly decoupled from source code and version control:

| Secret Identifier | Environment Variable | Storage Location | Entropy Standard |
|---|---|---|---|
| **Django SECRET_KEY** | `SECRET_KEY` | Environment / Vault | >= 64 characters cryptographic random |
| **Database Password** | `DATABASE_URL` / `DB_PASSWORD` | Environment / Railway Secret | High entropy alphanumeric |
| **Google OAuth Client ID** | `VITE_GOOGLE_CLIENT_ID` | Frontend `.env` | Verified Google Cloud Console ID |
| **Biometric Master Key** | `BIOMETRIC_API_KEY` | Environment / Secret Manager | 32-byte hexadecimal token |
| **Allowed Hosts** | `ALLOWED_HOSTS` | Environment variable | Explicit trusted domain list |
| **CORS Origins** | `CORS_ALLOWED_ORIGINS` | Environment variable | Explicit HTTPS origin list |

---

## 2. Secrets Handling Best Practices

1. **Zero Git Storage:** No `.env`, private keys, or API tokens committed to Git history.
2. **Dynamic Injection:** Loaded at process startup via `python-dotenv` or cloud platform secret managers (Railway, AWS Secrets Manager, GCP Secret Manager).
3. **Frontend Leakage Prevention:** Only variables prefixed with `VITE_` are bundled into the frontend application; private database keys or Django secrets are never exposed to client builds.
