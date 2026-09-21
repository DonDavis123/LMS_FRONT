"use client";

import { useEffect, useState } from "react";
import TaskList from "@/features/tasks/components/TaskList";
import TaskForm from "@/features/tasks/components/TaskForm";
import Modal from "@/shared/components/Modal";
import { TaskService } from "@/features/tasks/services/TaskService";
import type { CreateTaskPayload, Task } from "@/features/tasks/types/task.types";

type ModalState = { mode: "create" | "edit"; task?: Task } | null;

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function load() {
    setIsLoading(true);
    TaskService.getTasks()
      .then((data) => {
        setTasks(data);
        setError(null);
      })
      .catch(() => setError("Couldn't load tasks."))
      .finally(() => setIsLoading(false));
  }

  async function handleSubmit(payload: CreateTaskPayload) {
    if (modalState?.mode === "edit" && modalState.task) {
      const updated = await TaskService.updateTask(modalState.task.id, payload);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setToast("Task updated successfully");
    } else {
      const created = await TaskService.createTask(payload);
      setTasks((prev) => [created, ...prev]);
      setToast("Task created successfully");
    }
    setModalState(null);
  }

  function handleTaskDeleted(id: string, message: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setToast(message);
  }

  return (
    <>
      <TaskList
        tasks={tasks}
        isLoading={isLoading}
        error={error}
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
