import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "../../src/server.js";

describe("/healthz", () => {
  it("returns status and metadata", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body).toHaveProperty("version");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("env");
  });
});
