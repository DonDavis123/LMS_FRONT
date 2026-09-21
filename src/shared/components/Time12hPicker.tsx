"use client";

import { useEffect, useRef, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));
const PERIODS = ["AM", "PM"] as const;

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

export default function Time12hPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const current = to12Hour(value);
  const [hour, setHour] = useState(current.hour);
  const [minute, setMinute] = useState(current.minute);
  const [period, setPeriod] = useState<"AM" | "PM">(current.period);
  const [open, setOpen] = useState<"hour" | "minute" | "period" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const next = to12Hour(value);
    setHour(next.hour);
    setMinute(next.minute);
    setPeriod(next.period);
  }, [value]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function commit(nextHour = hour, nextMinute = minute, nextPeriod = period) {
    const h = Math.min(12, Math.max(1, Number(nextHour) || 12));
    const m = Math.min(59, Math.max(0, Number(nextMinute) || 0));
    const hh = String(h);
    const mm = pad(m);
    setHour(hh);
    setMinute(mm);
    setPeriod(nextPeriod as "AM" | "PM");
    onChange(from12Hour(hh, mm, nextPeriod));
  }

  return (
    <div ref={rootRef} className="relative flex items-center gap-1.5">
      <TimeInput value={hour} onChange={(v) => setHour(v.replace(/[^0-9]/g, "").slice(0, 2))} onFocus={() => setOpen("hour")} onBlur={() => commit()} />
      <span className="text-sm">:</span>
      <TimeInput value={minute} onChange={(v) => setMinute(v.replace(/[^0-9]/g, "").slice(0, 2))} onFocus={() => setOpen("minute")} onBlur={() => commit()} />
      <div className="relative">
        <button type="button" onClick={() => setOpen(open === "period" ? null : "period")} className="rounded border border-line bg-surface px-2 py-1.5 text-sm hover:bg-paper">
          {period}
        </button>
        {open === "period" && <TimeMenu values={[...PERIODS]} onSelect={(v) => { setOpen(null); commit(hour, minute, v as "AM" | "PM"); }} />}
      </div>
      {open === "hour" && <TimeMenu values={HOURS} onSelect={(v) => { setOpen(null); commit(v, minute, period); }} />}
      {open === "minute" && <TimeMenu values={MINUTES} columns={4} onSelect={(v) => { setOpen(null); commit(hour, v, period); }} />}
    </div>
  );
}

function TimeInput({ value, onChange, onFocus, onBlur }: { value: string; onChange: (value: string) => void; onFocus: () => void; onBlur: () => void }) {
  return <input value={value} inputMode="numeric" onChange={(e) => onChange(e.target.value)} onFocus={onFocus} onBlur={onBlur} className="w-12 rounded border border-line bg-surface px-2 py-1.5 text-center text-sm outline-none focus:border-slate focus:ring-2 focus:ring-slate-light" />;
}

function TimeMenu({ values, onSelect, columns = 1 }: { values: string[]; onSelect: (value: string) => void; columns?: number }) {
  return (
    <div className={`absolute left-0 top-full z-50 mt-1 max-h-52 min-w-20 overflow-y-auto rounded-md border border-line bg-surface p-1 shadow-xl ${columns > 1 ? "grid grid-cols-4 gap-1" : "flex flex-col"}`}>
      {values.map((v) => <button key={v} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onSelect(v)} className="rounded px-2 py-1.5 text-center text-sm hover:bg-paper">{v}</button>)}
    </div>
  );
}
