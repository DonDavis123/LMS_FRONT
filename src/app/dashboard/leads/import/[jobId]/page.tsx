"use client";

import { useParams } from "next/navigation";
import ImportRunPage from "@/features/leadImport/components/ImportRunPage";

export default function ImportRunRoute() {
  const params = useParams<{ jobId: string }>();
  const jobId = Array.isArray(params.jobId) ? params.jobId[0] : params.jobId;
  return <ImportRunPage jobId={jobId} />;
}
