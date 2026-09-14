# Database Backup, Point-in-Time Recovery (PITR) & Disaster Recovery

**Document Version:** 1.0.0  
**Target Database:** PostgreSQL 16+  

---

## 1. Automated Backup Strategies

1. **Daily Full Logical Snapshots (`pg_dump`):**
   ```bash
   pg_dump -Fc --no-acl --no-owner -h $DB_HOST -U $DB_USER -d $DB_NAME > /backups/spr_db_$(date +%Y%m%d_%H%M%S).dump
   ```
2. **Continuous WAL Archiving & Point-In-Time Recovery (PITR):**
   - Write-Ahead Logging (WAL) enabled in PostgreSQL.
   - Retained for 14 days in durable cloud object storage (S3/R2).

---

## 2. Disaster Recovery & Restoration Procedures

### 2.1 Full Database Restoration
```bash
# 1. Terminate active backend connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'spr_db';

# 2. Restore from snapshot
pg_restore --clean --if-exists --no-acl --no-owner -h $DB_HOST -U $DB_USER -d $DB_NAME /backups/spr_db_latest.dump

# 3. Verify integrity
python manage.py check --database default
```
