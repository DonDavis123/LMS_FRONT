"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  searchRecords,
  type RecordKind,
  type RecordSearchItem,
} from "@/shared/services/recordSearch";

interface UseRecordSearchOptions {
  kinds: RecordKind[];
  query: string;
  /** Only fetch while the dropdown is open. */
  enabled: boolean;
  debounceMs?: number;
}

interface SearchState {
  items: RecordSearchItem[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
}

const INITIAL: SearchState = {
  items: [],
  total: 0,
  loading: false,
  loadingMore: false,
  error: null,
  hasMore: false,
};

/**
 * Debounced, paginated, race-safe search against the backend list APIs.
 * With several kinds (e.g. Lead + Contact) the kinds are queried in
 * parallel and their results are grouped in the order given.
 */
export function useRecordSearch({ kinds, query, enabled, debounceMs = 250 }: UseRecordSearchOptions) {
  const [state, setState] = useState<SearchState>(INITIAL);
  const [retryTick, setRetryTick] = useState(0);
  const requestId = useRef(0);
  const cursors = useRef<Record<string, { page: number; hasMore: boolean }>>({});
  const wasEnabled = useRef(false);

  const kindsKey = kinds.join(",");
  const trimmed = query.trim();
  const pageSize = kinds.length > 1 ? 8 : 20;

  useEffect(() => {
    if (!enabled) {
      wasEnabled.current = false;
      requestId.current += 1; // drop anything still in flight
      return;
    }

    const activeKinds = kindsKey.split(",") as RecordKind[];
    const id = ++requestId.current;
    const justOpened = !wasEnabled.current;
    wasEnabled.current = true;

    setState((prev) => ({
      ...(justOpened ? INITIAL : prev),
      loading: true,
      loadingMore: false,
      error: null,
    }));

    const timer = window.setTimeout(
      async () => {
        const settled = await Promise.allSettled(
          activeKinds.map((kind) => searchRecords(kind, trimmed, 1, pageSize))
        );
        if (id !== requestId.current) return;

        const nextCursors: Record<string, { page: number; hasMore: boolean }> = {};
        const items: RecordSearchItem[] = [];
        let total = 0;
        let failures = 0;

        settled.forEach((result, index) => {
          const kind = activeKinds[index];
          if (result.status === "fulfilled") {
            items.push(...result.value.items);
            total += result.value.total;
            nextCursors[kind] = { page: 1, hasMore: result.value.hasMore };
          } else {
            failures += 1;
            nextCursors[kind] = { page: 0, hasMore: false };
          }
        });

        cursors.current = nextCursors;
        const allFailed = failures === activeKinds.length;
        setState({
          items,
          total,
          loading: false,
          loadingMore: false,
          error: allFailed ? "Couldn't load results." : null,
          hasMore: Object.values(nextCursors).some((c) => c.hasMore),
        });
      },
      trimmed ? debounceMs : 0
    );

    return () => window.clearTimeout(timer);
  }, [enabled, kindsKey, trimmed, pageSize, debounceMs, retryTick]);

  const loadMore = useCallback(async () => {
    if (state.loading || state.loadingMore || !state.hasMore) return;

    const id = requestId.current;
    const pending = (kindsKey.split(",") as RecordKind[]).filter((kind) => cursors.current[kind]?.hasMore);
    if (pending.length === 0) return;

    setState((prev) => ({ ...prev, loadingMore: true }));

    const settled = await Promise.allSettled(
      pending.map((kind) => searchRecords(kind, trimmed, cursors.current[kind].page + 1, pageSize))
    );
    if (id !== requestId.current) return;

    const incoming: RecordSearchItem[] = [];
    settled.forEach((result, index) => {
      const kind = pending[index];
      if (result.status === "fulfilled") {
        incoming.push(...result.value.items);
        cursors.current[kind] = { page: result.value.page, hasMore: result.value.hasMore };
      } else {
        cursors.current[kind] = { ...cursors.current[kind], hasMore: false };
      }
    });

    setState((prev) => {
      const seen = new Set(prev.items.map((item) => `${item.kind}:${item.id}`));
      const merged = [...prev.items];
      // Keep kinds grouped: insert each new item after the last item of its kind.
      for (const item of incoming) {
        const key = `${item.kind}:${item.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        let insertAt = merged.length;
        for (let i = merged.length - 1; i >= 0; i -= 1) {
          if (merged[i].kind === item.kind) {
            insertAt = i + 1;
            break;
          }
        }
        merged.splice(insertAt, 0, item);
      }
      return {
        ...prev,
        items: merged,
        loadingMore: false,
        hasMore: Object.values(cursors.current).some((c) => c.hasMore),
      };
    });
  }, [state.loading, state.loadingMore, state.hasMore, kindsKey, trimmed, pageSize]);

  const retry = useCallback(() => setRetryTick((tick) => tick + 1), []);

  return { ...state, loadMore, retry };
}
