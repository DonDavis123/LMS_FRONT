"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import TaskForm from "@/features/tasks/components/TaskForm";
import { TaskService } from "@/features/tasks/services/TaskService";
import type { CreateTaskPayload, Task } from "@/features/tasks/types/task.types";
import { getSafeReturnTo, RETURN_TO_PARAM, withReturnTo } from "@/shared/utils/returnTo";
import DetailLoader from "@/shared/components/DetailLoader";
import DetailSkeleton from "@/shared/components/DetailSkeleton";

function Inner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Keep the original origin (e.g. the calendar) so Back from the detail page still lands there.
  const returnTo = getSafeReturnTo(searchParams.get(RETURN_TO_PARAM));
  const detailHref = withReturnTo(`/dashboard/tasks/${params.id}`, returnTo);
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    TaskService.getTask(params.id).then(setTask).catch(() => setError("Couldn't load this task."));
  }, [params.id]);

  async function submit(values: CreateTaskPayload) {
    await TaskService.updateTask(params.id, values);
    router.push(detailHref);
  }

  if (error) return <p className="text-sm text-danger">{error}</p>;
  return (
    <DetailLoader ready={!!task} skeleton={<DetailSkeleton avatar={false} tabs={false} actions={0} cards={1} fields={8} className="max-w-4xl" />}>
      {task && (
        <div className="mx-auto max-w-4xl rounded-lg border border-line bg-surface">
          <TaskForm mode="edit" initialTask={task} onSubmit={submit} onCancel={() => router.push(detailHref)} />
        </div>
      )}
    </DetailLoader>
  );
}

export default function EditTaskPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
