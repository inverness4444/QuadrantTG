export function getApiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL env variable");
  }
  return value;
}

export function getTelegramBotName(): string {
  return process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME ?? "";
}

export function getTelegramMiniAppUrl(): string {
  return process.env.NEXT_PUBLIC_TELEGRAM_MINIAPP_URL ?? "";
}

export function getSentryDsn(): string {
  return process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";
}
