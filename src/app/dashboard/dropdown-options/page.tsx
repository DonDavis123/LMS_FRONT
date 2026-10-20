"use client";

import PicklistManager from "@/features/picklists/components/PicklistManager";
import { useRequireSuperAdmin } from "@/features/auth/hooks/useRequireSuperAdmin";

export default function DropdownOptionsPage() {
  // Superadmin-only: anyone else is redirected to /dashboard. The backend
  // enforces the same rule on every write.
  const { isAllowed } = useRequireSuperAdmin();

  if (!isAllowed) return null;

  return <PicklistManager />;
}
