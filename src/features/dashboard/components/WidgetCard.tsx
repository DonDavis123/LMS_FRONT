"use client";

import { useId, type ReactNode } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

interface WidgetCardProps {
  title: string;
  subtitle?: string;
  link?: { href: string; label: string };
  /** Extra header content (e.g. a range toggle), shown before the link. */
  headerAside?: ReactNode;
  status: "loading" | "error" | "ready";
  error?: string;
  onRetry?: () => void;
  /** Body height in px — shared by the skeleton, error and loaded states so nothing jumps. */
  minHeight: number;
  delay?: number;
  children: ReactNode;
}

/** Shared frame for every dashboard widget: heading, link, skeleton, error + retry. */
export default function WidgetCard({
  title,
  subtitle,
  link,
  headerAside,
  status,
  error,
  onRetry,
  minHeight,
  delay = 0,
  children,
}: WidgetCardProps) {
  const headingId = useId();
  const skeletonRows = Math.max(2, Math.round(minHeight / 52));

  return (
    <section
      aria-labelledby={headingId}
      className="lp-card lp-widget animate-fade-in-up flex h-full min-w-0 flex-col overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-5 sm:py-4">
        <div className="min-w-0">
          <h2 id={headingId} className="font-serif text-lg text-fg">
            {title}
          </h2>
          {subtitle && <p className="text-xs text-ink-soft">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3">
          {headerAside}
          {link && (
            <Link
              href={link.href}
              className="rounded text-sm font-medium text-slate outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-slate"
            >
              {link.label}
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1" style={{ minHeight }}>
        {status === "loading" && (
          <div className="space-y-3 p-4 sm:p-5" aria-busy="true" aria-label={`Loading ${title}`}>
            {Array.from({ length: skeletonRows }, (_, index) => (
              <div key={index} className="h-9 animate-shimmer rounded-md" />
            ))}
          </div>
        )}

        {status === "error" && (
          <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 px-4 py-8 text-center" style={{ minHeight }}>
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "color-mix(in srgb, var(--color-danger) 14%, transparent)" }}
            >
              <AlertCircle size={20} className="text-danger" aria-hidden="true" />
            </span>
            <p className="max-w-xs text-sm text-ink-soft">{error ?? "Something went wrong."}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-medium text-fg outline-none transition hover:bg-paper focus-visible:ring-2 focus-visible:ring-slate"
              >
                <RefreshCw size={14} aria-hidden="true" />
                Retry
              </button>
            )}
          </div>
        )}

        {status === "ready" && children}
      </div>
    </section>
  );
}

interface WidgetEmptyProps {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: { href: string; label: string };
  minHeight: number;
}

export function WidgetEmpty({ icon, title, hint, action, minHeight }: WidgetEmptyProps) {
  return (
    <div className="animate-scale-in flex flex-col items-center justify-center gap-2 px-4 py-8 text-center" style={{ minHeight }}>
      <span
        className="flex h-11 w-11 items-center justify-center rounded-full text-success"
        style={{ background: "color-mix(in srgb, var(--color-success) 14%, transparent)" }}
      >
        {icon}
      </span>
      <p className="font-serif text-base text-fg">{title}</p>
      {hint && <p className="max-w-xs text-sm text-ink-soft">{hint}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-1 rounded text-sm font-medium text-slate outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-slate"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
