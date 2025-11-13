# Incident Response Plan

## 1. DDoS / Overload Playbook

1. **Detection**
   - Watch Grafana alerts: sustained RPS > 2x baseline, `rate_limit_*` spikes, Redis latency > 5 ms, heavy queue backlog > 200, circuit breaker opened.
   - Freeze log retention window by exporting relevant log streams (bot + backend) to immutable storage (e.g., S3 with write-once).

2. **Containment**
   - Raise firewall/WAF rules (Cloudflare/Railway): block/JS-challenge abusive IP ranges, tighten geo filters.
   - Adjust runtime limits via env flags: lower `BOT_USER_RATE_LIMIT_PER_SECOND`, `WEBHOOK_RATE_LIMIT_PER_SECOND`, `MAX_HEAVY_JOBS_PER_MINUTE`. Reload services or update Redis-based control.

3. **Degraded Mode**
   - Disable heavy features (queue jobs) by toggling feature flag; bot returns “service is busy” message.
   - Backend serves cached responses, skips non-essential integrations, and increases cache TTLs.
   - Monitor whether load drops; if not, escalate to provider (request traffic scrubbing).

4. **Investigation**
   - Archive anonymized logs (with IP hashes) + metrics to a case folder.
   - Document timeline, involved IP ranges, attack vectors. Preserve evidence for postmortem.

5. **Recovery**
   - Gradually restore limits (reverse order) while keeping monitoring on high sensitivity.
   - Update runbook with new IoCs (indicators of compromise), refine rate rules.

## 2. Data Breach Playbook

1. **Detect & Isolate**
   - Identify potential breach via IDS alert, unusual DB queries, or suspicious admin actions.
   - Freeze affected systems: switch databases to read-only replicas, restrict admin access, snapshot infrastructure.

2. **Scope**
   - Determine which data/fields were accessed (audit logs, DB traces). Quantify impacted users.
   - Capture forensic artifacts (logs, server images) in a secure environment.

3. **Contain & Remediate**
   - Patch exploited vulnerability, disable exposed endpoints, rotate secrets (BOT_TOKEN, JWT_SECRET, DB creds, PII key, webhook secret).
   - Invalidate refresh tokens, force sign-out across clients, regenerate API keys.

4. **Communicate**
   - Internal notification (exec, legal, support), then regulators as required (e.g., GDPR 72h).
   - Prepare user-facing notice: incident summary, impacted data, recommended actions (password reset, token regeneration).
   - Provide FAQ/support channel for affected users.

5. **Post-Incident**
   - Complete RCA, assign action items (patches, additional tests) with deadlines.
   - Update policies/playbooks, train staff on lessons learned.

## 3. Rolling Block / Degradation Procedures

- **Tighten Limits**: update env (`MAX_HEAVY_JOBS_PER_MINUTE`, `BOT_USER_RATE_LIMIT_PER_SECOND`, `GLOBAL_RATE_LIMIT_MAX`) and redeploy or use dynamic control via Redis to cap throughput.
- **Selective Service Degradation**:
  - Disable `/report` or heavy commands via feature flag so queue remains empty.
  - Serve cached data (FastAPI caches, CDN) and return simplified responses.
  - Pause background integrations with external APIs to conserve CPU/IO.

## 4. User Notification Policy

- Notify users when PII, auth tokens, or account actions are exposed. Include nature of breach, timeframe, data involved, steps taken, and user actions required (token rotation, password reset).
- Use multiple channels (email, in-app, status page). Coordinate with legal for compliance in each region.
- Minimize damage by immediately rotating secrets platform-wide, invalidating sessions, and guiding users to secure their integrations.

## 5. Readiness Checklist

1. **Monitoring**
   - Alerts for RPS, 4xx/5xx, rate-limit counts, heavy queue backlog, Redis latency configured and tested.
2. **Logging**
   - Structured, PII-masked logs centralized and stored ≥30 days with immutable export.
3. **Secret Management**
   - Secrets stored in a manager (Render/Railway vars, Doppler). Rotation playbook tested.
4. **Playbooks**
   - DDoS and breach runbooks accessible (offline copy), team trained.
5. **Access Control**
   - Admin MFA, IP allowlists, row-level protections on sensitive tables.
6. **Testing**
   - Security/unit/integration/load tests run in CI; results documented.
7. **Backups**
   - DB/Redis backups tested for restore.
8. **Communication**
   - Contact list (SRE, SecOps, Legal, PR) and user notification templates pre-approved.

Completion of all checklist items indicates the platform is ready to handle incidents with minimal impact.
