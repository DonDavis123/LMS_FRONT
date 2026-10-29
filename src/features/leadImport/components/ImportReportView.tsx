"use client";

import type { ReactNode } from "react";
import DownloadsCard from "@/features/leadImport/components/DownloadsCard";
import OutcomeBar from "@/features/leadImport/components/OutcomeBar";
import OutcomeGroupsList from "@/features/leadImport/components/OutcomeGroupsList";
import ReportHeader from "@/features/leadImport/components/ReportHeader";
import ReportSideCards from "@/features/leadImport/components/ReportSideCards";
import ReportStats from "@/features/leadImport/components/ReportStats";
import {
  ReportError,
  ReportNotFound,
  ReportSkeleton,
  ReportStillRunning,
} from "@/features/leadImport/components/ReportStates";
import UndoReportCard from "@/features/leadImport/components/UndoReportCard";
import { useImportAdminAccess } from "@/features/leadImport/hooks/useImportAdminAccess";
import { useImportReport } from "@/features/leadImport/hooks/useImportReport";
import type { ImportReport } from "@/features/leadImport/types/leadImport.types";
import { isStillRunning } from "@/features/leadImport/utils/reportView";
import { card } from "@/features/leadImport/utils/reviewStyles";

interface ImportReportViewProps {
  jobId: string;
  /** The undo part fills this: buttons shown next to "Import another file". the second argument refreshes the report quietly (no loading screen). */
  renderActions?: (report: ImportReport, reload: () => void) => ReactNode;
}

/** The report of one import: summary, why rows were not added, downloads and details. */
export default function ImportReportView({ jobId, renderActions }: ImportReportViewProps) {
  const access = useImportAdminAccess();
  const { status, report, error, reload, refresh } = useImportReport(jobId);

  if (access !== "allowed") {
    return access === "checking" ? <ReportSkeleton /> : null;
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      {status === "loading" && <ReportSkeleton />}
      {status === "not-found" && <ReportNotFound />}
      {status === "error" && <ReportError error={error} onRetry={reload} />}
      {status === "ready" && report && <ReportBody report={report} renderActions={renderActions} reload={refresh} />}
    </div>
  );
}

function ReportBody({
  report,
  renderActions,
  reload,
}: {
  report: ImportReport;
  renderActions?: ImportReportViewProps["renderActions"];
  reload: () => void;
}) {
  const running = isStillRunning(report.job);
  const header = (
    <ReportHeader report={report} showPrimary={!running} actions={running ? null : renderActions?.(report, reload)} />
  );

  if (running) {
    return (
      <>
        {header}
        <ReportStillRunning jobId={report.job.id} />
      </>
    );
  }

  return (
    <>
      {header}
      {/* Small screens, one column in this order: summary, downloads, reasons, details. From lg up: two columns. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="contents lg:flex lg:flex-col lg:gap-4">
          {report.undo_report && (
            <div className="order-1">
              <UndoReportCard undo={report.undo_report} />
            </div>
          )}
          <section className={`${card} order-2 p-4`} aria-labelledby="report-summary-title">
            <h2 id="report-summary-title" className="sr-only">
              Summary
            </h2>
            <p className="text-sm text-fg">{report.message}</p>
            <div className="mt-4">
              <OutcomeBar totals={report.totals} />
            </div>
            <div className="mt-4">
              <ReportStats totals={report.totals} />
            </div>
          </section>
          <div className="order-4">
            <OutcomeGroupsList report={report} />
          </div>
        </div>
        <div className="contents lg:flex lg:flex-col lg:gap-4">
          <div className="order-3">
            <DownloadsCard report={report} />
          </div>
          <div className="order-5 flex flex-col gap-4 empty:hidden">
            <ReportSideCards report={report} />
          </div>
        </div>
      </div>
    </>
  );
}
