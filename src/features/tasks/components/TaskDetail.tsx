"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import InlineEditRow from "@/shared/components/InlineEditRow";
import { TaskService } from "@/features/tasks/services/TaskService";
import { TASK_PRIORITIES, TASK_STATUSES, type Task, type TaskPriority, type TaskStatus } from "@/features/tasks/types/task.types";

import { confirmDelete } from "@/shared/utils/confirmDelete";

interface Props { task: Task; onTaskChange: (task: Task) => void; }

function dueDateWithDaysLeft(value: string | null): string {
  if (!value) return "—";
  const due = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  const formatted = due.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (diff === 0) return `${formatted} (Today)`;
  if (diff > 0) return `${formatted} (${diff} day${diff === 1 ? "" : "s"} left)`;
  const overdue = Math.abs(diff);
  return `${formatted} (${overdue} day${overdue === 1 ? "" : "s"} overdue)`;
}

export default function TaskDetail({ task, onTaskChange }: Props) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);

  async function updateField(field: string, raw: string) {
    let value: unknown = raw.trim() ? raw : null;
    if (field === "priority") value = raw as TaskPriority;
    if (field === "status") value = raw as TaskStatus;
    if (field === "reminder_at") value = raw ? new Date(raw).toISOString() : null;
    const updated = await TaskService.updateTask(task.id, { [field]: value } as never);
    onTaskChange(updated);
  }

  async function deleteTask() {
    setMenu(false);
    if (!await confirmDelete(`Delete "${task.subject}"? This can't be undone.`)) return;
    try { await TaskService.deleteTask(task.id); router.push("/dashboard/tasks"); }
    catch { window.alert("Couldn't delete this task. Try again."); }
  }

  const related = task.lead_id ? `Lead: ${task.lead_name || task.lead_id}` : task.contact_id ? `Contact: ${task.contact_name || task.contact_id}` : task.account_id ? `Account: ${task.account_name || task.account_id}` : "—";

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard/tasks" className="text-sm text-slate hover:text-fg">← Back to Tasks</Link>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-fg">{task.subject || "Untitled Task"}</h1>
          <p className="mt-1 text-sm text-ink-soft">{related}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/tasks/${task.id}/edit`} className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper">Edit</Link>
          <div className="relative">
            <button type="button" onClick={() => setMenu(v => !v)} className="rounded-md border border-line p-2 text-ink-soft hover:bg-paper" aria-label="Task actions"><MoreVertical size={16}/></button>
            {menu && <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-line bg-surface py-1 shadow-lg">
              <Link href={`/dashboard/tasks/${task.id}/edit`} className="block px-3 py-2 text-sm hover:bg-paper">Edit</Link>
              <button type="button" onClick={deleteTask} className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft">Delete</button>
            </div>}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">Overview</h2>
        <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-2">
          <Row label="Subject" value={task.subject} onSave={v => updateField("subject", v)} />
          <Row label="Owner" value={task.owner_name} editable={false} />
          <Row label="Due Date" value={task.due_date} displayValue={dueDateWithDaysLeft(task.due_date)} type="date" onSave={v => updateField("due_date", v)} />
          <Row label="Priority" value={task.priority} type="select" options={TASK_PRIORITIES.map(v=>({value:v,label:v}))} onSave={v=>updateField("priority",v)} />
          <Row label="Status" value={task.status} type="select" options={TASK_STATUSES.map(v=>({value:v,label:v}))} onSave={v=>updateField("status",v)} />
          <Row label="Reminder At" value={task.reminder_at ? task.reminder_at.slice(0,16) : null} type="datetime-local" onSave={v=>updateField("reminder_at",v)} />
          <Row label="Related To" value={related} editable={false} />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">Description</h2>
        <Row label="Description" value={task.description} type="textarea" fullWidth onSave={v=>updateField("description",v)} />
      </div>

      <div className="mt-4 rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">System Information</h2>
        <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-2">
          <Row label="Created At" value={task.created_at ? new Date(task.created_at).toLocaleString() : null} editable={false}/>
          <Row label="Updated At" value={task.updated_at ? new Date(task.updated_at).toLocaleString() : null} editable={false}/>
        </div>
      </div>
    </div>
  );
}

function Row({label,value,fullWidth=false,type="text",options=[],editable=true,displayValue,onSave}:{label:string;value?:string|number|null;fullWidth?:boolean;type?:"text"|"date"|"datetime-local"|"number"|"textarea"|"select";options?:{value:string;label:string}[];editable?:boolean;displayValue?:string;onSave?:(v:string)=>Promise<void>}){
  return <InlineEditRow label={label} value={value} displayValue={displayValue} fullWidth={fullWidth} type={type} options={options} editable={editable} onSave={onSave} />;
}
