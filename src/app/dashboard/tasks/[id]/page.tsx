"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TaskDetail from "@/features/tasks/components/TaskDetail";
import { TaskService } from "@/features/tasks/services/TaskService";
import type { Task } from "@/features/tasks/types/task.types";

function Inner(){
 const params=useParams<{id:string}>(); const [task,setTask]=useState<Task|null>(null); const [error,setError]=useState<string|null>(null);
 useEffect(()=>{let c=false;TaskService.getTask(params.id).then(v=>{if(!c)setTask(v)}).catch(()=>{if(!c)setError("Couldn't load this task.")});return()=>{c=true}},[params.id]);
 if(error)return <p className="text-sm text-danger">{error}</p>; if(!task)return <div className="mx-auto max-w-5xl space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-10 animate-shimmer rounded-md"/>)}</div>;
 return <TaskDetail task={task} onTaskChange={setTask}/>;
}
export default function TaskDetailPage(){return <Suspense fallback={null}><Inner/></Suspense>}
