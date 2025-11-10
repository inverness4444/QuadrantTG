import Constants from "expo-constants";
import { NativeModules } from "react-native";

const stripScheme = (value: string) => value.replace(/^(https?:\/\/|exp:\/\/)/u, "");

const extractHost = (value?: string | null): string | undefined => {
  if (!value || typeof value !== "string") {
    return undefined;
  }
  const cleaned = stripScheme(value);
  const host = cleaned.split(/[/:]/u)[0];
  if (!host || host === "localhost" || host === "127.0.0.1") {
    return undefined;
  }
  return host;
};

const resolveDefaultApiUrl = () => {
  const scriptURL = (NativeModules as unknown as { SourceCode?: { scriptURL?: string } })?.SourceCode
    ?.scriptURL;
  if (typeof scriptURL === "string") {
    try {
      const parsed = new URL(scriptURL);
      const host = extractHost(parsed.host);
      if (host) {
        return `http://${host}:8001`;
      }
    } catch {
      // ignore parse errors
    }
  }

  const manifest = (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest;
  const expoGo = (Constants as unknown as { expoGoConfig?: { hostUri?: string | null } }).expoGoConfig;

  const candidates: Array<string | undefined> = [
    Constants.expoConfig?.hostUri,
    expoGo?.hostUri ?? undefined,
    manifest?.debuggerHost
  ];

  for (const candidate of candidates) {
    const host = extractHost(candidate);
    if (host) {
      return `http://${host}:8001`;
    }
  }
  return "http://localhost:8001";
};

const defaultApiUrl = resolveDefaultApiUrl();

const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;

export const API_URL =
  (typeof extra?.apiUrl === "string" && extra.apiUrl) ||
  (typeof process.env.EXPO_PUBLIC_API_URL === "string" && process.env.EXPO_PUBLIC_API_URL) ||
  defaultApiUrl;

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log("[api] Using API base URL:", API_URL);
}

type FetchOptions = RequestInit & { token?: string };

export const apiFetch = async <T>(path: string, options: FetchOptions = {}): Promise<T> => {
  const url = `${API_URL}${path}`;
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  const response = await fetch(url, {
    ...options,
    headers
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorText}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const contentLength = response.headers.get("Content-Length");
  if (contentLength === "0") {
    return undefined as T;
  }
  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as T;
  }
};
