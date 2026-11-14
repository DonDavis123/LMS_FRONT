"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MeetingList from "@/features/meetings/components/MeetingList";
import MeetingForm from "@/features/meetings/components/MeetingForm";
import Modal from "@/shared/components/Modal";
import GoogleConnectionChip from "@/features/googleIntegration/components/GoogleConnectionChip";
import { MeetingService } from "@/features/meetings/services/MeetingService";
import type {
  CreateMeetingPayload,
  Meeting,
  MeetingListItem,
} from "@/features/meetings/types/meeting.types";
import type { PaginationMeta } from "@/shared/types/pagination";
import type { SortState } from "@/shared/types/sort";

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
  const [sort, setSort] = useState<SortState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "warning" } | null>(null);

  const load = useCallback(async (requestedPage = page) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await MeetingService.getMeetingsPage(
        requestedPage,
        PAGE_SIZE,
        sort,
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
  }, [page, sort]);

  useEffect(() => {
    void load(page);
  }, [page, load]);

  useEffect(() => {
    if (!toast) return;
    // Warnings stay longer so they can be read.
    const timer = window.setTimeout(
      () => setToast(null),
      toast.tone === "warning" ? 8000 : 3000,
    );
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleSubmit(payload: CreateMeetingPayload) {
    if (modalState?.mode === "edit" && modalState.meeting) {
      const updated = await MeetingService.updateMeeting(modalState.meeting.id, payload);
      setToast(
        updated.conference_error
          ? {
              message:
                "Meeting saved, but Google Calendar couldn\u2019t be updated. Open the meeting to retry.",
              tone: "warning",
            }
          : { message: "Meeting updated successfully", tone: "success" },
      );
      setModalState(null);
      await load(page);
      return;
    }

    const created = await MeetingService.createMeeting(payload);
    // A saved meeting whose Meet failed is a warning, not an error.
    setToast(
      created.warning
        ? { message: created.warning, tone: "warning" }
        : { message: "Meeting created successfully", tone: "success" },
    );
    setModalState(null);
    if (page !== 1) {
      setPage(1); // the page effect reloads page 1
    } else {
      await load(1);
    }
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
        headerExtra={<GoogleConnectionChip />}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
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
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 animate-toast-in rounded-md border px-4 py-2.5 text-sm font-medium shadow-lg sm:w-auto ${
            toast.tone === "warning"
              ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950 dark:text-amber-300"
              : "border-line bg-surface text-fg"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
