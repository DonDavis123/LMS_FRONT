"use client";

import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import FloatingPopover from "@/shared/components/FloatingPopover";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
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

interface CalendarPanelProps {
  value: string;
  onApply: (value: string) => void;
  onCancel: () => void;
}

function CalendarPanel({ value, onApply, onCancel }: CalendarPanelProps) {
  const initial = parseIso(value) ?? new Date();
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const [draft, setDraft] = useState(value);
  const [slide, setSlide] = useState<"next" | "prev" | "none">("none");
  const [tick, setTick] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const todayIso = toIso(new Date());

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

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
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

  const grid = buildGrid(view.year, view.month);
  const gridIsos = grid.map(toIso);
  const focusable = gridIsos.includes(draft)
    ? draft
    : gridIsos.includes(todayIso)
      ? todayIso
      : toIso(new Date(view.year, view.month, 1));

  const navButton =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft transition hover:bg-paper hover:text-fg active:scale-90";

  return (
    <div ref={panelRef} onKeyDown={handleKeyDown}>
      <div className="mb-3 flex items-center justify-between gap-1">
        <div className="flex gap-1">
          <button type="button" aria-label="Previous year" onClick={() => goTo(view.year - 1, view.month)} className={navButton}>
            <ChevronsLeft size={14} />
          </button>
          <button type="button" aria-label="Previous month" onClick={() => goTo(view.year, view.month - 1)} className={navButton}>
            <ChevronLeft size={14} />
          </button>
        </div>
        <p aria-live="polite" className="text-sm font-medium text-fg">
          {MONTHS[view.month]} {view.year}
        </p>
        <div className="flex gap-1">
          <button type="button" aria-label="Next month" onClick={() => goTo(view.year, view.month + 1)} className={navButton}>
            <ChevronRight size={14} />
          </button>
          <button type="button" aria-label="Next year" onClick={() => goTo(view.year + 1, view.month)} className={navButton}>
            <ChevronsRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 justify-items-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="flex h-8 w-9 items-center justify-center text-xs text-ink-soft">
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
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm transition duration-150 active:scale-90 ${
                selected
                  ? "bg-ink font-medium text-white shadow-sm dark:bg-slate"
                  : isToday
                    ? "bg-paper font-medium text-fg hover:bg-slate-light"
                    : inMonth
                      ? "text-fg hover:bg-paper"
                      : "text-ink-soft/50 hover:bg-paper"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 flex-1 rounded-xl border border-line bg-surface text-sm font-medium text-fg transition hover:bg-paper active:scale-[0.98]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!draft}
          onClick={() => onApply(draft)}
          className="h-10 flex-1 rounded-xl bg-ink text-sm font-medium text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:opacity-50 dark:bg-slate"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
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
        <FloatingPopover anchorRef={anchorRef} onClose={() => setIsOpen(false)} width={300} ariaLabel="Choose date">
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
