"use client";

import { ArrowRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { RowChips } from "@/features/leadImport/components/OutcomeGroupsList";
import type { ImportReport } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import {
  duplicateActionSentence,
  fieldLabel,
  hasConvertedData,
  hasDuplicateData,
  mappedToLabel,
} from "@/features/leadImport/utils/reportView";
import { card, linkButton } from "@/features/leadImport/utils/reviewStyles";

const COLLAPSED_VALUES = 5;

function SideCard({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={`${card} p-4`} aria-labelledby={id}>
      <h2 id={id} className="text-sm font-semibold text-fg">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-medium tabular-nums text-fg">{formatCount(value)}</dd>
    </div>
  );
}

function DuplicatesCard({ report }: { report: ImportReport }) {
  const d = report.duplicates;
  return (
    <SideCard id="side-duplicates" title="How duplicates were handled">
      <p className="text-sm text-ink-soft">{duplicateActionSentence(d.action)}</p>
      <dl className="mt-2 divide-y divide-line">
        <Line label="Matched on email" value={d.matched_on_email} />
        <Line label="Matched on phone" value={d.matched_on_phone} />
        <Line label="Repeated in the file" value={d.in_file} />
      </dl>
    </SideCard>
  );
}

function OwnersCard({ report }: { report: ImportReport }) {
  const owners = report.owners;
  const max = Math.max(...owners.map((owner) => owner.count), 1);
  return (
    <SideCard id="side-owners" title="Lead owners">
      <ul className="space-y-2.5">
        {owners.map((owner) => (
          <li key={owner.name}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 break-words text-fg">{owner.name}</span>
              <span className="font-medium tabular-nums text-fg">{formatCount(owner.count)}</span>
            </div>
            <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-slate" style={{ width: `${(owner.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </SideCard>
  );
}

function ConvertedCard({ report }: { report: ImportReport }) {
  const c = report.converted;
  return (
    <SideCard id="side-converted" title="Accounts and contacts">
      <dl className="divide-y divide-line">
        <Line label="Accounts created" value={c.accounts_created} />
        <Line label="Accounts reused" value={c.accounts_reused} />
        <Line label="Contacts created" value={c.contacts_created} />
        <Line label="Contacts reused" value={c.contacts_reused} />
      </dl>
    </SideCard>
  );
}

function MappedValuesCard({ report }: { report: ImportReport }) {
  const [expanded, setExpanded] = useState(false);
  const { values, unknown_values_left_blank: blank, count } = report.mapped_values;
  const shown = expanded ? values : values.slice(0, COLLAPSED_VALUES);
  return (
    <SideCard id="side-mapped" title="Dropdown values we matched">
      {values.length > 0 && (
        <>
          <p className="text-xs tabular-nums text-ink-soft">
            {formatCount(Math.max(count, values.length))} {Math.max(count, values.length) === 1 ? "value was" : "values were"} matched to your choices.
          </p>
          <ul className="mt-2 space-y-1.5">
            {shown.map((item, index) => (
              <li key={`${item.field}-${item.file_value}-${index}`} className="text-sm">
                <span className="text-xs text-ink-soft">{fieldLabel(item.field)}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-fg">
                  <span className="break-words">{item.file_value || "(blank)"}</span>
                  <ArrowRight size={12} className="shrink-0 text-ink-soft" aria-label="matched to" role="img" />
                  <span className="break-words font-medium">{mappedToLabel(item.mapped_to)}</span>
                </span>
              </li>
            ))}
          </ul>
          {values.length > COLLAPSED_VALUES && (
            <button type="button" className={`${linkButton} mt-2`} aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Show fewer" : `Show all ${formatCount(values.length)}`}
            </button>
          )}
        </>
      )}
      {blank && <p className={`text-sm text-ink-soft ${values.length > 0 ? "mt-2" : ""}`}>Values we did not recognise were left blank.</p>}
    </SideCard>
  );
}

function WarningsCard({ report }: { report: ImportReport }) {
  return (
    <SideCard id="side-warnings" title="Warnings">
      <ul className="space-y-3">
        {report.warnings.map((warning, index) => (
          <li key={`${warning.code}-${index}`}>
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-sm text-fg">{warning.message}</p>
              <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 text-xs font-semibold tabular-nums text-fg">
                {formatCount(warning.count)}
              </span>
            </div>
            {warning.example_rows.length > 0 && (
              <div className="mt-1.5">
                <RowChips rows={warning.example_rows} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </SideCard>
  );
}

/** Each card appears only when the report has data for it. */
export default function ReportSideCards({ report }: { report: ImportReport }) {
  const mapped = report.mapped_values;
  const showMapped = mapped && (mapped.values.length > 0 || mapped.unknown_values_left_blank);
  return (
    <>
      {hasDuplicateData(report) && <DuplicatesCard report={report} />}
      {report.owners.length > 0 && <OwnersCard report={report} />}
      {hasConvertedData(report) && <ConvertedCard report={report} />}
      {showMapped && <MappedValuesCard report={report} />}
      {report.warnings.length > 0 && <WarningsCard report={report} />}
    </>
  );
}
