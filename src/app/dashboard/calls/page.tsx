"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CallList from "@/features/calls/components/CallList";
import CallForm from "@/features/calls/components/CallForm";
import Modal from "@/shared/components/Modal";
import { CallService } from "@/features/calls/services/CallService";
import type { CreateCallPayload, Call } from "@/features/calls/types/call.types";

type ModalState = { mode: "create" | "edit"; call?: Call } | null;

export default function CallsPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<Call[]>([]);
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
    CallService.getCalls()
      .then((data) => {
        setCalls(data);
        setError(null);
      })
      .catch(() => setError("Couldn't load calls."))
      .finally(() => setIsLoading(false));
  }

  async function handleSubmit(payload: CreateCallPayload) {
    if (modalState?.mode === "edit" && modalState.call) {
      const updated = await CallService.updateCall(modalState.call.id, payload);
      setCalls((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setToast("Call updated successfully");
    } else {
      const created = await CallService.createCall(payload);
      setCalls((prev) => [created, ...prev]);
      setToast("Call logged successfully");
    }
    setModalState(null);
  }

  function handleCallDeleted(id: string, message: string) {
    setCalls((prev) => prev.filter((c) => c.id !== id));
    setToast(message);
  }

  return (
    <>
      <CallList
        calls={calls}
        isLoading={isLoading}
        error={error}
        onCreateClick={() => setModalState({ mode: "create" })}
        onEditClick={(call) => setModalState({ mode: "edit", call })}
        onOpenClick={(call) => router.push(`/dashboard/calls/${call.id}`)}
        onCallDeleted={handleCallDeleted}
      />

      <Modal isOpen={modalState !== null} onClose={() => setModalState(null)}>
        {modalState && (
          <CallForm
            mode={modalState.mode}
            initialCall={modalState.call}
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
