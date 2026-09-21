"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MoreVertical } from "lucide-react";
import { CallService } from "@/features/calls/services/CallService";
import type { Call } from "@/features/calls/types/call.types";
import Modal from "@/shared/components/Modal";
import CallForm from "@/features/calls/components/CallForm";

import { confirmDelete } from "@/shared/utils/confirmDelete";

export default function CallDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [call, setCall] = useState<Call | null>(null);
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    CallService.getCall(params.id).then(setCall).catch(() => router.replace("/dashboard/calls"));
  }, [params.id, router]);

  if (!call) return <div className="p-6 text-sm text-ink-soft">Loading…</div>;

  const related = call.lead_name ? `Lead: ${call.lead_name}` : call.contact_name ? `Contact: ${call.contact_name}` : call.account_name ? `Account: ${call.account_name}` : "—";
  const relatedTo = call.lead_id ? "lead_id" : call.contact_id ? "contact_id" : call.account_id ? "account_id" : null;

  async function saveEdit(payload: Parameters<typeof CallService.updateCall>[1]) {
    const updated = await CallService.updateCall(call!.id, payload);
    setCall(updated);
    setEditing(false);
  }

  async function del() {
    const currentCall = call;
    if (!currentCall) return;
    if (!(await confirmDelete(`Delete "${currentCall.subject}"? This can't be undone.`))) return;
    await CallService.deleteCall(currentCall.id);
    router.push("/dashboard/calls");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/dashboard/calls" className="text-sm text-slate hover:text-fg">← Back to Calls</Link>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-fg">{call.subject}</h1>
          <p className="mt-1 text-sm text-ink-soft">{related}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setEditing(true)} className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:bg-paper">Edit</button>
          <div className="relative">
            <button type="button" onClick={() => setMenu((v) => !v)} className="rounded-md border border-line p-2 text-ink-soft hover:bg-paper"><MoreVertical size={16}/></button>
            {menu && <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-line bg-surface py-1 shadow-lg"><button type="button" onClick={del} className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft">Delete</button></div>}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">Overview</h2>
        <div className="grid grid-cols-1 gap-y-5 sm:grid-cols-2">
          <Detail label="Subject" value={call.subject} />
          <Detail label="Owner" value={call.owner_name ?? "—"} />
          <Detail label="Call Type" value={call.call_type} />
          <Detail label="Status" value={call.call_status} />
          <Detail label="Start Time" value={call.call_start_time ? new Date(call.call_start_time).toLocaleString() : "—"} />
          <Detail label="Duration" value={call.call_duration_minutes != null ? `${call.call_duration_minutes} min` : "—"} />
          <Detail label="Related To" value={related} />
          <Detail label="Record Type" value={relatedTo ? relatedTo.replace("_id", "") : "—"} />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">Description</h2>
        <p className="whitespace-pre-wrap text-sm text-ink-soft">{call.description || "—"}</p>
      </div>

      <Modal isOpen={editing} onClose={() => setEditing(false)}>
        <CallForm mode="edit" initialCall={call} onSubmit={saveEdit} onCancel={() => setEditing(false)} />
      </Modal>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-sm text-ink-soft">{label}</p><p className="mt-1 text-sm text-fg">{value || "—"}</p></div>;
}
