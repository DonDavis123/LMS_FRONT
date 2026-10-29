"use client";

import Select, { type SelectOption } from "@/shared/components/Select";
import Switch from "@/shared/components/Switch";
import type { AccountContactMatch, ImportOptions } from "@/features/leadImport/types/leadImport.types";

export const DATA_CARD_ID = "import-options-data";

interface DataHandlingCardProps {
  options: ImportOptions;
  /** True when a column is mapped to the converted field. */
  hasConvertedColumn: boolean;
  onPatch: (patch: Partial<ImportOptions>) => void;
}

const ACCOUNT_OPTIONS: SelectOption[] = [
  { value: "use_existing", label: "Reuse an account with the same company name" },
  { value: "create_new", label: "Always create a new account" },
];
const CONTACT_OPTIONS: SelectOption[] = [
  { value: "use_existing", label: "Reuse a contact with the same email or phone" },
  { value: "create_new", label: "Always create a new contact" },
];

function SettingRow({
  title,
  description,
  detail,
  control,
}: {
  title: string;
  description?: string;
  detail?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{title}</p>
        {description && <p className="mt-0.5 text-xs text-ink-soft">{description}</p>}
        {detail && <p className="mt-0.5 text-xs text-ink-soft">{detail}</p>}
      </div>
      {control}
    </div>
  );
}

/** Card 3: how cells are read. The converted controls only show when a converted column is mapped. */
export default function DataHandlingCard({ options, hasConvertedColumn, onPatch }: DataHandlingCardProps) {
  return (
    <section id={DATA_CARD_ID} tabIndex={-1} aria-labelledby="import-options-data-title" className="scroll-mt-4 rounded-lg border border-line bg-surface p-3 outline-none sm:p-4">
      <h3 id="import-options-data-title" className="text-sm font-semibold text-fg">
        How should we read your data?
      </h3>

      <div className="mt-3 divide-y divide-line">
        <SettingRow
          title="Split cells that hold several phone numbers"
          description="For example, 9895500700 / 9388077077 goes into phone and mobile."
          control={
            <Switch
              checked={options.split_multiple_phones}
              onChange={(split_multiple_phones) => onPatch({ split_multiple_phones })}
              ariaLabel="Split cells that hold several phone numbers"
              showState
            />
          }
        />
        <SettingRow
          title="Treat dropdown values we don't recognise as empty instead of rejecting the row"
          description="You can also match specific values one by one in the Review step."
          control={
            <Switch
              checked={options.unknown_values_as_blank}
              onChange={(unknown_values_as_blank) => onPatch({ unknown_values_as_blank })}
              ariaLabel="Treat dropdown values we don't recognise as empty instead of rejecting the row"
              showState
            />
          }
        />
      </div>

      {hasConvertedColumn && (
        <div className="mt-4 border-t border-line pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Accounts and contacts</h4>
          <p className="mt-1 text-sm text-fg">
            New rows marked yes, true, 1 or converted become an Account and a Contact, like the Convert Lead button, and
            the lead is kept as converted.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-fg">Accounts</p>
              <Select
                value={options.account_match}
                options={ACCOUNT_OPTIONS}
                onChange={(value) => onPatch({ account_match: value as AccountContactMatch })}
                ariaLabel="Accounts for converted rows"
              />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-fg">Contacts</p>
              <Select
                value={options.contact_match}
                options={CONTACT_OPTIONS}
                onChange={(value) => onPatch({ contact_match: value as AccountContactMatch })}
                ariaLabel="Contacts for converted rows"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
