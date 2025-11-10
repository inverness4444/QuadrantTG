import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import { webhookCallback } from "grammy";
import { bot } from "./bot.js";
import { env } from "./env.js";

const app = express();

app.use(express.json({ limit: "1mb" }));

app.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

const botWebhook = webhookCallback(bot, "express");

app.post("/telegram/webhook", (req: Request, res: Response, next: NextFunction) => {
  const secret = req.get("X-Telegram-Bot-Api-Secret-Token");
  if (secret !== env.webhookSecret) {
    return res.status(401).json({ ok: false, description: "invalid secret" });
  }
  return botWebhook(req, res, next);
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("bot_http_error", err);
  res.status(500).json({ ok: false });
});

app.listen(env.port, () => {
  console.log(`Bot webhook listening on port ${env.port}`);
});
