import { apiFetch } from "./api";

export type UserProfileResponse = {
  id: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  locale: string;
  is_admin: boolean;
  app_seconds_spent: number;
};

const requireTelegramHeaders = (telegramInitData?: string) => {
  if (!telegramInitData) {
    throw new Error("telegram_auth_required");
  }
  return {
    "X-Telegram-Init-Data": telegramInitData
  } as const;
};

export const reportUsageTime = async (
  seconds: number,
  telegramInitData?: string
): Promise<UserProfileResponse> => {
  const headers = requireTelegramHeaders(telegramInitData);
  return apiFetch<UserProfileResponse>("/api/v1/users/me/usage", {
    method: "POST",
    body: JSON.stringify({ seconds }),
    headers
  });
};
