## 1. Load Test Plan

### Scenarios
1. **Baseline ramp**  
   - Ramp from 10 → 300 RPS over 10 minutes against `/telegram/webhook` (mock updates) and `/api/v1/content`.  
   - Mix of 70% authenticated bot users, 20% anonymous health checks, 10% admin calls.
2. **Bursty traffic**  
   - Short spikes (500 RPS for 30 seconds every 2 minutes) to validate rate-limiter recovery and Redis stability.
3. **Long-lived sessions**  
   - Persistent connections simulating Mini App usage: refresh tokens every 15 minutes, fetch content, submit progress for 30 minutes.
4. **Adversarial “spammy” clients**  
   - Single IP firing 100 RPS to test `rate_limit_user` and `ipLimiter` reactions.  
   - Multiple Telegram `chat_id`s issuing `/report` to hit the heavy job queue.

### User Types
- **New users**: call `/auth/telegram/miniapp` followed by content fetch.
- **Authorized users**: reuse JWT/refresh, call `/users/me`, `/content`.
- **Admins**: CRUD operations via `/content/admin/*`.
- **Spam clients**: intentionally exceed limits to trigger 429s.

## 2. Tooling & Example Scenario
- Recommended tools: **k6** for HTTP API, **Artillery** (with custom script) for Telegram webhook, **Locust** for long sessions. All run only on staging/prod owned by us.

Example k6 script (`tests/load/burst.js`):
```js
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "2m", target: 50 },
    { duration: "2m", target: 200 },
    { duration: "1m", target: 500 },
    { duration: "2m", target: 50 }
  ],
  thresholds: {
    http_req_duration: ["p(95)<400", "p(99)<800"],
    http_req_failed: ["rate<0.02"]
  }
};

const token = __ENV.TEST_BOT_TOKEN;

export default () => {
  const res = http.post(
    `${__ENV.BASE_URL}/telegram/webhook`,
    JSON.stringify({ update_id: Date.now(), message: { text: "/report" } }),
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": __ENV.WEBHOOK_SECRET,
        Authorization: `Bearer ${token}`
      }
    }
  );
  check(res, {
    "status is 200|429": (r) => r.status === 200 || r.status === 429
  });
  sleep(1);
};
```

Metrics to capture:
- Latency percentiles (p50/p95/p99), request throughput, error rate, 429 counts.
- Resource: CPU, memory, Redis ops/sec, DB connections, queue backlog (`heavyOpsQueue` stats).
- Saturation signals: middleware latency >500 ms, Redis command latency >5 ms, job queue waiting >200.

## 3. Security Test Checklist
1. **Input fuzzing**: extremely long strings (10k chars), emojis, SQL meta characters in Telegram commands and API payloads.
2. **Rate-limit bypass**: vary headers (`X-Forwarded-For`), rotate tokens/user IDs to ensure limits apply correctly.
3. **IDOR/authorization**:  
   - Attempt to access `/content/admin` without admin flag.  
   - Modify `user_id` in `/users/me/usage` payload to ensure backend ignores client-supplied IDs.  
   - Request other users’ resources by guessing IDs; expect 403/404.
4. **Replay attacks**: reuse Telegram `init_data` after expiry; verify signature validation fails.
5. **Job queue abuse**: enqueue heavy jobs rapidly to confirm backlog guard and alerts.
6. **Config/secret exposure**: inspect responses/logs to confirm secrets masked, no stack traces with tokens.

## 4. Safe Execution Guidelines
- Run tests on **staging** mirroring prod resources; only run on prod during agreed windows with rollback ready.
- Coordinate with infra team: announce load window, ensure autoscaling/waf rules aware of test IPs to avoid bans.
- Limit concurrency to below provider quotas; monitor cost.
- After test, collect logs, metrics, and reset rate-limit counters (flush Redis in staging).
