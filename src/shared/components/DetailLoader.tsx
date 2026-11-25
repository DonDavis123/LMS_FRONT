"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Hands a detail page from its skeleton to its real content without a hard
 * swap. While `ready` is false only the skeleton shows. When it flips, the
 * content mounts (and plays its entrance cascade) while the skeleton stays on
 * top for a moment and fades out, so there is never a blank frame in between.
 *
 *   <DetailLoader ready={!!lead} skeleton={<DetailSkeleton summary pipeline />}>
 *     {lead && <LeadDetail lead={lead} />}
 *   </DetailLoader>
 */
const EXIT_MS = 340;

export default function DetailLoader({
  ready,
  skeleton,
  children,
}: {
  ready: boolean;
  skeleton: ReactNode;
  children: ReactNode;
}) {
  const [skeletonVisible, setSkeletonVisible] = useState(!ready);

  useEffect(() => {
    if (!ready) {
      setSkeletonVisible(true);
      return;
    }
    const timer = window.setTimeout(() => setSkeletonVisible(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);

  return (
    <div className="relative">
      {ready && children}
      {skeletonVisible && (
        <div className={ready ? "lp-skel-exit absolute inset-x-0 top-0 z-10" : ""} aria-hidden={ready || undefined}>
          {skeleton}
        </div>
      )}
    </div>
  );
}
