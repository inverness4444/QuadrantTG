'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authenticateWithInitData, fetchContentBundle } from "../lib/api";
import { readStoredSession, clearSession } from "../lib/storage";
import type { ContentBundle, TokenPair, UserPublic } from "../types/api";
import { LoadingScreen } from "./LoadingScreen";
import { OpenInTelegramScreen } from "./OpenInTelegram";
import { Dashboard } from "./Dashboard";
import { ErrorCard } from "./ErrorCard";
import { GlobalErrorBoundary } from "./GlobalErrorBoundary";

interface ReadyState {
  status: "ready";
  tokens: { access: string; refresh: string };
  user: UserPublic;
}

type AuthState =
  | { status: "checking" }
  | { status: "unsupported" }
  | { status: "missing-init" }
  | { status: "authenticating" }
  | ReadyState
  | { status: "error"; message: string };

type ContentState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; bundle: ContentBundle }
  | { status: "error"; message: string };

const initialAuthState: AuthState = { status: "checking" };
const initialContentState: ContentState = { status: "idle" };

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return fallback;
}

export function AppRoot(): JSX.Element {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const [contentState, setContentState] = useState<ContentState>(initialContentState);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [boundaryKey, setBoundaryKey] = useState<number>(0);

  const initEffectRan = useRef(false);
  const telegramReadyRef = useRef(false);
  const refreshAttemptedRef = useRef(false);
  const retryRequestRef = useRef<(() => Promise<void>) | null>(null);

  const ensureTelegram = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const telegram = window.Telegram?.WebApp;
    if (!telegram) {
      return null;
    }
    if (!telegramReadyRef.current) {
      try {
        telegram.ready();
        telegram.expand();
      } catch (error) {
        console.warn("Telegram WebApp readiness failed", error);
      }
      telegramReadyRef.current = true;
    }
    return telegram;
  }, []);

  const runAuthentication = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    const existingSession = readStoredSession();
    if (existingSession) {
      setAuthState({
        status: "ready",
        tokens: { access: existingSession.access, refresh: existingSession.refresh },
        user: existingSession.user
      });
      return;
    }

    const telegram = ensureTelegram();
    if (!telegram) {
      setAuthState({ status: "unsupported" });
      return;
    }

    const initData = telegram.initData;
    if (!initData) {
      setAuthState({ status: "missing-init" });
      return;
    }

    setAuthState({ status: "authenticating" });
    try {
      const tokenPair = await authenticateWithInitData(initData);
      setAuthState({
        status: "ready",
        tokens: { access: tokenPair.access, refresh: tokenPair.refresh },
        user: tokenPair.user
      });
      refreshAttemptedRef.current = false;
    } catch (error) {
      clearSession();
      setAuthState({
        status: "error",
        message: resolveErrorMessage(error, "Unable to authenticate with Telegram")
      });
    }
  }, [ensureTelegram]);

  const updateTokens = useCallback((tokenPair: TokenPair) => {
    setAuthState((current) => {
      if (current.status !== "ready") {
        return current;
      }
      return {
        status: "ready",
        tokens: { access: tokenPair.access, refresh: tokenPair.refresh },
        user: tokenPair.user
      } satisfies ReadyState;
    });
  }, []);

  const loadContent = useCallback(async () => {
    if (authState.status !== "ready") {
      return;
    }
    setContentState({ status: "loading" });
    retryRequestRef.current = null;
    try {
      const bundle = await fetchContentBundle({
        tokens: authState.tokens,
        refreshAttempted: refreshAttemptedRef,
        onTokens: updateTokens
      });
      setContentState({ status: "loaded", bundle });
    } catch (error) {
      const message = resolveErrorMessage(error, "Unable to load content");
      setContentState({ status: "error", message });
      retryRequestRef.current = loadContent;
    }
  }, [authState, updateTokens]);

  const handleRetryRequest = useCallback(() => {
    setGlobalError(null);
    setBoundaryKey((value) => value + 1);
    if (retryRequestRef.current) {
      void retryRequestRef.current();
    } else if (authState.status === "error") {
      void runAuthentication();
    } else if (authState.status === "ready") {
      void loadContent();
    }
  }, [authState, loadContent, runAuthentication]);

  useEffect(() => {
    if (initEffectRan.current) {
      return;
    }
    initEffectRan.current = true;
    void runAuthentication();
  }, [runAuthentication]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const previousHandler = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      event.preventDefault();
      const message = resolveErrorMessage(event.reason, "An unexpected error occurred");
      setGlobalError(message);
    };
    return () => {
      window.onunhandledrejection = previousHandler ?? null;
    };
  }, []);

  useEffect(() => {
    if (authState.status === "ready") {
      void loadContent();
    }
  }, [authState, loadContent]);

  const mainView = useMemo(() => {
    switch (authState.status) {
      case "checking":
        return <LoadingScreen />;
      case "authenticating":
        return <LoadingScreen label="Securing your Quadrant session..." />;
      case "unsupported":
        return (
          <ErrorCard
            title="Mini App unavailable"
            message="Telegram WebApp SDK is not available. Open this experience inside the Telegram client."
          />
        );
      case "missing-init":
        return <OpenInTelegramScreen />;
      case "error":
        return <ErrorCard message={authState.message} onRetry={handleRetryRequest} />;
      case "ready":
        if (contentState.status === "loading" || contentState.status === "idle") {
          return <LoadingScreen label="Loading your courses and books..." />;
        }
        if (contentState.status === "error") {
          return <ErrorCard message={contentState.message} onRetry={handleRetryRequest} />;
        }
        if (contentState.status === "loaded") {
          return <Dashboard user={authState.user} content={contentState.bundle} />;
        }
        return <LoadingScreen />;
      default:
        return <LoadingScreen />;
    }
  }, [authState, contentState, handleRetryRequest]);

  return (
    <main className="app-root">
      {globalError ? (
        <ErrorCard message={globalError} onRetry={handleRetryRequest} />
      ) : (
        <GlobalErrorBoundary key={boundaryKey} onError={(error) => setGlobalError(error.message)}>
          {mainView}
        </GlobalErrorBoundary>
      )}
    </main>
  );
}
