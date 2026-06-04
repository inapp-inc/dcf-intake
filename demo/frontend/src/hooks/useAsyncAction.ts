import { useCallback, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

/**
 * Mutation layer: run authenticated async actions with a single pending flag.
 */
export function useAsyncAction<TArgs extends unknown[], TResult = void>(
  action: (...args: TArgs) => Promise<TResult>,
) {
  const { isAuthenticated } = useAuth();
  const actionRef = useRef(action);
  actionRef.current = action;
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      if (!isAuthenticated) return undefined;
      setPending(true);
      try {
        return await actionRef.current(...args);
      } finally {
        setPending(false);
      }
    },
    [isAuthenticated],
  );

  return { run, pending };
}
