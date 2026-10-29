import { useCallback, useState } from "react";
import { LeadImportService } from "@/features/leadImport/services/LeadImportService";
import type {
  ExclusionsPatch,
  ExclusionsResponse,
  ImportOptions,
} from "@/features/leadImport/types/leadImport.types";
import { getImportError, type ImportErrorInfo } from "@/features/leadImport/utils/importErrors";

interface Params {
  jobId: string;
  patchOptions: (patch: Partial<ImportOptions>) => void;
  /** Called after every successful save: the check is out of date now. */
  onSaved: () => void;
}

export interface ExclusionOutcome {
  response: ExclusionsResponse | null;
  error: ImportErrorInfo | null;
}

/**
 * Saves "leave out" choices. After a save, the answer's `exclusions` replace
 * the ones kept in the wizard options (validate sends them), then onSaved()
 * marks the check out of date and schedules a new one.
 */
export function useRowExclusions({ jobId, patchOptions, onSaved }: Params) {
  const [saving, setSaving] = useState(0);

  const apply = useCallback(
    async (patch: ExclusionsPatch): Promise<ExclusionOutcome> => {
      setSaving((count) => count + 1);
      try {
        const response = await LeadImportService.updateExclusions(jobId, patch);
        patchOptions({ exclusions: response.exclusions });
        onSaved();
        return { response, error: null };
      } catch (failure) {
        return { response: null, error: getImportError(failure, "We could not save your change.") };
      } finally {
        setSaving((count) => count - 1);
      }
    },
    [jobId, patchOptions, onSaved],
  );

  const leaveOut = useCallback((rows: number[]) => apply({ row_numbers_add: rows }), [apply]);
  const includeAgain = useCallback((rows: number[]) => apply({ row_numbers_remove: rows }), [apply]);

  return { saving: saving > 0, apply, leaveOut, includeAgain };
}
