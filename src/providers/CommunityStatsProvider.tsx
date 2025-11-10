import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type CommunityStats = {
  totalUsers: number;
  onlineUsers: number;
  totalTokensIssued: number;
};

type CommunityStatsContextValue = CommunityStats & {
  updateStats: (next: Partial<CommunityStats>) => void;
};

const DEFAULT_STATS: CommunityStats = {
  totalUsers: 18250,
  onlineUsers: 642,
  totalTokensIssued: 1287365
};

const CommunityStatsContext = createContext<CommunityStatsContextValue | undefined>(undefined);

type CommunityStatsProviderProps = {
  children: React.ReactNode;
};

export const CommunityStatsProvider = ({ children }: CommunityStatsProviderProps) => {
  const [stats, setStats] = useState<CommunityStats>(DEFAULT_STATS);

  const updateStats = useCallback((next: Partial<CommunityStats>) => {
    if (!next || typeof next !== "object") {
      return;
    }
    setStats((prev) => ({
      totalUsers: next.totalUsers ?? prev.totalUsers,
      onlineUsers: next.onlineUsers ?? prev.onlineUsers,
      totalTokensIssued: next.totalTokensIssued ?? prev.totalTokensIssued
    }));
  }, []);

  const value = useMemo<CommunityStatsContextValue>(
    () => ({
      ...stats,
      updateStats
    }),
    [stats, updateStats]
  );

  return <CommunityStatsContext.Provider value={value}>{children}</CommunityStatsContext.Provider>;
};

export const useCommunityStatsContext = () => {
  const ctx = useContext(CommunityStatsContext);
  if (!ctx) {
    throw new Error("useCommunityStatsContext must be used within a CommunityStatsProvider");
  }
  return ctx;
};
