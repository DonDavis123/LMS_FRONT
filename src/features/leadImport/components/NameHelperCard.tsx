"use client";

import { Building2 } from "lucide-react";
import Switch from "@/shared/components/Switch";

interface NameHelperCardProps {
  checked: boolean;
  companyMapped: boolean;
  onChange: (next: boolean) => void;
}

/** Lets a file without a name column use the company name instead, so the user need not leave the screen. */
export default function NameHelperCard({ checked, companyMapped, onChange }: NameHelperCardProps) {
  return (
    <section className="rounded-lg border border-line bg-surface p-3 sm:p-4" aria-labelledby="import-name-helper-title">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-light text-slate">
          <Building2 size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="import-name-helper-title" className="text-sm font-semibold text-fg">
            No name column? Use the company name as the lead name
          </h3>
          <p id="import-name-helper-help" className="mt-0.5 text-xs text-ink-soft">
            {companyMapped
              ? "Every lead needs a name. With this on, each lead is named after its company."
              : "To turn this on, map one of your columns to Company name first."}
          </p>
        </div>
        <Switch
          checked={checked}
          onChange={onChange}
          disabled={!companyMapped && !checked}
          ariaLabel="Use the company name as the lead name"
          showState
        />
      </div>
    </section>
  );
}
