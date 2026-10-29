"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface ImportToastState {
  message: string;
  tone: "success" | "error";
}

/** Same pattern as the Leads page toast: show for 3 s (a little longer for errors). */
export function useImportToast() {
  const [toast, setToast] = useState<ImportToastState | null>(null);
  const timer = useRef<number | null>(null);

  const showToast = useCallback((message: string, tone: ImportToastState["tone"] = "success") => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = window.setTimeout(() => setToast(null), tone === "error" ? 5000 : 3000);
  }, []);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  return { toast, showToast };
}

export default function ImportToast({ toast }: { toast: ImportToastState | null }) {
  if (!toast) return null;
  const isError = toast.tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`fixed bottom-6 right-6 z-[60] flex max-w-[calc(100vw-3rem)] items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium shadow-lg animate-toast-in ${
        isError
          ? "border-danger/30 bg-danger-soft text-danger"
          : "border-success/30 bg-success-soft text-success"
      }`}
    >
      <Icon size={16} className="shrink-0" aria-hidden="true" />
      {toast.message}
    </div>
  );
}
