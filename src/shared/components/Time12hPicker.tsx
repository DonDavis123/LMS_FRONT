"use client";

import { Clock } from "lucide-react";
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import FloatingPopover from "@/shared/components/FloatingPopover";

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));
const PERIODS = ["AM", "PM"];

const ITEM_H = 40;
const VISIBLE_ROWS = 5;

export function to12Hour(value: string) {
  if (!value) return { hour: "12", minute: "00", period: "AM" as const };
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return { hour: String(hour), minute: pad(m || 0), period: period as "AM" | "PM" };
}

export function from12Hour(hour: string, minute: string, period: string) {
  let h = Number(hour) % 12;
  if (period === "PM") h += 12;
  return `${pad(h)}:${pad(Number(minute))}`;
}

interface WheelProps {
  label: string;
  items: string[];
  index: number;
  onIndexChange: (index: number) => void;
}

/** One scroll-snap wheel: the item centred in the band is the selection. */
function Wheel({ label, items, index, onIndexChange }: WheelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = index * ITEM_H;
    // Initial position only; later changes come from the user's own scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scrollToIndex(next: number) {
    const clamped = Math.min(items.length - 1, Math.max(0, next));
    ref.current?.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
    onIndexChange(clamped);
  }

  function handleScroll() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const next = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)));
      onIndexChange(next);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 };
    if (event.key in steps) {
      event.preventDefault();
      scrollToIndex(index + steps[event.key]);
    } else if (event.key === "Home") {
      event.preventDefault();
      scrollToIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      scrollToIndex(items.length - 1);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center">
      <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-soft">{label}</span>
      <div
        ref={ref}
        role="listbox"
        tabIndex={0}
        aria-label={label}
        aria-activedescendant={`${label}-${items[index]}`}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        style={{
          height: ITEM_H * VISIBLE_ROWS,
          maskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
        }}
        className="relative z-10 w-full snap-y snap-mandatory overflow-y-auto rounded-lg outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-slate-light [&::-webkit-scrollbar]:hidden"
      >
        <div aria-hidden="true" style={{ height: ITEM_H * 2 }} />
        {items.map((item, i) => {
          const distance = Math.abs(i - index);
          return (
            <button
              key={item}
              id={`${label}-${item}`}
              type="button"
              role="option"
              aria-selected={i === index}
              tabIndex={-1}
              onClick={() => scrollToIndex(i)}
              style={{
                height: ITEM_H,
                opacity: distance === 0 ? 1 : distance === 1 ? 0.55 : distance === 2 ? 0.28 : 0.12,
                transform: `scale(${distance === 0 ? 1.12 : distance === 1 ? 0.94 : 0.85})`,
              }}
              className={`flex w-full snap-center items-center justify-center text-base tabular-nums text-fg transition-[opacity,transform] duration-200 ease-out ${
                distance === 0 ? "font-semibold" : "font-normal"
              }`}
            >
              {item}
            </button>
          );
        })}
        <div aria-hidden="true" style={{ height: ITEM_H * 2 }} />
      </div>
    </div>
  );
}

interface TimePanelProps {
  value: string;
  onApply: (value: string) => void;
  onCancel: () => void;
}

function TimePanel({ value, onApply, onCancel }: TimePanelProps) {
  const [initial] = useState(() => {
    if (value) return to12Hour(value);
    const now = new Date();
    return to12Hour(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  });
  const [hourIdx, setHourIdx] = useState(HOURS.indexOf(initial.hour));
  const [minuteIdx, setMinuteIdx] = useState(Number(initial.minute));
  const [periodIdx, setPeriodIdx] = useState(initial.period === "PM" ? 1 : 0);

  return (
    <div>
      <p aria-live="polite" className="mb-3 text-center text-2xl font-semibold tabular-nums text-fg">
        {HOURS[hourIdx]}:{MINUTES[minuteIdx]} <span className="text-base font-medium text-ink-soft">{PERIODS[periodIdx]}</span>
      </p>

      <div className="relative">
        <div
          aria-hidden="true"
          style={{ top: ITEM_H * 2 + 20, height: ITEM_H }}
          className="pointer-events-none absolute inset-x-0 rounded-xl bg-paper"
        />
        <div className="relative flex items-start gap-1">
          <Wheel label="Hour" items={HOURS} index={hourIdx} onIndexChange={setHourIdx} />
          <span aria-hidden="true" className="relative z-10 self-center pt-5 text-lg font-semibold text-ink-soft">:</span>
          <Wheel label="Minute" items={MINUTES} index={minuteIdx} onIndexChange={setMinuteIdx} />
          <Wheel label="Period" items={PERIODS} index={periodIdx} onIndexChange={setPeriodIdx} />
        </div>
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
          onClick={() => onApply(from12Hour(HOURS[hourIdx], MINUTES[minuteIdx], PERIODS[periodIdx]))}
          className="h-10 flex-1 rounded-xl bg-ink text-sm font-medium text-white transition hover:bg-ink-2 active:scale-[0.98] dark:bg-slate"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default function Time12hPicker({
  value,
  onChange,
  popoverZIndex,
}: {
  value: string;
  onChange: (value: string) => void;
  popoverZIndex?: number;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const display = value ? to12Hour(value) : null;

  return (
    <div ref={anchorRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={display ? `Time ${display.hour}:${display.minute} ${display.period}. Change time` : "Choose time"}
        className="flex min-w-40 items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg transition hover:bg-paper focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate-light/50"
      >
        <span className={display ? "tabular-nums" : "text-ink-soft"}>
          {display ? `${display.hour}:${display.minute} ${display.period}` : "Select time"}
        </span>
        <Clock size={15} className="text-ink-soft" />
      </button>

      {isOpen && (
        <FloatingPopover anchorRef={anchorRef} onClose={() => setIsOpen(false)} width={272} ariaLabel="Choose time" zIndex={popoverZIndex}>
          <TimePanel
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
