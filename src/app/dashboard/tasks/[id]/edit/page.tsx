"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TaskForm from "@/features/tasks/components/TaskForm";
import { TaskService } from "@/features/tasks/services/TaskService";
import type { CreateTaskPayload, Task } from "@/features/tasks/types/task.types";
function Inner(){const p=useParams<{id:string}>();const r=useRouter();const[t,setT]=useState<Task|null>(null);const[e,setE]=useState<string|null>(null);useEffect(()=>{TaskService.getTask(p.id).then(setT).catch(()=>setE("Couldn't load this task."))},[p.id]);async function submit(v:CreateTaskPayload){await TaskService.updateTask(p.id,v);r.push(`/dashboard/tasks/${p.id}`)}if(e)return <p className="text-sm text-danger">{e}</p>;if(!t)return <div className="h-40 animate-shimmer rounded-lg"/>;return <div className="mx-auto max-w-4xl rounded-lg border border-line bg-surface p-6"><TaskForm mode="edit" initialTask={t} onSubmit={submit} onCancel={()=>r.push(`/dashboard/tasks/${p.id}`)}/></div>}
export default function EditTaskPage(){return <Suspense fallback={null}><Inner/></Suspense>}
