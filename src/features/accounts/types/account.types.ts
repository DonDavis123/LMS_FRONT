// Mirrors DjangoAccountModel field-for-field, and matches the flat shape
// the API actually returns: account_owner_id/account_owner_name are plain
// fields on the record, not a nested object.
// Only `account_name` and `account_owner` are non-nullable on the backend
// model — everything else is optional.

export const ACCOUNT_OWNERSHIP_OPTIONS = [
  "None",
  "Other",
  "Private",
  "Public",
  "Subsidiary",
  "Partnership",
  "Government",
  "Privately Held",
  "Public Company",
] as const;

export type AccountOwnership = (typeof ACCOUNT_OWNERSHIP_OPTIONS)[number];

export interface AccountContactSummary { id: string; name: string; email?: string | null; phone?: string | null; mobile?: string | null; }

export interface Account {
  id: string;
  account_owner_id: string;
  account_owner_name: string;
  account_name: string;
  account_site: string | null;
  account_number: string | null;
  account_type: string | null;
  industry: string | null;
  annual_revenue: number | null;
  rating: string | null;
  phone: string | null;
  website: string | null;
  ticker_symbol: string | null;
  ownership: AccountOwnership;
  employees: number | null;
  sic_code: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_country: string | null;
  billing_postal_code: string | null;
  description: string | null;
  created_by_id?: string;
  modified_by_id?: string;
  created_at: string;
  updated_at: string;
  contacts?: AccountContactSummary[];
}

/** Only account_name and owner_id are required — everything else is optional. */
export interface CreateAccountPayload {
  account_name: string;
  owner_id: string;
  account_site?: string | null;
  account_number?: string | null;
  account_type?: string | null;
  industry?: string | null;
  annual_revenue?: number | null;
  rating?: string | null;
  phone?: string | null;
  website?: string | null;
  ticker_symbol?: string | null;
  ownership?: AccountOwnership;
  employees?: number | null;
  sic_code?: string | null;
  billing_address?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_country?: string | null;
  billing_postal_code?: string | null;
  description?: string | null;
}

export type UpdateAccountPayload = Partial<CreateAccountPayload>;
