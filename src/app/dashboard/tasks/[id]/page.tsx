"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import TaskDetail from "@/features/tasks/components/TaskDetail";
import { TaskService } from "@/features/tasks/services/TaskService";
import type { Task } from "@/features/tasks/types/task.types";
import { getSafeReturnTo, RETURN_TO_PARAM } from "@/shared/utils/returnTo";

function Inner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get(RETURN_TO_PARAM));
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    TaskService.getTask(params.id)
      .then((value) => { if (!cancelled) setTask(value); })
      .catch(() => { if (!cancelled) setError("Couldn't load this task."); });
    return () => { cancelled = true; };
  }, [params.id]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!task) {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-shimmer rounded-md" />)}
      </div>
    );
  }
  return <TaskDetail task={task} onTaskChange={setTask} returnTo={returnTo} />;
}

export default function TaskDetailPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
