import { type JobsOptions, Queue } from "bullmq";

import { createRedisClient } from "./redis.js";

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

export const heavyOpsQueue = new Queue<ReportJobData>("heavy-ops", {
  connection: queueConnection,
  defaultJobOptions
});
