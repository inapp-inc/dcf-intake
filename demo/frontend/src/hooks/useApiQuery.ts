import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

export type UseApiQueryOptions<T> = {
  enabled?: boolean;
  initialData?: T | null;
  onSuccess?: (data: T) => void;
  keepPreviousData?: boolean;
};

/**
 * Data layer: authenticated fetch with loading/error and stable reload.
 * Uses api client session — fetcher should not take a token argument.
 */
export function useApiQuery<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: UseApiQueryOptions<T> = {},
) {
  const { isAuthenticated } = useAuth();
  const enabled = (options.enabled ?? true) && isAuthenticated;
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const onSuccessRef = useRef(options.onSuccess);
  onSuccessRef.current = options.onSuccess;

  const [data, setData] = useState<T | null>(options.initialData ?? null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<T | undefined> => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
      onSuccessRef.current?.(result);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      if (!options.keepPreviousData) setData(options.initialData ?? null);
      return undefined;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are explicit triggers
  }, [enabled, ...deps]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}
