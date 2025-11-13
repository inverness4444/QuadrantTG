import { redis } from "./redis.js";
import { env } from "./env.js";

const WINDOW_MS = 60_000;

export const checkHeavyJobAllowance = async () => {
  if (env.maxHeavyJobsPerMinute <= 0) {
    return true;
  }
  const window = Math.floor(Date.now() / WINDOW_MS);
  const key = `heavy_jobs:${window}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 120);
  }
  return count <= env.maxHeavyJobsPerMinute;
};
