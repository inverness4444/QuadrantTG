import type { TokenPair } from "../types/api";

const ACCESS_KEY = "quadrant_tg_access";
const REFRESH_KEY = "quadrant_tg_refresh";
const USER_KEY = "quadrant_tg_user";
const SESSION_FLAG = "tgAuthDone";

export function readStoredSession(): TokenPair | null {
  if (typeof window === "undefined") {
    return null;
  }
  const access = window.localStorage.getItem(ACCESS_KEY);
  const refresh = window.localStorage.getItem(REFRESH_KEY);
  const userRaw = window.localStorage.getItem(USER_KEY);
  const sessionReady = window.sessionStorage.getItem(SESSION_FLAG) === "1";
  if (!access || !refresh || !userRaw || !sessionReady) {
    return null;
  }
  try {
    const user = JSON.parse(userRaw);
    return { access, refresh, user };
  } catch (error) {
    console.warn("Failed to parse stored user payload", error);
    return null;
  }
}

export function persistSession(pair: TokenPair): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ACCESS_KEY, pair.access);
  window.localStorage.setItem(REFRESH_KEY, pair.refresh);
  window.localStorage.setItem(USER_KEY, JSON.stringify(pair.user));
  window.sessionStorage.setItem(SESSION_FLAG, "1");
}

export function updateTokens(access: string, refresh: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ACCESS_KEY, access);
  window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function updateStoredUser(user: TokenPair["user"]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(SESSION_FLAG);
}

export function markHandshakeAttempted(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(SESSION_FLAG, "1");
}

export function handshakeAttempted(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.sessionStorage.getItem(SESSION_FLAG) === "1";
}
