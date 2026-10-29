import type { AxiosProgressEvent } from "axios";
import { apiClient } from "@/infrastructure/api/client";
import { unwrapBlobError } from "@/features/leadImport/utils/importErrors";
import type {
  ExclusionsPatch,
  ExclusionsResponse,
  ImportFileFormat,
  ImportHistoryResponse,
  ImportMapping,
  ImportOptions,
  ImportReport,
  ImportRowsResponse,
  MappingPreviewResponse,
  ProgressResult,
  RowsStatusFilter,
  UndoPreview,
  UndoResult,
  UploadResponse,
  ValidateResponse,
} from "@/features/leadImport/types/leadImport.types";

const BASE = "/leads/import";

/** A downloaded file plus the name the server gave it. */
export interface DownloadedFile {
  blob: Blob;
  fileName: string;
}

export interface UploadSettings {
  /** 1-based row that holds the column names. Omit to let the server decide. */
  headerRow?: number;
  /** Sheet to read from an Excel file. Omit for the first sheet. */
  sheetName?: string | null;
}

export interface RowsQuery {
  status?: RowsStatusFilter;
  page?: number;
  page_size?: number;
  q?: string;
}

/** Reads the file name out of a Content-Disposition header. */
function fileNameFromDisposition(header: unknown, fallback: string): string {
  if (typeof header !== "string") return fallback;
  const encoded = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // fall through to the plain filename
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : fallback;
}

async function downloadFile(
  url: string,
  params: Record<string, string | undefined>,
  fallbackName: string,
): Promise<DownloadedFile> {
  try {
    const response = await apiClient.get<Blob>(url, { params, responseType: "blob" });
    return {
      blob: response.data,
      fileName: fileNameFromDisposition(response.headers["content-disposition"], fallbackName),
    };
  } catch (error) {
    // The error body of a download is a Blob; turn it back into JSON so
    // getImportError() can show the usual detail + how_to_fix.
    throw await unwrapBlobError(error);
  }
}

