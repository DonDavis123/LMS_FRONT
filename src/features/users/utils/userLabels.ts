import type { UserAuditLogEntry } from "@/features/users/types/user.types";

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Admin",
  SALES_MANAGER: "Sales Manager",
  SALES_EXECUTIVE: "Sales Executive",
};

/** Display label for a backend role value; unknown roles are shown as-is. */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return "-";
  return ROLE_LABELS[role.toUpperCase()] ?? role;
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  USER_CREATED: "Account created",
  USER_UPDATED: "Profile updated",
  USER_ROLE_CHANGED: "Role changed",
  USER_BLOCKED: "Account blocked",
  USER_UNBLOCKED: "Account unblocked",
  USER_PASSWORD_RESET: "Password reset",
  USER_RETIRED: "Account deleted",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * One-line detail for an audit entry, read defensively because `metadata`
 * is free-form on the wire. Returns `null` when there is nothing to add.
 */
export function describeAuditMetadata(entry: UserAuditLogEntry): string | null {
  const metadata = entry.metadata;
  if (!isRecord(metadata)) return null;

  switch (entry.action) {
    case "USER_CREATED":
      return typeof metadata.role === "string" ? `Role: ${roleLabel(metadata.role)}` : null;

    case "USER_ROLE_CHANGED":
      return typeof metadata.from === "string" && typeof metadata.to === "string"
        ? `${roleLabel(metadata.from)} → ${roleLabel(metadata.to)}`
        : null;

    case "USER_UPDATED": {
      if (!isRecord(metadata.changes)) return null;
      const parts: string[] = [];
      for (const [field, change] of Object.entries(metadata.changes)) {
        if (isRecord(change) && typeof change.from === "string" && typeof change.to === "string") {
          const label = field === "name" ? "Name" : field === "email" ? "Email" : field;
          parts.push(`${label}: ${change.from} → ${change.to}`);
        }
      }
      return parts.length > 0 ? parts.join("; ") : null;
    }

    case "USER_RETIRED":
      return typeof metadata.replacement_user_email === "string"
        ? `Records transferred to ${metadata.replacement_user_email}`
        : null;

    default:
      return null;
  }
}
