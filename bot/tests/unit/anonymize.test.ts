import { describe, expect, it } from "vitest";

import { anonymizeId, anonymizeIp } from "../../src/logging/anonymize.js";

describe("anonymize helpers", () => {
  it("hashes ids consistently", () => {
    expect(anonymizeId(123)).toBe(anonymizeId(123));
  });

  it("hashes IPs", () => {
    const masked = anonymizeIp("10.0.0.1");
    expect(masked).not.toBe("10.0.0.1");
    expect(masked).toBe(anonymizeIp("10.0.0.1"));
  });
});
