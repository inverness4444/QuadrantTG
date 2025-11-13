import { Redis } from "ioredis";

import { env } from "./env.js";
import { logger } from "./logger.js";

const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

const redisOptions = {
  enableAutoPipelining: true,
  lazyConnect: isTestEnv
};

export const createRedisClient = () => new Redis(env.redisUrl, redisOptions);

export const redis = createRedisClient();

redis.on("error", (error) => {
  logger.error({ event: "redis_connection_error", error: error.message });
});

redis.on("connect", () => {
  logger.info({ event: "redis_connected" });
});
