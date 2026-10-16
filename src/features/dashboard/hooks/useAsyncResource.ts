import { useCallback, useEffect, useRef, useState } from "react";
import { extractApiError } from "@/shared/utils/apiError";
import type { AsyncState } from "@/features/dashboard/types/dashboard.types";

interface AsyncResource<T> {
  state: AsyncState<T>;
  /** True while a (re)fetch is in flight, including refetches that keep showing old data. */
  isFetching: boolean;
  /** Epoch ms of the last successful load. */
  loadedAt: number | null;
  reload: () => void;
  patch: (update: (current: T) => T) => void;
}

/**
 * One widget's data. Re-runs when `key` changes or `reload()` is called, keeps
 * the previous data on screen while refetching, and ignores late responses
 * after unmount or a newer request. Pass `load = null` to stay idle.
 */
export function useAsyncResource<T>(load: (() => Promise<T>) | null, key: string, fallbackError: string): AsyncResource<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [isFetching, setIsFetching] = useState(load !== null);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const run = loadRef.current;
    if (!run) return;
    let cancelled = false;
    setIsFetching(true);

    run()
      .then((data) => {
        if (cancelled) return;
        setState({ status: "ready", data });
        setLoadedAt(Date.now());
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", message: extractApiError(error, fallbackError) });
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, nonce, fallbackError]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  const patch = useCallback((update: (current: T) => T) => {
    setState((current) => (current.status === "ready" ? { status: "ready", data: update(current.data) } : current));
  }, []);

  return { state, isFetching, loadedAt, reload, patch };
}
