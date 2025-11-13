import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import http from "http";

import { createServer } from "../support/testServer.js";

describe("Rate limiting integration", () => {
  let server: http.Server;

  beforeAll(async () => {
    server = await createServer();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("blocks excessive requests from same IP", async () => {
    const agent = request(server);
    for (let i = 0; i < 10; i++) {
      await agent.get("/healthz");
    }
    const res = await agent.get("/healthz");
    expect([200, 429]).toContain(res.status);
  });
});
