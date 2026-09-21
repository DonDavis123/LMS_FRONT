"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MeetingList from "@/features/meetings/components/MeetingList";
import MeetingForm from "@/features/meetings/components/MeetingForm";
import Modal from "@/shared/components/Modal";
import { MeetingService } from "@/features/meetings/services/MeetingService";
import type { CreateMeetingPayload, Meeting } from "@/features/meetings/types/meeting.types";

type ModalState = { mode: "create" | "edit"; meeting?: Meeting } | null;

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function load() {
    setIsLoading(true);
    MeetingService.getMeetings()
      .then((data) => {
        setMeetings(data);
        setError(null);
      })
      .catch(() => setError("Couldn't load meetings."))
      .finally(() => setIsLoading(false));
  }

  async function handleSubmit(payload: CreateMeetingPayload) {
    if (modalState?.mode === "edit" && modalState.meeting) {
      const updated = await MeetingService.updateMeeting(modalState.meeting.id, payload);
      setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setToast("Meeting updated successfully");
    } else {
      const created = await MeetingService.createMeeting(payload);
      setMeetings((prev) => [created, ...prev]);
      setToast("Meeting created successfully");
    }
    setModalState(null);
  }

  function handleMeetingDeleted(id: string, message: string) {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    setToast(message);
  }

  return (
    <>
      <MeetingList
        meetings={meetings}
        isLoading={isLoading}
        error={error}
        onCreateClick={() => setModalState({ mode: "create" })}
        onEditClick={(meeting) => setModalState({ mode: "edit", meeting })}
        onOpenClick={(meeting) => router.push(`/dashboard/meetings/${meeting.id}`)}
        onMeetingDeleted={handleMeetingDeleted}
      />

      <Modal isOpen={modalState !== null} onClose={() => setModalState(null)}>
        {modalState && (
          <MeetingForm
            mode={modalState.mode}
            initialMeeting={modalState.meeting}
            onSubmit={handleSubmit}
            onCancel={() => setModalState(null)}
          />
        )}
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 animate-toast-in rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
