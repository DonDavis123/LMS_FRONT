import { Ban, CheckCircle2, Clock3, KeyRound, Pencil, ShieldCheck, Trash2, UserPlus, type LucideIcon } from "lucide-react";
import type { UserAuditLogEntry } from "@/features/users/types/user.types";
import { auditActionLabel, describeAuditMetadata } from "@/features/users/utils/userLabels";
import { normalizeEnumValue } from "@/shared/utils/enumValue";

interface UserAuditTimelineProps {
  /** Newest first, as returned by the API. */
  entries: UserAuditLogEntry[];
}

const ACTION_ICONS: Record<string, { Icon: LucideIcon; tone: string }> = {
  USER_CREATED: { Icon: UserPlus, tone: "text-success" },
  USER_UPDATED: { Icon: Pencil, tone: "text-slate" },
  USER_ROLE_CHANGED: { Icon: ShieldCheck, tone: "text-slate" },
  USER_BLOCKED: { Icon: Ban, tone: "text-danger" },
  USER_UNBLOCKED: { Icon: CheckCircle2, tone: "text-success" },
  USER_PASSWORD_RESET: { Icon: KeyRound, tone: "text-slate" },
  USER_RETIRED: { Icon: Trash2, tone: "text-danger" },
};

function iconFor(action: string) {
  return ACTION_ICONS[normalizeEnumValue(action)] ?? { Icon: Clock3, tone: "text-ink-soft" };
}

function parseDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayLabel(value: string): string {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : value;
}

function timeLabel(value: string): string {
  const date = parseDate(value);
  return date ? date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "";
}

/** Groups consecutive entries under one chip per calendar day, keeping their order. */
interface DayGroup {
  key: string;
  label: string;
  items: UserAuditLogEntry[];
}

function groupByDay(entries: UserAuditLogEntry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const entry of entries) {
    const key = parseDate(entry.created_at)?.toDateString() ?? entry.created_at;
    const current = groups[groups.length - 1];
    if (current && current.key === key) current.items.push(entry);
    else groups.push({ key, label: dayLabel(entry.created_at), items: [entry] });
  }
  return groups;
}

/** Vertical timeline of account changes: day chip, time, icon rail, what happened and by whom. */
export default function UserAuditTimeline({ entries }: UserAuditTimelineProps) {
  return (
    <div className="space-y-6">
      {groupByDay(entries).map((group) => (
        <section key={group.key}>
          <div className="mb-3 inline-flex items-center rounded-md border border-line bg-paper px-3 py-1 text-xs font-medium text-fg">
            {group.label}
          </div>

          <ol>
            {group.items.map((entry, index) => {
              const { Icon, tone } = iconFor(entry.action);
              const detail = describeAuditMetadata(entry);
              const isLast = index === group.items.length - 1;

              return (
                <li key={entry.id} className="flex gap-3">
                  <time className="w-[4.25rem] shrink-0 pt-1.5 text-right text-xs text-ink-soft">
                    {timeLabel(entry.created_at)}
                  </time>

                  <div className="relative flex w-8 shrink-0 justify-center">
                    {!isLast && (
                      <span aria-hidden="true" className="absolute bottom-0 left-1/2 top-8 w-0.5 -translate-x-1/2 bg-slate-light" />
                    )}
                    <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface ${tone}`}>
                      <Icon size={15} />
                    </span>
                  </div>

                  <div className={`min-w-0 flex-1 pt-1 ${isLast ? "" : "pb-6"}`}>
                    <p className="text-sm font-medium leading-snug text-fg">{auditActionLabel(entry.action)}</p>
                    {detail && <p className="mt-0.5 break-words text-sm text-fg">{detail}</p>}
                    <p className="mt-0.5 text-xs text-ink-soft">by {entry.actor_email || "unknown"}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
