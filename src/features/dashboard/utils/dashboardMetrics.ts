import { LEAD_SOURCES, LEAD_STATUSES, type LeadSource, type LeadStatus } from "@/features/leads/types/lead.types";
import type { Task, TaskPriority } from "@/features/tasks/types/task.types";
import { normalizeEnumValue } from "@/shared/utils/enumValue";
import type { DailyCount, DashboardRange, Delta } from "@/features/dashboard/types/dashboard.types";

const MS_PER_DAY = 86_400_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/* ── Dates (always the user's LOCAL calendar day) ───────────────────── */

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Parses "YYYY-MM-DD" from its parts as a local date. `new Date("YYYY-MM-DD")`
 * would be read as UTC midnight and land on the previous day west of UTC.
 */
export function parseDateKey(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Whole calendar days from `b` to `a` (DST-safe). */
export function diffInDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / MS_PER_DAY);
}

export function formatShortDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatAxisDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return date ? `${MONTHS[date.getMonth()]} ${date.getDate()}` : dateKey;
}

export function formatClock(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function dayHeading(date: Date, now: Date): string {
  const diff = diffInDays(date, now);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return formatShortDate(date);
}

export interface RangeWindow {
  /** Every local day in the range, oldest first, ending today. */
  days: string[];
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
}

export function buildRangeWindow(range: DashboardRange, now: Date = new Date()): RangeWindow {
  const today = startOfDay(now);
  const from = addDays(today, -(range - 1));
  return {
    days: Array.from({ length: range }, (_, index) => toDateKey(addDays(from, index))),
    from,
    to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999),
    previousFrom: addDays(from, -range),
    previousTo: new Date(from.getTime() - 1),
  };
}

/** Counts ISO timestamps per local day; every day of `days` is present (0 when empty). */
export function bucketByDay(days: string[], isoDates: string[]): DailyCount[] {
  const counts = new Map<string, number>(days.map((day) => [day, 0]));
  for (const iso of isoDates) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) continue;
    const key = toDateKey(date);
    const current = counts.get(key);
    if (current !== undefined) counts.set(key, current + 1);
  }
  return days.map((day) => ({ date: day, count: counts.get(day) ?? 0 }));
}

/* ── Numbers ────────────────────────────────────────────────────────── */

export function computeDelta(current: number, previous: number): Delta | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous < 0) return null;
  if (previous === 0) return current > 0 ? { kind: "new", percent: 0 } : null;
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return { kind: "flat", percent: 0 };
  return { kind: percent > 0 ? "up" : "down", percent: Math.abs(percent) };
}

export function describeDelta(delta: Delta, baseline: string): string {
  switch (delta.kind) {
    case "new":
      return `New — nothing in ${baseline}`;
    case "flat":
      return `No change compared with ${baseline}`;
    case "up":
      return `${delta.percent}% more than ${baseline}`;
    case "down":
      return `${delta.percent}% fewer than ${baseline}`;
  }
}

export function sumCounts(series: DailyCount[]): number {
  return series.reduce((total, item) => total + item.count, 0);
}

export function formatPercent(part: number, whole: number): string {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return "0%";
  const value = Math.round((part / whole) * 1000) / 10;
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

/** Integer-only y scale with at most 5 ticks. */
export function niceScale(max: number): { top: number; ticks: number[] } {
  const safeMax = Number.isFinite(max) && max > 0 ? Math.ceil(max) : 1;
  if (safeMax <= 4) {
    return { top: safeMax, ticks: Array.from({ length: safeMax + 1 }, (_, index) => index) };
  }
  const raw = safeMax / 4;
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((multiple) => multiple * power).find((candidate) => candidate >= raw) ?? 10 * power;
  const top = Math.ceil(safeMax / step) * step;
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, index) => index * step) };
}

/* ── Greeting / hero ────────────────────────────────────────────────── */

