// Mirrors the backend `lead_capture` module (/api/lead-capture/…).
// The company has exactly one Lead Form.

export type LeadFormAssignmentMode = "SINGLE_OWNER" | "ROTATION";

export interface LeadFormOwner {
  id: string;
  name: string;
}

export interface LeadFormRotationOwner extends LeadFormOwner {
  /** Order in the rotation (0-based). */
  position: number;
}

export interface LeadForm {
  id: string;
  title: string;
  /** A Lead Source option label, or `null` while none is chosen. */
  lead_source: string | null;
  assignment_mode: LeadFormAssignmentMode;
  single_owner: LeadFormOwner | null;
  rotation_owners: LeadFormRotationOwner[];
  /** `false` = blocked (new forms start blocked). */
  is_active: boolean;
  /** Has a lead source AND an eligible owner, so it can be unblocked. */
  is_configured: boolean;
  /** Live, but its owner or source is no longer valid. */
  needs_attention: boolean;
  public_token: string;
  /** Absolute link of the public page (see `resolvePublicUrl` in the service). */
  public_url: string;
  submission_count: number;
  last_submission_at: string | null;
  created_at: string;
  updated_at: string;
}

/** PATCH body: only the fields that changed. */
export interface UpdateLeadFormPayload {
  title?: string;
  lead_source?: string | null;
  assignment_mode?: LeadFormAssignmentMode;
  single_owner_id?: string | null;
  /** Ordered; the order is the rotation order. Must not be empty or contain duplicates. */
  rotation_owner_ids?: string[];
}

/** Backend limits (lead_capture/domain/entities/lead_form.py). */
export const LEAD_FORM_TITLE_MAX_LENGTH = 150;
export const LEAD_FORM_MAX_ROTATION_OWNERS = 50;
