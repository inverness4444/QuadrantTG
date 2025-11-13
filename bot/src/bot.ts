import { Bot, GrammyError, HttpError, type Context } from "grammy";
import { limit } from "@grammyjs/ratelimiter";
import type { MiddlewareFn } from "grammy";
import { env } from "./env.js";
import { isExternalDegraded } from "./externalClient.js";
import { redis } from "./redis.js";
import { heavyOpsQueue } from "./queue.js";
import { logger } from "./logger.js";
import { anonymizeId } from "./logging/anonymize.js";
import { checkHeavyJobAllowance } from "./jobRateLimiter.js";

export const bot = new Bot(env.botToken);

type BotContext = Context;
type RedisClient = typeof redis;

bot.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  logger.info({
    event: "bot_update",
    updateId: ctx.update.update_id,
    chat: anonymizeId(ctx.chat?.id),
    user: anonymizeId(ctx.from?.id),
    duration_ms: Date.now() - start
  });
});

const userLimiter = limit<BotContext, RedisClient>({
  timeFrame: 1000,
  limit: env.botUserRateLimitPerSecond,
  storageClient: redis,
  keyGenerator: (ctx) => `user:${ctx.from?.id ?? "unknown"}`,
  onLimitExceeded: async (ctx) => {
    logger.warn({
      event: "rate_limit_user",
      user: anonymizeId(ctx.from?.id),
      chat: anonymizeId(ctx.chat?.id)
    });
    if (ctx.chat?.id) {
      await ctx.reply("Пожалуйста, не спешите — мы уже обрабатываем ваши запросы.");
    }
  }
});

const chatLimiter = limit<BotContext, RedisClient>({
  timeFrame: 1000,
  limit: env.botUserRateLimitPerSecond * 2,
  storageClient: redis,
  keyGenerator: (ctx) => `chat:${ctx.chat?.id ?? "unknown"}`,
  onLimitExceeded: async (ctx) => {
    logger.warn({
      event: "rate_limit_chat",
      user: anonymizeId(ctx.from?.id),
      chat: anonymizeId(ctx.chat?.id)
    });
    if (ctx.chat?.id) {
      await ctx.reply("Чат перегружен запросами. Попробуйте ещё раз чуть позже.");
    }
  }
});

bot.use(userLimiter);
bot.use(chatLimiter);

bot.command("start", async (ctx) => {
  await ctx.reply(
    "Quadrant Mini App is ready whenever you are. Launch the web experience to sync your progress.",
    {
      reply_markup: {
        inline_keyboard: [[{ text: "Open app", web_app: { url: env.miniAppUrl } }]]
      }
    }
  );
});

const heavyCommandLimiter = limit<BotContext, RedisClient>({
  timeFrame: 60_000,
  limit: env.botHeavyCommandLimitPerMinute,
  storageClient: redis,
  keyGenerator: (ctx) => `heavy:${ctx.from?.id ?? "unknown"}`,
  onLimitExceeded: async (ctx) => {
    logger.warn({
      event: "rate_limit_heavy_command",
      user: anonymizeId(ctx.from?.id)
    });
    await ctx.reply("Запрашивать отчёт можно не чаще одного раза в минуту.");
  }
});

const queueBacklogGuard: MiddlewareFn = async (ctx, next) => {
  if (isExternalDegraded()) {
    logger.warn({ event: "degraded_mode_reject", chat: anonymizeId(ctx.chat?.id) });
    await ctx.reply("Сервис сейчас работает в ограниченном режиме. Попробуйте позже.");
    return;
  }
  const counts = await heavyOpsQueue.getJobCounts();
  if (counts.waiting + counts.delayed > 250) {
    logger.warn({
      event: "queue_backlog_drop",
      waiting: counts.waiting,
      delayed: counts.delayed
    });
    await ctx.reply("Мы сейчас заняты обработкой других задач. Повторите попытку позже.");
    return;
  }
  await next();
};

bot.command("report", heavyCommandLimiter, queueBacklogGuard, async (ctx) => {
  if (!ctx.chat?.id || !ctx.from?.id) {
    await ctx.reply("Не удалось определить чат/пользователя для отчёта.");
    return;
  }
  const allowed = await checkHeavyJobAllowance();
  if (!allowed) {
    logger.warn({ event: "heavy_job_global_limit", chat: anonymizeId(ctx.chat.id) });
    await ctx.reply("Сейчас слишком много запросов на отчёт. Попробуйте позже.");
    return;
  }
  await heavyOpsQueue.add("report", {
    chatId: ctx.chat.id,
    userId: ctx.from.id,
    requestedAt: Date.now()
  });
  logger.info({
    event: "report_job_enqueued",
    chat: anonymizeId(ctx.chat.id),
    user: anonymizeId(ctx.from.id)
  });
  await ctx.reply("Готовим отчёт и пришлём сообщение, как только всё будет готово.");
});

bot.catch((err) => {
  const ctx = err.ctx;
  logger.error({
    event: "bot_error",
    updateId: ctx.update.update_id,
    error:
      err.error instanceof GrammyError
        ? err.error.message
        : err.error instanceof HttpError
          ? err.error.message
          : String(err.error)
  });
});
