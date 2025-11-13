# Backup & Migration Policy

## 1. Backup Strategy

### Frequency
- **PostgreSQL**: 
  - Snapshots every 6 hours (point-in-time via WAL archiving).
  - Full dump nightly (01:00 UTC) using `pg_dump`.
  - Retention: daily backups for 14 days, weekly for 8 weeks, monthly for 1 year.
- **Redis**: 
  - RDB snapshots every hour, AOF trailing (if supported by hosting) streamed to object storage.
- **File artifacts (logs, configs)**: 
  - Immutable copy of daily logs to cloud storage (S3/GCS) with 30-day retention.

### Storage & Encryption
- Store all backups in encrypted buckets (S3/GCS) with MFA delete enabled.
- Use server-side encryption (SSE-KMS) and add per-backup AES-256 encryption via `openssl` before upload.
- Access controlled via IAM roles; humans retrieve backups only through break-glass procedure.

### Example Commands
```bash
# Full DB dump
pg_dump --format=custom --file=backups/db-$(date +%F).dump $DATABASE_URL
openssl enc -aes-256-cbc -salt -in backups/db-$(date +%F).dump \
  -out backups/db-$(date +%F).dump.enc -pass file:$BACKUP_KEY_FILE
aws s3 cp backups/db-$(date +%F).dump.enc s3://quadrant-backups/postgres/

# PITR archive
pg_basebackup -D /var/backups/pgbase -Ft -z -P
aws s3 sync /var/backups/pgbase s3://quadrant-backups/pitr/

# Redis snapshot
redis-cli save
aws s3 cp /var/lib/redis/dump.rdb s3://quadrant-backups/redis/dump-$(date +%F-%H).rdb
```

### Restore Drills
- Quarterly restore rehearsal:
  - Spin up isolated staging DB.
  - Download latest backup (`aws s3 cp`), decrypt, restore via `pg_restore`.
  - Run smoke tests (DB migrations + API health).
- Document drill results (duration, issues) and track in Ops wiki.

## 2. Migration Strategy

### Zero-downtime Guidelines
- Adopt **expand-and-contract** pattern:
  1. **Expand**: add new columns/tables (nullable), backfill asynchronously.
  2. Update code to write to both old/new fields.
  3. Deploy code reading new fields after backfill.
  4. **Contract**: drop legacy columns after verifying traffic.
- Use database migrations (Alembic for backend, Prisma/TypeORM equivalent for bot) with version control.
- Each migration must be idempotent and rollback-friendly (inverse SQL provided).
- Avoid locks: add columns with `CONCURRENTLY` when indexing, batch updates in small transactions.
- Keep migrations compatible with previous app versions (allow blue/green deployments).

### Rollback
- Maintain `down` scripts for every migration.
- If release fails:
  - Roll back application to previous version.
  - Execute `alembic downgrade <previous_revision>` (or ORM equivalent).
  - Restore DB from latest snapshot only if migration is destructive (documented in runbook).

## 3. Canary Release

- **Process**:
  1. Deploy new version to canary environment (small percentage of pods/instances or staging receiving 5% of traffic via load balancer).
  2. Route a fraction of Telegram webhook traffic using load balancer rule (e.g., Cloudflare Worker) or use staging bot to mirror production updates.
  3. Monitor for at least 30 minutes.
- **Metrics to watch**:
  - Error rate (HTTP 5xx, bot errors, queue failures) vs. control.
  - Latency percentiles (p95/p99).
  - Rate-limit triggers (should not spike for honest users).
  - Database health (locks, replication lag).
  - Security signals (alerts, unusual auth failures).
- **Decision**:
  - If metrics stay within ±10% of baseline and no security flags, progress to full rollout.
  - If anomalies detected, halt deployment (stop traffic to canary), roll back code, and investigate.

## 4. Automation & Documentation

- Automate backups via CI or cron; log success/failure and alert on failures.
- Store backup metadata (timestamp, checksum, encryption key ID) in a catalog.
- Keep runbooks for backup/restore, migrations, and canary steps in repo (`RUNBOOKS.md`).
- CI should run dry-run migrations (`alembic upgrade head --sql`) to catch issues pre-deploy.
