declare global {
  interface TelegramWebAppUser {
    id: number;
    is_bot?: boolean;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    photo_url?: string;
  }

  interface TelegramWebApp {
    initData: string;
    ready(): void;
    expand(): void;
    colorScheme?: "light" | "dark";
    initDataUnsafe?: {
      user?: TelegramWebAppUser;
    };
  }

  interface TelegramWindow extends Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }

  interface Window extends TelegramWindow {}
}

export {};
