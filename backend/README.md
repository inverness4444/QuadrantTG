# Quadrant Backend

FastAPI service that powers the Telegram Mini App and mobile clients. It validates Telegram web-app signatures, issues Quadrant JWTs, and exposes all learning content via REST.

## Stack
- FastAPI + Uvicorn
- PostgreSQL (SQLAlchemy 2.x + asyncpg)
- Alembic migrations
- Redis + Celery for background jobs
- Pydantic Settings for configuration management

## Environment
Copy `.env.example` to `.env` and adjust the values:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL DSN (`postgresql+asyncpg://user:pass@host:port/db`). |
| `JWT_SECRET` | Symmetric key used to sign access/refresh tokens. |
| `ALLOWED_ORIGINS` | Comma-separated list of trusted origins (e.g. `http://localhost:3000,https://miniapp.quadrant.example`). |
| `TELEGRAM_BOT_TOKEN` | Bot token used to validate Mini App `initData` signatures. |
| `LOG_LEVEL` | Logging level (e.g. `INFO`, `DEBUG`). |

## Run locally
```bash
poetry install
poetry run uvicorn app.main:app --reload
```
The server listens on port `8000` by default. Swagger docs are available at `/docs`.

## Key endpoints
- `POST /api/v1/auth/telegram/miniapp` — validates the raw `initData`, upserts the user, and returns `{ access, refresh, user }`.
- `POST /api/v1/auth/refresh` — accepts a refresh token and rotates the JWT pair.
- `GET /healthz` — lightweight health probe for infrastructure checks.

All routes are CORS-protected using the origins defined in `ALLOWED_ORIGINS`, with `Authorization`, `Content-Type`, and `X-Requested-With` headers enabled.

## Project layout
```
app/
  api/          # Routers and dependencies
  core/         # Settings, security, database, telegram helpers
  models/       # SQLAlchemy models (User, Course, Book, ...)
  repositories/ # Data-access layer
  schemas/      # Pydantic DTOs
  services/     # Business logic
  integrations/ # Strava, TonConnect, Notion
  tasks/        # Celery tasks
```
