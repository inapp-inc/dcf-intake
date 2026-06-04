import type { ReactNode } from "react";
import { LoadingBlock } from "./LoadingSpinner";

export function QueryState({
  loading,
  loadingMessage = "Loading…",
  loadingHint,
  minHeight = 120,
  empty,
  children,
}: {
  loading: boolean;
  loadingMessage?: string;
  loadingHint?: string;
  minHeight?: number;
  empty?: ReactNode;
  children: ReactNode;
}) {
  if (loading) {
    return <LoadingBlock message={loadingMessage} hint={loadingHint} minHeight={minHeight} />;
  }
  if (empty != null) return <>{empty}</>;
  return <>{children}</>;
}
