"use client";
import { Check } from "lucide-react";
export default function SelectionIndicator({ selected }: { selected: boolean }) {
  return <span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-all duration-200 ${selected ? "scale-105 border-slate bg-slate text-white shadow-[0_0_0_3px_rgba(76,103,133,0.12)]" : "border-line bg-surface"}`}>{selected && <Check size={11} strokeWidth={2.5} />}</span>;
}
