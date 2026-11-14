"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleIntegrationService } from "@/features/googleIntegration/services/GoogleIntegrationService";
import {
  GOOGLE_CONNECTION_CHANGED_EVENT,
  GOOGLE_OAUTH_CHANNEL,
  isGoogleOAuthMessage,
  type GoogleConnectionStatus,
  type GoogleOAuthMessage,
} from "@/features/googleIntegration/types/google.types";

const POPUP_NAME = "google-connect";
const POPUP_FEATURES = "width=520,height=680";
const POPUP_POLL_MS = 500;
/** Lets a result message arrive before a closed popup is treated as "cancelled". */
const POPUP_CLOSE_GRACE_MS = 700;
const POPUP_BLOCKED_MESSAGE =
  "Your browser blocked the Google sign-in popup. Allow popups for this site and try again.";

interface Options {
  /** Set false to skip the initial status request (status stays null until refresh/connect). */
  enabled?: boolean;
}

/**
 * The signed-in user's Google connection: status + the connect (popup/OAuth)
 * and disconnect actions.
 *
 * `connect()` must be called straight from a click handler: the popup is
 * opened synchronously (so popup blockers allow it) and pointed at Google
 * once the server has produced the authorization URL.
 */
export function useGoogleConnection({ enabled = true }: Options = {}) {
  const [status, setStatus] = useState<GoogleConnectionStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const mountedRef = useRef(true);
  const instanceId = useRef(`g-${Math.random().toString(36).slice(2)}`);
  const requestRef = useRef(0);
  const connectingRef = useRef(false);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<number | null>(null);
  const graceRef = useRef<number | null>(null);

  const load = useCallback(async (silent: boolean) => {
    const request = ++requestRef.current;
    if (!silent) setLoading(true);
    try {
      const next = await GoogleIntegrationService.getStatus();
      if (!mountedRef.current || request !== requestRef.current) return;
      setStatus(next);
      setError(null);
    } catch (caught) {
      if (!mountedRef.current || request !== requestRef.current) return;
      setError(
        caught instanceof Error ? caught.message : "Couldn't check the Google connection.",
      );
    } finally {
      if (mountedRef.current && request === requestRef.current) setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => load(false), [load]);

  const announceChange = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent(GOOGLE_CONNECTION_CHANGED_EVENT, { detail: instanceId.current }),
    );
  }, []);

  const clearTimers = useCallback(() => {
    if (pollRef.current !== null) window.clearInterval(pollRef.current);
    if (graceRef.current !== null) window.clearTimeout(graceRef.current);
    pollRef.current = null;
    graceRef.current = null;
  }, []);

  const stopConnecting = useCallback(() => {
    clearTimers();
    connectingRef.current = false;
    popupRef.current = null;
    if (mountedRef.current) setConnecting(false);
  }, [clearTimers]);

  const handleResult = useCallback(
    (result: GoogleOAuthMessage) => {
      // Only the instance that opened the popup reacts to its result.
      if (!connectingRef.current) return;
      stopConnecting();

      if (result.status === "connected") {
        setError(null);
        void load(false).then(announceChange);
      } else {
        setError(result.message || "Google connection failed. Try again.");
      }
    },
    [announceChange, load, stopConnecting],
  );

  // Initial load.
  useEffect(() => {
    if (enabled) void load(false);
  }, [enabled, load]);

  // Mount flag + result listeners (postMessage, BroadcastChannel fallback) +
  // status changes made by other hook instances on the page.
  useEffect(() => {
    mountedRef.current = true;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isGoogleOAuthMessage(event.data)) return;
      handleResult(event.data);
    };
    window.addEventListener("message", onMessage);

    // Google's sign-in pages can sever `window.opener`, so the return page
    // also broadcasts on a same-origin channel.
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(GOOGLE_OAUTH_CHANNEL);
      channel.onmessage = (event: MessageEvent) => {
        if (isGoogleOAuthMessage(event.data)) handleResult(event.data);
      };
    }

    const onChanged = (event: Event) => {
      if ((event as CustomEvent<string>).detail === instanceId.current) return;
      void load(true);
    };
    window.addEventListener(GOOGLE_CONNECTION_CHANGED_EVENT, onChanged);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("message", onMessage);
      window.removeEventListener(GOOGLE_CONNECTION_CHANGED_EVENT, onChanged);
      channel?.close();
      clearTimers();
      connectingRef.current = false;
      popupRef.current = null;
    };
  }, [clearTimers, handleResult, load]);

  const connect = useCallback(async () => {
    if (connectingRef.current) {
      popupRef.current?.focus();
      return;
    }
    setError(null);

    // Must happen synchronously inside the click handler.
    const popup = window.open("", POPUP_NAME, POPUP_FEATURES);
    if (!popup || popup.closed) {
      setError(POPUP_BLOCKED_MESSAGE);
      return;
    }

    popupRef.current = popup;
    connectingRef.current = true;
    setConnecting(true);

    try {
      popup.document.title = "Connect Google";
      popup.document.body.textContent = "Opening Google…";
    } catch {
      // Cosmetic only.
    }

    // Detect the user closing the popup without finishing.
    pollRef.current = window.setInterval(() => {
      if (!popup.closed) return;
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
      pollRef.current = null;
      graceRef.current = window.setTimeout(() => {
        graceRef.current = null;
        if (!connectingRef.current) return;
        stopConnecting();
        void load(true); // it may have completed even though no message arrived
      }, POPUP_CLOSE_GRACE_MS);
    }, POPUP_POLL_MS);

    try {
      const url = await GoogleIntegrationService.startConnect();
      if (!connectingRef.current || popup.closed) return;
      popup.location.href = url;
    } catch (caught) {
      try {
        popup.close();
      } catch {
        // Already closed.
      }
      if (!mountedRef.current) return;
      stopConnecting();
      setError(
        caught instanceof Error ? caught.message : "Couldn't start the Google connection.",
      );
    }
  }, [load, stopConnecting]);

  const disconnect = useCallback(async (): Promise<boolean> => {
    setError(null);
    setDisconnecting(true);
    try {
      await GoogleIntegrationService.disconnect();
      await load(true);
      announceChange();
      return true;
    } catch (caught) {
      if (mountedRef.current) {
        setError(caught instanceof Error ? caught.message : "Couldn't disconnect Google.");
      }
      return false;
    } finally {
      if (mountedRef.current) setDisconnecting(false);
    }
  }, [announceChange, load]);

  return {
    status,
    loading,
    error,
    connecting,
    disconnecting,
    connect,
    disconnect,
    refresh,
    clearError: useCallback(() => setError(null), []),
  };
}

export type GoogleConnection = ReturnType<typeof useGoogleConnection>;
