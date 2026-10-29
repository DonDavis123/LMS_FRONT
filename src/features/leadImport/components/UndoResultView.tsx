"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { UndoResult } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import { num } from "@/features/leadImport/utils/undoView";

/** What happened: the server's message, the counts and, when partly done, why and what to do next. */
export default function UndoResultView({ result }: { result: UndoResult }) {
  const partly = result.status === "partly_undone";
  const counts = result.undo_report?.counts;
  const rows: Array<[string, number]> = [
    ["Leads removed", num(counts?.leads_removed)],
    ["Accounts removed", num(counts?.accounts_removed)],
    ["Contacts removed", num(counts?.contacts_removed)],
    ["Leads restored", num(counts?.leads_restored)],
    ["Left alone", num(counts?.left_alone)],
  ];
  const Icon = partly ? AlertTriangle : CheckCircle2;
  const headline = result.message || (partly ? "The import was partly undone." : "The import was undone.");

  return (
    <div className="space-y-4" role="status">
      <div className="flex gap-2">
        <Icon size={18} className={`mt-0.5 shrink-0 ${partly ? "text-fg" : "text-success"}`} aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-fg">{partly ? "Partly undone" : "Import undone"}</h3>
          <p className="mt-0.5 text-sm text-fg">{headline}</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md border border-line bg-paper px-3 py-2">
            <dt className="text-xs text-ink-soft">{label}</dt>
            <dd className="mt-0.5 text-base font-semibold tabular-nums text-fg">{formatCount(value)}</dd>
          </div>
        ))}
      </dl>

      {partly && (
        <div className="rounded-md border border-amber/40 bg-paper px-3 py-2 text-sm text-fg">
          <p className="font-medium">Some records were left alone</p>
          <p className="mt-0.5">
            They were edited, assigned, converted or linked to other work after the import, so the undo did not touch them. The report lists them.
            {result.can_undo
              ? " You can try the undo again later from the import history. Records that are untouched by then will be removed."
              : ""}
          </p>
        </div>
      )}
    </div>
  );
}
