import { normalizeEnumValue } from "@/shared/utils/enumValue";
import type {
  ManagedUser,
  ManagedUserDetail,
  ReplacementCandidate,
  UserAuditLogEntry,
} from "@/features/users/types/user.types";

/**
 * Wire → UI mappers for the Manage Users API. Each one only repairs enum-like
 * fields (see `normalizeEnumValue`); everything else passes through untouched.
 * Keeping this at the service boundary means components never see
 * `"UserRole.ADMIN"` and never need to defend against it.
 */
export function toManagedUser(raw: ManagedUser): ManagedUser {
  return { ...raw, role: normalizeEnumValue(raw.role) };
}

export function toManagedUserDetail(raw: ManagedUserDetail): ManagedUserDetail {
  return { ...raw, role: normalizeEnumValue(raw.role) };
}

export function toReplacementCandidate(raw: ReplacementCandidate): ReplacementCandidate {
  return { ...raw, role: normalizeEnumValue(raw.role) };
}

export function toAuditLogEntry(raw: UserAuditLogEntry): UserAuditLogEntry {
  return {
    ...raw,
    action: normalizeEnumValue(raw.action),
    metadata: raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
  };
}
