import "dotenv/config";

export default ({ config }) => ({
  ...config,
  name: "Quadrant",
  slug: config.slug ?? "quadrant-mobile",
  version: config.version ?? "1.0.0",
  scheme: config.scheme ?? "quadrant",
  icon: "./assets/icon_quadrant.png",
  android: {
    ...config.android,
    package: config.android?.package ?? "com.muslim.quadrant",
    adaptiveIcon: {
      foregroundImage: "./assets/logo_dark.png",
      backgroundColor: config.android?.adaptiveIcon?.backgroundColor ?? "#000000"
    }
  },
  ios: {
    ...config.ios,
    bundleIdentifier: config.ios?.bundleIdentifier ?? "com.muslim.quadrant",
    icon: "./assets/icon_quadrant.png"
  },
  extra: {
    ...config.extra,
    telegramBotId: process.env.EXPO_PUBLIC_TELEGRAM_BOT_ID ?? null,
    stravaClientId: process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID ?? null,
    stravaClientSecret: process.env.EXPO_PUBLIC_STRAVA_CLIENT_SECRET ?? null,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? null
  }
});
