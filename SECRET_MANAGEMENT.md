# Secret Management Blueprint

## 1. Storage Strategy

| Environment | Storage | Notes |
| --- | --- | --- |
| Local development | `.env` (ignored by git) with Doppler/1Password sync | Commit only `.env.example`; developers load secrets via `direnv` or `npm run env:pull`. |
| CI / Preview | CI secret store (GitHub Actions Encrypted Secrets, Render preview env vars) | Inject per-branch tokens with least privilege. |
| Production (Railway/Render/Heroku) | Platform env variables + optional Secret Manager (AWS SM, Doppler) as source of truth | Platform pulls short-lived secrets at deploy; no `.env` on disk. |

- `.gitignore` already excludes `.env`. Add pre-commit hook (e.g., `detect-secrets`, `git-secrets`) to scan staged files.
- Use `git update-index --skip-worktree .env` to avoid accidental check-ins after initial creation.
- For DB dumps/logs, use pipeline that redacts columns flagged as sensitive (see `SECURITY_DATA_PROTECTION.md`).

## 2. Config Module Pattern

`bot/src/env.ts` (and backend equivalents) use `zod` validation + masking:
```ts
const EnvSchema = z.object({ BOT_TOKEN: z.string(), ... });
const parsed = EnvSchema.parse(process.env);
export const env = { botToken: parsed.BOT_TOKEN, ... };
```
- App exits fast if any required variable is missing.
- `maskSecret` helper logs only the first/last characters in non-prod to confirm wiring without leaking full secrets.
- Downstream modules import from `env.ts` instead of reading `process.env` directly, ensuring single validation point.

## 3. Rotation & Environment Separation

- Maintain per-environment secret sets (`BOT_TOKEN_DEV`, `BOT_TOKEN_STAGE`, `BOT_TOKEN_PROD`) to avoid cross-use.
- Telegram bot rotation:
  1. Generate new token with `@BotFather` → `/revoke`.
  2. Update secret store (`BOT_TOKEN`) for staging → deploy → verify health.
  3. Update production secret; trigger rolling deploy; verify incoming updates.
  4. Delete obsolete token in BotFather to prevent reuse.
- JWT/PII keys: rotate quarterly. Use versioned keys (`JWT_SECRET_V2`) and support dual verification until old tokens expire.
- Database credentials: prefer managed Postgres with IAM tokens or rotate credentials monthly; update connection strings via secret store and redeploy.
- Record rotation schedule in runbook; automate reminders (e.g., GitHub issue cron, OpsGenie).

## 4. Don’ts

- Never log entire values of `BOT_TOKEN`, `JWT_SECRET`, DB URLs, OAuth tokens; rely on `maskSecret`.
- Do not bake secrets into Docker images or commit history. Run `git filter-repo` if leakage occurs.
- Avoid sharing `.env` via chat/email; use password managers or secret sync tools.
