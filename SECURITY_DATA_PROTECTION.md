## Data Classification & Minimisation

| Data point | Source | Purpose | Classification |
| --- | --- | --- | --- |
| `telegram_id`, `username`, `first_name`, `last_name`, `locale` | Telegram login | Identify user account | PII (moderate) |
| `photo_url`, `avatar_hash` | Telegram / user upload | Display avatar | PII (low) |
| `email`, `phone_number` *(optional)* | Mini App settings | Contact + recovery | PII (high) |
| `access_token`, `refresh_token`, `session_secret` | Auth service | Session management | Sensitive secret |
| `miniapp_progress`, `app_seconds_spent`, learning stats | Backend | Feature analytics | Behavioral data |
| `admin_notes`, `support_tickets` | Ops | Abuse/fraud | Highly sensitive |

Principles:
- Collect only Telegram envelope data by default; optional fields stored only when feature requires.
- Split highly sensitive fields (`email`, `phone_number`, `refresh_token`, `admin_notes`) into a dedicated table with strict ACLs.
- Prefer derived IDs (`user_uuid`) instead of exposing incremental DB IDs outside the backend.
- Stored secrets must be encrypted at rest with envelope encryption (row key + KMS master key).

## Proposed Database Schema

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    user_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL UNIQUE,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    locale TEXT NOT NULL DEFAULT 'en',
    avatar_url TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_sensitive (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email BYTEA,                         -- encrypted
    phone BYTEA,                         -- encrypted
    email_digest BYTEA,                  -- sha256(email) for lookups
    phone_digest BYTEA,
    refresh_token BYTEA,                 -- encrypted
    refresh_token_salt BYTEA NOT NULL,   -- per-row AEAD salt/nonce
    encryption_metadata JSONB NOT NULL   -- algorithm, version, key id
);

CREATE TABLE auth_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash BYTEA NOT NULL,           -- hashed access token
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor_id BIGINT REFERENCES users(id),
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    payload JSONB,
    ip INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional: strict RLS
ALTER TABLE user_sensitive ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_sensitive_owner_policy ON user_sensitive
    USING (user_id = current_setting('app.current_user_id')::BIGINT);
```

Indexes:
- `users(telegram_id)` and `users(user_uuid)` for lookups.
- `user_sensitive(email_digest)` / `(phone_digest)` for case-insensitive searches without decrypting payload.
- `audit_log(actor_id, created_at)` for investigations.

## Storage Strategy
- `email`, `phone`, `refresh_token` stored as AES-256-GCM ciphertext; `*_digest` hashed with SHA-256 + random salt for search capability.
- Keep `refresh_token` TTL short; rotate and store last-three tokens only.
- Secrets such as `jwt_secret`, encryption keys, and Telegram tokens must come from a managed secrets store (Render Secrets, Doppler, AWS Secrets Manager). Failing to set `JWT_SECRET` now raises at boot (see `backend/app/core/config.py`).

## TypeScript Crypto Helper (Node.js bot / services)

```ts
// bot/src/security/dataProtection.ts
import { randomBytes, createCipheriv, createDecipheriv, createHash } from "crypto";

const ALGO = "aes-256-gcm";
const KEY_SIZE = 32;
const IV_SIZE = 12;

const getKey = () => {
  const key = process.env.PII_ENCRYPTION_KEY;
  if (!key || key.length < KEY_SIZE) {
    throw new Error("PII_ENCRYPTION_KEY must be set (32+ bytes base64)");
  }
  return Buffer.from(key, "base64");
};

export type CipherPayload = {
  ciphertext: string;
  iv: string;
  authTag: string;
  version: number;
};

export function encryptField(plaintext: string): CipherPayload {
  const iv = randomBytes(IV_SIZE);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([iv, encrypted, authTag]).toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    version: 1
  };
}

