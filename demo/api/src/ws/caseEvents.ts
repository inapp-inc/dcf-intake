import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { WebSocketServer } from "ws";
import { config } from "../config.js";
import { assertCaseAccess } from "../middleware/caseAccess.js";
import type { UserRole } from "../domain/form51a/types.js";
import { registerCaseSocket, unregisterCaseSocket } from "../services/eventBus.js";

const WS_PATH = /^\/ws\/cases\/([^/?]+)/;

export function attachCaseWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const pathname = req.url?.split("?")[0] ?? "";
    const match = pathname.match(WS_PATH);
    if (!match) {
      socket.destroy();
      return;
    }

    const token = new URL(req.url ?? "/", "http://localhost").searchParams.get("token");
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    let role: UserRole;
    try {
      const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
      role = payload.role as UserRole;
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const caseId = match[1];

    void (async () => {
      try {
        await assertCaseAccess(caseId, role);
      } catch {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        registerCaseSocket(caseId, ws);
        ws.on("close", () => unregisterCaseSocket(caseId, ws));
      });
    })();
  });
}
