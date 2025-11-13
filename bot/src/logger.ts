import pino from "pino";

const redactPaths = [
  "req.headers.authorization",
  "req.body.token",
  "req.body.refresh",
  "res.body.token",
  "res.body.refresh"
];

const createLogger = () =>
  pino({
    level: process.env.LOG_LEVEL ?? "info",
    redact: {
      paths: redactPaths,
      censor: "[REDACTED]"
    },
    base: {
      service: "quadrant-tg-bot",
      env: process.env.NODE_ENV ?? "development"
    },
    transport:
      process.env.NODE_ENV === "production"
        ? undefined
        : {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "SYS:standard" }
          }
  });

export type Logger = ReturnType<typeof createLogger>;
export const logger = createLogger();
