"use client";

import { useParams } from "next/navigation";
import ImportReportView from "@/features/leadImport/components/ImportReportView";

export default function ImportReportPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;
  return <ImportReportView jobId={jobId} />;
}
