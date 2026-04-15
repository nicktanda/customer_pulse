import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import type { Queue } from "bullmq";
import express from "express";
import type { Server } from "node:http";

/**
 * Minimal queue admin UI (Bull Board). Protect with network rules + HTTP basic auth in production.
 */
export function startBullBoard(port: number, queues: Queue[]): Server {
  const app = express();
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });

  const user = process.env.BULL_BOARD_USER;
  const pass = process.env.BULL_BOARD_PASS;

  app.use("/admin/queues", (req, res, next) => {
    if (!user || !pass) {
      return next();
    }
    const header = req.headers.authorization;
    if (!header?.startsWith("Basic ")) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Bull Board"');
      return res.status(401).send("Authentication required");
    }
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const [u, p] = decoded.split(":");
    if (u !== user || p !== pass) {
      return res.status(401).send("Invalid credentials");
    }
    return next();
  });

  app.use("/admin/queues", serverAdapter.getRouter());

  return app.listen(port, () => {
    console.log(`[worker] Bull Board http://0.0.0.0:${port}/admin/queues`);
    if (!user) {
      console.warn("[worker] BULL_BOARD_USER not set — board is NOT password-protected.");
    }
  });
}
