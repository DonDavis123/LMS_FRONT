import type { FilterCondition } from "@/shared/components/FilterBar";

/** Lists that can be mailed. Accounts have no address of their own: they mail their contacts. */
export type MailEntity = "contacts" | "leads" | "accounts";

export type MailRecordType = "CONTACT" | "LEAD" | "ACCOUNT";

export type MailEmailKind = "PRIMARY" | "SECONDARY";

/** Why the server left a record out of the recipient list (POST /mail/recipients/resolve/). */
export type MailSkipReason =
  | "NO_EMAIL"
  | "INVALID_EMAIL"
  | "OPTED_OUT"
  | "DUPLICATE_EMAIL"
  | "NOT_FOUND"
  | "NO_CONTACTS";

/** Hard limits of the backend resolver (src/modules/mailing/application/dto/limits.py). */
export const MAIL_MAX_IDS = 500;
export const MAIL_MAX_FILTER_MATCHES = 2000;
export const MAIL_MAX_BATCH_SIZE = 50;
/** Addresses per Gmail tab. Kept below the server maximum so the link stays short. */
export const MAIL_BATCH_SIZE = 40;
/** The server accepts at most this many targets per timeline log call. */
export const MAIL_MAX_LOG_TARGETS = 50;
/** The server truncates/refuses longer subjects in the timeline log. */
export const MAIL_MAX_LOG_SUBJECT = 200;

export type MailSelection =
  | { mode: "ids"; ids: string[] }
  | {
      mode: "filter";
      search: string | null;
      filters: FilterCondition[];
      exclude_ids: string[];
    };

export interface ResolveRecipientsRequest {
  entity: MailEntity;
  selection: MailSelection;
  include_secondary_email?: boolean;
  batch_size?: number;
}

export interface MailRecipient {
  record_id: string;
  record_type: Exclude<MailRecordType, "ACCOUNT">;
  name: string;
  email: string;
  email_kind: MailEmailKind;
  account_name: string | null;
  source_account_id: string | null;
}

export interface SkippedMailRecord {
  record_id: string;
  record_type: MailRecordType;
  name: string;
  reason: MailSkipReason;
}

export interface ResolveRecipientsResponse {
  entity: MailEntity;
  summary: {
    selected: number;
    eligible: number;
    skipped: number;
    batches: number;
  };
  recipients: MailRecipient[];
  skipped: SkippedMailRecord[];
  batches: string[][];
}

export type MailLogRecordType = "CONTACT" | "LEAD";

export interface MailLogTarget {
  record_type: MailLogRecordType;
  record_id: string;
}

/** POST /email-activity/compose/ */
export interface LogComposeRequest {
  client_ref: string;
  channel: "GMAIL_COMPOSE";
  targets: MailLogTarget[];
  subject?: string;
  batch_index?: number;
  batch_total?: number;
}

export interface LogComposeResponse {
  logged: number;
  already_logged: number;
  not_found: MailLogTarget[];
}

/** How the user wants the draft opened. Only Gmail drafts are written to the timeline. */
export type MailProvider = "gmail" | "mailto";
