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
  async getTasks(): Promise<Task[]> {
    type PaginatedResponse = {
      results: Task[];
      pagination?: {
        page: number;
        page_size: number;
        total: number;
        total_pages: number;
      };
    };

    const { data } = await apiClient.get<
      Task[] | PaginatedResponse
    >("/tasks/", {
      params: {
        page: 1,
        page_size: 50,
      },
    });

    // The backend now returns { results, pagination }.
    // Keep the service API as an array so existing pages/components
    // remain compatible.
    return Array.isArray(data) ? data : data.results;
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
