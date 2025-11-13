import { type JobsOptions, Queue } from "bullmq";

import { createRedisClient } from "./redis.js";

const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

export type ReportJobData = {
  chatId: number;
  userId: number;
  requestedAt: number;
};

export const queueConnection = createRedisClient();

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000
  },
  removeOnComplete: 1000,
  removeOnFail: 5000
};

const stubQueue = {
  name: "heavy-ops",
  add: async () => undefined,
  getJobCounts: async () => ({ waiting: 0, delayed: 0, active: 0, completed: 0, failed: 0, paused: 0 })
};

export const heavyOpsQueue = isTestEnv
  ? (stubQueue as unknown as Queue<ReportJobData>)
  : new Queue<ReportJobData>("heavy-ops", {
      connection: queueConnection,
      defaultJobOptions
    });
