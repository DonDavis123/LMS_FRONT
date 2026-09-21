// Enum values mirrored 1:1 from the backend's domain enums so the
// dropdowns can never send a value the API will reject.

export const TASK_PRIORITIES = ["Highest", "High", "Normal", "Low", "Lowest"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const DEFAULT_TASK_PRIORITY: TaskPriority = "Normal";

export const TASK_STATUSES = [
  "Not Started",
  "Deferred",
  "In Progress",
  "Completed",
  "Waiting for Input",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const DEFAULT_TASK_STATUS: TaskStatus = "Not Started";

/**
 * Shape returned by GET /tasks/ and GET /tasks/{id}/. Follows the same
 * flat `<relation>_id` / `<relation>_name` convention as Contact/Account
 * (rather than Lead's nested `owner` object) since `owner` here is just
 * one of several optional FKs (lead/contact/account) on the same record.
 */
export interface Task {
  id: string;
  subject: string;
  owner_id: string;
  owner_name?: string | null;
  due_date: string | null; // YYYY-MM-DD
  priority: TaskPriority;
  status: TaskStatus;
  reminder_at: string | null; // ISO datetime
  description: string | null;
  lead_id: string | null;
  lead_name?: string | null;
  contact_id: string | null;
  contact_name?: string | null;
  account_id: string | null;
  account_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Only `subject` and `owner` are required (per the backend's field table —
 * `subject` has no default/blank, `owner` is a required FK). Everything
 * else, including the single lead/contact/account association, is
 * optional. `priority` and `status` default to Normal / Not Started when
 * left unset, matching the backend's own defaults.
 */
export interface CreateTaskPayload {
  subject: string;
  owner_id: string;
  due_date?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  reminder_at?: string | null;
  description?: string | null;
  lead_id?: string | null;
  contact_id?: string | null;
  account_id?: string | null;
}

export type UpdateTaskPayload = Partial<CreateTaskPayload>;
