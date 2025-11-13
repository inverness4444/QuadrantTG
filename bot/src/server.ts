import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import RedisStore, { type RedisReply, type SendCommandFn } from "rate-limit-redis";
import { webhookCallback } from "grammy";
import pkg from "../package.json" assert { type: "json" };
import { bot } from "./bot.js";
import { env } from "./env.js";
import { redis } from "./redis.js";
import { logger } from "./logger.js";
import { configureTrustProxy, getClientIp } from "./network.js";
import { anonymizeIp } from "./logging/anonymize.js";

export const app = express();
const appVersion = pkg.version ?? "0.0.0";

configureTrustProxy(app);

const redisSendCommand: SendCommandFn = (...args) => {
  if (args.length === 0) {
    return Promise.reject(new Error("redis_command_required"));
  }
  const [command, ...rest] = args;
  return redis.call(command, ...rest) as Promise<RedisReply>;
};

const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
const shouldUseRedisStore = !isTestEnv;
const createRedisStore = () =>
  shouldUseRedisStore
    ? new RedisStore({
        sendCommand: redisSendCommand
      })
    : undefined;

const globalLimiter = rateLimit({
  windowMs: env.globalRateLimitWindowMs,
  max: env.globalRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => getClientIp(req),
  handler: (_req, res) => {
    res.status(429).json({ ok: false, description: "service_overloaded" });
  },
  store: createRedisStore()
});

const ipLimiter = rateLimit({
  windowMs: env.ipRateLimitWindowMs,
  max: env.ipRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: (_req, res) => {
    res.status(429).json({ ok: false, description: "too_many_requests" });
  },
  store: createRedisStore()
});

const webhookIpLimiter = rateLimit({
  windowMs: 60_000,
  max: env.webhookIpLimitPerMinute,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  handler: (_req, res) => {
    res.status(429).json({ ok: false, description: "too many requests" });
  },
  store: createRedisStore()
});

const webhookLimiter = rateLimit({
  windowMs: 1000,
  max: env.webhookRateLimitPerSecond,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const secret = req.get("X-Telegram-Bot-Api-Secret-Token");
    return secret ?? getClientIp(req);
  },
  handler: (_req, res) => {
    res.status(429).json({ ok: false, description: "too_many_updates" });
  },
  store: createRedisStore()
});

const webhookSlowdown = slowDown({
  windowMs: 60_000,
  delayAfter: env.webhookRateLimitPerSecond * 10,
  delayMs: (hits: number) => Math.min(hits * 50, 2000)
});

app.use(express.json({ limit: "256kb" }));
app.use((req, res, next) => {
  res.setTimeout(env.requestTimeoutMs, () => {
    if (!res.headersSent) {
      logger.warn({ event: "http_timeout", path: req.path });
      res.status(503).json({ ok: false, description: "request_timeout" });
    }
  });
  next();
});
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(
      {
        event: "http_request",
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: duration,
        ip: anonymizeIp(getClientIp(req)),
        rateLimited: res.statusCode === 429
      },
      "http_request_completed"
    );
  });
  next();
});
app.use(globalLimiter);
app.use(ipLimiter);

app.get("/healthz", (_req, res) => {
  res.status(200).json({
    status: "ok",
    version: appVersion,
    uptime: Math.round(process.uptime()),
    env: process.env.NODE_ENV ?? "development"
  });
});

const botWebhook = webhookCallback(bot, "express");

const verifyWebhookSecret = (req: Request, res: Response, next: NextFunction) => {
  const secret = req.get("X-Telegram-Bot-Api-Secret-Token");
  if (secret !== env.webhookSecret) {
    logger.warn({
      event: "invalid_webhook_secret",
      ip: anonymizeIp(getClientIp(req))
    });
    return res.status(401).json({ ok: false, description: "invalid secret" });
  }
  return next();
};

app.post(
  "/telegram/webhook",
  webhookIpLimiter,
  webhookLimiter,
  webhookSlowdown,
  verifyWebhookSecret,
  (req: Request, res: Response, next: NextFunction) => {
    return botWebhook(req, res).catch(next);
  }
);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  logger.error(
    {
      event: "http_error",
      error: err instanceof Error ? err.message : String(err),
      path: req.path
    },
    "unexpected_http_error"
  );
  res.status(500).json({ ok: false });
});

export const startServer = () =>
  app.listen(env.port, () => {
    logger.info({ event: "service_startup", port: env.port }, "bot_webhook_ready");
  });

if (process.env.NODE_ENV !== "test") {
  startServer();
}
