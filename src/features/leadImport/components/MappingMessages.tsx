"use client";

import { AlertCircle, AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import type { ImportErrorInfo } from "@/features/leadImport/utils/importErrors";

/** Server errors: one line each, they block Continue. */
export function MappingErrors({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 sm:p-4">
      <p className="text-sm font-semibold text-danger">
        {errors.length === 1 ? "Fix this to continue" : `Fix these ${errors.length} things to continue`}
      </p>
      <ul className="mt-2 space-y-1.5">
        {errors.map((error, index) => (
          <li key={`${index}-${error}`} className="flex items-start gap-2 text-sm text-fg">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
            <span className="min-w-0 break-words">{error}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Server warnings: calm and amber, they never block. */
export function MappingWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div role="status" className="rounded-lg border border-amber/40 bg-amber/10 p-3 sm:p-4">
      <p className="text-sm font-semibold text-fg">Worth a look, but you can continue</p>
      <ul className="mt-2 space-y-1.5">
        {warnings.map((warning, index) => (
          <li key={`${index}-${warning}`} className="flex items-start gap-2 text-sm text-fg">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-dark" aria-hidden="true" />
            <span className="min-w-0 break-words">{warning}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The preview request itself failed. Stays on screen until the user retries. */
export function PreviewRetryCard({ error, onRetry }: { error: ImportErrorInfo; onRetry: () => void }) {
  const Icon = error.isNetwork ? WifiOff : AlertCircle;
  return (
    <div role="alert" className="m-3 rounded-lg border border-line bg-paper p-4 sm:m-4">
      <div className="flex items-start gap-3">
        <Icon size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">We could not check your mapping</p>
          <p className="mt-0.5 break-words text-sm text-fg">{error.message}</p>
          {error.howToFix && <p className="mt-0.5 break-words text-sm text-ink-soft">{error.howToFix}</p>}
          <p className="mt-1 text-xs text-ink-soft">You can still continue. The next step checks the whole file.</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg transition hover:bg-paper active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
          >
            <RefreshCw size={14} aria-hidden="true" />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
