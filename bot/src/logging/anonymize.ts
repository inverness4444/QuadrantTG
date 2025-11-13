import { createHash } from "crypto";

const hash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 12);

export const anonymizeId = (value: number | string | undefined | null) => {
  if (value === undefined || value === null) return undefined;
  return hash(String(value));
};

export const anonymizeIp = (value: string | undefined | null) => {
  if (!value) return undefined;
  if (value === "unknown") return "unknown";
  return hash(value);
};
