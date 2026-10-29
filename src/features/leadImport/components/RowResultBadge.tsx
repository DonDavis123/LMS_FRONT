import { AlertTriangle, Check, Copy, Minus, Plus, RefreshCw } from "lucide-react";
import { rowResult, type ResultIcon, type ResultTone } from "@/features/leadImport/utils/rowDisplay";
import type { RowStatus } from "@/features/leadImport/types/leadImport.types";

const TONES: Record<ResultTone, string> = {
  success: "bg-success-soft text-success border-success/30",
  info: "bg-slate-light text-slate border-slate/30",
  warn: "bg-amber/15 text-fg border-amber/40",
  danger: "bg-danger-soft text-danger border-danger/30",
  muted: "bg-paper text-ink-soft border-line",
};

const ICONS: Record<ResultIcon, typeof Check> = {
  check: Check,
  refresh: RefreshCw,
  copy: Copy,
  alert: AlertTriangle,
  minus: Minus,
  plus: Plus,
};

interface RowResultBadgeProps {
  status: RowStatus;
  /** A change that is saved but not in the counts yet. */
  pending?: "excluded" | "included" | null;
}

/** What will happen to a row. The icon and the words say it; colour only adds to it. */
export default function RowResultBadge({ status, pending = null }: RowResultBadgeProps) {
  const info =
    pending === "excluded"
      ? { label: "Left out", tone: "muted" as ResultTone, icon: "minus" as ResultIcon }
      : pending === "included"
        ? { label: "Included again", tone: "info" as ResultTone, icon: "plus" as ResultIcon }
        : rowResult(status);
  const Icon = ICONS[info.icon];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[info.tone]}`}
    >
      <Icon size={12} aria-hidden="true" />
      {info.label}
    </span>
  );
}
