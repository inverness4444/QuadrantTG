import { isIP } from "node:net";
import { z } from "zod";

const numeric = () => z.coerce.number().positive().optional();

const EnvSchema = z.object({
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
  WEBHOOK_SECRET: z.string().min(1, "WEBHOOK_SECRET is required"),
  WEBHOOK_PUBLIC_URL: z.string().url().optional(),
  BACKEND_API_BASE_URL: z.string().min(1, "BACKEND_API_BASE_URL is required"),
  NEXT_PUBLIC_TELEGRAM_MINIAPP_URL: z.string().url({ message: "NEXT_PUBLIC_TELEGRAM_MINIAPP_URL must be a valid URL" }),
  PORT: z.optional(z.string()),
  REDIS_URL: z.string().url().optional(),
  GLOBAL_RATE_LIMIT_WINDOW_MS: numeric(),
  GLOBAL_RATE_LIMIT_MAX: numeric(),
  IP_RATE_LIMIT_WINDOW_MS: numeric(),
  IP_RATE_LIMIT_MAX: numeric(),
  WEBHOOK_RATE_LIMIT_PER_SECOND: numeric(),
  BOT_USER_RATE_LIMIT_PER_SECOND: numeric(),
  BOT_HEAVY_COMMAND_LIMIT_PER_MINUTE: numeric(),
  MAX_HEAVY_JOBS_PER_MINUTE: numeric(),
  PII_ENCRYPTION_KEY: z.string().min(1, "PII_ENCRYPTION_KEY is required"),
  TRUSTED_PROXIES: z.string().optional()
});

const parsed = EnvSchema.parse(process.env);

const maskSecret = (value: string, visible = 2) => {
  if (!value) return "unset";
  if (value.length <= visible * 2) return `${value[0]}***`;
  return `${value.slice(0, visible)}***${value.slice(-visible)}`;
};

const parseTrustedProxies = (raw: string | undefined) => {
  if (!raw) return [];
  const entries = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  entries.forEach((entry) => {
    if (entry === "*" || entry === "0.0.0.0/0" || entry === "::/0") {
      throw new Error("TRUSTED_PROXIES must not contain wildcard entries");
    }
    if (entry.includes("/")) {
      const [ip, mask] = entry.split("/");
      const maskNumber = Number(mask);
      if (!isIP(ip) || Number.isNaN(maskNumber)) {
        throw new Error(`Invalid CIDR entry in TRUSTED_PROXIES: ${entry}`);
      }
      if ((isIP(ip) === 4 && (maskNumber < 0 || maskNumber > 32)) || (isIP(ip) === 6 && (maskNumber < 0 || maskNumber > 128))) {
        throw new Error(`Invalid mask in TRUSTED_PROXIES: ${entry}`);
      }
    } else if (!isIP(entry)) {
      throw new Error(`Invalid IP in TRUSTED_PROXIES: ${entry}`);
    }
  });
  return entries;
};

export const env = {
  botToken: parsed.BOT_TOKEN,
  webhookSecret: parsed.WEBHOOK_SECRET,
  webhookPublicUrl: parsed.WEBHOOK_PUBLIC_URL,
  backendApiBaseUrl: parsed.BACKEND_API_BASE_URL,
  miniAppUrl: parsed.NEXT_PUBLIC_TELEGRAM_MINIAPP_URL,
  port: parsed.PORT ? Number(parsed.PORT) : 8080,
  redisUrl: parsed.REDIS_URL ?? "redis://127.0.0.1:6379/0",
  globalRateLimitWindowMs: parsed.GLOBAL_RATE_LIMIT_WINDOW_MS ?? 1000,
  globalRateLimitMax: parsed.GLOBAL_RATE_LIMIT_MAX ?? 1500,
  ipRateLimitWindowMs: parsed.IP_RATE_LIMIT_WINDOW_MS ?? 10000,
  ipRateLimitMax: parsed.IP_RATE_LIMIT_MAX ?? 600,
  webhookRateLimitPerSecond: parsed.WEBHOOK_RATE_LIMIT_PER_SECOND ?? 25,
  botUserRateLimitPerSecond: parsed.BOT_USER_RATE_LIMIT_PER_SECOND ?? 3,
  botHeavyCommandLimitPerMinute: parsed.BOT_HEAVY_COMMAND_LIMIT_PER_MINUTE ?? 1,
  maxHeavyJobsPerMinute: parsed.MAX_HEAVY_JOBS_PER_MINUTE ?? 300,
  piiEncryptionKey: parsed.PII_ENCRYPTION_KEY,
  trustedProxies: parseTrustedProxies(parsed.TRUSTED_PROXIES)
};

if (process.env.NODE_ENV !== "production") {
  console.info("env_loaded", {
    backendApiBaseUrl: env.backendApiBaseUrl,
    redisUrl: env.redisUrl,
    botToken: maskSecret(env.botToken),
    webhookSecret: maskSecret(env.webhookSecret),
    piiEncryptionKey: maskSecret(env.piiEncryptionKey),
    trustedProxies: env.trustedProxies
  });
}
