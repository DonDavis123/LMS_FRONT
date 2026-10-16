import { apiClient } from "@/infrastructure/api/client";
import type {
  Company,
  CompanyDetail,
  CompanyListQuery,
  CompanySummary,
  CompanyUser,
  CompanyUserListQuery,
  CreateCompanyPayload,
  CreateCompanyResult,
  CreateCompanyUserPayload,
  PlatformAuditLogEntry,
  PlatformAuditLogQuery,
  PlatformOverview,
  UpdateCompanyPayload,
} from "@/features/platform/types/platform.types";
import {
  toCompany,
  toCompanyDetail,
  toCompanySummary,
  toCompanyUser,
  toCompanyUserDetail,
  toPlatformAuditLogEntry,
  toPlatformOverview,
} from "@/features/platform/mappers/platformMappers";
import type { ManagedUserDetail } from "@/features/users/types/user.types";
import type { PaginatedResponse } from "@/shared/types/pagination";
import { toListQueryParams } from "@/shared/utils/listQuery";

/**
 * Platform Admin API (see the backend's docs/platform-companies-api.md and
 * docs/platform-admin-api.md). Every endpoint needs a PLATFORM_SUPERADMIN
 * token and a suspended company can still be managed through them.
 *
 * The backend owns every rule; this layer only sends requests and returns
 * typed bodies. Errors are left to propagate so callers can show the
 * server's own `detail` through `extractApiError` / `mapUserFormError`.
 */
function assertPaginated<T>(data: PaginatedResponse<T> | undefined, what: string): PaginatedResponse<T> {
  if (data && Array.isArray(data.results) && data.pagination) return data;
  throw new Error(`Invalid ${what} response from the server.`);
}

/** Backend cap for `page_size` on every list endpoint. */
const MAX_PAGE_SIZE = 50;

function clampPageSize(pageSize: number | undefined, fallback: number): number {
  const size = pageSize ?? fallback;
  return Math.min(Math.max(1, Math.floor(size)), MAX_PAGE_SIZE);
}

const COMPANIES = "/platform/companies";

