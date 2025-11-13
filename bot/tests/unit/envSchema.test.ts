import { describe, expect, it } from "vitest";

import { EnvSchema } from "../../src/env.js";

const baseEnv = {
  BOT_TOKEN: "test",
  WEBHOOK_SECRET: "secret",
  BACKEND_API_BASE_URL: "https://api.test",
  NEXT_PUBLIC_TELEGRAM_MINIAPP_URL: "https://example.com/app",
  PII_ENCRYPTION_KEY: Buffer.alloc(32, "a").toString("base64")
};

describe("EnvSchema", () => {
  it("parses valid numeric port", () => {
    const parsed = EnvSchema.parse({ ...baseEnv, PORT: "9090" });
    expect(parsed.PORT).toBe(9090);
  });

  it("fails when port is invalid string", () => {
    expect(() => EnvSchema.parse({ ...baseEnv, PORT: "abc" })).toThrow();
  });
});
