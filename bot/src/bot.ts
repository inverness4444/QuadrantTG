import { Bot, GrammyError, HttpError } from "grammy";
import { env } from "./env.js";

export const bot = new Bot(env.botToken);

bot.use(async (ctx, next) => {
  console.info("update_received", { update_id: ctx.update.update_id });
  await next();
});

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

bot.catch((err) => {
  const ctx = err.ctx;
  console.error("bot_error", {
    update_id: ctx.update.update_id,
    error: err.error instanceof GrammyError ? err.error.message : err.error instanceof HttpError ? err.error.message : String(err.error)
  });
});
