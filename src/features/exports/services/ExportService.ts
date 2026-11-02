import { apiClient } from "@/infrastructure/api/client";
import type { ExportEntity, ExportFormat, ExportQuery, ExportedFile } from "@/features/exports/types/export.types";
import { fileNameFromDisposition, unwrapBlobError } from "@/shared/utils/download";
import { toListQueryParams } from "@/shared/utils/listQuery";

export const ExportService = {
  /**
   * GET /exports/<entity>/?format=csv|xlsx plus the list's own search,
   * filters and sort. Page and page size are left out on purpose: the server
   * exports every matching row, not just the page on screen.
   */
  async exportRecords(entity: ExportEntity, query: ExportQuery, format: ExportFormat): Promise<ExportedFile> {
    const params: Record<string, string | number> = toListQueryParams(query);
    delete params.page;
    delete params.page_size;

    try {
      const response = await apiClient.get<Blob>(`/exports/${entity}/`, {
        params: { ...params, format },
        responseType: "blob",
      });
      return {
        blob: response.data,
        fileName: fileNameFromDisposition(response.headers["content-disposition"], `${entity}.${format}`),
      };
    } catch (error) {
      throw await unwrapBlobError(error);
    }
  },
};
