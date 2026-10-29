import { Copy } from "lucide-react";
import type { DuplicateAction, DuplicatesSkipped } from "@/features/leadImport/types/leadImport.types";
import { formatCount } from "@/features/leadImport/utils/format";
import { duplicateActionLabel } from "@/features/leadImport/utils/labels";
import { card, linkButton } from "@/features/leadImport/utils/reviewStyles";

const ACTION_HELP: Record<DuplicateAction, string> = {
  skip: "Duplicates are left as they are and not added again.",
  update: "Existing leads are updated with the values from your file.",
  create_anyway: "Duplicates are added as new leads.",
};

interface DuplicatesCardProps {
  action: DuplicateAction;
  counts: DuplicatesSkipped;
  onChange: () => void;
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-fg">{formatCount(value)}</dd>
    </div>
  );
}

/** One compact card: what was found, and what the chosen action does with it. */
export default function DuplicatesCard({ action, counts, onChange }: DuplicatesCardProps) {
  return (
    <section aria-label="Duplicates" className={`${card} p-3 sm:px-4`}>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-center gap-2">
          <Copy size={16} className="shrink-0 text-ink-soft" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-fg">Duplicates</h2>
        </div>
        <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-2 min-[480px]:grid-cols-3">
          <Count label="Match leads you already have" value={counts.existing} />
          <Count label="Repeat inside the file" value={counts.in_file} />
          <Count label="Converted leads (never changed)" value={counts.converted_locked} />
        </dl>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-2.5 text-xs text-ink-soft">
        <span>
          <span className="font-medium text-fg">{duplicateActionLabel(action)}.</span> {ACTION_HELP[action]}
        </span>
        <button type="button" className={linkButton} onClick={onChange}>
          Change
        </button>
      </p>
    </section>
  );
}
