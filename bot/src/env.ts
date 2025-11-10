import { z } from "zod";

const EnvSchema = z.object({
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
  WEBHOOK_SECRET: z.string().min(1, "WEBHOOK_SECRET is required"),
  WEBHOOK_PUBLIC_URL: z.string().url().optional(),
  BACKEND_API_BASE_URL: z.string().min(1, "BACKEND_API_BASE_URL is required"),
  NEXT_PUBLIC_TELEGRAM_MINIAPP_URL: z.string().url({ message: "NEXT_PUBLIC_TELEGRAM_MINIAPP_URL must be a valid URL" }),
  PORT: z.optional(z.string())
});

const parsed = EnvSchema.parse(process.env);

export const env = {
  botToken: parsed.BOT_TOKEN,
  webhookSecret: parsed.WEBHOOK_SECRET,
  webhookPublicUrl: parsed.WEBHOOK_PUBLIC_URL,
  backendApiBaseUrl: parsed.BACKEND_API_BASE_URL,
  miniAppUrl: parsed.NEXT_PUBLIC_TELEGRAM_MINIAPP_URL,
  port: parsed.PORT ? Number(parsed.PORT) : 8080
};
