import http from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { seedDatabase } from "./lib/seed";
import { initSocketServer } from "./lib/socket";

const rawPort = process.env["PORT"] || "5000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = http.createServer(app);
initSocketServer(httpServer);

seedDatabase()
  .then(() => {
    httpServer.listen(port, () => {
      logger.info({ port }, "Server listening with Socket.io");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Error seeding database");
    process.exit(1);
  });
