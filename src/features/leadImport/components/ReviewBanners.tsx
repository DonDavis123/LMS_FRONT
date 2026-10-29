import { AlertCircle, RefreshCw } from "lucide-react";
import Spinner from "@/shared/components/Spinner";
import { formatCount } from "@/features/leadImport/utils/format";
import type { ImportErrorInfo } from "@/features/leadImport/utils/importErrors";
import { primaryButton, secondaryButton } from "@/features/leadImport/utils/reviewStyles";

interface SettingsProblemBannerProps {
  errors: string[];
  onBackToMapping: () => void;
  onBackToOptions: () => void;
}

/** The backend refused the settings (checked: false). Nothing else is shown until they are fixed. */
export function SettingsProblemBanner({ errors, onBackToMapping, onBackToOptions }: SettingsProblemBannerProps) {
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-danger">
      <div className="flex items-start gap-2">
        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Your file could not be checked with these settings</h2>
          {errors.length > 0 ? (
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm">
              {errors.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-sm">Go back and review your column mapping and options.</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={secondaryButton} onClick={onBackToMapping}>
          Back to column mapping
        </button>
        <button type="button" className={secondaryButton} onClick={onBackToOptions}>
          Back to options
        </button>
      </div>
    </div>
  );
}

/** The check request itself failed (network, server). Always shows the message AND how to fix it. */
export function CheckFailedBanner({ error, onRetry }: { error: ImportErrorInfo; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-danger">
      <div className="flex items-start gap-2">
        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{error.message}</h2>
          {error.howToFix && <p className="mt-1 text-sm">{error.howToFix}</p>}
        </div>
      </div>
      <div className="mt-3">
        <button type="button" className={secondaryButton} onClick={onRetry}>
          <RefreshCw size={14} aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  );
}

interface StaleBannerProps {
  /** A check is running right now. */
  checking: boolean;
  totalRows: number;
  onUpdate: () => void;
}

/** Shown whenever the numbers below are older than the user's latest change. */
export function StaleBanner({ checking, totalRows, onUpdate }: StaleBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2.5 text-sm text-fg"
    >
      {checking ? (
        <>
          <Spinner size="sm" />
          <span className="min-w-0 flex-1">
            <span className="font-medium">Updating the counts.</span>{" "}
            <span className="text-ink-soft">
              Checking {formatCount(totalRows)} rows against your settings and your existing leads...
            </span>
          </span>
        </>
      ) : (
        <>
          <span className="min-w-0 flex-1">
            <span className="font-medium">Your changes are saved. Update the counts to continue.</span>{" "}
            <span className="text-ink-soft">This also happens by itself in a moment.</span>
          </span>
          <button type="button" className={primaryButton} onClick={onUpdate}>
            Update counts
          </button>
        </>
      )}
    </div>
  );
}
