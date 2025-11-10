import { useThemeContext } from "../providers/ThemeProvider";

export const useTheme = () => {
  const { theme, mode, toggleTheme, setMode } = useThemeContext();
  return { theme, mode, toggleTheme, setMode };
};
