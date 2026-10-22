/** GET /public/lead-forms/<token>/ */
export interface PublicLeadFormInfo {
  title: string;
  company_name: string;
  accepting_responses: boolean;
}

/** POST /public/lead-forms/<token>/ */
export interface PublicLeadSubmission {
  name: string;
  email: string;
  phone: string;
  description: string;
  /** Must always be sent empty; real visitors never see or fill it. */
  fax_number: string;
}

export interface PublicLeadSubmitResponse {
  detail: string;
}

export const PUBLIC_LEAD_LIMITS = {
  name: 150,
  email: 254,
  phone: 20,
  description: 2000,
} as const;
