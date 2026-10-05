"use client";

import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import FloatingPopover from "@/shared/components/FloatingPopover";
import Time12hPicker from "@/shared/components/Time12hPicker";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function parseIso(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

/** Always 6 weeks (Monday first) so the popover height never jumps between months. */
function buildGrid(year: number, month: number): Date[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - offset + i));
}

type PanelView = "days" | "months" | "years";

interface CalendarPanelProps {
  value: string;
  onApply: (value: string) => void;
  onCancel: () => void;
}

function CalendarPanel({ value, onApply, onCancel }: CalendarPanelProps) {
  const initial = parseIso(value) ?? new Date();
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const [mode, setMode] = useState<PanelView>("days");
  const [decadeStart, setDecadeStart] = useState(Math.floor(initial.getFullYear() / 12) * 12);
  const [draft, setDraft] = useState(value);
  const [slide, setSlide] = useState<"next" | "prev" | "none">("none");
  const [tick, setTick] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const todayIso = toIso(new Date());
  const today = new Date();

  useEffect(() => {
    if (!pendingFocus.current) return;
    panelRef.current?.querySelector<HTMLButtonElement>(`[data-date="${pendingFocus.current}"]`)?.focus();
    pendingFocus.current = null;
  });

  function goTo(year: number, month: number) {
    const target = new Date(year, month, 1);
    const forward = target.getTime() > new Date(view.year, view.month, 1).getTime();
    setView({ year: target.getFullYear(), month: target.getMonth() });
    setSlide(forward ? "next" : "prev");
    setTick((t) => t + 1);
  }

  function select(day: Date) {
    setDraft(toIso(day));
    if (day.getMonth() !== view.month || day.getFullYear() !== view.year) goTo(day.getFullYear(), day.getMonth());
  }

  function jumpToToday() {
    setDraft(todayIso);
    goTo(today.getFullYear(), today.getMonth());
    setMode("days");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (mode !== "days") return;
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    const base = parseIso(draft) ?? new Date();
    let next: Date | null = null;

    if (event.key in steps) next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + steps[event.key]);
    else if (event.key === "PageUp") next = new Date(base.getFullYear(), base.getMonth() - (event.shiftKey ? 12 : 1), base.getDate());
    else if (event.key === "PageDown") next = new Date(base.getFullYear(), base.getMonth() + (event.shiftKey ? 12 : 1), base.getDate());
    if (!next) return;

    event.preventDefault();
    pendingFocus.current = toIso(next);
    select(next);
  }

  function handlePrev() {
    if (mode === "days") goTo(view.year, view.month - 1);
    else if (mode === "months") setView((v) => ({ ...v, year: v.year - 1 }));
    else setDecadeStart((d) => d - 12);
  }

  function handleNext() {
    if (mode === "days") goTo(view.year, view.month + 1);
    else if (mode === "months") setView((v) => ({ ...v, year: v.year + 1 }));
    else setDecadeStart((d) => d + 12);
  }

  function handleTitleClick() {
    if (mode === "days") setMode("months");
    else if (mode === "months") {
      setDecadeStart(Math.floor(view.year / 12) * 12);
      setMode("years");
    } else setMode("days");
  }

  const grid = buildGrid(view.year, view.month);
  const gridIsos = grid.map(toIso);
  const focusable = gridIsos.includes(draft)
    ? draft
    : gridIsos.includes(todayIso)
      ? todayIso
      : toIso(new Date(view.year, view.month, 1));

  const navButton =
    "flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-paper hover:text-fg active:scale-90";
  const titleText =
    mode === "days" ? `${MONTHS[view.month]} ${view.year}` : mode === "months" ? String(view.year) : `${decadeStart} – ${decadeStart + 11}`;
  const prevLabel = mode === "days" ? "Previous month" : mode === "months" ? "Previous year" : "Previous 12 years";
  const nextLabel = mode === "days" ? "Next month" : mode === "months" ? "Next year" : "Next 12 years";

  return (
    <div ref={panelRef} onKeyDown={handleKeyDown}>
      <div className="mb-2 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={handleTitleClick}
          aria-live="polite"
          aria-label={mode === "years" ? "Back to calendar" : "Choose month and year"}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-fg transition hover:bg-paper"
        >
          {titleText}
          <ChevronDown size={14} className={`text-ink-soft transition-transform duration-200 ${mode === "days" ? "" : "rotate-180"}`} />
        </button>
        <div className="flex gap-0.5">
          <button type="button" aria-label={prevLabel} onClick={handlePrev} className={navButton}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" aria-label={nextLabel} onClick={handleNext} className={navButton}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {mode === "days" && (
        <>
          <div className="grid grid-cols-7 justify-items-center">
            {WEEKDAYS.map((day) => (
              <span key={day} className="flex h-8 w-9 items-center justify-center text-xs font-medium text-ink-soft">
                {day}
              </span>
            ))}
          </div>

          <div
            key={tick}
            role="grid"
            aria-label={`${MONTHS[view.month]} ${view.year}`}
            className={`grid grid-cols-7 justify-items-center gap-y-1 ${
              slide === "next" ? "animate-cal-next" : slide === "prev" ? "animate-cal-prev" : ""
            }`}
          >
            {grid.map((day, i) => {
              const iso = gridIsos[i];
              const inMonth = day.getMonth() === view.month;
              const selected = iso === draft;
              const isToday = iso === todayIso;
              return (
                <button
                  key={iso}
                  type="button"
                  data-date={iso}
                  tabIndex={iso === focusable ? 0 : -1}
                  aria-pressed={selected}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={day.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                  onClick={() => select(day)}
                  onDoubleClick={() => onApply(iso)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums transition duration-150 active:scale-90 ${
                    selected
                      ? "bg-ink font-semibold text-white shadow-sm dark:bg-slate"
                      : isToday
                        ? "font-semibold text-amber ring-1 ring-inset ring-amber/60 hover:bg-paper"
                        : inMonth
                          ? "text-fg hover:bg-paper"
                          : "text-ink-soft/45 hover:bg-paper"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </>
      )}

      {mode === "months" && (
        <div className="animate-scale-in grid grid-cols-3 gap-1.5 py-1">
          {MONTHS_SHORT.map((name, m) => {
            const selected = m === view.month;
            const current = m === today.getMonth() && view.year === today.getFullYear();
            return (
              <button
                key={name}
                type="button"
                aria-label={`${MONTHS[m]} ${view.year}`}
                aria-pressed={selected}
                onClick={() => {
                  goTo(view.year, m);
                  setMode("days");
                }}
                className={`h-11 rounded-xl text-sm transition active:scale-95 ${
                  selected
                    ? "bg-ink font-semibold text-white dark:bg-slate"
                    : current
                      ? "font-semibold text-amber ring-1 ring-inset ring-amber/60 hover:bg-paper"
                      : "text-fg hover:bg-paper"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {mode === "years" && (
        <div className="animate-scale-in grid grid-cols-3 gap-1.5 py-1">
          {Array.from({ length: 12 }, (_, i) => decadeStart + i).map((year) => {
            const selected = year === view.year;
            const current = year === today.getFullYear();
            return (
              <button
                key={year}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setView((v) => ({ ...v, year }));
                  setMode("months");
                }}
                className={`h-11 rounded-xl text-sm tabular-nums transition active:scale-95 ${
                  selected
                    ? "bg-ink font-semibold text-white dark:bg-slate"
                    : current
                      ? "font-semibold text-amber ring-1 ring-inset ring-amber/60 hover:bg-paper"
                      : "text-fg hover:bg-paper"
                }`}
              >
                {year}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <button
          type="button"
          onClick={jumpToToday}
          className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate transition hover:bg-paper dark:text-amber"
        >
          Today
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-lg px-3 text-sm font-medium text-ink-soft transition hover:bg-paper hover:text-fg active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!draft}
            onClick={() => onApply(draft)}
            className="h-9 rounded-lg bg-ink px-4 text-sm font-medium text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:opacity-50 dark:bg-slate"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** Raise the calendar above other portaled layers (e.g. the filter popover). */
  popoverZIndex?: number;
  /** Show a clear (x) button when a date is set. */
  clearable?: boolean;
}

/**
 * Typeable date field with a custom calendar popover, shared by activities.
 * Accepts MM/DD/YYYY, MM-DD-YYYY, or YYYY-MM-DD when typed.
 */
export default function DateInput({
  value,
  onChange,
  placeholder = "MM/DD/YYYY",
  ariaLabel = "Date",
  popoverZIndex,
  clearable = true,
}: DateInputProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!value) {
      setText("");
      return;
    }
    const [year, month, day] = value.split("-");
    setText(year && month && day ? `${month}/${day}/${year}` : value);
  }, [value]);

  function formattedCurrent() {
    const [year, month, day] = value.split("-");
    return year && month && day ? `${month}/${day}/${year}` : value;
  }

  function parseAndCommit(raw: string) {
    const input = raw.trim();
    if (!input) {
      onChange("");
      return;
    }

    const match = input.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (!match) {
      const iso = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!iso) {
        setText(value ? formattedCurrent() : "");
        return;
      }
      const [, y, m, d] = iso;
      const candidate = new Date(Number(y), Number(m) - 1, Number(d));
      if (candidate.getFullYear() !== Number(y) || candidate.getMonth() !== Number(m) - 1 || candidate.getDate() !== Number(d)) {
        setText(value ? formattedCurrent() : "");
        return;
      }
      onChange(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
      return;
    }

    const [, month, day, year] = match;
    const candidate = new Date(Number(year), Number(month) - 1, Number(day));
    if (
      candidate.getFullYear() !== Number(year) ||
      candidate.getMonth() !== Number(month) - 1 ||
      candidate.getDate() !== Number(day)
    ) {
      setText(value ? formattedCurrent() : "");
      return;
    }

    onChange(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
  }

  return (
    <div ref={anchorRef} className="relative flex min-w-0 items-center rounded-lg border border-line bg-surface px-3 transition focus-within:border-slate focus-within:ring-2 focus-within:ring-slate-light/50">
      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={(event) => parseAndCommit(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            parseAndCommit(event.currentTarget.value);
            event.currentTarget.blur();
          }
        }}
        placeholder={placeholder}
        inputMode="numeric"
        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-fg outline-none placeholder:text-ink-soft"
        aria-label={ariaLabel}
      />
      {clearable && value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear date"
          className="rounded-md p-1 text-ink-soft transition hover:bg-paper hover:text-fg"
        >
          <X size={13} />
        </button>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="rounded-md p-1.5 text-ink-soft transition hover:bg-paper hover:text-fg"
        aria-label="Choose date"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Calendar size={15} />
      </button>
      {isOpen && (
        <FloatingPopover anchorRef={anchorRef} onClose={() => setIsOpen(false)} width={300} ariaLabel="Choose date" zIndex={popoverZIndex}>
          <CalendarPanel
            value={value}
            onCancel={() => setIsOpen(false)}
            onApply={(next) => {
              onChange(next);
              setIsOpen(false);
            }}
          />
        </FloatingPopover>
      )}
    </div>
  );
}

/**
 * Date + 12-hour time pair. Value is a local `YYYY-MM-DDTHH:mm` string, the
 * same shape an `<input type="datetime-local">` used, so callers don't change.
 */
interface DateTimeInputProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  popoverZIndex?: number;
}

export function DateTimeInput({ value, onChange, ariaLabel = "Date and time", placeholder, popoverZIndex }: DateTimeInputProps) {
  const [date = "", time = ""] = value ? value.split("T") : [];

  function commitDate(nextDate: string) {
    if (!nextDate) return onChange("");
    // A new date with no time yet starts at 9:00 AM rather than midnight.
    onChange(`${nextDate}T${time || "09:00"}`);
  }

  function commitTime(nextTime: string) {
    const base = date || toIso(new Date());
    onChange(`${base}T${nextTime}`);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <DateInput value={date} onChange={commitDate} ariaLabel={`${ariaLabel} (date)`} placeholder={placeholder} popoverZIndex={popoverZIndex} />
      </div>
      <Time12hPicker value={time.slice(0, 5)} onChange={commitTime} popoverZIndex={popoverZIndex} />
    </div>
  );
}
