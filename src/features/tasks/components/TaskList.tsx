"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import RecordActionsMenu from "@/shared/components/RecordActionsMenu";
import BulkDeleteBar from "@/shared/components/BulkDeleteBar";
import SelectionIndicator from "@/shared/components/SelectionIndicator";
import { TASK_PRIORITIES, TASK_STATUSES, type Task } from "@/features/tasks/types/task.types";
import { TaskService } from "@/features/tasks/services/TaskService";
import { userService } from "@/features/users/services/userService";
import FilterBar, { type FilterCondition, type FilterFieldConfig } from "@/shared/components/FilterBar";
import { applyFilters } from "@/shared/utils/applyFilters";
import type { LeadOwnerOption } from "@/features/auth/types/auth.types";

import { confirmDelete } from "@/shared/utils/confirmDelete";
import { useSelectionKeyboard } from "@/shared/hooks/useSelectionKeyboard";

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  onCreateClick: () => void;
  onEditClick: (task: Task) => void;
  onOpenClick: (task: Task) => void;
  onTaskDeleted: (id: string, message: string) => void;
  onTaskUpdated: (task: Task) => void;
}

const PAGE_SIZE = 10;

function toChoices(values: readonly string[]) {
  return values.map((v) => ({ value: v, label: v }));
}

const PRIORITY_STYLES: Record<string, string> = {
  Highest: "bg-danger-soft text-danger",
  High: "bg-danger-soft text-danger",
  Normal: "bg-slate-light text-slate",
  Low: "bg-paper text-ink-soft",
  Lowest: "bg-paper text-ink-soft",
};

const STATUS_STYLES: Record<string, string> = {
  "Not Started": "bg-paper text-ink-soft",
  Deferred: "bg-paper text-ink-soft",
  "In Progress": "bg-slate-light text-slate",
  Completed: "bg-success-soft text-success",
  "Waiting for Input": "bg-danger-soft text-danger",
};

function dueDateWithDaysLeft(value: string | null): string {
  if (!value) return "—";
  const due = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  const formatted = due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (diff === 0) return `${formatted} (Today)`;
  if (diff > 0) return `${formatted} (${diff} day${diff === 1 ? "" : "s"} left)`;
  const overdue = Math.abs(diff);
  return `${formatted} (${overdue} day${overdue === 1 ? "" : "s"} overdue)`;
}

