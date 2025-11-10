import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { lightTheme, darkTheme, type ThemeDefinition, type ThemeMode } from "../theme/themes";

type ThemeContextValue = {
  theme: ThemeDefinition;
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeProviderProps = {
  initialMode?: ThemeMode;
  children: React.ReactNode;
};

export const ThemeProvider = ({ initialMode = "light", children }: ThemeProviderProps) => {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  const theme = useMemo<ThemeDefinition>(() => (mode === "light" ? lightTheme : darkTheme), [mode]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      mode,
      toggleTheme,
      setMode
    }),
    [mode, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used inside ThemeProvider");
  }
  return context;
};
