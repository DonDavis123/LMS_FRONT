"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import CompanyEditCard from "@/features/platform/components/CompanyEditCard";
import CompanyStatusBadge from "@/features/platform/components/CompanyStatusBadge";
import CompanyStatusCard from "@/features/platform/components/CompanyStatusCard";
import CompanyUsersSection from "@/features/platform/components/CompanyUsersSection";
import type { Company, CompanyDetail as CompanyDetailData } from "@/features/platform/types/platform.types";
import { RecordSection } from "@/shared/components/RecordSection";
import { formatDateTime } from "@/shared/utils/formatDate";

interface CompanyDetailProps {
  company: CompanyDetailData;
  /** Merge the company returned by an update / suspend / activate call. */
  onCompanyChange: (company: Company) => void;
  /** The company's users changed: re-read the user count and superadmins. */
  onUsersChanged: () => void;
  onNotify: (message: string) => void;
}

export default function CompanyDetail({ company, onCompanyChange, onUsersChanged, onNotify }: CompanyDetailProps) {
  const isSuspended = company.status === "SUSPENDED";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link href="/platform/companies" className="text-sm text-slate hover:text-fg">
        ← Back to companies
      </Link>

      {isSuspended && (
        <div
          role="status"
          className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          This company is suspended. Its users cannot sign in.
          {company.status_reason ? ` Reason: ${company.status_reason}` : ""}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-light text-lg font-semibold text-slate">
          {(company.name || "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-serif text-2xl text-fg">{company.name || "(No name)"}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <CompanyStatusBadge status={company.status} />
            <span className="text-xs text-ink-soft">{company.slug}</span>
          </div>
        </div>
      </div>

      <RecordSection title="Company information">
        <InfoItem label="Name">{company.name || "-"}</InfoItem>
        <InfoItem label="Slug">{company.slug || "-"}</InfoItem>
        <InfoItem label="Website">
          {company.website ? (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate hover:underline"
            >
              {company.website}
            </a>
          ) : (
            "-"
          )}
        </InfoItem>
        <InfoItem label="Status">
          <CompanyStatusBadge status={company.status} />
        </InfoItem>
        <InfoItem label="Users">{company.users_count}</InfoItem>
        <InfoItem label="Status changed">{formatDateTime(company.status_changed_at) || "-"}</InfoItem>
        <InfoItem label="Created">{formatDateTime(company.created_at) || "-"}</InfoItem>
        <InfoItem label="Last updated">{formatDateTime(company.updated_at) || "-"}</InfoItem>
      </RecordSection>

      <RecordSection title="Superadmins">
        {company.superadmins.length === 0 ? (
          <p className="text-sm text-ink-soft sm:col-span-2">This company has no superadmin yet.</p>
        ) : (
          company.superadmins.map((admin) => (
            <div key={admin.id} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{admin.name || "(No name)"}</p>
                <p className="truncate text-xs text-ink-soft">{admin.email}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  admin.is_active ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                }`}
              >
                {admin.is_active ? "Active" : "Blocked"}
              </span>
            </div>
          ))
        )}
      </RecordSection>

      <CompanyEditCard company={company} onCompanyChange={onCompanyChange} onNotify={onNotify} />

      <CompanyStatusCard company={company} onCompanyChange={onCompanyChange} onNotify={onNotify} />

      <CompanyUsersSection
        companyId={company.id}
        companyName={company.name}
        onChanged={onUsersChanged}
        onNotify={onNotify}
      />

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Activity history</h3>
          <p className="mt-1 text-sm text-ink-soft">See every platform change made to this company and its users.</p>
        </div>
        <Link
          href={`/platform/audit-logs?company_id=${company.id}`}
          className="flex shrink-0 items-center justify-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-medium text-fg transition hover:bg-paper active:scale-[0.98]"
        >
          <History size={15} />
          View history
        </Link>
      </div>
    </div>
  );
}

function InfoItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-ink-soft">{label}</p>
      <div className="mt-0.5 break-words text-sm text-fg">{children}</div>
    </div>
  );
}
