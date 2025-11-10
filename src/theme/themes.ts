export type ThemeMode = "light" | "dark";

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accent: string;
  muted: string;
  highlight: string;
  inputBackground: string;
  navBackground: string;
  navBorder: string;
  navActive: string;
  navInactive: string;
  userCardBackground: string;
  userCardShadow: string;
  overlay: string;
};

export type ThemeDefinition = {
  mode: ThemeMode;
  colors: ThemeColors;
};

export const lightTheme: ThemeDefinition = {
  mode: "light",
  colors: {
    background: "#F6F8FC",
    surface: "#FFFFFF",
    surfaceAlt: "#F1F4FB",
    textPrimary: "#222B45",
    textSecondary: "#6F7C9A",
    border: "#E3E8F3",
    accent: "#3B7BF6",
    muted: "#A0AEC0",
    highlight: "#E8F0FF",
    inputBackground: "#FFFFFF",
    navBackground: "#FFFFFF",
    navBorder: "#E2E8F0",
    navActive: "#3B7BF6",
    navInactive: "#A0AEC0",
    userCardBackground: "#3B7BF6",
    userCardShadow: "rgba(39,82,161,0.35)",
    overlay: "rgba(8,15,26,0.25)"
  }
};

export const darkTheme: ThemeDefinition = {
  mode: "dark",
  colors: {
    background: "#0F172A",
    surface: "#1F2937",
    surfaceAlt: "#24344D",
    textPrimary: "#F9FAFB",
    textSecondary: "#9CA3AF",
    border: "#2D3748",
    accent: "#60A5FA",
    muted: "#6B7280",
    highlight: "#1E3A8A",
    inputBackground: "#111827",
    navBackground: "#1F2937",
    navBorder: "#27364B",
    navActive: "#60A5FA",
    navInactive: "#6B7280",
    userCardBackground: "#1D4ED8",
    userCardShadow: "rgba(15,23,42,0.45)",
    overlay: "rgba(10,15,28,0.65)"
  }
};
