process.env.NODE_ENV = "test";
process.env.BOT_TOKEN ??= "test-token";
process.env.WEBHOOK_SECRET ??= "secret";
process.env.BACKEND_API_BASE_URL ??= "https://backend.test";
process.env.NEXT_PUBLIC_TELEGRAM_MINIAPP_URL ??= "https://example.com/app";
process.env.PII_ENCRYPTION_KEY ??= Buffer.alloc(32, "a").toString("base64");
process.env.MAX_HEAVY_JOBS_PER_MINUTE ??= "10";
