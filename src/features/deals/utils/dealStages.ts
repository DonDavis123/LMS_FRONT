import type { DealStage } from "@/features/deals/types/deal.types";

/** The pipeline is fixed: these five stages, in this order. */
export const DEAL_STAGES: readonly DealStage[] = ["New", "Quotation Sent", "Negotiation", "Won", "Lost"];

/** Stages a deal can be converted into from a lead (no closed stages on creation). */
export const OPEN_STAGES: readonly DealStage[] = ["New", "Quotation Sent", "Negotiation"];

/** Stages offered when creating a deal by hand. */
export const CREATE_STAGES: readonly DealStage[] = ["New", "Quotation Sent", "Negotiation", "Won"];

/** Main path shown in the detail page's progress bar (Lost is a separate action). */
export const PROGRESS_STAGES: readonly DealStage[] = ["New", "Quotation Sent", "Negotiation", "Won"];

export const DEFAULT_DEAL_STAGE: DealStage = "New";

interface StageMeta {
  label: string;
  /** Used to prefill the form; the board/server value wins where known. */
  defaultProbability: number;
  /** Small colour dot. */
  dot: string;
  /** Pill: background + text, theme tokens only (works in dark mode). */
  pill: string;
  /** Top accent on a board column. */
  accent: string;
}

export const STAGE_META: Record<DealStage, StageMeta> = {
  New: {
    label: "New",
    defaultProbability: 10,
    dot: "bg-slate",
    pill: "bg-slate-light text-slate",
    accent: "border-t-slate",
  },
  "Quotation Sent": {
    label: "Quotation Sent",
    defaultProbability: 40,
    dot: "bg-amber",
    pill: "bg-amber/15 text-fg",
    accent: "border-t-amber",
  },
  Negotiation: {
    label: "Negotiation",
    defaultProbability: 70,
    dot: "bg-ink-soft",
    pill: "bg-paper text-fg ring-1 ring-inset ring-line",
    accent: "border-t-ink-soft",
  },
  Won: {
    label: "Won",
    defaultProbability: 100,
    dot: "bg-success",
    pill: "bg-success-soft text-success",
    accent: "border-t-success",
  },
  Lost: {
    label: "Lost",
    defaultProbability: 0,
    dot: "bg-danger",
    pill: "bg-danger-soft text-danger",
    accent: "border-t-danger",
  },
};

export function isDealStage(value: unknown): value is DealStage {
  return typeof value === "string" && (DEAL_STAGES as readonly string[]).includes(value);
}

export function isClosedStage(stage: DealStage): boolean {
  return stage === "Won" || stage === "Lost";
}

export function stageIndex(stage: DealStage): number {
  return DEAL_STAGES.indexOf(stage);
}
