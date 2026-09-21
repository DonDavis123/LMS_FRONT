// Mirrors DjangoContactModel field-for-field, and matches the flat shape
// the API actually returns (confirmed against GET /contacts/{id}/):
// account_id/account_name and contact_owner_id/contact_owner_name are
// plain fields on the record, not nested objects.
// Only `name` and `contact_owner` are non-nullable on the backend model —
// everything else is optional.

export interface Contact {
  id: string;
  // Relationships (flat, as returned by the API)
  account_id: string | null;
  account_name: string | null;
  contact_owner_id: string;
  contact_owner_name: string;
  reporting_to_id: string | null;
  reporting_to_name: string | null;
  // Contact information
  name: string;
  email: string | null;
  secondary_email: string | null;
  phone: string | null;
  other_phone: string | null;
  mobile: string | null;
  home_phone: string | null;
  assistant_phone: string | null;
  // Professional information
  title: string | null;
  department: string | null;
  lead_source: string | null;
  vendor_name: string | null;
  // Personal information
  date_of_birth: string | null;
  assistant: string | null;
  email_opt_out: boolean;
  // Address
  mailing_address: string | null;
  mailing_city: string | null;
  mailing_state: string | null;
  mailing_country: string | null;
  mailing_postal_code: string | null;
  other_address: string | null;
  // Description
  description: string | null;
  // Audit (read-only)
  created_by_id?: string;
  modified_by_id?: string;
  created_at: string;
  updated_at: string;
}

/** Only name and contact_owner_id are required — everything else is optional. */
export interface CreateContactPayload {
  name: string;
  contact_owner_id: string;
  account_id?: string | null;
  email?: string | null;
  secondary_email?: string | null;
  phone?: string | null;
  other_phone?: string | null;
  mobile?: string | null;
  home_phone?: string | null;
  assistant_phone?: string | null;
  title?: string | null;
  department?: string | null;
  lead_source?: string | null;
  vendor_name?: string | null;
  date_of_birth?: string | null;
  assistant?: string | null;
  email_opt_out?: boolean;
  reporting_to_id?: string | null;
  mailing_address?: string | null;
  mailing_city?: string | null;
  mailing_state?: string | null;
  mailing_country?: string | null;
  mailing_postal_code?: string | null;
  other_address?: string | null;
  description?: string | null;
}

export type UpdateContactPayload = Partial<CreateContactPayload>;
