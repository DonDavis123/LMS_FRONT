"use client";

import { useEffect, useState } from "react";
import PlatformOverview from "@/features/platform/components/PlatformOverview";
import { platformService } from "@/features/platform/services/platformService";
import type { PlatformOverview as PlatformOverviewData } from "@/features/platform/types/platform.types";
import { extractApiError } from "@/shared/utils/apiError";

export default function PlatformHomePage() {
  const [overview, setOverview] = useState<PlatformOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    platformService
      .getOverview()
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(extractApiError(err, "Couldn't load the platform overview."));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <PlatformOverview
      overview={overview}
      isLoading={isLoading}
      error={error}
      onRetry={() => setRefreshKey((value) => value + 1)}
    />
  );
}
