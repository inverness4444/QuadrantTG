import CircuitBreaker from "opossum";
import { fetch, type RequestInit } from "undici";

import { env } from "./env.js";

type BackendResult<T> = {
  degraded: boolean;
  data: T | null;
};

type FetchArgs = {
  path: string;
  init?: RequestInit;
  timeoutMs?: number;
};

const joinUrl = (path: string) => {
  const cleanedBase = env.backendApiBaseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanedBase}${normalizedPath}`;
};

const fetchWithTimeout = async <T>({ path, init, timeoutMs = 5000 }: FetchArgs): Promise<BackendResult<T>> => {
  const url = joinUrl(path);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`backend_http_${response.status}`);
    }
    const data = (await response.json()) as T;
    return { degraded: false, data };
  } finally {
    clearTimeout(timeout);
  }
};

const breaker = new CircuitBreaker(fetchWithTimeout, {
  timeout: 6000,
  errorThresholdPercentage: 50,
  resetTimeout: 15000,
  rollingCountTimeout: 10000,
  volumeThreshold: 10
});

breaker.fallback(() => ({ degraded: true, data: null }));

export const callBackendJson = async <T>(path: string, init?: RequestInit, timeoutMs?: number): Promise<BackendResult<T>> => {
  const result = await breaker.fire({ path, init, timeoutMs });
  return result as BackendResult<T>;
};

export const isExternalDegraded = () => breaker.opened;
