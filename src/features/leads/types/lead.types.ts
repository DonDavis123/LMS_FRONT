// Enum values mirrored 1:1 from the backend's domain enums
// (lead_source.py, lead_status.py, lead_rating.py, lead_industry.py)
// so the dropdowns can never send a value the API will reject.

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
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

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

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_RATINGS = [
  "None",
  "Acquired",
  "Active",
  "Market Failed",
  "Project Cancelled",
  "Shut Down",
] as const;

export type LeadRating = (typeof LEAD_RATINGS)[number];

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

export type LeadIndustry = (typeof LEAD_INDUSTRIES)[number];

/** The pipeline strip shown across the top of a lead's detail page. */
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
  company_name: string;
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

/**
 * Body for POST /leads/{id}/convert/.
 * - "create_new" needs no extra fields — the backend derives the new
 *   Account/Contact's name straight from the lead's own name/company.
 * - "use_existing" requires the matching id picked from conversion-check.
 */
export interface ConvertLeadPayload {
  account_action: ConversionAction;
  account_id?: string;
  account_name?: string;
  contact_action: ConversionAction;
  contact_id?: string;
  contact_name?: string;
}
