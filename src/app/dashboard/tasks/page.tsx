"use client";

import { useEffect, useState } from "react";
import TaskList from "@/features/tasks/components/TaskList";
import TaskForm from "@/features/tasks/components/TaskForm";
import Modal from "@/shared/components/Modal";
import { TaskService } from "@/features/tasks/services/TaskService";
import type { CreateTaskPayload, Task } from "@/features/tasks/types/task.types";
import type { FilterCondition } from "@/shared/components/FilterBar";
import type { PaginationMeta } from "@/shared/types/pagination";

type ModalState = { mode: "create" | "edit"; task?: Task } | null;

const DEFAULT_PAGE_SIZE = 10;
const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    TaskService.getTasksPage({ page, page_size: pageSize, filters })
      .then((data) => {
        if (cancelled) return;
        setTasks(data.results);
        setPagination(data.pagination);
        if (data.pagination.total_pages > 0 && page > data.pagination.total_pages) {
          setPage(data.pagination.total_pages);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load tasks.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, filters, refreshKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleSubmit(payload: CreateTaskPayload) {
    if (modalState?.mode === "edit" && modalState.task) {
      const updated = await TaskService.updateTask(modalState.task.id, payload);
      setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
      setToast("Task updated successfully");
    } else {
      await TaskService.createTask(payload);
      setRefreshKey((value) => value + 1);
      setToast("Task created successfully");
    }
    setModalState(null);
  }

  function handleTaskDeleted(_id: string, message: string) {
    setRefreshKey((value) => value + 1);
    setToast(message);
  }

  return (
    <>
      <TaskList
        tasks={tasks}
        isLoading={isLoading}
        error={error}
        filters={filters}
        onFiltersChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
        pageSize={pageSize}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
        onCreateClick={() => setModalState({ mode: "create" })}
        onEditClick={(task) => setModalState({ mode: "edit", task })}
        onOpenClick={(task) => (window.location.href = `/dashboard/tasks/${task.id}`)}
        onTaskDeleted={handleTaskDeleted}
        onTaskUpdated={(updated) => {
          setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
          setToast("Task status updated successfully");
        }}
      />

      <Modal isOpen={modalState !== null} onClose={() => setModalState(null)}>
        {modalState && (
          <TaskForm
            mode={modalState.mode}
            initialTask={modalState.task}
            onSubmit={handleSubmit}
            onCancel={() => setModalState(null)}
          />
        )}
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 animate-toast-in rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
