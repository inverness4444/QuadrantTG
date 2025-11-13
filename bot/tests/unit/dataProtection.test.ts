import { describe, expect, it } from "vitest";

import { decryptField, encryptField, maskEmail, maskPhone } from "../../src/security/dataProtection.js";

describe("dataProtection helpers", () => {
  it("encrypts and decrypts symmetrically", () => {
    const payload = encryptField("secret");
    const decrypted = decryptField(payload);
    expect(decrypted).toBe("secret");
  });

  it("masks email", () => {
    expect(maskEmail("john.doe@example.com")).toBe("jo***@example.com");
  });

  it("masks phone", () => {
    expect(maskPhone("+12345678900")).toBe("+12***678900");
  });
});
