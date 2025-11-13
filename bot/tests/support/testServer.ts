import express from "express";

import { env } from "../../src/env.js";

export const createServer = async () => {
  const app = express();
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  return app.listen(0);
};
