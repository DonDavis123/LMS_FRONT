"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import TaskDetail from "@/features/tasks/components/TaskDetail";
import { TaskService } from "@/features/tasks/services/TaskService";
import type { Task } from "@/features/tasks/types/task.types";
import { getSafeReturnTo, RETURN_TO_PARAM } from "@/shared/utils/returnTo";
import DetailLoader from "@/shared/components/DetailLoader";
import DetailSkeleton from "@/shared/components/DetailSkeleton";

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
  return (
    <DetailLoader ready={!!task} skeleton={<DetailSkeleton avatar={false} actions={2} cards={2} fields={8} />}>
      {task && <TaskDetail task={task} onTaskChange={setTask} returnTo={returnTo} />}
    </DetailLoader>
  );
}

export default function TaskDetailPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