export default function TaskList({
  tasks,
  isLoading,
  error,
  onCreateClick,
  onEditClick,
  onOpenClick,
  onTaskDeleted,
  onTaskUpdated,
}: TaskListProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [owners, setOwners] = useState<LeadOwnerOption[]>([]);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  useEffect(() => {
    userService.getLeadOwners().then(setOwners).catch(() => setOwners([]));
  }, []);

  const fields = useMemo<FilterFieldConfig[]>(
    () => [
      { field: "priority", label: "Priority", type: "choice", choices: toChoices(TASK_PRIORITIES) },
      { field: "status", label: "Status", type: "choice", choices: toChoices(TASK_STATUSES) },
      { field: "due_date", label: "Due Date", type: "date" },
      {
        field: "owner_id",
        label: "Owner",
        type: "uuid",
        choices: owners.map((o) => ({ value: o.id, label: o.name })),
      },
      { field: "created_at", label: "Created", type: "datetime" },
    ],
    [owners]
  );

  function getFieldValue(task: Task, field: string): unknown {
    return (task as unknown as Record<string, unknown>)[field];
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const searched = tasks.filter((task) =>
      `${task.subject} ${task.owner_name ?? ""}`.toLowerCase().includes(q)
    );
    return applyFilters(searched, filters, getFieldValue);
  }, [tasks, query, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  useSelectionKeyboard(selectionMode, selectedIds.size, handleBulkDelete);

  function toggleSelectAll() {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = filtered.length > 0 && filtered.every((row) => next.has(row.id));
      if (allSelected) filtered.forEach((row) => next.delete(row.id));
      else filtered.forEach((row) => next.add(row.id));
      return next;
    });
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (!await confirmDelete(`Delete ${ids.length} selected tasks? This can't be undone.`)) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => TaskService.deleteTask(id)));
      const deleted = results.reduce((count, result) => count + (result.status === "fulfilled" ? 1 : 0), 0);
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          onTaskDeleted(ids[index], result.value);
        }
      });
      setSelectedIds(new Set());
      setSelectionMode(false);
      if (deleted < ids.length) window.alert(`${deleted} deleted. ${ids.length - deleted} could not be deleted.`);
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleDelete(task: Task) {
    if (!await confirmDelete(`Delete "${task.subject}"? This can't be undone.`)) return;
    setDeletingId(task.id);
    try {
      const message = await TaskService.deleteTask(task.id);
      onTaskDeleted(task.id, message);
    } catch {
      window.alert("Couldn't delete this task. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleStatusChange(task: Task, status: Task["status"]) {
    if (status === task.status || updatingStatusId) return;
    setUpdatingStatusId(task.id);
    try {
      const updated = await TaskService.updateTask(task.id, { status });
      onTaskUpdated(updated);
    } catch (error) {
      console.error("Failed to update task status:", error);
      window.alert("Couldn't update the task status. Try again.");
    } finally {
      setUpdatingStatusId(null);
    }
  }

  function relatedLabel(task: Task): string {
    if (task.lead_id) return task.lead_name ? `Lead: ${task.lead_name}` : "Lead";
    if (task.contact_id) return task.contact_name ? `Contact: ${task.contact_name}` : "Contact";
    if (task.account_id) return task.account_name ? `Account: ${task.account_name}` : "Account";
    return "—";
  }

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex flex-col gap-3 border-b border-line p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-xl text-fg">Tasks</h1>
            <p className="text-sm text-ink-soft">
              {filtered.length} total {filtered.length === 1 ? "task" : "tasks"}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search tasks…"
              className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-slate focus:ring-2 focus:ring-slate-light sm:w-56"
            />
            <button
              onClick={onCreateClick}
              className="whitespace-nowrap rounded-md bg-amber px-4 py-2 text-sm font-semibold text-fg transition hover:bg-amber-dark active:scale-[0.98]"
            >
              + Create Task
            </button>
          </div>
        </div>

        <FilterBar
          fields={fields}
          filters={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
        />
      </div>

      {error && (
        <p className="border-b border-line bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
      )}

      <BulkDeleteBar count={selectedIds.size} onDelete={handleBulkDelete} onClear={() => { setSelectedIds(new Set()); setSelectionMode(false); }} deleting={bulkDeleting} />

      {isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-shimmer rounded-md" />
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center animate-scale-in">
          <p className="font-serif text-lg text-fg">
            {query || filters.length > 0 ? "No tasks match your search or filters" : "No tasks yet"}
          </p>
          <p className="max-w-sm text-sm text-ink-soft">
            {query || filters.length > 0
              ? "Try a different search term, or remove a filter."
              : "Create a task to follow up on a lead, contact, or account."}
          </p>
          {!(query || filters.length > 0) && (
            <button
              onClick={onCreateClick}
              className="mt-1 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98]"
            >
              + Create Task
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <th className="w-10 px-4 py-3" aria-label="Selection and actions">
                    {selectionMode && (
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={filtered.length > 0 && filtered.every((row) => selectedIds.has(row.id))}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-line accent-slate"
                      />
                    )}
                  </th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Related To</th>
                  <th className="px-4 py-3">Owner</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((task) => (
                  <tr
                    key={task.id}
                    data-record-row={task.id}
                    onClick={(event) => {
                      if (!selectionMode) return;
                      const target = event.target as HTMLElement;
                      if (target.closest('button[aria-label="Record actions"]')) return;
                      event.preventDefault();
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (next.has(task.id)) next.delete(task.id); else next.add(task.id);
                        return next;
                      });
                    }}
                    onDoubleClick={() => { if (!selectionMode) onOpenClick(task); }}
                    title="Double-click to open task details"
                    className="group cursor-pointer border-b border-line last:border-0 hover:bg-paper hover:shadow-[inset_2px_0_0_var(--color-amber)]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {selectionMode && <SelectionIndicator selected={selectedIds.has(task.id)} />}
                        <RecordActionsMenu
                        onEdit={() => onEditClick(task)}
                        onDelete={() => handleDelete(task)}
                        onSelect={() => setSelectionMode(true)}
                        recordId={task.id}
                        disabled={deletingId === task.id}
                      />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(event) => {
                          if (selectionMode) {
                            event.preventDefault();
                            event.stopPropagation();
                            setSelectedIds((current) => { const next = new Set(current); if (next.has(task.id)) next.delete(task.id); else next.add(task.id); return next; });
                          } else onOpenClick(task);
                        }}
                        className="text-left font-medium text-slate hover:underline"
                      >
                        {task.subject}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{dueDateWithDaysLeft(task.due_date)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          PRIORITY_STYLES[task.priority] ?? "bg-paper text-ink-soft"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative inline-flex">
                        <select
                          value={task.status}
                          disabled={updatingStatusId === task.id}
                          aria-label={`Change status for ${task.subject}`}
                          onChange={(event) =>
                            handleStatusChange(task, event.target.value as Task["status"])
                          }
                          className={`appearance-none rounded-full border-0 py-1 pl-2.5 pr-7 text-xs font-medium outline-none cursor-pointer disabled:cursor-wait disabled:opacity-60 ${
                            STATUS_STYLES[task.status] ?? "bg-paper text-ink-soft"
                          }`}
                        >
                          {(["Not Started", "Deferred", "In Progress", "Completed", "Waiting for Input"] as const).map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-current" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{relatedLabel(task)}</td>
                    <td className="px-4 py-3 text-ink-soft">{task.owner_name ?? "Unassigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-ink-soft">
            <span>Total Records {filtered.length}</span>
            <div className="flex items-center gap-3">
              <span>
                {pageStart + 1} to {Math.min(pageStart + PAGE_SIZE, filtered.length)}
              </span>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded border border-line px-2 py-1 disabled:opacity-40"
              >
                ‹
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded border border-line px-2 py-1 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
        </>
      )}


    </div>
  );
}
