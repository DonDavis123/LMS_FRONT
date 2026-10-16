"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/features/auth/services/authService";
import { getHomePath } from "@/features/auth/types/auth.types";
import LoadingScreen from "@/shared/components/LoadingScreen";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    authService.restoreSession().then((user) => {
      if (cancelled) return;
      router.replace(user ? getHomePath(user) : "/login");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return <LoadingScreen label="Loading LeadPulse CRM…" />;
}
