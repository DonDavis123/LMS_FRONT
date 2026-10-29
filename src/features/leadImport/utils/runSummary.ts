import type { LeadOwnerOption } from "@/features/auth/types/auth.types";
import type { ImportOptions, UploadResponse, ValidateResponse } from "@/features/leadImport/types/leadImport.types";
import { duplicateSentence, ownerLine } from "@/features/leadImport/utils/optionSummary";
import { getReviewNumbers } from "@/features/leadImport/utils/reviewSummary";

/** What the "Ready to import" card says, built from the wizard's last check. */
export interface RunSummary {
  fileName: string;
  added: number;
  updated: number;
  skipped: number;
  /** Rows with a problem. They will not be imported. */
  errors: number;
  leftOut: number;
  /** Converted rows that become an account and a contact. */
  converted: number;
  ownerText: string;
  duplicateText: string;
  /** Null when the import may start. Otherwise the reason, in plain words. */
  blockedReason: string | null;
}

interface BuildRunSummaryArgs {
  upload: UploadResponse;
  check: ValidateResponse | null;
  checkIsStale: boolean;
  options: ImportOptions;
  owners: LeadOwnerOption[] | null;
}

export function buildRunSummary({ upload, check, checkIsStale, options, owners }: BuildRunSummaryArgs): RunSummary {
  const checked = check && check.checked ? check : null;
  const numbers = checked ? getReviewNumbers(checked) : null;

  let blockedReason: string | null = null;
  if (!checked) blockedReason = "Your file has not been checked yet. Go back to the review step and check it first.";
  else if (checkIsStale) blockedReason = "You changed something after the last check. Go back to the review step to check again.";
  else if (!checked.can_import) blockedReason = "Nothing in this file can be imported yet. Go back to the review step to see why.";

  return {
    fileName: upload.file_name,
    added: numbers?.added ?? 0,
    updated: numbers?.updated ?? 0,
    skipped: numbers?.skipped ?? 0,
    errors: numbers?.errors ?? 0,
    leftOut: numbers?.leftOut ?? 0,
    converted: numbers?.converted ?? 0,
    ownerText: `${ownerLine(options, owners, numbers?.added ?? 0)}.`,
    duplicateText: duplicateSentence(options),
    blockedReason,
  };
}
