"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReminderList from "@/features/reminders/components/ReminderList";
import ReminderDialog from "@/features/reminders/components/ReminderDialog";
import { ReminderService } from "@/features/reminders/services/ReminderService";
import type { Reminder } from "@/features/reminders/types/reminder.types";
import { isReminderInPast, sortReminders } from "@/features/reminders/utils/reminder.utils";
import { extractApiError } from "@/shared/utils/apiError";
import { confirmDelete } from "@/shared/utils/confirmDelete";

type DialogState = { reminder: Reminder | null; notice?: string } | null;
type ToastState = { message: string; tone: "success" | "error" } | null;

const PAST_TIME_NOTICE =
  "This reminder's time has already passed. Choose a new date and time to turn it on.";

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasLoadedRef = useRef(false);

  // Latest-request-wins: a slow, older response can never overwrite newer state.
  useEffect(() => {
    let cancelled = false;
    if (!hasLoadedRef.current) setIsLoading(true);

    ReminderService.getCustomReminders()
      .then((data) => {
        if (cancelled) return;
        setReminders(data);
        setError(null);
        hasLoadedRef.current = true;
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load reminders.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Reminders are consumed by the backend scheduler once they fire, so quietly
  // re-sync when the user returns to the tab — unless a request is in flight
  // or a dialog is open (a refetch must not clobber optimistic state).
  const isQuietRef = useRef(true);
  useEffect(() => {
    isQuietRef.current = busyIds.size === 0 && dialog === null;
  }, [busyIds, dialog]);

  useEffect(() => {
    const resync = () => {
      if (document.visibilityState === "visible" && isQuietRef.current) setRefreshKey((k) => k + 1);
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("focus", resync);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("focus", resync);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const setBusy = useCallback((id: string, busy: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  function replaceReminder(saved: Reminder) {
    setReminders((prev) => {
      const exists = prev.some((item) => item.id === saved.id);
      return sortReminders(exists ? prev.map((item) => (item.id === saved.id ? saved : item)) : [...prev, saved]);
    });
  }

  function handleSaved(saved: Reminder, mode: "create" | "edit") {
    replaceReminder(saved);
    setDialog(null);
    setToast({
      message: mode === "edit" ? "Reminder updated successfully" : "Reminder saved successfully",
      tone: "success",
    });
  }

  function handleEditClick(reminder: Reminder) {
    setDialog({ reminder });
  }

  async function handleToggle(reminder: Reminder, enabled: boolean) {
    if (busyIds.has(reminder.id)) return;

    // Turning on a reminder whose time has passed would fire it immediately.
    // Ask for a new time instead, with "enabled" preselected.
    if (enabled && isReminderInPast(reminder)) {
      setDialog({ reminder: { ...reminder, is_enabled: true }, notice: PAST_TIME_NOTICE });
      return;
    }

    setBusy(reminder.id, true);
    replaceReminder({ ...reminder, is_enabled: enabled }); // optimistic
    try {
      const saved = await ReminderService.setEnabled(reminder.id, enabled);
      replaceReminder(saved);
    } catch (err) {
      if (statusOf(err) === 400 || statusOf(err) === 404) {
        // Gone (it fired or was deleted elsewhere) — re-sync instead of guessing.
        setRefreshKey((k) => k + 1);
        setToast({ message: extractApiError(err, "This reminder no longer exists."), tone: "error" });
      } else {
        replaceReminder(reminder); // roll back
        setToast({ message: "Couldn't update this reminder. Try again.", tone: "error" });
      }
    } finally {
      setBusy(reminder.id, false);
    }
  }

  async function handleDelete(reminder: Reminder) {
    if (busyIds.has(reminder.id)) return;
    if (!(await confirmDelete(`Delete "${reminder.subject}"? This can't be undone.`))) return;

    setBusy(reminder.id, true);
    try {
      const message = await ReminderService.deleteReminder(reminder.id);
      setReminders((prev) => prev.filter((item) => item.id !== reminder.id));
      setToast({ message, tone: "success" });
    } catch (err) {
      if (statusOf(err) === 404) {
        // Already gone (e.g. it fired in the meantime) — drop it from the list.
        setReminders((prev) => prev.filter((item) => item.id !== reminder.id));
        setToast({ message: "This reminder no longer exists.", tone: "error" });
      } else {
        setToast({ message: "Couldn't delete this reminder. Try again.", tone: "error" });
      }
    } finally {
      setBusy(reminder.id, false);
    }
  }

  return (
    <>
      <ReminderList
        reminders={reminders}
        isLoading={isLoading}
        error={error}
        busyIds={busyIds}
        onCreateClick={() => setDialog({ reminder: null })}
        onEditClick={handleEditClick}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />

      <ReminderDialog
        isOpen={dialog !== null}
        onClose={() => setDialog(null)}
        reminder={dialog?.reminder ?? null}
        notice={dialog?.notice}
        onSaved={handleSaved}
      />

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-[60] max-w-[calc(100vw-2rem)] -translate-x-1/2 animate-toast-in rounded-md border px-4 py-2.5 text-sm font-medium shadow-lg ${
            toast.tone === "error"
              ? "border-danger/30 bg-danger-soft text-danger"
              : "border-line bg-surface text-fg"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
