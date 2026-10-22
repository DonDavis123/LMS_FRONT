"use client";

import { AlertTriangle } from "lucide-react";
import Switch from "@/shared/components/Switch";
import type { LeadForm } from "@/features/leadCapture/types/leadCapture.types";

interface LeadFormStatusHeaderProps {
  form: LeadForm;
  /** A block / unblock request is in flight. */
  isToggling: boolean;
  /** `true` = unblock, `false` = block. */
  onToggle: (accepting: boolean) => void;
}

type Status = "needs_attention" | "live" | "blocked";

const BADGES: Record<Status, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-success-soft text-success" },
  blocked: { label: "Blocked", className: "bg-paper text-ink-soft ring-1 ring-line" },
  needs_attention: {
    label: "Needs attention",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  },
};

function statusOf(form: LeadForm): Status {
  if (form.needs_attention) return "needs_attention";
  return form.is_active ? "live" : "blocked";
}

export default function LeadFormStatusHeader({ form, isToggling, onToggle }: LeadFormStatusHeaderProps) {
  const status = statusOf(form);
  const badge = BADGES[status];
  // A blocked form that was never set up can't be turned on yet. A live form
  // that needs attention can always be blocked.
  const cannotUnblock = !form.is_active && !form.is_configured;

  return (
    <div className="lp-card overflow-hidden">
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-words font-serif text-lg leading-tight text-fg">{form.title}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-soft">
            {form.is_active
              ? "Visitors can open the link or scan the QR code and send their details."
              : "The link is closed: visitors see that the form is no longer accepting responses."}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
          <span className="text-sm font-medium text-fg">{form.is_active ? "Accepting responses" : "Blocked"}</span>
          <Switch
            checked={form.is_active}
            onChange={onToggle}
            ariaLabel={form.is_active ? "Block the lead form" : "Unblock the lead form"}
            disabled={cannotUnblock}
            loading={isToggling}
          />
        </div>
      </div>

      {cannotUnblock && (
        <p className="border-t border-line bg-paper/50 px-4 py-2.5 text-xs text-ink-soft">
          Choose a lead source and an eligible owner in the settings below and save them. The form can be turned on
          once both are set.
        </p>
      )}

      {form.needs_attention && (
        <div
          role="alert"
          className="flex items-start gap-2 border-t border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>
            This form is live, but its lead source or owner is no longer valid (for example the owner was deactivated
            or the option was removed), so visitors can&apos;t submit it. Choose a valid lead source and owner below,
            or block the form.
          </p>
        </div>
      )}
    </div>
  );
}
