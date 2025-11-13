## Logging Architecture

### Log Types
1. **Request logs** (HTTP & bot updates)
   - Fields: timestamp, method, path, status, duration, IP, user_id/chat_id, rate-limited flag.
   - Implemented via Express middleware in `bot/src/server.ts` and grammY middleware in `bot/src/bot.ts`.
2. **Security events**
   - Rate-limit hits (`rate_limit_user`, `rate_limit_chat`, `rate_limit_heavy_command`).
   - Suspicious behaviour (queue backlog, degraded mode, repeated auth failures).
   - Example log: `logger.warn({ event: "rate_limit_user", userId, chatId })`.
3. **System events**
   - Startup/shutdown, Redis disconnects, worker failures.
   - External dependency failures (circuit breaker fallback).

### Levels & Rules
- `debug`: temporary verbose info (enabled via `LOG_LEVEL=debug`). Never include tokens or raw Telegram payloads.
- `info`: normal flow (requests, job enqueued, service start).
- `warn`: anomalies (rate limits, degraded mode, slow queries).
- `error`: operational failures (exceptions, external timeouts).
- `security`: represented via `warn`/`error` with `event` field describing threat. No plaintext PII.
- **Never log** full tokens, refresh tokens, encryption keys, full emails/phones (use `maskSecret`, `maskEmail/Phone` utilities).

### Aggregation
- **Basic**: stdout + `pino-pretty` locally, pipe to files with logrotate if needed.
- **Advanced**: ship JSON logs to ELK/OpenSearch or managed services (Datadog, Logtail) via sidecar/agent (e.g., Vector/Fluent Bit). Index on `event`, `status`, `ip`, `userId`.

## Metrics & Alerts
- **Counters**: RPS, 4xx, 5xx, rate-limit hits, queue backlog length.
- **Gauges**: Redis latency, worker concurrency, circuit breaker open state.
- **Alerts**:
  - `rate_limit_user` spikes (>100/min) -> possible brute-force.
  - RPS > expected baseline (e.g., >200% average for 5min) -> DDoS suspicion.
  - Single IP with >N requests/min triggers warn log + webhook (use Redis to track).
  - External API timeouts > 5% over 10min.

## Debug Mode
- Toggle `LOG_LEVEL=debug` + `DEBUG_TRACE=1` via env or remote command.
- Debug logs should still redact PII; include correlation IDs (telegram update id, request id) to trace flows without secrets.
- Auto-expire debug mode (set TTL, e.g., 30 minutes) to avoid verbose logs lingering.

## Example: Suspicious Behaviour Log
```ts
logger.warn({
  event: "suspicious_ip_activity",
  ip: req.ip,
  path: req.path,
  hits_last_minute: 200
});
```

From bot queue guard:
```ts
logger.warn({
  event: "queue_backlog_drop",
  waiting: counts.waiting,
  delayed: counts.delayed
});
```
