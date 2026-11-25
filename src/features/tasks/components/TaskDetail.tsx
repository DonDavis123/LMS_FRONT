"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import InlineEditRow from "@/shared/components/InlineEditRow";
import { TaskService } from "@/features/tasks/services/TaskService";
import { TASK_PRIORITIES, TASK_STATUSES, type Task, type TaskPriority, type TaskStatus } from "@/features/tasks/types/task.types";

import { confirmDelete } from "@/shared/utils/confirmDelete";
import { formatDateTime } from "@/shared/utils/formatDate";
import RecordTimeline from "@/shared/components/RecordTimeline";
import { Tabs } from "@/shared/components/Tabs";
import { formatLocalDateTime, isoToLocalInputValue } from "@/shared/utils/dateTime";
import { backLabelFor, withReturnTo } from "@/shared/utils/returnTo";
import { RecordSectionTitle, recordCardClass, recordGridClass } from "@/shared/components/RecordSection";

interface Props { task: Task; onTaskChange: (task: Task) => void; /** Where "Back" goes when the task was opened from another page (e.g. the calendar). */ returnTo?: string | null; }

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

export default function TaskDetail({ task, onTaskChange, returnTo = null }: Props) {
  const router = useRouter();
  const backHref = returnTo ?? "/dashboard/tasks";
  const editHref = withReturnTo(`/dashboard/tasks/${task.id}/edit`, returnTo);
  const [menu, setMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "timeline">("overview");

  async function updateField(field: string, raw: string) {
    let value: unknown = raw.trim() ? raw : null;
    if (field === "priority") value = raw as TaskPriority;
    if (field === "status") value = raw as TaskStatus;
    if (field === "reminder_at") {
      // `raw` is a local datetime-local value; convert to a real instant.
      const parsed = raw ? new Date(raw) : null;
      if (parsed && Number.isNaN(parsed.getTime())) throw new Error("Invalid reminder");
      value = parsed ? parsed.toISOString() : null;
    }
    const updated = await TaskService.updateTask(task.id, { [field]: value } as never);
    // PATCH returns the bare task without owner_name / lead_name / contact_name,
    // so merge instead of replacing or those fields blank out after an edit.
    onTaskChange({ ...task, ...updated });
  }

  async function deleteTask() {
    setMenu(false);
    if (!await confirmDelete(`Delete "${task.subject}"? This can't be undone.`)) return;
    try { await TaskService.deleteTask(task.id); router.push(backHref); }
    catch { window.alert("Couldn't delete this task. Try again."); }
  }

  const related = task.lead_id ? `Lead: ${task.lead_name || task.lead_id}` : task.contact_id ? `Contact: ${task.contact_name || task.contact_id}` : task.account_id ? `Company: ${task.account_name || task.account_id}` : "—";

  return (
    <div className="lp-detail mx-auto max-w-5xl">
      <Link href={backHref} className="text-sm text-slate hover:text-fg">{backLabelFor(returnTo, "← Back to Tasks")}</Link>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-fg">{task.subject || "Untitled Task"}</h1>
          <p className="mt-1 text-sm text-ink-soft">{related}</p>
        </div>
        <div className="lp-actions flex items-center gap-2">
          <Link href={editHref} className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper">Edit</Link>
          <div className="relative">
            <button type="button" onClick={() => setMenu(v => !v)} className="rounded-md border border-line p-2 text-ink-soft hover:bg-paper" aria-label="Task actions"><MoreVertical size={16}/></button>
            {menu && <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-line bg-surface py-1 shadow-lg">
              <Link href={editHref} className="block px-3 py-2 text-sm hover:bg-paper">Edit</Link>
              <button type="button" onClick={deleteTask} className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft">Delete</button>
            </div>}
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "timeline", label: "Timeline" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      <div key={activeTab} className="animate-tab-panel">
        {activeTab === "overview" ? (
          <>
            <div className={`mt-4 ${recordCardClass}`}>
              <RecordSectionTitle>Overview</RecordSectionTitle>
              <div className={recordGridClass}>
                <Row label="Subject" value={task.subject} onSave={v => updateField("subject", v)} />
                <Row label="Owner" value={task.owner_name} editable={false} />
                <Row label="Assigned To" value={task.assigned_to_name} editable={false} />
                <Row label="Due Date" value={task.due_date} displayValue={dueDateWithDaysLeft(task.due_date)} type="date" onSave={v => updateField("due_date", v)} />
                <Row label="Priority" value={task.priority} type="select" options={TASK_PRIORITIES.map(v=>({value:v,label:v}))} onSave={v=>updateField("priority",v)} />
                <Row label="Status" value={task.status} type="select" options={TASK_STATUSES.map(v=>({value:v,label:v}))} onSave={v=>updateField("status",v)} />
                <Row label="Reminder At" value={isoToLocalInputValue(task.reminder_at)} displayValue={task.reminder_at ? formatLocalDateTime(task.reminder_at) : undefined} type="datetime-local" onSave={v=>updateField("reminder_at",v)} />
                <Row label="Related To" value={related} editable={false} />
              </div>
            </div>

            <div className={`mt-4 ${recordCardClass}`}>
              <RecordSectionTitle>Description</RecordSectionTitle>
              <Row label="Description" value={task.description} type="textarea" fullWidth onSave={v=>updateField("description",v)} />
            </div>

            <div className={`mt-4 ${recordCardClass}`}>
              <RecordSectionTitle>System Information</RecordSectionTitle>
              <div className={recordGridClass}>
                <Row label="Created At" value={formatDateTime(task.created_at) || null} editable={false}/>
                <Row label="Updated At" value={formatDateTime(task.updated_at) || null} editable={false}/>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-4">
            <RecordTimeline module="tasks" recordId={task.id} />
          </div>
        )}
      </div>
    </div>
  );
}

function Row({label,value,fullWidth=false,type="text",options=[],editable=true,displayValue,onSave}:{label:string;value?:string|number|null;fullWidth?:boolean;type?:"text"|"date"|"datetime-local"|"number"|"textarea"|"select";options?:{value:string;label:string}[];editable?:boolean;displayValue?:string;onSave?:(v:string)=>Promise<void>}){
  return <InlineEditRow label={label} value={value} displayValue={displayValue} fullWidth={fullWidth} type={type} options={options} editable={editable} onSave={onSave} />;
}
