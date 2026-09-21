export interface MatchingAccount {
  id: string;
  account_name: string;
  website: string | null;
  phone: string | null;
}

export interface MatchingContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  account_id?: string | null;
  account_name?: string | null;
}

export interface LeadConversionCheck {
  lead_id: string;
  accounts: MatchingAccount[];
  contacts: MatchingContact[];
}

export type ConversionAction = 'use_existing' | 'create_new';

export interface ConvertLeadPayload {
  account_action: ConversionAction;
  account_id?: string;
  account_name?: string;
  contact_action: ConversionAction;
  contact_id?: string;
  contact_name?: string;
}
