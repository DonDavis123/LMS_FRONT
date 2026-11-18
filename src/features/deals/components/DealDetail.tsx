"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, MoreVertical, Trophy, XCircle } from "lucide-react";
import InlineEditRow from "@/shared/components/InlineEditRow";
import Modal from "@/shared/components/Modal";
import RecordTimeline from "@/shared/components/RecordTimeline";
import { RecordSection } from "@/shared/components/RecordSection";
import { Tabs } from "@/shared/components/Tabs";
import CreateTaskFromRecord from "@/shared/components/CreateTaskFromRecord";
import { confirmDelete } from "@/shared/utils/confirmDelete";
import { extractApiError } from "@/shared/utils/apiError";
import { formatDateTime } from "@/shared/utils/formatDate";
import { backLabelFor } from "@/shared/utils/returnTo";
import { DealService } from "@/features/deals/services/DealService";
import type { CreateDealPayload, Deal, DealStage, UpdateDealPayload } from "@/features/deals/types/deal.types";
import { formatCloseDate, isOverdue } from "@/features/deals/utils/dealDates";
import { PROGRESS_STAGES, STAGE_META, isClosedStage } from "@/features/deals/utils/dealStages";
import { formatCurrency, normalizeAmountInput } from "@/features/deals/utils/formatCurrency";
import DealForm, { DEAL_FORM_TITLE_ID } from "@/features/deals/components/DealForm";
import DealStageBadge from "@/features/deals/components/DealStageBadge";
import LostReasonModal from "@/features/deals/components/LostReasonModal";

interface DealDetailProps {
  deal: Deal;
  onDealChange: (deal: Deal) => void;
  /** Where "Back" goes when the deal was opened from another record. */
  returnTo?: string | null;
  initialTab?: "overview" | "timeline";
}

type DetailTab = "overview" | "timeline";