export function decryptField(payload: CipherPayload): string {
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");
  const encrypted = Buffer.from(payload.ciphertext, "base64");
  const cipherTextBody = encrypted.slice(IV_SIZE, encrypted.length - authTag.length);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(cipherTextBody), decipher.final()]);
  return decrypted.toString("utf8");
}

export const sha256Digest = (value: string) =>
  createHash("sha256").update(value.trim().toLowerCase()).digest("base64");

export const maskEmail = (email: string) => {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}***@${domain}`;
};

export const maskPhone = (phone: string) =>
  phone.replace(/(\+\d{1,2})\d{3}(\d{2,})/, "$1***$2");
```

Usage with Prisma/TypeORM before insert/update:
```ts
const payload = encryptField(userInput.email);
await db.userSensitive.upsert({
  where: { userId },
  update: { email: payload.ciphertext, emailIv: payload.iv, emailAuthTag: payload.authTag },
  create: { userId, email: payload.ciphertext, emailIv: payload.iv, emailAuthTag: payload.authTag },
});
```

## Logging & Masking

Never log (even in debug):
- Access tokens, refresh tokens, JWTs, session cookies.
- Full email, phone, address, passport/license data.
- Payment details, Ton/crypto wallets, 2FA secrets.
- Telegram init payloads (`X-Telegram-Init-Data`), webhook raw bodies.
- Encryption keys, master key IDs, or IV/auth tags.

Safe logging pattern:
```ts
import pino from "pino";
import { maskEmail, maskPhone } from "../security/dataProtection.js";

const logger = pino({
  redact: ["req.headers.authorization", "req.body.token"],
});

logger.info({
  event: "user_update",
  email: maskEmail(user.email),
  phone: maskPhone(user.phone),
  userId: user.id,
});
```

Python (FastAPI) example:
```py
from app.logging import logger

def log_user_action(user, action: str) -> None:
    masked_email = mask_email(user.email)
    logger.info("user_action", extra={"user_id": user.id, "email": masked_email, "action": action})
```

## Access Control Patterns
- REST (FastAPI): attach `request.state.user_id` in `get_current_user` and enforce row ownership inside repository queries (`WHERE user_id = :current_user_id`). Admin routes require `require_admin_user` + Redis-backed rate limit (`backend/app/api/v1/routes/content.py`).
- GraphQL: wrap resolvers inside an authorization decorator that checks `ctx.user.id` against record owner or roles list before hitting the DB.
- Bot commands: store `ctx.from.id` ↔ backend `user_uuid`. Before returning sensitive info, call backend `/users/me` to confirm `is_admin` or record ownership; refuse if mismatch.

Example FastAPI dependency:
```py
async def require_resource_owner(
    user: UserPublic = Depends(get_current_user),
    record: Record = Depends(get_record),
) -> Record:
    if record.user_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="forbidden")
    return record
```

## Migration Strategy
1. **Add columns**: introduce new `user_sensitive` table with nullable encrypted columns plus metadata. Deploy with default values and background job to backfill digests.
2. **Backfill**: run idempotent batch job that reads plaintext email/phone from legacy columns, writes encrypted payload + `*_digest`, and marks row version.
3. **Dual write**: update API layer to write to both old and new columns; validate decrypt/encrypt path.
4. **Read path flip**: once ≥99% of rows populated, read from encrypted columns; keep legacy fields for rollback.
5. **Cleanup**: drop or archive plaintext columns. Export encrypted archive to cold storage before drop if legal requires.
6. **Key rotation**: design versioned `encryption_metadata` so rows can be re-encrypted with new keys without downtime.
7. **Data retention**: implement scheduled job that deletes inactive accounts or pseudonymizes PII after retention period; update audit log to reference `user_uuid` only.

## Summary Rules
1. Encrypt at rest everything beyond Telegram public data.
2. Hash + salt search fields; never store raw digests without salting.
3. Enforce strict logging redaction, request-level rate limits, and access guards.
4. Design migrations to be additive, reversible, and automated with audit logs for every schema change involving PII.
