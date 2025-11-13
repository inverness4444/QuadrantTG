import { describe, expect, it, beforeEach, vi } from "vitest";

import { limit } from "@grammyjs/ratelimiter";
import type { Context, NextFunction } from "grammy";
import type { Redis } from "ioredis";

describe("rate limiter middleware", () => {
  let mockRedis: Pick<Redis, "incr" | "pexpire">;
  let hits = 0;

  beforeEach(() => {
    hits = 0;
    mockRedis = {
      incr: vi.fn(async () => ++hits),
      pexpire: vi.fn(async () => 1)
    } as any;
  });

const createCtx = (userId: number): Partial<Context> => ({
  from: { id: userId } as any,
  chat: { id: userId } as any,
  reply: vi.fn(async () => undefined)
});

  it("limits repeated user calls", async () => {
    const limiter = limit({
      timeFrame: 1000,
      limit: 2,
      storageClient: mockRedis as any,
      keyGenerator: (ctx) => `user:${ctx.from?.id}`,
      onLimitExceeded: async (ctx) => {
        await (ctx.reply as any)("limited");
      }
    });
    const ctx = createCtx(1) as Context;
    await limiter(ctx, (() => Promise.resolve()) as NextFunction);
    await limiter(ctx, (() => Promise.resolve()) as NextFunction);
    await limiter(ctx, (() => Promise.resolve()) as NextFunction);
    expect(mockRedis.incr).toHaveBeenCalledTimes(3);
    expect((ctx.reply as any)).toHaveBeenCalledTimes(1);
  });

  it("tracks different users separately", async () => {
    const limiter = limit({
      timeFrame: 1000,
      limit: 1,
      storageClient: mockRedis as any,
      keyGenerator: (ctx) => `user:${ctx.from?.id}`
    });
    const ctx1 = createCtx(1) as Context;
    const ctx2 = createCtx(2) as Context;
    await limiter(ctx1, (() => Promise.resolve()) as NextFunction);
    await limiter(ctx2, (() => Promise.resolve()) as NextFunction);
    expect((ctx1.reply as any)).not.toHaveBeenCalled();
    expect((ctx2.reply as any)).not.toHaveBeenCalled();
  });
});