export default function DealDetail({ deal, onDealChange, returnTo = null, initialTab = "overview" }: DealDetailProps) {
  const router = useRouter();
  const backHref = returnTo ?? "/dashboard/deals";
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [movingTo, setMovingTo] = useState<DealStage | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const overdue = isOverdue(deal.expected_close_date, deal.stage);
  const currentIndex = PROGRESS_STAGES.indexOf(deal.stage);

  async function moveTo(stage: DealStage) {
    if (stage === deal.stage || movingTo) return;
    if (stage === "Lost") {
      setLostOpen(true);
      return;
    }
    setMoveError(null);
    setMovingTo(stage);
    try {
      const updated = await DealService.moveDeal(deal.id, { stage });
      onDealChange({ ...deal, ...updated });
      setToast(`Moved to ${STAGE_META[stage].label}`);
    } catch (err) {
      setMoveError(extractApiError(err, "Couldn't move this deal. Try again."));
    } finally {
      setMovingTo(null);
    }
  }

  async function markLost(reason: string) {
    // A rejection is shown inside the modal, which stays open.
    const updated = await DealService.moveDeal(deal.id, { stage: "Lost", lost_reason: reason });
    onDealChange({ ...deal, ...updated });
    setLostOpen(false);
    setMoveError(null);
    setToast("Deal marked as lost");
  }

  async function updateField(field: "name" | "amount" | "expected_close_date" | "probability" | "description", raw: string) {
    let payload: UpdateDealPayload;
    if (field === "name") {
      if (!raw.trim()) throw new Error("Name is required");
      payload = { name: raw.trim() };
    } else if (field === "amount") {
      const amount = normalizeAmountInput(raw);
      if (!amount) throw new Error("Invalid amount");
      payload = { amount };
    } else if (field === "probability") {
      const probability = Number(raw);
      if (raw.trim() === "" || !Number.isInteger(probability) || probability < 0 || probability > 100) {
        throw new Error("Invalid probability");
      }
      payload = { probability };
    } else if (field === "expected_close_date") {
      payload = { expected_close_date: raw.trim() ? raw : null };
    } else {
      payload = { description: raw.trim() ? raw : null };
    }
    const updated = await DealService.updateDeal(deal.id, payload);
    onDealChange({ ...deal, ...updated });
  }

  async function handleEditSubmit(payload: CreateDealPayload) {
    const updated = await DealService.updateDeal(deal.id, payload);
    onDealChange({ ...deal, ...updated });
    setEditing(false);
    setToast("Deal updated successfully");
  }

  async function handleDelete() {
    setMenuOpen(false);
    if (!(await confirmDelete(`Delete "${deal.name}"? This can't be undone.`))) return;
    try {
      await DealService.deleteDeal(deal.id);
      router.push(backHref);
    } catch (err) {
      setMoveError(extractApiError(err, "Couldn't delete this deal. Try again."));
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link href={backHref} className="text-sm text-slate hover:text-fg">
        {backLabelFor(returnTo, "← Back to Deals")}
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words font-serif text-2xl text-fg">{deal.name || "Untitled Deal"}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="font-serif text-2xl text-fg">{formatCurrency(deal.amount)}</span>
            <DealStageBadge stage={deal.stage} />
            <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft ring-1 ring-inset ring-line">
              {deal.probability}% probability
            </span>
            {overdue && (
              <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                <AlertCircle size={12} aria-hidden="true" />
                Overdue since {formatCloseDate(deal.expected_close_date)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tasks can only be linked to a contact (the task form drops a bare account). */}
          {deal.contact_id && (
            <CreateTaskFromRecord
              related={{
                personType: "contact",
                personId: deal.contact_id,
                personLabel: deal.contact_name ?? "Contact",
                accountId: deal.account_id ?? "",
                accountLabel: deal.account_name ?? "",
              }}
            />
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper"
          >
            Edit
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Deal actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="rounded-md border border-line p-2 text-ink-soft hover:bg-paper"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-line bg-surface py-1 shadow-lg">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditing(true);
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-fg hover:bg-paper"
                >
                  Edit
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleDelete}
                  className="block w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {deal.stage === "Won" && (
        <div role="status" className="mt-4 flex items-start gap-3 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-success animate-scale-in">
          <Trophy size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">Deal won</p>
            {deal.closed_at && <p className="text-xs">Closed {formatDateTime(deal.closed_at)}</p>}
          </div>
        </div>
      )}
      {deal.stage === "Lost" && (
        <div role="status" className="mt-4 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-danger animate-scale-in">
          <XCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Deal lost</p>
            <p className="break-words text-sm">
              <span className="font-medium">Reason:</span> {deal.lost_reason?.trim() || "No reason recorded"}
            </p>
            {deal.closed_at && <p className="mt-0.5 text-xs">Closed {formatDateTime(deal.closed_at)}</p>}
          </div>
        </div>
      )}

      {/* Stage progress bar: click a stage to move the deal. */}
      <div className="mt-5 rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Stage</h2>
          {deal.stage !== "Lost" && (
            <button
              type="button"
              onClick={() => moveTo("Lost")}
              disabled={movingTo !== null}
              className="inline-flex items-center gap-1.5 rounded-md border border-danger/40 px-3 py-1 text-xs font-medium text-danger transition hover:bg-danger-soft disabled:opacity-50"
            >
              <XCircle size={13} aria-hidden="true" />
              Mark as lost
            </button>
          )}
        </div>
        <div
          role="group"
          aria-label="Deal stage — select a stage to move this deal"
          className="mt-3 flex overflow-hidden rounded-lg border border-line"
        >
          {PROGRESS_STAGES.map((stage, index) => {
            const isCurrent = stage === deal.stage;
            const isDone = currentIndex > index;
            const isMoving = movingTo === stage;
            const tone = isCurrent
              ? stage === "Won"
                ? "bg-success text-white"
                : "bg-ink text-white"
              : isDone
                ? "bg-slate-light text-slate hover:brightness-95"
                : "bg-paper text-ink-soft hover:bg-slate-light hover:text-fg";
            return (
              <button
                key={stage}
                type="button"
                aria-current={isCurrent ? "step" : undefined}
                disabled={movingTo !== null}
                onClick={() => moveTo(stage)}
                className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1.5 py-2.5 text-center text-xs font-medium transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber disabled:cursor-wait sm:px-3 sm:text-sm ${
                  index > 0 ? "border-l border-line" : ""
                } ${tone} ${isMoving ? "animate-stage-pulse" : ""}`}
              >
                {isDone && <Check size={13} aria-hidden="true" className="shrink-0" />}
                <span className="min-w-0 break-words">{STAGE_META[stage].label}</span>
              </button>
            );
          })}
        </div>
        {moveError && (
          <p role="alert" className="mt-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {moveError}
          </p>
        )}
        {isClosedStage(deal.stage) && (
          <p className="mt-2 text-xs text-ink-soft">Click an earlier stage to reopen this deal.</p>
        )}
      </div>

      <Tabs
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "timeline", label: "Timeline" },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      <div key={activeTab} className="animate-fade-in">
        {activeTab === "overview" ? (
          <div className="mt-4 space-y-4">
            <RecordSection title="Deal Information">
              <Row label="Deal Name" value={deal.name} onSave={(raw) => updateField("name", raw)} />
              <Row
                label="Amount (₹)"
                value={deal.amount}
                displayValue={formatCurrency(deal.amount)}
                onSave={(raw) => updateField("amount", raw)}
              />
              <Row
                label="Expected Close"
                value={deal.expected_close_date}
                displayValue={
                  deal.expected_close_date
                    ? `${formatCloseDate(deal.expected_close_date)}${overdue ? " (overdue)" : ""}`
                    : undefined
                }
                type="date"
                onSave={(raw) => updateField("expected_close_date", raw)}
              />
              <Row label="Stage" value={deal.stage} editable={false} />
              <Row
                label="Probability (%)"
                value={deal.probability}
                displayValue={`${deal.probability}%`}
                type="number"
                onSave={(raw) => updateField("probability", raw)}
              />
              <Row label="Owner" value={deal.owner_name} editable={false} />
              <Row label="Lead Source" value={deal.lead_source} editable={false} />
              {deal.stage === "Lost" && <Row label="Lost Reason" value={deal.lost_reason} editable={false} fullWidth />}
            </RecordSection>

            <RecordSection title="Related Records">
              <LinkRow label="Account" name={deal.account_name} href={deal.account_id ? `/dashboard/accounts/${deal.account_id}` : null} />
              <LinkRow label="Contact" name={deal.contact_name} href={deal.contact_id ? `/dashboard/contacts/${deal.contact_id}` : null} />
              <LinkRow
                label="Source Lead"
                name={deal.source_lead_name}
                href={deal.source_lead_id ? `/dashboard/leads/${deal.source_lead_id}` : null}
              />
            </RecordSection>

            <RecordSection title="Description Information">
              <Row label="Description" value={deal.description} type="textarea" fullWidth onSave={(raw) => updateField("description", raw)} />
            </RecordSection>

            <RecordSection title="System Information">
              <Row label="Created At" value={formatDateTime(deal.created_at) || null} editable={false} />
              <Row label="Updated At" value={formatDateTime(deal.updated_at) || null} editable={false} />
              {deal.closed_at && <Row label="Closed At" value={formatDateTime(deal.closed_at) || null} editable={false} />}
            </RecordSection>
          </div>
        ) : (
          <RecordTimeline module="deals" recordId={deal.id} />
        )}
      </div>

      <Modal isOpen={editing} onClose={() => setEditing(false)} ariaLabelledBy={DEAL_FORM_TITLE_ID}>
        {editing && <DealForm mode="edit" initialDeal={deal} onSubmit={handleEditSubmit} onCancel={() => setEditing(false)} />}
      </Modal>

      <LostReasonModal isOpen={lostOpen} dealName={deal.name} onConfirm={markLost} onCancel={() => setLostOpen(false)} />

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[60] max-w-[90vw] -translate-x-1/2 animate-toast-in rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  fullWidth = false,
  type = "text",
  editable = true,
  displayValue,
  onSave,
}: {
  label: string;
  value?: string | number | null;
  fullWidth?: boolean;
  type?: "text" | "date" | "number" | "textarea";
  editable?: boolean;
  displayValue?: string;
  onSave?: (value: string) => Promise<void>;
}) {
  return (
    <InlineEditRow
      label={label}
      value={value}
      displayValue={displayValue}
      fullWidth={fullWidth}
      type={type}
      editable={editable}
      onSave={onSave}
    />
  );
}

/** Read-only row whose value is a link to another record. */
function LinkRow({ label, name, href }: { label: string; name: string | null; href: string | null }): ReactNode {
  return (
    <div className="min-w-0 rounded-xl border border-transparent px-3 py-2.5">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="flex min-h-7 items-center text-sm text-fg">
        {href ? (
          <Link href={href} className="break-words font-medium text-slate hover:underline">
            {name || "View record"}
          </Link>
        ) : (
          "—"
        )}
      </p>
    </div>
  );
}
