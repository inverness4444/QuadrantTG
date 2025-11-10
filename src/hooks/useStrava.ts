import { useStravaContext } from "../providers/StravaProvider";

export const useStrava = () => {
  const {
    athlete,
    connect,
    dailySteps,
    disconnect,
    error,
    isConnected,
    isSyncing,
    lastSyncedAt,
    refresh,
    isConfigured
  } =
    useStravaContext();
  return {
    athlete,
    connect,
    dailySteps,
    disconnect,
    error,
    isConnected,
    isSyncing,
    lastSyncedAt,
    refresh,
    isConfigured
  };
};
