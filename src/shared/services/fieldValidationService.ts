import { apiClient } from "@/infrastructure/api/client";
import type { ContactFieldKind } from "@/shared/utils/contactFieldRules";

export type RecordType = "lead" | "contact" | "account";

export interface FieldCheckResult {
  valid: boolean;
  message: string | null;
  /** Set when another lead / contact / account already uses the value. */
  duplicate: { record_type: RecordType; record_id: string; record_name: string } | null;
}

export const fieldValidationService = {
  /**
   * Checks a phone / email against every lead, contact and account of the
   * company. Pass the record being edited so it is not its own duplicate.
   */
  async check(
    field: ContactFieldKind,
    value: string,
    exclude?: { type: RecordType; id: string },
    signal?: AbortSignal
  ): Promise<FieldCheckResult> {
    const { data } = await apiClient.post<FieldCheckResult>(
      "/validate/field/",
      {
        field,
        value,
        exclude_type: exclude?.type ?? null,
        exclude_id: exclude?.id ?? null,
      },
      { signal }
    );
    return data;
  },
};
