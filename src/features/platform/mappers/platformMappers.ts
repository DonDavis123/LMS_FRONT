import { normalizeEnumValue } from "@/shared/utils/enumValue";
import type {
  Company,
  CompanyDetail,
  CompanyStatus,
  CompanySummary,
  CompanyUser,
  PlatformAuditLogEntry,
  PlatformOverview,
  RecentCompany,
} from "@/features/platform/types/platform.types";
import {
  toManagedUser,
  toManagedUserDetail,
} from "@/features/users/mappers/userMappers";
import type { ManagedUserDetail } from "@/features/users/types/user.types";

/**
 * Wire → UI mappers for the Platform API. Like the user mappers they only
 * repair enum-like fields (the backend can render a Python enum as
 * `"CompanyStatus.ACTIVE"`); everything else passes through untouched, and
 * missing optional fields get safe defaults so components never defend
 * against `undefined`.
 */
function toStatus(value: unknown): CompanyStatus {
  return normalizeEnumValue(value) as CompanyStatus;
}

export function toCompanySummary(raw: CompanySummary): CompanySummary {
  return {
    ...raw,
    website: raw.website || null,
    status: toStatus(raw.status),
    users_count: raw.users_count ?? 0,
  };
}

export function toCompany(raw: Company): Company {
  return {
    ...raw,
    website: raw.website || null,
    status: toStatus(raw.status),
    status_reason: raw.status_reason ?? "",
    status_changed_at: raw.status_changed_at ?? null,
  };
}

export function toCompanyDetail(raw: CompanyDetail): CompanyDetail {
  return {
    ...toCompany(raw),
    users_count: raw.users_count ?? 0,
    superadmins: Array.isArray(raw.superadmins) ? raw.superadmins : [],
  };
}

export function toCompanyUser(raw: CompanyUser): CompanyUser {
  return toManagedUser(raw);
}

export function toCompanyUserDetail(raw: ManagedUserDetail): ManagedUserDetail {
  return toManagedUserDetail(raw);
}

export function toPlatformAuditLogEntry(raw: PlatformAuditLogEntry): PlatformAuditLogEntry {
  return {
    ...raw,
    action: normalizeEnumValue(raw.action),
    company_id: raw.company_id ?? null,
    target_user_id: raw.target_user_id ?? null,
    target_email: raw.target_email ?? "",
    metadata: raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {},
  };
}

function toRecentCompany(raw: RecentCompany): RecentCompany {
  return { ...raw, status: toStatus(raw.status) };
}

export function toPlatformOverview(raw: PlatformOverview): PlatformOverview {
  return {
    companies: {
      total: raw.companies?.total ?? 0,
      active: raw.companies?.active ?? 0,
      onboarding: raw.companies?.onboarding ?? 0,
      suspended: raw.companies?.suspended ?? 0,
    },
    users: {
      total: raw.users?.total ?? 0,
      active: raw.users?.active ?? 0,
    },
    recent_companies: Array.isArray(raw.recent_companies)
      ? raw.recent_companies.map(toRecentCompany)
      : [],
  };
}
