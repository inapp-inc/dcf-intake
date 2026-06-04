import type { WebSocket } from "ws";

const subscribers = new Map<string, Set<WebSocket>>();

export function registerCaseSocket(caseId: string, ws: WebSocket): void {
  let set = subscribers.get(caseId);
  if (!set) {
    set = new Set();
    subscribers.set(caseId, set);
  }
  set.add(ws);
}

export function unregisterCaseSocket(caseId: string, ws: WebSocket): void {
  const set = subscribers.get(caseId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) subscribers.delete(caseId);
}

export function publishCaseEvent(caseId: string, event: Record<string, unknown>): void {
  const message = JSON.stringify(event);
  const set = subscribers.get(caseId);
  if (!set) return;
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}
