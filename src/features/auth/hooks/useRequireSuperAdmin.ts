"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/features/auth/services/authService";
import { authStorage } from "@/infrastructure/auth/tokenStorage";
import { isSuperAdmin, type AuthUser } from "@/features/auth/types/auth.types";

interface RequireSuperAdminState {
  /** The signed-in user once resolved; `null` while checking or if there is none. */
  user: AuthUser | null;
  /** `true` only after the session resolved to a superadmin. */
  isAllowed: boolean;
}

/**
 * Route guard for superadmin-only pages. Resolves the session through
 * `authService.restoreSession()` (cached user first, then a lookup) so the
 * page can render immediately, then re-checks the role against
 * GET /users/me/ — the backend reads the role from the database on every
 * request, so a cached "SUPERADMIN" can be stale after a demotion or block.
 * Anyone who isn't a superadmin is redirected to /dashboard. Pages should
 * render nothing and skip their data fetch until `isAllowed` is true.
 *
 * This is a UX guard only — the backend enforces the real permission.
 */
export function useRequireSuperAdmin(): RequireSuperAdminState {
  const router = useRouter();
  const [state, setState] = useState<RequireSuperAdminState>({ user: null, isAllowed: false });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const cached = await authService.restoreSession();
      if (cancelled) return;

      if (!isSuperAdmin(cached)) {
        router.replace("/dashboard");
        return;
      }
      setState({ user: cached, isAllowed: true });

      // Revalidate against the server. A failed lookup (`null`) keeps the
      // cached answer; the API itself will still reject forbidden calls.
      const fresh = await authService.fetchCurrentUser();
      if (cancelled || !fresh) return;

      authStorage.setUser(fresh);
      if (!isSuperAdmin(fresh)) {
        setState({ user: null, isAllowed: false });
        router.replace("/dashboard");
      } else {
        setState({ user: fresh, isAllowed: true });
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return state;
}
