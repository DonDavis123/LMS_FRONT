// Built-in options, mirrored from the backend's domain enums
// (lead_source.py, lead_status.py, lead_rating.py, lead_industry.py).
//
// These are only the STARTING options every company gets. Each company's
// superadmin can add, rename, hide, delete and reorder them, so the live
// lists come from GET /picklists/leads/ (see `useLeadPicklists`). These
// constants are just the fallback shown until that list has loaded.

export const LEAD_SOURCES = [
  "None",
  "Advertisement",
  "Cold Call",
  "Employee Referral",
  "External Referral",
  "Online Store",
  "Partner",
  "Public Relations",
  "Sales Email Alias",
  "Seminar Partner",
  "Internal Seminar",
  "Trade Show",
  "Web Download",
  "Web Research",
  "Chat",
  "X (Twitter)",
  "Facebook",
  "Other",
] as const;

/** Any option text the company has configured (not only the built-in ones). */
export type LeadSource = string;

export const LEAD_STATUSES = [
  "None",
  "Attempted to Contact",
  "Contact in Future",
  "Contacted",
  "Junk Lead",
  "Lost Lead",
  "Not Contacted",
  "Pre-Qualified",
  "Not Qualified",
] as const;

/** Any option text the company has configured (not only the built-in ones). */
export type LeadStatus = string;

export const LEAD_RATINGS = [
  "None",
  "Acquired",
  "Active",
  "Market Failed",
  "Project Cancelled",
  "Shut Down",
] as const;

/** Any option text the company has configured (not only the built-in ones). */
export type LeadRating = string;

export const LEAD_INDUSTRIES = [
  "None",
  "ASP (Application Service Provider)",
  "Data/Telecom OEM",
  "ERP (Enterprise Resource Planning)",
  "Government/Military",
  "Large Enterprise",
  "Management",
  "ISV",
  "MSP (Management Service Provider)",
  "Network Equipment Enterprise",
  "Non-management ISV",
  "Optical Networking",
  "Service Provider",
  "Small/Medium Enterprise",
  "Storage Equipment",
  "Storage Service Provider",
  "Systems Integrator",
  "Wireless Industry",
  "ERP",
  "Management ISV",
] as const;

/** Any option text the company has configured (not only the built-in ones). */
export type LeadIndustry = string;

/** Built-in stages of the pipeline strip on a lead's detail page (default only — the strip now follows the company's own Lead Status options). */
export const LEAD_STATUS_PIPELINE = [
  "Attempted to Contact",
  "Contact in Future",
  "Contacted",
  "Junk Lead",
  "Lost Lead",
  "Not Contacted",
  "Pre-Qualified",
  "Not Qualified",
] as const;

export interface LeadOwner {
  id: string;
  name: string;
  email?: string;
}

export interface Lead {
  id: string;
  name: string;
  title: string | null;
  company_name: string;
  email: string | null;
  mobile_number: string | null;
  phone: string | null;
  fax: string | null;
  website: string | null;
  lead_source: LeadSource;
  lead_status: LeadStatus;
  industry: LeadIndustry | null;
  rating: LeadRating | null;
  number_of_employees: number | null;
  annual_revenue: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  description: string | null;
  owner: LeadOwner;
  /** True once the lead has been converted — it is then read-only history. */
  is_converted?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Name and Company Name are the only mandatory fields to create a lead —
 * everything else (including email and owner) is optional. Note: owner_id
 * is still always sent because the backend's Lead.owner is a non-nullable
 * FK — the form auto-fills it with the signed-in user, so it's never
 * actually left blank even though it isn't marked required in the UI.
 */
export interface CreateLeadPayload {
  name: string;
  company_name?: string | null;
  owner_id: string;
  email?: string | null;
  title?: string | null;
  mobile_number?: string | null;
  phone?: string | null;
  fax?: string | null;
  website?: string | null;
  lead_source?: LeadSource;
  lead_status?: LeadStatus;
  industry?: LeadIndustry | null;
  rating?: LeadRating | null;
  number_of_employees?: number | null;
  annual_revenue?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  description?: string | null;
}

export type UpdateLeadPayload = Partial<CreateLeadPayload>;

// --- Lead conversion (GET /leads/{id}/conversion-check/, POST /leads/{id}/convert/) ---

/** One row returned by the conversion-check endpoint for a possible duplicate account. */
export interface MatchingAccount {
  id: string;
  account_name: string;
  website: string | null;
  phone: string | null;
}

/** One row returned by the conversion-check endpoint for a possible duplicate contact. */
export interface MatchingContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
}

export interface ConversionCheckResponse {
  lead_id: string;
  accounts: MatchingAccount[];
  contacts: MatchingContact[];
}

export type ConversionAction = "create_new" | "use_existing";

/** Account decisions additionally allow "skip" for company-less (Contact-only) leads. */
export type AccountConversionAction = ConversionAction | "skip";

/**
 * Body for POST /leads/{id}/convert/.
 * - "create_new" sends no id and no record data — the backend derives the new
 *   Account/Contact straight from the lead itself.
 * - "use_existing" requires the matching id picked from conversion-check.
 * - account_action "skip" (no account_id) is valid only for leads without a
 *   company name (Contact-only conversion).
 */
export interface ConvertLeadPayload {
  account_action: AccountConversionAction;
  account_id?: string;
  contact_action: ConversionAction;
  contact_id?: string;
}
