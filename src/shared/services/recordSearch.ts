import { LeadService } from "@/features/leads/services/LeadService";
import { ContactService } from "@/features/contacts/services/ContactService";
import { AccountService } from "@/features/accounts/services/AccountService";
import type { FilterCondition } from "@/shared/components/FilterBar";

export type RecordKind = "lead" | "contact" | "account";

export interface RecordSearchItem {
  id: string;
  kind: RecordKind;
  label: string;
  sublabel?: string;
  email?: string | null;
}

export interface RecordSearchPage {
  items: RecordSearchItem[];
  page: number;
  total: number;
  hasMore: boolean;
}

export const RECORD_KIND_LABEL: Record<RecordKind, string> = {
  lead: "Lead",
  contact: "Contact",
  account: "Account",
};

// The backend list endpoints (/leads/, /contacts/, /accounts/) all accept a
// `filters` JSON array. These are the text columns each one exposes for a
// "contains" (case-insensitive) match.
const SEARCH_FIELD: Record<RecordKind, string> = {
  lead: "name",
  contact: "name",
  account: "account_name",
};

function buildFilters(kind: RecordKind, query: string): FilterCondition[] {
  const value = query.trim();
  // The API rejects empty filter values, so an empty search sends no filter
  // at all and simply returns the first page ordered by name.
  if (!value) return [];
  return [{ field: SEARCH_FIELD[kind], operator: "contains", value }];
}

/**
 * Server-side lookup used by every Lead / Contact / Account picker.
 * Never fetches more than one page — the dropdown asks for further pages
 * as the user scrolls.
 */
export async function searchRecords(
  kind: RecordKind,
  query: string,
  page = 1,
  pageSize = 20
): Promise<RecordSearchPage> {
  const params = { page, page_size: pageSize, filters: buildFilters(kind, query) };

  if (kind === "lead") {
    const res = await LeadService.getLeadsPage(params);
    return toPage(
      res.results.map((row) => ({
        id: row.id,
        kind,
        label: row.name || row.company_name || "Unnamed Lead",
        sublabel: row.company_name || row.email || undefined,
        email: row.email,
      })),
      res.pagination
    );
  }

  if (kind === "contact") {
    const res = await ContactService.getContactsPage(params);
    return toPage(
      res.results.map((row) => ({
        id: row.id,
        kind,
        label: row.name || "Unnamed Contact",
        sublabel: row.email || row.account_name || undefined,
        email: row.email,
      })),
      res.pagination
    );
  }

  const res = await AccountService.getAccountsPage(params);
  return toPage(
    res.results.map((row) => ({
      id: row.id,
      kind,
      label: row.account_name || "Unnamed Account",
      sublabel: row.website || row.phone || undefined,
      email: null,
    })),
    res.pagination
  );
}

function toPage(
  items: RecordSearchItem[],
  pagination: { page: number; total: number; total_pages: number }
): RecordSearchPage {
  return {
    items,
    page: pagination.page,
    total: pagination.total,
    hasMore: pagination.page < pagination.total_pages,
  };
}
