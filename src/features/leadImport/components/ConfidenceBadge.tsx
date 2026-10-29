import { CheckCircle2, CircleHelp, EyeOff, MinusCircle, UserCheck, type LucideIcon } from "lucide-react";
import type { MatchKind } from "@/features/leadImport/utils/mappingRules";

const BADGES: Record<MatchKind, { label: string; Icon: LucideIcon; className: string }> = {
  auto: { label: "Matched automatically", Icon: CheckCircle2, className: "bg-success-soft text-success" },
  check: { label: "Suggested: please check", Icon: CircleHelp, className: "bg-amber/15 text-fg" },
  none: { label: "Not matched", Icon: MinusCircle, className: "bg-slate-light text-slate" },
  chosen: { label: "Chosen by you", Icon: UserCheck, className: "bg-slate-light text-slate" },
  ignored: { label: "Not imported", Icon: EyeOff, className: "border border-line bg-paper text-ink-soft" },
};

/** How sure we are about a column. Always an icon plus text, never colour alone. */
export default function ConfidenceBadge({ kind }: { kind: MatchKind }) {
  const { label, Icon, className } = BADGES[kind];
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      <Icon size={13} className="shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}
