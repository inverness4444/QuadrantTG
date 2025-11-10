# Quadrant Mobile

Quadrant Mobile is an Expo-powered React Native prototype of the Quadrant learning and wellness ecosystem. It combines curated learning paths, an in-app library, gamified progress tracking, and web3/fitness integrations into a single mobile experience that can run on iOS, Android, and the web from one TypeScript codebase.

This branch also introduces a production-ready FastAPI backend, a Telegram Mini App built with Next.js, and a grammY-powered Telegram bot that launches the Mini App via a secure webhook flow.

- **FastAPI backend** — validates Telegram `initData`, mints Quadrant JWTs (`/auth/telegram/miniapp`, `/auth/refresh`), exposes `/healthz`, and constrains CORS to trusted origins.
- **Next.js Telegram Mini App** — mirrors the mobile UI, performs a single auth handshake per session, refreshes tokens once on 401, and renders inline error recovery without reload loops.
- **Telegram bot** — serves a webhook-verified `/telegram/webhook` endpoint, responds to `/start` with a web_app button, and exposes `/healthz` for monitoring.

Use the `.env.example` files under `backend/`, `miniapp/`, and `bot/` to configure each service.

## Quick start overview

| Service | Command | Notes |
| --- | --- | --- |
| Backend API | `poetry run uvicorn app.main:app --reload` | Requires `.env` and Postgres connection |
| Mini App | `npm install && npm run dev` (in `miniapp/`) | Next.js dev server on port 3000 |
| Bot | `npm install && npm run dev` (in `bot/`) | Express/grammY webhook server on port 8080 |

Once running, point the bot webhook at `https://<bot-host>/telegram/webhook` using:

```bash
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -d "url=$WEBHOOK_PUBLIC_URL" \
  -d "secret_token=$WEBHOOK_SECRET"
```

### Local end-to-end check
1. Start the backend, Mini App (`NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`), and bot (use `ngrok` or similar to expose the webhook).
2. In Telegram, open the bot and send `/start`, then tap **Open app**.
3. The Mini App loads inside Telegram, performs exactly one `/auth/telegram/miniapp` exchange, caches tokens, and fetches content with no reload loops. Subsequent API calls succeed thanks to the tightened CORS configuration.

### Mini App tests (no reload loop)

The Mini App ships with a Vitest suite that guarantees the handshake happens once, `window.location.reload` is never invoked, and navigation stays stable for ten simulated seconds:

```bash
cd miniapp
npm install
npm test
```
The tests mock `window.Telegram.WebApp` and `fetch` to assert behaviour in both valid and missing `initData` scenarios.

- Multi-tab experience covering learning, progress analytics, wallet management, and profile.
- Rich course and book catalog with rewards, streak incentives, and community stats.
- TON wallet connectivity powered by TonConnect with secure persistence.
- Strava OAuth integration to translate daily activities into in-app steps and streak credit.
- Localization (English, Spanish, Russian) and light/dark theming backed by React Context providers.

## Tech stack
- Expo 54 / React Native 0.81 with React 19 and TypeScript 5.
- Modular providers for theme, localization, authentication, TonConnect, Strava, and streak calculations.
- Custom data layer sourced from Notion (with JSON fallback) for the digital library.
- Expo SecureStore for persisting sensitive tokens on device.

## Getting started

### Prerequisites
- Node.js 18+ and npm 9+ (or your preferred package manager).
- Expo CLI (`npm install -g expo-cli`) if you want the global `expo` binary.
- Native tooling for the platforms you plan to target (Xcode for iOS, Android Studio + SDKs for Android).

### Installation
```bash
git clone <repo-url>
cd quadrant-mobile
npm install
cp .env.example .env
# fill the values described below
```

### Running the app
```bash
npm start        # Expo dev server with QR code
npm run android  # Build & install on an Android emulator/device
npm run ios      # Build & install on the iOS simulator/device
npm run web      # Run the project in a browser
```

Use the Expo Go app (or tunnels via LAN) to load the development build on physical devices. When targeting native builds, make sure the corresponding SDKs are available on your machine.

## Environment configuration

The app reads secrets from Expo `extra` fields and environment variables at runtime. Populate `.env` (or your shell) with the following keys:

| Variable | Description |
| --- | --- |
| `EXPO_PUBLIC_TELEGRAM_BOT_ID` | Bot identifier used by the Telegram OAuth flow inside `AuthProvider`. Required to enable Quadrant account sign-in. |
| `EXPO_PUBLIC_STRAVA_CLIENT_ID` / `STRAVA_CLIENT_ID` | Strava application client ID. Either key works; Expo `EXPO_PUBLIC_*` variables are recommended for managed builds. |
| `EXPO_PUBLIC_STRAVA_CLIENT_SECRET` / `STRAVA_CLIENT_SECRET` | Strava client secret for token exchange. |

Expo automatically inlines variables prefixed with `EXPO_PUBLIC_` into the client bundle. For extra security on native builds you can mirror them inside `app.config.ts`/`app.json` using the `extra` field instead of plain `.env`.

### Backend (`backend/.env`)

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql+asyncpg://user:pass@host:port/db`). |
| `JWT_SECRET` | Symmetric signing key for Quadrant JWTs. |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed by CORS (e.g. `http://localhost:3000,https://miniapp.quadrant.example`). |
| `TELEGRAM_BOT_TOKEN` | Bot token used to validate Telegram Mini App signatures. |
| `LOG_LEVEL` | Python logging level (`INFO`, `DEBUG`, etc.). |

