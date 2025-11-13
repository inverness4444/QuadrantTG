import type { Express, Request } from "express";
import proxyAddr from "proxy-addr";

import { env } from "./env.js";

const hasTrustedProxies = env.trustedProxies.length > 0;
const compiledTrust = hasTrustedProxies ? proxyAddr.compile(env.trustedProxies) : null;

export const configureTrustProxy = (app: Express) => {
  if (hasTrustedProxies && compiledTrust) {
    app.set("trust proxy", compiledTrust);
  } else {
    app.set("trust proxy", false);
  }
};

export const getClientIp = (req: Request): string => {
  if (hasTrustedProxies && compiledTrust) {
    try {
      return proxyAddr(req, compiledTrust) ?? req.socket.remoteAddress ?? "unknown";
    } catch {
      return req.socket.remoteAddress ?? "unknown";
    }
  }
  return req.socket.remoteAddress ?? "unknown";
};
