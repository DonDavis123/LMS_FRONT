"use client";

import { Undo2 } from "lucide-react";
import type { UndoReport } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import { card } from "@/features/leadImport/utils/reviewStyles";
import { formatDateTime } from "@/shared/utils/formatDate";

export default function UndoReportCard({ undo }: { undo: UndoReport }) {
  const when = formatDateTime(undo.undone_at);
  const who = undo.undone_by_name;
  const lead = `This import was undone${when ? ` on ${when}` : ""}${who ? ` by ${who}` : ""}`;
  const counts: Array<[string, number]> = [
    ["Leads removed", undo.counts.leads_removed],
    ["Accounts removed", undo.counts.accounts_removed],
    ["Contacts removed", undo.counts.contacts_removed],
    ["Leads restored", undo.counts.leads_restored],
    ["Left alone", undo.counts.left_alone],
  ];
  return (
    <section className={`${card} p-4`} aria-labelledby="undo-report-title">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-slate">
          <Undo2 size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="undo-report-title" className="text-sm font-semibold text-fg">
            {undo.message ? `${lead}: ${undo.message}` : `${lead}.`}
          </h2>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {counts.map(([label, value]) => (
          <div key={label} className="rounded-md border border-line bg-paper px-3 py-2">
            <dt className="text-xs text-ink-soft">{label}</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums text-fg">{formatCount(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
