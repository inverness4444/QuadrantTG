import "dotenv/config";
import { Worker } from "bullmq";

import { bot } from "./bot.js";
import { callBackendJson } from "./externalClient.js";
import { queueConnection, heavyOpsQueue, type ReportJobData } from "./queue.js";

const queueName = heavyOpsQueue.name;

const worker = new Worker<ReportJobData>(
  queueName,
  async (job) => {
    const result = await callBackendJson<{ status: string }>("/health/ready");
    const status = result.data?.status ?? "unknown";
    const header = result.degraded
      ? "⚠️ Backend перегружен — показываем последние известные данные."
      : "✅ Отчёт готов.";

    await bot.api.sendMessage(
      job.data.chatId,
      `${header}\nСтатус: ${status}\nЗапрошено пользователем: ${job.data.userId}\nВремя запроса: ${new Date(job.data.requestedAt).toLocaleString()}`
    );
  },
  {
    connection: queueConnection,
    concurrency: 3
  }
);

worker.on("completed", (job) => {
  console.info("heavy_job_completed", { jobId: job.id });
});

worker.on("failed", async (job, err) => {
  console.error("heavy_job_failed", { jobId: job?.id, error: err.message });
  if (job?.data?.chatId) {
    try {
      await bot.api.sendMessage(job.data.chatId, "Не удалось собрать отчёт. Попробуйте чуть позже.");
    } catch (notifyError) {
      console.error("heavy_job_failure_notification_error", notifyError);
    }
  }
});
