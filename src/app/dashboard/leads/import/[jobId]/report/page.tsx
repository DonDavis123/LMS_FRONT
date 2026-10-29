"use client";

import { useParams } from "next/navigation";
import ImportReportView from "@/features/leadImport/components/ImportReportView";
import UndoReportAction from "@/features/leadImport/components/UndoReportAction";

export default function ImportReportPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;
  return (
    <ImportReportView
      jobId={jobId}
      renderActions={(report, refresh) => <UndoReportAction report={report} onDone={refresh} />}
    />
  );
}
