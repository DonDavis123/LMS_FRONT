/** Every screen path of the import feature in one place. */
export const LEADS_PATH = "/dashboard/leads";
export const IMPORT_PATH = "/dashboard/leads/import";
export const IMPORT_HISTORY_PATH = "/dashboard/leads/import/history";

export function importRunPath(jobId: string): string {
  return `${IMPORT_PATH}/${jobId}`;
}

export function importReportPath(jobId: string): string {
  return `${IMPORT_PATH}/${jobId}/report`;
}
