import { roleLabel } from "@/features/users/utils/userLabels";
import type { PlatformAuditLogEntry } from "@/features/platform/types/platform.types";
import { normalizeEnumValue } from "@/shared/utils/enumValue";

const STATUS_LABELS: Record<string, string> = {
  ONBOARDING: "Onboarding",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
};

/** Display label for a company status; unknown values are shown as-is. */
export function companyStatusLabel(status: string | null | undefined): string {
  if (!status) return "-";
  return STATUS_LABELS[normalizeEnumValue(status)] ?? status;
}

/** Badge colours per status, using the same theme tokens as the rest of the app. */
export function companyStatusClasses(status: string | null | undefined): string {
  switch (normalizeEnumValue(status)) {
    case "ACTIVE":
      return "bg-success-soft text-success";
    case "SUSPENDED":
      return "bg-danger-soft text-danger";
    case "ONBOARDING":
      return "bg-amber/15 text-amber-dark";
    default:
      return "bg-slate-light text-slate";
  }
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  COMPANY_CREATED: "Company created",
  COMPANY_UPDATED: "Company updated",
  COMPANY_SUSPENDED: "Company suspended",
  COMPANY_ACTIVATED: "Company activated",
  COMPANY_USER_CREATED: "User created",
  COMPANY_USER_PASSWORD_RESET: "User password reset",
  COMPANY_USER_BLOCKED: "User blocked",
  COMPANY_USER_UNBLOCKED: "User unblocked",
};

export function platformAuditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[normalizeEnumValue(action)] ?? action;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * One-line detail for an audit entry, read defensively because `metadata`
 * is free-form on the wire. Returns `null` when there is nothing to add.
 */
export function describePlatformAuditMetadata(entry: PlatformAuditLogEntry): string | null {
  const metadata = entry.metadata;
  if (!isRecord(metadata)) return null;

  switch (normalizeEnumValue(entry.action)) {
    case "COMPANY_CREATED": {
      if (typeof metadata.name !== "string") return null;
      return typeof metadata.slug === "string"
        ? `${metadata.name} (${metadata.slug})`
        : metadata.name;
    }

    case "COMPANY_UPDATED": {
      if (!Array.isArray(metadata.changed_fields)) return null;
      const fields = metadata.changed_fields.filter((f): f is string => typeof f === "string");
      return fields.length > 0 ? `Changed: ${fields.join(", ")}` : null;
    }

    case "COMPANY_SUSPENDED":
      return typeof metadata.reason === "string" && metadata.reason ? `Reason: ${metadata.reason}` : null;

    case "COMPANY_ACTIVATED":
      return typeof metadata.previous_status === "string"
        ? `Was ${companyStatusLabel(metadata.previous_status).toLowerCase()}`
        : null;

    case "COMPANY_USER_CREATED":
      return typeof metadata.role === "string" ? `Role: ${roleLabel(metadata.role)}` : null;

    default:
      return null;
  }
}
