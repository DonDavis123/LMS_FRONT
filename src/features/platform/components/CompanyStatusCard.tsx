"use client";

import { useState } from "react";
import CompanyStatusBadge from "@/features/platform/components/CompanyStatusBadge";
import SuspendCompanyDialog from "@/features/platform/components/SuspendCompanyDialog";
import { platformService } from "@/features/platform/services/platformService";
import type { Company, CompanyDetail } from "@/features/platform/types/platform.types";
import ConfirmActionDialog from "@/features/users/components/ConfirmActionDialog";
import { RecordSection } from "@/shared/components/RecordSection";
import Spinner from "@/shared/components/Spinner";
import { extractApiError } from "@/shared/utils/apiError";
import { formatDateTime } from "@/shared/utils/formatDate";

interface CompanyStatusCardProps {
  company: CompanyDetail;
  onCompanyChange: (company: Company) => void;
  onNotify: (message: string) => void;
}

/**
 * Suspend / activate a company. A suspended company can still be managed
 * from the platform area; its users cannot sign in. An ONBOARDING company
 * can be activated or suspended.
 */
export default function CompanyStatusCard({ company, onCompanyChange, onNotify }: CompanyStatusCardProps) {
  const [isSuspendOpen, setIsSuspendOpen] = useState(false);
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuspended = company.status === "SUSPENDED";
  const isActive = company.status === "ACTIVE";

  async function handleActivate() {
    setIsBusy(true);
    setError(null);
    try {
      const updated = await platformService.activateCompany(company.id);
      onCompanyChange(updated);
      onNotify("Company activated successfully");
    } catch (err) {
      setError(extractApiError(err, "Couldn't activate this company. Try again."));
    } finally {
      setIsBusy(false);
      setIsActivateOpen(false);
    }
  }

  return (
    <RecordSection title="Company status">
      <div className="space-y-3 sm:col-span-2">
        <div className="flex flex-wrap items-center gap-2">
          <CompanyStatusBadge status={company.status} />
          {company.status_changed_at && (
            <span className="text-xs text-ink-soft">since {formatDateTime(company.status_changed_at)}</span>
          )}
        </div>

        <p className="text-sm text-ink-soft">
          {isSuspended
            ? "This company is suspended. Its users cannot sign in and were signed out of every session. Activating it lets them sign in again (they must log in again)."
            : isActive
              ? "Suspending blocks every user of this company from signing in and ends all of their sessions. You can activate it again at any time."
              : "This company is still onboarding. Activate it once it is ready, or suspend it to block access."}
        </p>

        {isSuspended && company.status_reason && (
          <p className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-fg">
            <span className="font-medium">Reason: </span>
            {company.status_reason}
          </p>
        )}

        {error && (
          <p className="animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {!isActive && (
            <button
              type="button"
              onClick={() => setIsActivateOpen(true)}
              disabled={isBusy}
              className="flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBusy && <Spinner size="sm" className="border-white/30 border-t-white" />}
              Activate company
            </button>
          )}
          {!isSuspended && (
            <button
              type="button"
              onClick={() => setIsSuspendOpen(true)}
              disabled={isBusy}
              className="rounded-md border border-danger/40 bg-danger-soft px-4 py-2 text-sm font-semibold text-danger transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Suspend company
            </button>
          )}
        </div>
      </div>

      <SuspendCompanyDialog
        isOpen={isSuspendOpen}
        companyId={company.id}
        companyName={company.name}
        onClose={() => setIsSuspendOpen(false)}
        onSuspended={(updated) => {
          setIsSuspendOpen(false);
          setError(null);
          onCompanyChange(updated);
          onNotify("Company suspended");
        }}
      />

      <ConfirmActionDialog
        isOpen={isActivateOpen}
        title="Activate this company?"
        message={`${company.name} will become active and its users can sign in again. They must log in again.`}
        confirmLabel="Activate"
        isBusy={isBusy}
        onConfirm={handleActivate}
        onCancel={() => setIsActivateOpen(false)}
      />
    </RecordSection>
  );
}
