"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import MeetingDetail from "@/features/meetings/components/MeetingDetail";
import { MeetingService } from "@/features/meetings/services/MeetingService";
import type { Meeting } from "@/features/meetings/types/meeting.types";
import { getSafeReturnTo, RETURN_TO_PARAM } from "@/shared/utils/returnTo";

function Inner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const returnTo = getSafeReturnTo(searchParams.get(RETURN_TO_PARAM));
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    MeetingService.getMeeting(params.id).then(setMeeting).catch(() => setError("Couldn't load this meeting."));
  }, [params.id]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!meeting) {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-shimmer rounded-md" />)}
      </div>
    );
  }
  return <MeetingDetail meeting={meeting} onMeetingChange={setMeeting} returnTo={returnTo} />;
}

export default function MeetingDetailPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
