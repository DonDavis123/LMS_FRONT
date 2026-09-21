import type { PaginatedResponse } from "@/shared/types/pagination";
import { toListQueryParams, type ListQueryParams } from "@/shared/utils/listQuery";
import { apiClient } from "@/infrastructure/api/client";
import type { CreateTaskPayload, Task, UpdateTaskPayload } from "@/features/tasks/types/task.types";

/**
 * Confirmed backend endpoints:
 *   GET  /api/tasks/            list
 *   POST /api/tasks/            create
 *   GET  /api/tasks/{id}/       detail
 *   PATCH/DELETE /api/tasks/{id}/
 * Paths are built inline per call (not hoisted into shared constants) so
 * any one of them can be changed independently if the backend's routing
 * differs from this guess — same convention as LeadService/ContactService.
 */
export const TaskService = {
  async getTasksPage(params: ListQueryParams = {}): Promise<PaginatedResponse<Task>> {
    const { data } = await apiClient.get<PaginatedResponse<Task>>("/tasks/", {
      params: toListQueryParams(params),
    });
    return data;
  },

  // Compatibility method for existing pickers/forms that need a plain array.
  // List pages must use getTasksPage() so pagination metadata is preserved.
  async getTasks(): Promise<Task[]> {
    const data = await this.getTasksPage({ page: 1, page_size: 50 });
    return data.results;
  },

  async getTask(id: string): Promise<Task> {
    const { data } = await apiClient.get<Task>(`/tasks/${id}/`);
    return data;
  },

  async createTask(payload: CreateTaskPayload): Promise<Task> {
    const { data } = await apiClient.post<Task>("/tasks/", payload);
    return data;
  },

  async updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
    const { data } = await apiClient.patch<Task>(`/tasks/${id}/`, payload);
    return data;
  },

  /**
   * Returns the backend's own confirmation message when it sends one,
   * falling back to a sensible default only if the response has no body.
   */
  async deleteTask(id: string): Promise<string> {
    const { data } = await apiClient.delete<{ message?: string; detail?: string } | undefined>(
      `/tasks/${id}/`
    );
    return data?.message ?? data?.detail ?? "Task deleted successfully";
  },
};
