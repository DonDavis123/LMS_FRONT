"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import Modal from "@/shared/components/Modal";
import { extractApiError } from "@/shared/utils/apiError";
import { withReturnTo } from "@/shared/utils/returnTo";
import { DealService } from "@/features/deals/services/DealService";
import type { CreateDealPayload, Deal } from "@/features/deals/types/deal.types";
import { formatCloseDate, isOverdue } from "@/features/deals/utils/dealDates";
import { formatCurrency } from "@/features/deals/utils/formatCurrency";
import DealForm, { DEAL_FORM_TITLE_ID, type PickedRecord } from "@/features/deals/components/DealForm";
import DealStageBadge from "@/features/deals/components/DealStageBadge";

interface RecordDealsProps {
  kind: "contact" | "account";
  recordId: string;
  recordName: string;
  /** Page the deal's "Back" link returns to, e.g. `/dashboard/contacts/{id}`. */
  returnTo: string;
  /** A contact's own account, pre-selected on the new deal too. */
  account?: PickedRecord;
}

const PAGE_SIZE = 20;

/** "Deals" section on the contact and account detail pages. */
export default function RecordDeals({ kind, recordId, recordName, returnTo, account }: RecordDealsProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    DealService.getDealsPage({
      page: 1,
      page_size: PAGE_SIZE,
      filters: [{ field: kind, operator: "equals", value: recordId }],
      sort: { field: "created_at", direction: "desc" },
    })
      .then((data) => {
        if (cancelled) return;
        setDeals(data.results);
        setTotal(data.pagination.total);
      })
      .catch((err) => {
        if (!cancelled) setError(extractApiError(err, "Couldn't load deals."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, recordId, reloadKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleCreate(payload: CreateDealPayload) {
    await DealService.createDeal(payload);
    setCreating(false);
    setToast("Deal created successfully");
    setReloadKey((k) => k + 1);
  }

  const self: PickedRecord = { id: recordId, label: recordName };

  return (
    <section aria-label="Deals" className="mt-4 rounded-lg border border-line bg-surface p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Deals{!isLoading && !error ? ` (${total})` : ""}
        </h2>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-fg hover:bg-paper"
        >
          <Plus size={14} aria-hidden="true" /> New Deal
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading deals">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-shimmer rounded-md" />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded-md border border-danger/40 px-2.5 py-1 text-xs font-medium hover:bg-surface"
          >
            Retry
          </button>
        </div>
      ) : deals.length === 0 ? (
        <div className="py-6 text-center animate-scale-in">
          <p className="text-sm font-medium text-fg">No deals yet</p>
          <p className="mt-1 text-xs text-ink-soft">Deals linked to {recordName} will appear here.</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {deals.map((deal) => {
              const overdue = isOverdue(deal.expected_close_date, deal.stage);
              return (
                <li key={deal.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={withReturnTo(`/dashboard/deals/${deal.id}`, returnTo)}
                      className="break-words text-sm font-medium text-slate hover:underline"
                    >
                      {deal.name}
                    </Link>
                    <p className={`text-xs ${overdue ? "font-medium text-danger" : "text-ink-soft"}`}>
                      Close {formatCloseDate(deal.expected_close_date)}
                      {overdue ? " · Overdue" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-fg">{formatCurrency(deal.amount)}</span>
                    <DealStageBadge stage={deal.stage} />
                  </div>
                </li>
              );
            })}
          </ul>
          {total > deals.length && (
            <p className="mt-2 text-xs text-ink-soft">
              Showing the latest {deals.length} of {total}.{" "}
              <Link href="/dashboard/deals?view=list" className="font-medium text-slate hover:underline">
                Open all deals
              </Link>
            </p>
          )}
        </>
      )}

      <Modal isOpen={creating} onClose={() => setCreating(false)} ariaLabelledBy={DEAL_FORM_TITLE_ID}>
        {creating && (
          <DealForm
            mode="create"
            initialContact={kind === "contact" ? self : undefined}
            initialAccount={kind === "account" ? self : account}
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        )}
      </Modal>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 animate-toast-in rounded-md border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg shadow-lg">
          {toast}
        </div>
      )}
    </section>
  );
}
