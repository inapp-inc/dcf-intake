import { useEffect, useRef } from "react";
import { wsCaseUrl } from "../config/paths";
import type { CaseWsEvent } from "../api/types";

export function useCaseWebSocket(
  caseId: string | null,
  token: string | null,
  onEvent: (event: CaseWsEvent) => void,
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!caseId || !token) return;

    const url = wsCaseUrl(caseId, token);
    const ws = new WebSocket(url);

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as CaseWsEvent;
        onEventRef.current(data);
      } catch {
        /* ignore malformed */
      }
    };

    return () => ws.close();
  }, [caseId, token]);
}
