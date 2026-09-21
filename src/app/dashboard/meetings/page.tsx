"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MeetingList from "@/features/meetings/components/MeetingList";
import MeetingForm from "@/features/meetings/components/MeetingForm";
import Modal from "@/shared/components/Modal";
import { MeetingService } from "@/features/meetings/services/MeetingService";
import type {
  CreateMeetingPayload,
  Meeting,
  MeetingListItem,
} from "@/features/meetings/types/meeting.types";
import type { PaginationMeta } from "@/shared/types/pagination";

type ModalState = { mode: "create" | "edit"; meeting?: Meeting } | null;

const PAGE_SIZE = 10;

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  page_size: PAGE_SIZE,
  total: 0,
  total_pages: 0,
};

export default function MeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [pagination, setPagination] =
    useState<PaginationMeta>(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async (requestedPage = page) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await MeetingService.getMeetingsPage(
        requestedPage,
        PAGE_SIZE,
      );

      // The backend can return an empty page when a record was deleted from
      // the last page. Move to the last valid page and load it.
      if (
        response.pagination.total_pages > 0 &&
        requestedPage > response.pagination.total_pages
      ) {
        setPage(response.pagination.total_pages);
        return;
      }

      setMeetings(response.results);
      setPagination(response.pagination);
      setPage(response.pagination.page);
    } catch {
      setMeetings([]);
      setError("Couldn't load meetings.");
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load(page);
  }, [page, load]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleSubmit(payload: CreateMeetingPayload) {
    if (modalState?.mode === "edit" && modalState.meeting) {
      await MeetingService.updateMeeting(modalState.meeting.id, payload);
      setToast("Meeting updated successfully");
      setModalState(null);
      await load(page);
      return;
    }

    await MeetingService.createMeeting(payload);
    setToast("Meeting created successfully");
    setModalState(null);
    setPage(1);
    await load(1);
  }

  async function openEdit(listItem: MeetingListItem) {
    try {
      setError(null);
      const meeting = await MeetingService.getMeeting(listItem.id);
      setModalState({ mode: "edit", meeting });
    } catch {
      setError("Couldn't load this meeting for editing.");
    }
  }

  async function refreshAfterDelete() {
    await load(page);
  }

  return (
    <>
      <MeetingList
        meetings={meetings}
        pagination={pagination}
        isLoading={isLoading}
        error={error}
        onCreateClick={() => setModalState({ mode: "create" })}
        onEditClick={openEdit}
        onOpenClick={(meeting) =>
          router.push(`/dashboard/meetings/${meeting.id}`)
        }
        onPageChange={(nextPage) => {
          if (
            nextPage >= 1 &&
            nextPage <= Math.max(1, pagination.total_pages)
          ) {
            setPage(nextPage);
          }
        }}
        onRefresh={refreshAfterDelete}
      />

      <Modal
        isOpen={modalState !== null}
        onClose={() => setModalState(null)}
      >
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
