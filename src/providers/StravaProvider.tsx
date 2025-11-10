import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { makeRedirectUri } from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";

type StravaAuthPayload = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  athlete: {
    id: number;
    firstname: string;
    lastname?: string;
    profile_medium?: string;
  };
};

type StravaActivity = {
  id: number;
  distance: number;
  type: string;
  start_date: string;
};

type StravaContextValue = {
  isConnected: boolean;
  athlete?: StravaAuthPayload["athlete"];
  dailySteps: number;
  lastSyncedAt?: number;
  isSyncing: boolean;
  isConfigured: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  error?: string;
};

const StravaContext = createContext<StravaContextValue | undefined>(undefined);

const STORAGE_KEY = "quadrant_stravaAuth";
const STEP_ELIGIBLE_ACTIVITIES = new Set(["Walk", "Run", "Hike", "VirtualRun", "TrailRun"]);
const METERS_PER_STEP = 0.78; // Average stride length in meters

const secureStoreAvailablePromise = SecureStore.isAvailableAsync().catch(() => false);

let memoryCache: string | null = null;

const storeAuthPayload = async (value?: StravaAuthPayload) => {
  const payload = value ? JSON.stringify(value) : null;
  try {
    const available = await secureStoreAvailablePromise;
    if (available) {
      if (payload) {
        await SecureStore.setItemAsync(STORAGE_KEY, payload);
      } else {
        await SecureStore.deleteItemAsync(STORAGE_KEY);
      }
    } else {
      memoryCache = payload;
    }
  } catch (error) {
    console.warn("Failed to persist Strava auth payload", error);
    memoryCache = payload;
  }
};

const readAuthPayload = async (): Promise<StravaAuthPayload | undefined> => {
  try {
    const available = await secureStoreAvailablePromise;
    let raw: string | null;
    if (available) {
      raw = await SecureStore.getItemAsync(STORAGE_KEY);
    } else {
      raw = memoryCache;
    }
    if (!raw) {
      return undefined;
    }
    return JSON.parse(raw) as StravaAuthPayload;
  } catch (error) {
    console.warn("Failed to read Strava auth payload", error);
    return undefined;
  }
};

const getConfig = () => {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const clientId =
    extra?.stravaClientId ??
    extra?.STRAVA_CLIENT_ID ??
    process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID ??
    process.env.STRAVA_CLIENT_ID;
  const clientSecret =
    extra?.stravaClientSecret ??
    extra?.STRAVA_CLIENT_SECRET ??
    process.env.EXPO_PUBLIC_STRAVA_CLIENT_SECRET ??
    process.env.STRAVA_CLIENT_SECRET;

  const parsedClientId = typeof clientId === "string" && clientId.trim().length > 0 ? clientId.trim() : undefined;
  const parsedClientSecret =
    typeof clientSecret === "string" && clientSecret.trim().length > 0 ? clientSecret.trim() : undefined;

  return {
    clientId: parsedClientId,
    clientSecret: parsedClientSecret
  };
};

const exchangeToken = async (code: string, clientId: string, clientSecret: string) => {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code"
    })
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`token_exchange_failed:${errorPayload}`);
  }

  const data = await response.json();
  const payload: StravaAuthPayload = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athlete: {
      id: data.athlete?.id,
      firstname: data.athlete?.firstname ?? "",
      lastname: data.athlete?.lastname ?? "",
      profile_medium: data.athlete?.profile_medium ?? undefined
    }
  };
  return payload;
};

const refreshAccessToken = async (refreshToken: string, clientId: string, clientSecret: string) => {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`refresh_failed:${errorPayload}`);
  }

  const data = await response.json();
  const payload: StravaAuthPayload = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athlete: {
      id: data.athlete?.id,
      firstname: data.athlete?.firstname ?? "",
      lastname: data.athlete?.lastname ?? "",
      profile_medium: data.athlete?.profile_medium ?? undefined
    }
  };
  return payload;
};

const computeStepsFromActivities = (activities: StravaActivity[]): number => {
  let totalSteps = 0;
  for (const activity of activities) {
    if (!STEP_ELIGIBLE_ACTIVITIES.has(activity.type)) {
      continue;
    }
    const distance = typeof activity.distance === "number" ? activity.distance : 0;
    if (distance <= 0) {
      continue;
    }
    totalSteps += Math.round(distance / METERS_PER_STEP);
  }
  return totalSteps;
};

