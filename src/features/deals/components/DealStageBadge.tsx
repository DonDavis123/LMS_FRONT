import type { DealStage } from "@/features/deals/types/deal.types";
import { STAGE_META } from "@/features/deals/utils/dealStages";

/** Coloured stage pill (theme tokens only, so it follows dark mode). */
export default function DealStageBadge({ stage }: { stage: DealStage }) {
  const meta = STAGE_META[stage];
  if (!meta) {
    return <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft">{stage}</span>;
  }
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${meta.pill}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}
