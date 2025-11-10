import React, { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import { AppRoot } from "../components/AppRoot";

const mockTokens = {
  access: "access-token",
  refresh: "refresh-token",
  user: {
    id: 42,
    username: "explorer",
    first_name: "Test",
    last_name: "User",
    locale: "en",
    is_admin: false,
    app_seconds_spent: 3600
  }
};

const mockContent = {
  courses: [
    {
      id: 1,
      title: "Focus Fundamentals",
      summary: "Sharpen your attention with micro-habits.",
      duration_minutes: 45,
      difficulty: "easy",
      image_url: null,
      category: null
    }
  ],
  course_categories: [],
  books: [
    {
      id: 1,
      title: "Mindful Routines",
      author: "Quadrant",
      synopsis: "Daily anchors to stay aligned.",
      pages: 120,
      image_url: null,
      category: { id: 1, label: "Focus", description: null }
    }
  ],
  book_categories: []
};

describe("Telegram Mini App handshake", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.test";
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME = "QuadrantBot";
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.resetAllMocks();
    window.Telegram = undefined;
    process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME = originalEnv.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
  });

  it("performs a single authentication exchange and never reloads", async () => {
    const telegramMock: TelegramWebApp = {
      ready: vi.fn(),
      expand: vi.fn(),
      initData: "user=%7B%22id%22%3A42%2C%22first_name%22%3A%22Test%22%7D&auth_date=111&hash=abc",
      initDataUnsafe: { user: { id: 42 } }
    };
    window.Telegram = { WebApp: telegramMock };

    const fetchMock = vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.endsWith("/auth/telegram/miniapp")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockTokens), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        );
      }
      if (url.endsWith("/content")) {
        return Promise.resolve(
          new Response(JSON.stringify(mockContent), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
        );
      }
      return Promise.reject(new Error(`Unhandled fetch request: ${url}`));
    });

    const locationProto = Object.getPrototypeOf(window.location) as Location;
    const originalReload = locationProto.reload;
    const reloadSpy = vi.fn();
    locationProto.reload = reloadSpy as unknown as () => void;
    const initialHref = window.location.href;

    render(
      <StrictMode>
        <AppRoot />
      </StrictMode>
    );

    await screen.findByText(/Welcome back/i);

    const postCalls = fetchMock.mock.calls.filter(([, init]) => (init?.method ?? "GET") === "POST");
    expect(postCalls).toHaveLength(1);

    expect(reloadSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10_000);
    expect(window.location.href).toBe(initialHref);

    locationProto.reload = originalReload;
  });

  it("shows open in telegram screen when init data missing", async () => {
    const telegramMock: TelegramWebApp = {
      ready: vi.fn(),
      expand: vi.fn(),
      initData: ""
    };
    window.Telegram = { WebApp: telegramMock };

    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(null, { status: 400 })
    );
    const locationProto = Object.getPrototypeOf(window.location) as Location;
    const originalReload = locationProto.reload;
    const reloadSpy = vi.fn();
    locationProto.reload = reloadSpy as unknown as () => void;

    render(
      <StrictMode>
        <AppRoot />
      </StrictMode>
    );

    await screen.findByText(/Open in Telegram/i);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();

    locationProto.reload = originalReload;
  });
});
