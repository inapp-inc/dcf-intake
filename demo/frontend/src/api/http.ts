import { ApiError } from "./errors";
import { TIMEOUT_MESSAGE } from "../config/timeouts";

export async function fetchTimed(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(TIMEOUT_MESSAGE, 408, "CLIENT_TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    const code = (body as { code?: string })?.code;
    const message = (body as { message?: string })?.message ?? res.statusText;
    throw new ApiError(message, res.status, code, body);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
