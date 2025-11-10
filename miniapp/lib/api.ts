import type { MutableRefObject } from "react";
import type { ContentBundle, TokenPair } from "../types/api";
import { getApiBaseUrl } from "./env";
import { persistSession, updateStoredUser, updateTokens } from "./storage";

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export async function authenticateWithInitData(initData: string): Promise<TokenPair> {
  const response = await fetch(`${getApiBaseUrl()}/auth/telegram/miniapp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ init_data: initData })
  });

  if (!response.ok) {
    const message = `Authentication failed with status ${response.status}`;
    throw new Error(message);
  }

  const payload = await parseJson<TokenPair>(response);
  persistSession(payload);
  return payload;
}

export async function refreshSession(refreshToken: string): Promise<TokenPair> {
  const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refresh: refreshToken })
  });

  if (!response.ok) {
    throw new Error("refresh_failed");
  }

  const payload = await parseJson<TokenPair>(response);
  updateTokens(payload.access, payload.refresh);
  updateStoredUser(payload.user);
  return payload;
}

export interface AuthorizedFetchOptions {
  tokens: { access: string; refresh: string };
  refreshAttempted: MutableRefObject<boolean>;
  onTokens: (tokens: TokenPair) => void;
}

export async function fetchContentBundle(
  options: AuthorizedFetchOptions
): Promise<ContentBundle> {
  const { tokens, refreshAttempted, onTokens } = options;
  const runRequest = async (access: string): Promise<Response> =>
    fetch(`${getApiBaseUrl()}/content`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access}`
      }
    });

  let response = await runRequest(tokens.access);

  if (response.status === 401 && !refreshAttempted.current) {
    refreshAttempted.current = true;
    try {
      const refreshed = await refreshSession(tokens.refresh);
      onTokens(refreshed);
      response = await runRequest(refreshed.access);
    } catch (error) {
      throw new Error("refresh_failed");
    }
  }

  if (!response.ok) {
    throw new Error(`request_failed_${response.status}`);
  }

  return parseJson<ContentBundle>(response);
}
