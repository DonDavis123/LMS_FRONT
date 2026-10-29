"use client";

import { ArrowDown, ArrowRight, CheckSquare, Info, Square } from "lucide-react";
import { useMemo } from "react";
import Select from "@/shared/components/Select";
import ConfidenceBadge from "@/features/leadImport/components/ConfidenceBadge";
import {
  IGNORE_COLUMN,
  type ImportFieldDef,
  type ImportSampleRow,
} from "@/features/leadImport/types/leadImport.types";
import {
  buildFieldOptions,
  columnLabel,
  exampleValues,
  isIgnored,
  type MatchKind,
} from "@/features/leadImport/utils/mappingRules";

/** Shared by the column header row and every row, so the columns line up. */
export const MAPPING_GRID = "md:grid md:grid-cols-[minmax(0,1.2fr)_1.25rem_minmax(0,1.3fr)_minmax(0,0.9fr)] md:gap-x-3";

interface MappingRowProps {
  header: string;
  value: string;
  fields: ImportFieldDef[];
  usage: Map<string, string>;
  sampleRows: ImportSampleRow[];
  matchKind: MatchKind;
  keptInDescription: boolean;
  onChange: (header: string, field: string) => void;
  onToggleKeep: (header: string) => void;
}

/** One column of the file: its name and examples, where it goes, and how sure we are. */
export default function MappingRow({
  header,
  value,
  fields,
  usage,
  sampleRows,
  matchKind,
  keptInDescription,
  onChange,
  onToggleKeep,
}: MappingRowProps) {
  const examples = useMemo(() => exampleValues(header, sampleRows), [header, sampleRows]);
  const options = useMemo(() => buildFieldOptions(fields, usage, header), [fields, usage, header]);
  const ignored = isIgnored(value);
  const name = columnLabel(header);

  return (
    <li className={`px-3 py-3 sm:px-4 ${MAPPING_GRID} md:items-start`}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-fg" title={name}>
          {name}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-soft" title={examples.join(" · ") || undefined}>
          {examples.length > 0 ? examples.join(" · ") : "No example values"}
        </p>
      </div>

      <div className="hidden pt-1.5 text-ink-soft md:block" aria-hidden="true">
        <ArrowRight size={16} />
      </div>
      <div className="my-1 text-ink-soft md:hidden" aria-hidden="true">
        <ArrowDown size={14} />
      </div>

      <div className="min-w-0">
        <Select
          size="sm"
          value={ignored ? IGNORE_COLUMN : value}
          options={options}
          onChange={(field) => onChange(header, field)}
          ariaLabel={`Maps to, for the column ${name}`}
        />
        {ignored && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              role="checkbox"
              aria-checked={keptInDescription}
              onClick={() => onToggleKeep(header)}
              className="inline-flex items-center gap-1.5 rounded text-xs font-medium text-fg hover:text-slate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            >
              {keptInDescription ? (
                <CheckSquare size={15} className="text-slate" aria-hidden="true" />
              ) : (
                <Square size={15} className="text-ink-soft" aria-hidden="true" />
              )}
              Keep in description
            </button>
            {keptInDescription && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-light px-2 py-0.5 text-xs font-medium text-slate">
                <Info size={12} aria-hidden="true" />
                Added to description
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 min-w-0 md:mt-0 md:pt-0.5">
        <ConfidenceBadge kind={matchKind} />
      </div>
    </li>
  );
}
