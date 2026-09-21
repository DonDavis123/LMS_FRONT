"use client";
import { Check } from "lucide-react";
export default function SelectionIndicator({ selected }: { selected: boolean }) {
  return <span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? "border-slate bg-slate text-white" : "border-line bg-surface"}`}>{selected && <Check size={11} strokeWidth={2.5} />}</span>;
}
