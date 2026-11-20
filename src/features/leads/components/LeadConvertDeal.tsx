"use client";

import { Handshake } from "lucide-react";
import DateInput from "@/shared/components/DateInput";
import Select from "@/shared/components/Select";
import Switch from "@/shared/components/Switch";
import { inputClass } from "@/shared/components/FormLayout";
import type { ConvertLeadDeal } from "@/features/leads/types/lead.types";
import { OPEN_STAGES } from "@/features/deals/utils/dealStages";

export interface DealDraft {
  enabled: boolean;
  name: string;
  amount: string;
  closeDate: string;
  stage: NonNullable<ConvertLeadDeal["stage"]>;
}

export function initialDealDraft(defaultName: string): DealDraft {
  return { enabled: false, name: defaultName, amount: "", closeDate: "", stage: "New" };
}

interface LeadConvertDealProps {
  draft: DealDraft;
  onChange: (next: DealDraft) => void;
}

/** Optional "Create a deal" step of the lead conversion screen. */
export default function LeadConvertDeal({ draft, onChange }: LeadConvertDealProps) {
  return (
    <section className="rounded-lg border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Handshake size={18} aria-hidden="true" />
          3. Deal <span className="text-xs font-normal text-ink-soft">(optional)</span>
        </h2>
        <Switch
          checked={draft.enabled}
          onChange={(enabled) => onChange({ ...draft, enabled })}
          ariaLabel="Create a deal"
          showState
        />
      </div>
      <div className="p-4">
        {!draft.enabled ? (
          <p className="text-sm text-ink-soft">Turn this on to open a deal for the new Company or Contact as part of the conversion.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-fg">
                Deal name<span className="text-danger"> *</span>
              </span>
              <input value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-fg">
                Amount (₹)<span className="text-danger"> *</span>
              </span>
              <input
                value={draft.amount}
                onChange={(e) => onChange({ ...draft, amount: e.target.value })}
                inputMode="decimal"
                autoComplete="off"
                placeholder="1,00,000"
                className={inputClass}
              />
            </label>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-fg">Expected close date</span>
              <DateInput value={draft.closeDate} onChange={(closeDate) => onChange({ ...draft, closeDate })} ariaLabel="Expected close date" />
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-fg">Stage</span>
              <Select
                value={draft.stage}
                ariaLabel="Deal stage"
                onChange={(stage) => onChange({ ...draft, stage: stage as DealDraft["stage"] })}
                options={OPEN_STAGES.map((stage) => ({ value: stage, label: stage }))}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
