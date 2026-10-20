// Mirrors the backend `picklists` module (/api/picklists/…).
// Every company owns its own list of options per field; each company starts
// with the built-in options, which the backend seeds on first read.

/** Modules whose dropdowns a superadmin can customise. */
export type PicklistModule = "leads" | "contacts" | "accounts";

/** Kept for existing Lead code; new code should pass a module explicitly. */
export const PICKLIST_MODULE = "leads" as const;

export type LeadPicklistField = "lead_source" | "lead_status" | "industry" | "rating";
export type ContactPicklistField = "lead_source";
// Account Type is free text on the backend, so it is not a customisable dropdown.
export type AccountPicklistField = "industry" | "rating" | "ownership";

/** Any dropdown field name (the backend scopes it by module). */
export type PicklistFieldKey = LeadPicklistField | ContactPicklistField | AccountPicklistField;

export interface PicklistOption {
  id: string;
  value: string;
  sort_order: number;
  is_active: boolean;
  /** The built-in "None" option: it can't be renamed, hidden, deleted or moved. */
  is_system: boolean;
  /** Records using this option. Only sent in the superadmin (include_inactive) view. */
  usage_count: number | null;
}

export interface PicklistField {
  module: string;
  field: string;
  label: string;
  options: PicklistOption[];
}

export interface PicklistModuleResponse {
  module: string;
  fields: PicklistField[];
}

export interface UpdatePicklistOptionPayload {
  value?: string;
  is_active?: boolean;
}

export interface DeletePicklistOptionResult {
  message: string;
  records_updated: number;
}

/** Display metadata for one dropdown on the admin screen. `maxLength` mirrors the backend limits. */
export interface PicklistFieldMeta {
  field: PicklistFieldKey;
  label: string;
  description: string;
  maxLength: number;
}

export interface PicklistModuleMeta {
  module: PicklistModule;
  label: string;
  /** Singular / plural noun for the records that use these options. */
  recordSingular: string;
  recordPlural: string;
  fields: PicklistFieldMeta[];
}

const LEAD_FIELDS: PicklistFieldMeta[] = [
  {
    field: "lead_source",
    label: "Lead Source",
    description: "Where a lead came from. Used on the lead form, lead list and filters.",
    maxLength: 100,
  },
  {
    field: "lead_status",
    label: "Lead Status",
    description: "The stages of your lead pipeline, shown as the status bar on every lead.",
    maxLength: 100,
  },
  {
    field: "industry",
    label: "Industry",
    description: "The industry a lead belongs to.",
    maxLength: 150,
  },
  {
    field: "rating",
    label: "Rating",
    description: "How a lead is rated.",
    maxLength: 100,
  },
];

const CONTACT_FIELDS: PicklistFieldMeta[] = [
  {
    field: "lead_source",
    label: "Lead Source",
    description: "Where a contact came from. Used on the contact form and contact details.",
    maxLength: 100,
  },
];

const ACCOUNT_FIELDS: PicklistFieldMeta[] = [
  {
    field: "industry",
    label: "Industry",
    description: "The industry an account belongs to.",
    maxLength: 150,
  },
  {
    field: "rating",
    label: "Rating",
    description: "How an account is rated.",
    maxLength: 100,
  },
  {
    field: "ownership",
    label: "Ownership",
    description: "How an account is owned, e.g. Private or Public.",
    maxLength: 50,
  },
];

export const PICKLIST_MODULES: PicklistModuleMeta[] = [
  { module: "leads", label: "Leads", recordSingular: "lead", recordPlural: "leads", fields: LEAD_FIELDS },
  {
    module: "contacts",
    label: "Contacts",
    recordSingular: "contact",
    recordPlural: "contacts",
    fields: CONTACT_FIELDS,
  },
  {
    module: "accounts",
    label: "Accounts",
    recordSingular: "account",
    recordPlural: "accounts",
    fields: ACCOUNT_FIELDS,
  },
];

export function getPicklistModuleMeta(module: PicklistModule): PicklistModuleMeta {
  return PICKLIST_MODULES.find((item) => item.module === module) ?? PICKLIST_MODULES[0];
}

/** The Leads dropdowns (kept for existing imports). */
export const PICKLIST_FIELDS = LEAD_FIELDS as (PicklistFieldMeta & { field: LeadPicklistField })[];
