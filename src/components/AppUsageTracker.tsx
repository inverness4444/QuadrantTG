import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "../hooks/useAuth";
import { reportUsageTime } from "../services/userApi";

const FLUSH_INTERVAL_MS = 60_000;
const MIN_BATCH_SECONDS = 30;

export const AppUsageTracker = () => {
  const { telegramInitData, profile, updateProfile } = useAuth();
  const sessionStartRef = useRef<number | null>(null);
  const pendingSecondsRef = useRef<number>(0);
  const sendingRef = useRef<boolean>(false);

  const flushUsage = useCallback(
    async (force = false) => {
      if (!telegramInitData) {
        pendingSecondsRef.current = 0;
        return;
      }

      if (sessionStartRef.current !== null) {
        const now = Date.now();
        const delta = Math.floor((now - sessionStartRef.current) / 1000);
        if (delta > 0) {
          pendingSecondsRef.current += delta;
          sessionStartRef.current = now;
        }
      }

      const totalSeconds = pendingSecondsRef.current;
      if (totalSeconds <= 0) {
        return;
      }
      if (!force && totalSeconds < MIN_BATCH_SECONDS) {
        return;
      }
      if (sendingRef.current) {
        return;
      }

      sendingRef.current = true;
      pendingSecondsRef.current = 0;

      try {
        const updatedProfile = await reportUsageTime(totalSeconds, telegramInitData);
        updateProfile(updatedProfile);
      } catch (error) {
        pendingSecondsRef.current += totalSeconds;
        console.warn("[usage] Failed to report app usage", error);
      } finally {
        sendingRef.current = false;
      }
    },
    [telegramInitData, updateProfile]
  );

  useEffect(() => {
    if (!telegramInitData || !profile) {
      sessionStartRef.current = null;
      pendingSecondsRef.current = 0;
      return;
    }

    const currentState = (AppState.currentState ?? "active") as AppStateStatus;
    if (currentState === "active") {
      sessionStartRef.current = Date.now();
    }

    const handleStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        sessionStartRef.current = Date.now();
        return;
      }

      if (sessionStartRef.current !== null) {
        const now = Date.now();
        const delta = Math.floor((now - sessionStartRef.current) / 1000);
        if (delta > 0) {
          pendingSecondsRef.current += delta;
        }
        sessionStartRef.current = null;
        void flushUsage(true);
      }
    };

    const subscription = AppState.addEventListener("change", handleStateChange);
    const intervalId = setInterval(() => {
      void flushUsage();
    }, FLUSH_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
      if (sessionStartRef.current !== null) {
        const now = Date.now();
        const delta = Math.floor((now - sessionStartRef.current) / 1000);
        if (delta > 0) {
          pendingSecondsRef.current += delta;
        }
        sessionStartRef.current = null;
      }
      void flushUsage(true);
    };
  }, [telegramInitData, profile, flushUsage]);

  return null;
};
