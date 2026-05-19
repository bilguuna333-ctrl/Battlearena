import { Server as SocketServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { logger } from "./logger";

let io: SocketServer;

export function initSocketServer(httpServer: HttpServer) {
  io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "New socket connection");

    socket.on("join-room", (roomName: string) => {
      socket.join(roomName);
      logger.info({ socketId: socket.id, roomName }, "User joined room");
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}

export function getIo() {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

export function emitToUser(username: string, event: string, data: any) {
  if (io) {
    io.to(`user:${username}`).emit(event, data);
  }
}

export function emitToBattle(battleId: string, event: string, data: any) {
  if (io) {
    io.to(`battle:${battleId}`).emit(event, data);
  }
}
