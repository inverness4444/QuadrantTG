import { Redis } from "ioredis";

import { env } from "./env.js";

const redisOptions = {
  enableAutoPipelining: true
};

export const createRedisClient = () => new Redis(env.redisUrl, redisOptions);

export const redis = createRedisClient();

redis.on("error", (error) => {
  console.error("redis_connection_error", { error: error.message });
});

redis.on("connect", () => {
  console.info("redis_connected");
});
