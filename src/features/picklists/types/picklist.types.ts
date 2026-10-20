// Mirrors the backend `picklists` module (/api/picklists/…).
// Every company owns its own list of options per field; each company starts
// with the built-in options, which the backend seeds on first read.

/** Only the Leads module has customisable dropdowns today. */
export const PICKLIST_MODULE = "leads" as const;

export type LeadPicklistField = "lead_source" | "lead_status" | "industry" | "rating";

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

/** Display metadata for the admin screen. `maxLength` mirrors the backend limits. */
export const PICKLIST_FIELDS: {
  field: LeadPicklistField;
  label: string;
  description: string;
  maxLength: number;
}[] = [
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
