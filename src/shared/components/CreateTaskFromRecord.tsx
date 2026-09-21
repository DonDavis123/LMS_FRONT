"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import Modal from "@/shared/components/Modal";
import TaskForm from "@/features/tasks/components/TaskForm";
import { TaskService } from "@/features/tasks/services/TaskService";
import type { CreateTaskPayload } from "@/features/tasks/types/task.types";
import type { RelatedToValue } from "@/shared/components/RelatedToPicker";

export default function CreateTaskFromRecord({ related, buttonLabel = "Create Task" }: { related: RelatedToValue; buttonLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(payload: CreateTaskPayload) {
    await TaskService.createTask(payload);
    setOpen(false);
    setMessage("Task created successfully");
    window.setTimeout(() => setMessage(null), 3000);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper">
        <Plus size={15} /> {buttonLabel}
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <TaskForm mode="create" initialRelated={related} onSubmit={submit} onCancel={() => setOpen(false)} />
      </Modal>
      {message && <div className="fixed bottom-6 right-6 z-[70] rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm font-medium text-success shadow-lg">{message}</div>}
    </>
  );
}