export const LeadImportService = {
  /** GET /leads/import/template/?format=csv|xlsx */
  downloadTemplate(format: ImportFileFormat): Promise<DownloadedFile> {
    return downloadFile(`${BASE}/template/`, { format }, `lead-import-template.${format}`);
  },

  /**
   * POST /leads/import/upload/ (multipart). Always creates a NEW draft job:
   * picking another sheet or header row means uploading the file again.
   * Pass `signal` to cancel the request.
   */
  async upload(
    file: File,
    settings: UploadSettings = {},
    onUploadProgress?: (event: AxiosProgressEvent) => void,
    signal?: AbortSignal,
  ): Promise<UploadResponse> {
    const form = new FormData();
    form.append("file", file);
    if (settings.headerRow !== undefined) form.append("header_row", String(settings.headerRow));
    if (settings.sheetName) form.append("sheet_name", settings.sheetName);

    const { data } = await apiClient.post<UploadResponse>(`${BASE}/upload/`, form, {
      // The shared client defaults to JSON. Overriding it makes axios drop
      // the header for FormData so the browser adds multipart + boundary.
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
      signal,
    });
    return data;
  },

  /** POST /leads/import/<job_id>/mapping-preview/ */
  async previewMapping(
    jobId: string,
    mapping: ImportMapping,
    options: ImportOptions,
  ): Promise<MappingPreviewResponse> {
    const { data } = await apiClient.post<MappingPreviewResponse>(`${BASE}/${jobId}/mapping-preview/`, {
      mapping,
      options,
    });
    return data;
  },

  /** POST /leads/import/<job_id>/validate/ */
  async validate(jobId: string, mapping: ImportMapping, options: ImportOptions): Promise<ValidateResponse> {
    const { data } = await apiClient.post<ValidateResponse>(`${BASE}/${jobId}/validate/`, {
      mapping,
      options,
    });
    return data;
  },

  /** GET /leads/import/<job_id>/rows/?status=&page=&page_size=&q= */
  async getRows(jobId: string, query: RowsQuery = {}): Promise<ImportRowsResponse> {
    const { data } = await apiClient.get<ImportRowsResponse>(`${BASE}/${jobId}/rows/`, {
      params: {
        status: query.status ?? "all",
        page: query.page,
        page_size: query.page_size,
        q: query.q || undefined,
      },
    });
    return data;
  },

  /** PATCH /leads/import/<job_id>/exclusions/ (call validate again afterwards) */
  async updateExclusions(jobId: string, patch: ExclusionsPatch): Promise<ExclusionsResponse> {
    const { data } = await apiClient.patch<ExclusionsResponse>(`${BASE}/${jobId}/exclusions/`, patch);
    return data;
  },

  /** DELETE /leads/import/<job_id>/ discards a draft (204). */
  async discard(jobId: string): Promise<void> {
    await apiClient.delete(`${BASE}/${jobId}/`);
  },

  /** POST /leads/import/<job_id>/start/ */
  async start(jobId: string, mapping: ImportMapping, options: ImportOptions): Promise<ProgressResult> {
    const { data } = await apiClient.post<ProgressResult>(`${BASE}/${jobId}/start/`, { mapping, options });
    return data;
  },

  /** POST /leads/import/<job_id>/process/ */
  async process(jobId: string, processedRows?: number): Promise<ProgressResult> {
    const { data } = await apiClient.post<ProgressResult>(
      `${BASE}/${jobId}/process/`,
      processedRows === undefined ? {} : { processed_rows: processedRows },
    );
    return data;
  },

  /** GET /leads/import/<job_id>/progress/ */
  async getProgress(jobId: string): Promise<ProgressResult> {
    const { data } = await apiClient.get<ProgressResult>(`${BASE}/${jobId}/progress/`);
    return data;
  },

  /** POST /leads/import/<job_id>/cancel/ */
  async cancel(jobId: string): Promise<ProgressResult> {
    const { data } = await apiClient.post<ProgressResult>(`${BASE}/${jobId}/cancel/`);
    return data;
  },

  /** GET /leads/import/<job_id>/report/ */
  async getReport(jobId: string): Promise<ImportReport> {
    const { data } = await apiClient.get<ImportReport>(`${BASE}/${jobId}/report/`);
    return data;
  },

  /** GET /leads/import/<job_id>/rejected-file/?format=csv|xlsx[&include=excluded] */
  downloadRejected(
    jobId: string,
    format: ImportFileFormat,
    includeExcluded = false,
  ): Promise<DownloadedFile> {
    return downloadFile(
      `${BASE}/${jobId}/rejected-file/`,
      { format, include: includeExcluded ? "excluded" : undefined },
      `rows-not-added.${format}`,
    );
  },

  /** GET /leads/import/<job_id>/results-file/?format=csv|xlsx */
  downloadResults(jobId: string, format: ImportFileFormat): Promise<DownloadedFile> {
    return downloadFile(`${BASE}/${jobId}/results-file/`, { format }, `import-results.${format}`);
  },

  /** GET /leads/import/history/?page=&page_size= */
  async getHistory(page = 1, pageSize = 10): Promise<ImportHistoryResponse> {
    const { data } = await apiClient.get<ImportHistoryResponse>(`${BASE}/history/`, {
      params: { page, page_size: pageSize },
    });
    return data;
  },

  /** GET /leads/import/<job_id>/undo-preview/ */
  async getUndoPreview(jobId: string): Promise<UndoPreview> {
    const { data } = await apiClient.get<UndoPreview>(`${BASE}/${jobId}/undo-preview/`);
    return data;
  },

  /** POST /leads/import/<job_id>/undo/ with {confirm: true} */
  async undo(jobId: string): Promise<UndoResult> {
    const { data } = await apiClient.post<UndoResult>(`${BASE}/${jobId}/undo/`, { confirm: true });
    return data;
  },
};