export const platformService = {
  /** GET /platform/overview/ — company and user counts plus the 5 newest companies. */
  async getOverview(): Promise<PlatformOverview> {
    const { data } = await apiClient.get<PlatformOverview>("/platform/overview/");
    if (!data || typeof data !== "object" || !data.companies) {
      throw new Error("Invalid overview response from the server.");
    }
    return toPlatformOverview(data);
  },

  /**
   * GET /platform/companies/ — paginated list. `search` matches name or
   * slug; `status` filters; `sort_by` is one of name, slug, status,
   * created_at, users_count. Default order is newest first.
   */
  async getCompaniesPage(query: CompanyListQuery = {}): Promise<PaginatedResponse<CompanySummary>> {
    const params: Record<string, string | number> = toListQueryParams({
      page: query.page,
      page_size: clampPageSize(query.page_size, 10),
      search: query.search,
      sort: query.sort,
    });
    if (query.status) params.status = query.status;

    const { data } = await apiClient.get<PaginatedResponse<CompanySummary>>(`${COMPANIES}/`, { params });
    const page = assertPaginated(data, "companies");
    return { ...page, results: page.results.map(toCompanySummary) };
  },

  /** GET /platform/companies/{id}/ — 404 `{ detail: "Company not found." }` if missing. */
  async getCompany(id: string): Promise<CompanyDetail> {
    const { data } = await apiClient.get<CompanyDetail>(`${COMPANIES}/${id}/`);
    return toCompanyDetail(data);
  },

  /**
   * POST /platform/companies/ — creates the company and its first SUPERADMIN
   * in one transaction (201). A blank website is omitted rather than sent.
   */
  async createCompany(payload: CreateCompanyPayload): Promise<CreateCompanyResult> {
    const body: CreateCompanyPayload = { ...payload };
    if (!body.website?.trim()) delete body.website;

    const { data } = await apiClient.post<CreateCompanyResult>(`${COMPANIES}/`, body);
    return { company: toCompany(data.company), admin: toCompanyUserDetail(data.admin) };
  },

  /** PATCH /platform/companies/{id}/ — name and/or website; the slug never changes. */
  async updateCompany(id: string, payload: UpdateCompanyPayload): Promise<Company> {
    const { data } = await apiClient.patch<Company>(`${COMPANIES}/${id}/`, payload);
    return toCompany(data);
  },

  /**
   * POST /platform/companies/{id}/suspend/ — `reason` is required. Signs
   * every user of the company out and blocks sign-in until reactivated.
   */
  async suspendCompany(id: string, reason: string): Promise<Company> {
    const { data } = await apiClient.post<Company>(`${COMPANIES}/${id}/suspend/`, { reason });
    return toCompany(data);
  },

  /** POST /platform/companies/{id}/activate/ — no body; users must sign in again. */
  async activateCompany(id: string): Promise<Company> {
    const { data } = await apiClient.post<Company>(`${COMPANIES}/${id}/activate/`);
    return toCompany(data);
  },

  /**
   * GET /platform/companies/{id}/users/ — paginated. `search` matches name
   * or email; `role` and `is_active` filter; `sort_by` is one of name,
   * email, role, is_active, created_at. Retired users are not listed.
   */
  async getCompanyUsersPage(
    companyId: string,
    query: CompanyUserListQuery = {},
  ): Promise<PaginatedResponse<CompanyUser>> {
    const params: Record<string, string | number> = toListQueryParams({
      page: query.page,
      page_size: clampPageSize(query.page_size, 10),
      search: query.search,
      sort: query.sort,
    });
    if (query.role) params.role = query.role;
    if (query.is_active !== null && query.is_active !== undefined) {
      params.is_active = query.is_active ? "true" : "false";
    }

    const { data } = await apiClient.get<PaginatedResponse<CompanyUser>>(
      `${COMPANIES}/${companyId}/users/`,
      { params },
    );
    const page = assertPaginated(data, "company users");
    return { ...page, results: page.results.map(toCompanyUser) };
  },

  /** POST /platform/companies/{id}/users/ — role is SUPERADMIN or ADMIN (201). */
  async createCompanyUser(
    companyId: string,
    payload: CreateCompanyUserPayload,
  ): Promise<ManagedUserDetail> {
    const { data } = await apiClient.post<ManagedUserDetail>(`${COMPANIES}/${companyId}/users/`, payload);
    return toCompanyUserDetail(data);
  },

  /**
   * POST /platform/companies/{id}/users/{userId}/reset-password/ — responds
   * 204 and signs the user out everywhere. The password only ever travels
   * in the request body.
   */
  async resetCompanyUserPassword(companyId: string, userId: string, newPassword: string): Promise<void> {
    await apiClient.post(`${COMPANIES}/${companyId}/users/${userId}/reset-password/`, {
      new_password: newPassword,
    });
  },

  /** POST …/users/{userId}/block/ — returns the user (`is_active: false`) and ends their sessions. */
  async blockCompanyUser(companyId: string, userId: string): Promise<ManagedUserDetail> {
    const { data } = await apiClient.post<ManagedUserDetail>(`${COMPANIES}/${companyId}/users/${userId}/block/`);
    return toCompanyUserDetail(data);
  },

  /** POST …/users/{userId}/unblock/ — returns the user (`is_active: true`). */
  async unblockCompanyUser(companyId: string, userId: string): Promise<ManagedUserDetail> {
    const { data } = await apiClient.post<ManagedUserDetail>(`${COMPANIES}/${companyId}/users/${userId}/unblock/`);
    return toCompanyUserDetail(data);
  },

  /** GET /platform/audit-logs/ — newest first; filter by `company_id` and/or `action`. */
  async getAuditLogs(query: PlatformAuditLogQuery = {}): Promise<PaginatedResponse<PlatformAuditLogEntry>> {
    const params: Record<string, string | number> = {
      page: query.page ?? 1,
      page_size: clampPageSize(query.page_size, 20),
    };
    if (query.company_id) params.company_id = query.company_id;
    if (query.action) params.action = query.action;

    const { data } = await apiClient.get<PaginatedResponse<PlatformAuditLogEntry>>("/platform/audit-logs/", {
      params,
    });
    const page = assertPaginated(data, "audit log");
    return { ...page, results: page.results.map(toPlatformAuditLogEntry) };
  },
};