export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function firstNameOf(name: string | null | undefined): string {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : "there";
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Non-zero parts of the hero sentence; empty means "all caught up". */
export function buildSummaryParts(dueToday: number, overdue: number, meetingsToday: number): string[] {
  const parts: string[] = [];
  if (dueToday > 0) parts.push(`${plural(dueToday, "task")} due today`);
  if (overdue > 0) parts.push(`${overdue} overdue`);
  if (meetingsToday > 0) parts.push(`${plural(meetingsToday, "meeting")} later today`);
  return parts;
}

/* ── Tasks ──────────────────────────────────────────────────────────── */

export interface TaskGroups {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
}

export function groupTasksByDue(tasks: Task[], now: Date = new Date()): TaskGroups {
  const groups: TaskGroups = { overdue: [], today: [], upcoming: [] };
  for (const task of tasks) {
    const due = task.due_date ? parseDateKey(task.due_date) : null;
    if (!due) {
      groups.upcoming.push(task);
      continue;
    }
    const diff = diffInDays(due, now);
    if (diff < 0) groups.overdue.push(task);
    else if (diff === 0) groups.today.push(task);
    else groups.upcoming.push(task);
  }
  return groups;
}

export function dueLabel(task: Task, now: Date = new Date()): { text: string; overdue: boolean } {
  const due = task.due_date ? parseDateKey(task.due_date) : null;
  if (!due) return { text: "No due date", overdue: false };
  const diff = diffInDays(due, now);
  if (diff < 0) return { text: `${plural(-diff, "day")} overdue`, overdue: true };
  if (diff === 0) return { text: "Today", overdue: false };
  if (diff === 1) return { text: "Tomorrow", overdue: false };
  return { text: formatShortDate(due), overdue: false };
}

export type PriorityTone = "danger" | "slate" | "muted";

export function priorityTone(priority: TaskPriority): PriorityTone {
  if (priority === "Highest" || priority === "High") return "danger";
  if (priority === "Normal") return "slate";
  return "muted";
}

export function taskRelatedName(task: Task): string | null {
  return task.lead_name || task.contact_name || task.account_name || null;
}

/* ── Lead statuses / sources ────────────────────────────────────────── */

export type Tone = "success" | "amber" | "danger" | "slate";

export const TONE_COLOR: Record<Tone, string> = {
  success: "var(--color-success)",
  amber: "var(--color-amber)",
  danger: "var(--color-danger)",
  slate: "var(--color-slate)",
};

/** Text colour for a tone: mixed with the foreground so it stays readable on both themes. */
export const TONE_TEXT: Record<Tone, string> = {
  success: "color-mix(in srgb, var(--color-success) 65%, var(--color-fg))",
  amber: "color-mix(in srgb, var(--color-amber-dark) 65%, var(--color-fg))",
  danger: "color-mix(in srgb, var(--color-danger) 65%, var(--color-fg))",
  slate: "color-mix(in srgb, var(--color-slate) 65%, var(--color-fg))",
};

export function toneTint(tone: Tone, percent = 14): string {
  return `color-mix(in srgb, ${TONE_COLOR[tone]} ${percent}%, transparent)`;
}

export function leadStatusTone(status: LeadStatus): Tone {
  switch (status) {
    case "Pre-Qualified":
    case "Contacted":
      return "success";
    case "Attempted to Contact":
    case "Contact in Future":
    case "Not Contacted":
      return "amber";
    case "Lost Lead":
    case "Junk Lead":
    case "Not Qualified":
      return "danger";
    default:
      // "None", and any stage the company added itself.
      return "slate";
  }
}

export function statusLabel(status: LeadStatus): string {
  return status === "None" ? "No status" : status;
}

export function sourceLabel(source: LeadSource): string {
  return source === "None" ? "Unknown" : source;
}

function squash(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function repairEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  if (typeof value !== "string") return null;
  const exact = allowed.find((item) => item === value);
  if (exact) return exact;
  // Python enums can arrive as "LeadStatus.PRE_QUALIFIED".
  const bare = squash(normalizeEnumValue(value));
  return allowed.find((item) => squash(item) === bare) ?? null;
}

/**
 * Options are now company-defined text, so any non-empty value is kept as the
 * backend sent it. Only the old Python-enum shape ("LeadStatus.PRE_QUALIFIED")
 * is repaired back to its built-in name.
 */
function toOptionText(value: unknown, builtIn: readonly string[]): string {
  if (typeof value !== "string" || !value.trim()) return "None";
  const text = value.trim();
  if (text.includes(".")) {
    const repaired = repairEnum(text, builtIn);
    if (repaired) return repaired;
  }
  return text;
}

export function toLeadStatus(value: unknown): LeadStatus {
  return toOptionText(value, LEAD_STATUSES);
}

export function toLeadSource(value: unknown): LeadSource {
  return toOptionText(value, LEAD_SOURCES);
}

export interface PipelineRow {
  status: LeadStatus;
  label: string;
  count: number;
  /** Share of `total`, 0–100. */
  percent: number;
}

export function buildPipelineRows(byStatus: { status: LeadStatus; count: number }[], total: number): PipelineRow[] {
  const counts = new Map<LeadStatus, number>();
  for (const item of byStatus) counts.set(item.status, (counts.get(item.status) ?? 0) + item.count);

  // `byStatus` already lists the company's own stages (see DashboardService).
  return [...counts.keys()]
    .filter((status) => status !== "None" || (counts.get(status) ?? 0) > 0)
    .map((status) => {
      const count = counts.get(status) ?? 0;
      return {
        status,
        label: statusLabel(status),
        count,
        percent: total > 0 ? Math.min(100, (count / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export interface SourceSlice {
  key: string;
  label: string;
  count: number;
  percent: number;
}

const MAX_SOURCE_SLICES = 5;

export function buildSourceSlices(bySource: { source: LeadSource; count: number }[]): { slices: SourceSlice[]; total: number } {
  const merged = new Map<LeadSource, number>();
  for (const item of bySource) {
    if (item.count > 0) merged.set(item.source, (merged.get(item.source) ?? 0) + item.count);
  }
  const sorted = [...merged.entries()].sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);

  const head = sorted.slice(0, MAX_SOURCE_SLICES).map(([source, count]) => ({ key: source, label: sourceLabel(source), count }));
  const otherCount = sorted.slice(MAX_SOURCE_SLICES).reduce((sum, [, count]) => sum + count, 0);
  const entries = otherCount > 0 ? [...head, { key: "__other", label: "More sources", count: otherCount }] : head;

  return {
    total,
    slices: entries.map((entry) => ({ ...entry, percent: total > 0 ? (entry.count / total) * 100 : 0 })),
  };
}

/** Ordered token palette. `--color-fg` stands in for ink so it stays visible in dark mode. */
export const SOURCE_PALETTE = [
  "var(--color-fg)",
  "var(--color-slate)",
  "var(--color-amber)",
  "var(--color-success)",
  "color-mix(in srgb, var(--color-danger) 65%, transparent)",
  "var(--color-ink-soft)",
] as const;

/* ── Avatars ────────────────────────────────────────────────────────── */

const AVATAR_TONES = [
  "var(--color-slate)",
  "var(--color-amber-dark)",
  "var(--color-success)",
  "var(--color-danger)",
  "var(--color-fg)",
] as const;

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toUpperCase();
}

export function avatarToneFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

/* ── SVG geometry ───────────────────────────────────────────────────── */

export interface Point {
  x: number;
  y: number;
}

function fixed(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** Monotone cubic (Fritsch–Carlson) path: smooth, never overshoots the data. */
export function buildLinePath(points: Point[]): string {
  const count = points.length;
  if (count === 0) return "";
  if (count === 1) return `M${fixed(points[0].x)} ${fixed(points[0].y)}`;
  if (count === 2) {
    return `M${fixed(points[0].x)} ${fixed(points[0].y)} L${fixed(points[1].x)} ${fixed(points[1].y)}`;
  }

  const widths: number[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    widths.push(points[i + 1].x - points[i].x || 1);
    slopes.push((points[i + 1].y - points[i].y) / widths[i]);
  }

  const tangents: number[] = new Array<number>(count).fill(0);
  tangents[0] = slopes[0];
  tangents[count - 1] = slopes[count - 2];
  for (let i = 1; i < count - 1; i++) {
    tangents[i] = slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2;
  }
  for (let i = 0; i < count - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i] / slopes[i];
    const b = tangents[i + 1] / slopes[i];
    const magnitude = a * a + b * b;
    if (magnitude > 9) {
      const scale = 3 / Math.sqrt(magnitude);
      tangents[i] = scale * a * slopes[i];
      tangents[i + 1] = scale * b * slopes[i];
    }
  }

  let path = `M${fixed(points[0].x)} ${fixed(points[0].y)}`;
  for (let i = 0; i < count - 1; i++) {
    const h = widths[i] / 3;
    path +=
      ` C${fixed(points[i].x + h)} ${fixed(points[i].y + tangents[i] * h)}` +
      ` ${fixed(points[i + 1].x - h)} ${fixed(points[i + 1].y - tangents[i + 1] * h)}` +
      ` ${fixed(points[i + 1].x)} ${fixed(points[i + 1].y)}`;
  }
  return path;
}
