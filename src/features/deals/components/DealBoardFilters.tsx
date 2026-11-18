"use client";

import { useState } from "react";
import { X } from "lucide-react";
import SearchBox from "@/shared/components/SearchBox";
import Select from "@/shared/components/Select";
import DateInput from "@/shared/components/DateInput";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";

/** How far back Won / Lost deals are shown on the board. */
export type ClosedWindow = "30" | "90" | "all";

export interface BoardFilterState {
  search: string;
  owner: string;
  closeFrom: string;
  closeTo: string;
  closedWindow: ClosedWindow;
}

export const DEFAULT_BOARD_FILTERS: BoardFilterState = {
  search: "",
  owner: "",
  closeFrom: "",
  closeTo: "",
  closedWindow: "30",
};

interface DealBoardFiltersProps {
  value: BoardFilterState;
  owners: LeadOwnerOption[];
  onChange: (next: BoardFilterState) => void;
}

const CLOSED_WINDOW_OPTIONS: { value: ClosedWindow; label: string }[] = [
  { value: "30", label: "Won / Lost: last 30 days" },
  { value: "90", label: "Won / Lost: last 90 days" },
  { value: "all", label: "Won / Lost: all time" },
];

export function hasActiveBoardFilters(value: BoardFilterState): boolean {
  return Boolean(value.search || value.owner || value.closeFrom || value.closeTo);
}

function FieldLabel({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-xs font-medium text-ink-soft">{text}</span>
      {children}
    </div>
  );
}

export default function DealBoardFilters({ value, owners, onChange }: DealBoardFiltersProps) {
  const active = hasActiveBoardFilters(value);
  const invalidRange = Boolean(value.closeFrom && value.closeTo && value.closeFrom > value.closeTo);
  // SearchBox keeps its own typed text, so it is remounted when the filters are cleared.
  const [searchResetKey, setSearchResetKey] = useState(0);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2.5">
        <FieldLabel text="Search">
          <SearchBox
            key={searchResetKey}
            value={value.search}
            onSearchChange={(search) => onChange({ ...value, search })}
            placeholder="Search deals…"
            ariaLabel="Search deals"
          />
        </FieldLabel>

        <FieldLabel text="Owner">
          <div className="w-full sm:w-48">
            <Select
              size="sm"
              ariaLabel="Filter by owner"
              value={value.owner}
              onChange={(owner) => onChange({ ...value, owner })}
              options={[
                { value: "", label: "All owners", muted: true },
                ...owners.map((owner) => ({ value: owner.id, label: owner.name, description: owner.email })),
              ]}
            />
          </div>
        </FieldLabel>

        <FieldLabel text="Close date from">
          <div className="w-40">
            <DateInput
              value={value.closeFrom}
              onChange={(closeFrom) => onChange({ ...value, closeFrom })}
              ariaLabel="Expected close date from"
            />
          </div>
        </FieldLabel>

        <FieldLabel text="Close date to">
          <div className="w-40">
            <DateInput
              value={value.closeTo}
              onChange={(closeTo) => onChange({ ...value, closeTo })}
              ariaLabel="Expected close date to"
            />
          </div>
        </FieldLabel>

        <FieldLabel text="Closed deals">
          <div className="w-full sm:w-56">
            <Select
              size="sm"
              ariaLabel="Closed deals window"
              value={value.closedWindow}
              onChange={(closedWindow) => onChange({ ...value, closedWindow: closedWindow as ClosedWindow })}
              options={CLOSED_WINDOW_OPTIONS}
            />
          </div>
        </FieldLabel>

        {active && (
          <button
            type="button"
            onClick={() => {
              setSearchResetKey((key) => key + 1);
              onChange({ ...DEFAULT_BOARD_FILTERS, closedWindow: value.closedWindow });
            }}
            className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-sm text-ink-soft transition hover:bg-paper hover:text-fg"
          >
            <X size={14} aria-hidden="true" />
            Clear filters
          </button>
        )}
      </div>
      {invalidRange && (
        <p role="alert" className="text-xs text-danger">
          “From” is after “to” — no deals can match that range.
        </p>
      )}
    </div>
  );
}
