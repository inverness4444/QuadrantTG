import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Linking } from "react-native";
import { Buffer } from "buffer";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { apiFetch } from "../services/api";

WebBrowser.maybeCompleteAuthSession();

type TelegramAuthUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

type TelegramAuthPayload = {
  user: TelegramAuthUser;
  rawInitData: string;
};

type AppUserProfile = {
  id: number;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  locale: string;
  is_admin: boolean;
  app_seconds_spent: number;
};

type AuthContextValue = {
  user?: TelegramAuthUser;
  profile?: AppUserProfile;
  telegramInitData?: string;
  isAdmin: boolean;
  signInWithTelegram: () => Promise<void>;
  signOut: () => void;
  isAuthenticating: boolean;
  updateProfile: (profile: AppUserProfile) => void;
  grantAdminOverride: () => void;
  revokeAdminOverride: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getTelegramBotId = (): string | undefined => {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const id = extra?.telegramBotId ?? extra?.TELEGRAM_BOT_ID ?? process.env.EXPO_PUBLIC_TELEGRAM_BOT_ID;
  return typeof id === "string" && id.trim().length > 0 ? id.trim() : undefined;
};

const serializeTelegramInitData = (data: TelegramAuthUser): string => {
  const params = new URLSearchParams();
  (Object.entries(data) as [keyof TelegramAuthUser, TelegramAuthUser[keyof TelegramAuthUser]][]).forEach(
    ([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      params.append(key, typeof value === "number" ? String(value) : value);
    }
  );
  return params.toString();
};

const extractTelegramPayload = (url?: string): TelegramAuthPayload | undefined => {
  if (!url) {
    return undefined;
  }

  let searchParams: URLSearchParams | undefined;

  try {
    const parsed = new URL(url);
    if (parsed.search && parsed.search.includes("tgAuthResult")) {
      searchParams = new URLSearchParams(parsed.search);
    } else if (parsed.hash && parsed.hash.includes("tgAuthResult")) {
      searchParams = new URLSearchParams(parsed.hash.replace(/^#/u, ""));
    }
  } catch {
    const hashSection = url.split("#")[1];
    if (hashSection) {
      searchParams = new URLSearchParams(hashSection);
    }
  }

  if (!searchParams) {
    return undefined;
  }

  const rawResult = searchParams.get("tgAuthResult");
  if (!rawResult) {
    return undefined;
  }
  try {
    const decoded = decodeURIComponent(rawResult);

    const tryParse = (value: string): TelegramAuthUser | undefined => {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === "object") {
          return parsed as TelegramAuthUser;
        }
        if (typeof parsed === "string") {
          return tryParse(parsed);
        }
      } catch {
        // ignore and fall back to base64 decode
      }
      return undefined;
    };

    let user = tryParse(decoded);

    if (!user) {
      try {
        const base64Decoded = Buffer.from(decoded, "base64").toString("utf-8");
        user = tryParse(base64Decoded);
      } catch (error) {
        console.warn("Failed to decode base64 Telegram auth result", error);
      }
    }

    if (!user) {
      console.warn("Telegram auth payload could not be parsed");
      return undefined;
    }

    return {
      user,
      rawInitData: serializeTelegramInitData(user)
    };
  } catch (error) {
    console.warn("Failed to decode Telegram auth result", error);
    return undefined;
  }
};

type AuthProviderProps = {
  children: React.ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<TelegramAuthUser | undefined>(undefined);
  const [telegramInitData, setTelegramInitData] = useState<string | undefined>(undefined);
  const [profile, setProfile] = useState<AppUserProfile | undefined>(undefined);
  const [profileAdmin, setProfileAdmin] = useState<boolean>(false);
  const [adminOverride, setAdminOverride] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const applyProfile = useCallback((nextProfile: AppUserProfile) => {
    setProfile(nextProfile);
    setProfileAdmin(Boolean(nextProfile.is_admin));
  }, []);

  const signInWithTelegram = useCallback(async () => {
    const botId = getTelegramBotId();
    if (!botId) {
      throw new Error("missing_bot_id");
    }

    setIsAuthenticating(true);
    try {
      const redirectOrigin = "https://website-ruby-phi-28.vercel.app";
      const redirectUri = makeRedirectUri({ scheme: "quadrant", path: "auth" });

      const authUrl = `https://oauth.telegram.org/auth?bot_id=${botId}&embed=1&origin=${encodeURIComponent(
        redirectOrigin
      )}&return_to=${encodeURIComponent(redirectUri)}&request_access=write`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      console.log("telegram auth result", result);

      const resultUrl = "url" in result ? result.url : undefined;
      const resolvePayload = async (url?: string) => {
        let payload = extractTelegramPayload(url);

        if (!payload) {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            payload = extractTelegramPayload(initialUrl);
          }
        }

        if (!payload) {
          throw new Error("invalid_payload");
        }

        const headers = {
          "X-Telegram-Init-Data": payload.rawInitData,
          Accept: "application/json"
        } as const;

        const profileResponse = await apiFetch<AppUserProfile>("/api/v1/users/me", {
          headers: {
            ...headers
          }
        });

        setUser(payload.user);
        setTelegramInitData(payload.rawInitData);
        applyProfile(profileResponse);
      };

      if (result.type === "cancel" || result.type === "dismiss") {
        try {
          await resolvePayload(resultUrl);
          return;
        } catch {
          throw new Error("cancelled");
        }
      }

      if (result.type !== "success") {
        throw new Error("unknown_error");
      }

      await resolvePayload(resultUrl);
    } catch (error) {
      console.error("Telegram sign-in failed", error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const signOut = useCallback(() => {
    setUser(undefined);
    setTelegramInitData(undefined);
    setProfile(undefined);
    setProfileAdmin(false);
    setAdminOverride(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      telegramInitData,
      isAdmin: profileAdmin || adminOverride,
      signInWithTelegram,
      signOut,
      isAuthenticating,
      updateProfile: applyProfile,
      grantAdminOverride: () => setAdminOverride(true),
      revokeAdminOverride: () => setAdminOverride(false)
    }),
    [
      user,
      profile,
      telegramInitData,
      profileAdmin,
      adminOverride,
      signInWithTelegram,
      signOut,
      isAuthenticating,
      applyProfile
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return ctx;
};