const fetchTodaysActivities = async (accessToken: string): Promise<StravaActivity[]> => {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const after = Math.floor(midnight.getTime() / 1000);

  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=50&after=${after}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(`activities_failed:${errorPayload}`);
  }

  const data = (await response.json()) as StravaActivity[];
  return Array.isArray(data) ? data : [];
};

type StravaProviderProps = {
  children: React.ReactNode;
};

export const StravaProvider = ({ children }: StravaProviderProps) => {
  const [authPayload, setAuthPayload] = useState<StravaAuthPayload | undefined>(undefined);
  const [dailySteps, setDailySteps] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | undefined>(undefined);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const config = useMemo(() => getConfig(), []);
  const isConfigured = Boolean(config.clientId && config.clientSecret);

  const isMounted = useRef(true);

  const syncActivities = useCallback(
    async (
      payload: StravaAuthPayload,
      options: { silent?: boolean } = {}
    ) => {
      const { clientId, clientSecret } = config;
      if (!clientId || !clientSecret) {
        throw new Error("coming_soon");
      }

      if (!options.silent) {
        setIsSyncing(true);
      }
      try {
        let workingPayload = payload;
        const now = Math.floor(Date.now() / 1000);
        if (payload.expiresAt <= now + 60) {
          workingPayload = await refreshAccessToken(payload.refreshToken, clientId, clientSecret);
          if (isMounted.current) {
            setAuthPayload(workingPayload);
          }
          await storeAuthPayload(workingPayload);
        }

        const activities = await fetchTodaysActivities(workingPayload.accessToken);
        const steps = computeStepsFromActivities(activities);
        if (isMounted.current) {
          setDailySteps(steps);
          setLastSyncedAt(Date.now());
        }
      } finally {
        if (!options.silent && isMounted.current) {
          setIsSyncing(false);
        }
      }
    },
    [config]
  );

const connect = useCallback(async () => {
  setError(undefined);
  const { clientId, clientSecret } = config;
  if (!clientId || !clientSecret) {
    throw new Error("coming_soon");
  }

    const redirectUri = makeRedirectUri({ path: "strava-auth" });
    const authUrl = `https://www.strava.com/oauth/mobile/authorize?client_id=${encodeURIComponent(
      clientId
    )}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&approval_prompt=auto&scope=${encodeURIComponent("read,activity:read_all")}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
    if (result.type === "dismiss" || result.type === "cancel") {
      throw new Error("cancelled");
    }
    if (result.type !== "success" || !result.url) {
      throw new Error("auth_failed");
    }

    const url = new URL(result.url);
    const code = url.searchParams.get("code");
    if (!code) {
      throw new Error("missing_code");
    }

    const payload = await exchangeToken(code, clientId, clientSecret);
    if (isMounted.current) {
      setAuthPayload(payload);
      setError(undefined);
    }
    await storeAuthPayload(payload);
  await syncActivities(payload);
}, [config, syncActivities]);

  useEffect(() => {
    isMounted.current = true;
    (async () => {
      const existing = await readAuthPayload();
      if (existing) {
        setAuthPayload(existing);
        if (isConfigured) {
          try {
            await syncActivities(existing, { silent: true });
          } catch (err) {
            console.warn("Initial Strava sync failed", err);
          }
        }
      }
    })();
    return () => {
      isMounted.current = false;
    };
  }, [isConfigured, syncActivities]);

  const disconnect = useCallback(async () => {
    if (isMounted.current) {
      setAuthPayload(undefined);
      setDailySteps(0);
      setLastSyncedAt(undefined);
      setError(undefined);
    }
    await storeAuthPayload(undefined);
  }, []);

  const refresh = useCallback(async () => {
    if (!authPayload) {
      throw new Error("not_connected");
    }
    try {
      await syncActivities(authPayload);
      setError(undefined);
    } catch (err) {
      console.warn("Failed to refresh Strava activities", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("unknown_error");
      }
      throw err;
    }
  }, [authPayload, syncActivities]);

  const contextValue = useMemo<StravaContextValue>(
    () => ({
      isConnected: Boolean(authPayload),
      athlete: authPayload?.athlete,
      dailySteps,
      lastSyncedAt,
      isSyncing,
      connect,
      disconnect,
      refresh,
      error,
      isConfigured
    }),
    [authPayload, connect, dailySteps, disconnect, error, isConfigured, isSyncing, lastSyncedAt, refresh]
  );

  return <StravaContext.Provider value={contextValue}>{children}</StravaContext.Provider>;
};

export const useStravaContext = () => {
  const ctx = useContext(StravaContext);
  if (!ctx) {
    throw new Error("useStravaContext must be used within StravaProvider");
  }
  return ctx;
};
