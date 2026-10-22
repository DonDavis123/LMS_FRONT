"use client";

import LeadFormManager from "@/features/leadCapture/components/LeadFormManager";
import { useRequireSuperAdmin } from "@/features/auth/hooks/useRequireSuperAdmin";

export default function LeadFormPage() {
  // Superadmin-only: anyone else is redirected to /dashboard. The backend
  // enforces the same rule on every request.
  const { isAllowed } = useRequireSuperAdmin();

  if (!isAllowed) return null;

  return <LeadFormManager />;
}