### Telegram Mini App (`miniapp/.env`)

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL for the FastAPI instance (include `/api/v1`). |
| `NEXT_PUBLIC_TELEGRAM_BOT_NAME` | Bot username without the leading `@` (used in “Open in Telegram” screen). |
| `NEXT_PUBLIC_TELEGRAM_MINIAPP_URL` | Published Mini App URL for Telegram’s `web_app` button. |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional Sentry DSN for client-side error capture. |

### Telegram Bot (`bot/.env`)

| Variable | Description |
| --- | --- |
| `BOT_TOKEN` | Telegram bot token (used by grammY). |
| `WEBHOOK_SECRET` | Secret checked against `X-Telegram-Bot-Api-Secret-Token` header. |
| `WEBHOOK_PUBLIC_URL` | Public HTTPS URL pointing at `/telegram/webhook`. |
| `BACKEND_API_BASE_URL` | FastAPI base URL for future bot→API calls. |
| `NEXT_PUBLIC_TELEGRAM_MINIAPP_URL` | Same as Mini App URL, used when rendering the `web_app` button. |
| `PORT` | Local port for the webhook server (default `8080`). |

## Project structure
- `App.tsx` — bootstraps the provider tree and bottom navigation shell.
- `src/components` — shared UI elements such as the Quadrant logo and cards.
- `src/constants` — static course, library, and reward datasets plus localization keys.
- `src/hooks` — reusable hooks for theming, localization, library state, Strava sync, TON wallet access, etc.
- `src/providers` — stateful context providers (authentication, levels, streaks, community stats, token balance, and more).
- `src/screens` — tab-level screens (`Home`, `Progress`, `Wallet`, `Profile`) that compose hooks and components into UX flows.
- `assets/` — bundled images, fonts, and splash assets.
- `notion_book_pages.json` — cached metadata for Notion-hosted book content (used as a fallback when the API is unavailable).

## Key integrations

### Learning & rewards
Course and library content is defined under `src/constants/data.ts` and localized via `src/i18n/locales.ts`. Progress, XP, and reward logic live in the `LevelProvider`, `DailyStreakProvider`, and related hooks to keep UI components declarative.

### Notion-powered library
`src/services/notion.ts` pulls structured book sections from Notion pages specified in `notion_book_pages.json`. The service gracefully falls back to bundled summaries when the Notion API cannot be reached, ensuring offline usability. Update the JSON file with your own Notion page IDs and metadata to customize the library.

### Strava activity sync
`StravaProvider` handles OAuth, token refresh, and daily activity polling. Provide valid Strava credentials (see `.env.example`) and whitelist Expo redirect URIs in your Strava developer settings. Qualifying activities are converted to steps to keep streaks and rewards in sync with real-world movement.

### TON wallet connectivity
`TonWalletProvider` bootstraps TonConnect with secure storage, wallet discovery, and deep-link based pairing. Replace the default manifest URL in `TonWalletProvider.tsx` with your own TonConnect manifest when moving from the demo environment to production.

### Localization & theming
The app ships with English, Spanish, and Russian copies alongside dynamic light/dark theming. `useLocalization` and `useTheme` expose helpers for translating strings and reading palette values inside UI components.

## Scripts
- `npm start` — run the Metro bundler via Expo.
- `npm run android` — build and launch the Android app.
- `npm run ios` — build and launch the iOS app.
- `npm run web` — run the Expo web target.

## Backend API (FastAPI)
- Install dependencies: `cd backend && poetry install`.
- Copy `backend/.env.example` to `.env` and populate the keys listed above.
- Run locally: `poetry run uvicorn app.main:app --reload` (defaults to port `8000`).
- Key endpoints:
  - `POST /api/v1/auth/telegram/miniapp` — validates Telegram `initData`, creates or updates the user, returns `{ access, refresh, user }`.
  - `POST /api/v1/auth/refresh` — rotates JWTs using a refresh token.
  - `GET /healthz` — lightweight readiness probe.

## Telegram Mini App (Next.js)
- Install dependencies: `cd miniapp && npm install`.
- Copy `.env.example` to `.env.local` (or `.env`) and set `NEXT_PUBLIC_API_BASE_URL` to your FastAPI instance.
- Run locally: `npm run dev` (port `3000`).
- Tests: `npm test` ensures the authentication handshake runs exactly once, `window.location.reload` is never invoked, and the URL remains stable for ten simulated seconds.

## Telegram Bot (grammY + Express)
- Install dependencies: `cd bot && npm install`.
- Copy `.env.example` to `.env` with your bot token, webhook secret, and Mini App URL.
- Run locally: `npm run dev` (port `8080`). Tunnel the port (e.g. `ngrok http 8080`) and register the webhook via the curl command listed earlier.
- Webhook security: POST requests must include the `X-Telegram-Bot-Api-Secret-Token` header matching `WEBHOOK_SECRET`.
- Health check: `GET /healthz` returns `200` for uptime monitoring.

## Contributing
Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) for branching strategy, coding guidelines, and the pull request checklist. The repository also includes a [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md); by participating you agree to uphold its standards.

## License
Distributed under the terms of the [MIT License](LICENSE). Update the copyright holder if the project should be published under a different license.
