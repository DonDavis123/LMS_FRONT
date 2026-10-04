"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/features/auth/services/authService";
import { isSuperAdmin, type AuthUser } from "@/features/auth/types/auth.types";

interface RequireSuperAdminState {
  /** The signed-in user once resolved; `null` while checking or if there is none. */
  user: AuthUser | null;
  /** `true` only after the session resolved to a superadmin. */
  isAllowed: boolean;
}

/**
 * Route guard for superadmin-only pages. Resolves the session through
 * `authService.restoreSession()` (cached user first, then a lookup), and
 * redirects anyone who isn't a superadmin to /dashboard. Pages should render
 * nothing and skip their data fetch until `isAllowed` is true.
 *
 * This is a UX guard only — the backend enforces the real permission.
 */
export function useRequireSuperAdmin(): RequireSuperAdminState {
  const router = useRouter();
  const [state, setState] = useState<RequireSuperAdminState>({ user: null, isAllowed: false });

  useEffect(() => {
    let cancelled = false;

    authService.restoreSession().then((user) => {
      if (cancelled) return;
      if (isSuperAdmin(user)) {
        setState({ user, isAllowed: true });
      } else {
        router.replace("/dashboard");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return state;
}
