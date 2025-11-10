import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type TokenBalanceContextValue = {
  balance: number;
  addTokens: (amount: number) => void;
  spendTokens: (amount: number) => void;
  setBalance: (amount: number) => void;
};

const INITIAL_BALANCE = 245;

const TokenBalanceContext = createContext<TokenBalanceContextValue | undefined>(undefined);

type TokenBalanceProviderProps = {
  children: React.ReactNode;
};

export const TokenBalanceProvider = ({ children }: TokenBalanceProviderProps) => {
  const [balance, setBalanceState] = useState<number>(INITIAL_BALANCE);

  const addTokens = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    setBalanceState((prev) => prev + amount);
  }, []);

  const spendTokens = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    setBalanceState((prev) => Math.max(0, prev - amount));
  }, []);

  const setBalance = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount < 0) {
      return;
    }
    setBalanceState(amount);
  }, []);

  const value = useMemo<TokenBalanceContextValue>(
    () => ({
      balance,
      addTokens,
      spendTokens,
      setBalance
    }),
    [balance, addTokens, spendTokens, setBalance]
  );

  return <TokenBalanceContext.Provider value={value}>{children}</TokenBalanceContext.Provider>;
};

export const useTokenBalanceContext = () => {
  const ctx = useContext(TokenBalanceContext);
  if (!ctx) {
    throw new Error("useTokenBalanceContext must be used within a TokenBalanceProvider");
  }
  return ctx;
};
