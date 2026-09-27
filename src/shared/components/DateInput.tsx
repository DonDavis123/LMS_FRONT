"use client";

import { Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

/**
 * Typeable + native-calendar date field shared by activities.
 * Accepts MM/DD/YYYY, MM-DD-YYYY, or YYYY-MM-DD when typed.
 */
export default function DateInput({
  value,
  onChange,
  placeholder = "MM/DD/YYYY",
  ariaLabel = "Date",
}: DateInputProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
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

  function openPicker() {
    const input = pickerRef.current;
    if (!input) return;
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === "function") picker.showPicker();
    else picker.click();
  }

  return (
    <div className="relative flex min-w-0 items-center rounded-lg border border-line bg-surface px-3 transition focus-within:border-slate focus-within:ring-2 focus-within:ring-slate-light/50">
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
        onClick={openPicker}
        className="rounded-md p-1.5 text-ink-soft transition hover:bg-paper hover:text-fg"
        aria-label="Choose date"
      >
        <Calendar size={15} />
      </button>
      <input
        ref={pickerRef}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute h-px w-px opacity-0"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
