const STORAGE_KEY = "intake-demo-token";

type SessionListener = () => void;
const listeners = new Set<SessionListener>();

export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Notify auth layer (e.g. expired JWT); listeners clear React session state. */
export function handleAuthFailure(): void {
  clearAccessToken();
  listeners.forEach((fn) => fn());
}

export function subscribeSession(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
