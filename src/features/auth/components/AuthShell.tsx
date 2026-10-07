import type { ReactNode } from "react";
import BrandMark from "@/features/auth/components/BrandMark";
import LoginShowcase from "@/features/auth/components/LoginShowcase";
import ThemeToggle from "@/shared/components/ThemeToggle";
// Imported here (not only in LoginForm) so /forgot-password and
// /reset-password get the auth styles and motion tokens as well — Next.js
// only ships a route the CSS its own modules import.
import "@/features/auth/styles/login.css";

interface AuthShellProps {
  /** The page's form: LoginForm, ForgotPasswordForm or ResetPasswordForm. */
  children: ReactNode;
  /**
   * Use a shorter brand panel (no pipeline graphic or highlights) for the
   * single-purpose screens — forgot and reset password — where the form is
   * the whole task. The sign-in screen keeps the full panel.
   */
  compactPanel?: boolean;
}

/**
 * Shared frame for the signed-out screens.
 *
 * ≥ lg: brand panel (2 of 5 columns) beside the form column (3 of 5).
 * < lg: the panel is hidden and the form fills the screen.
 *
 * `.lp-login-root` (login.css) provides the grid and the motion/focus tokens
 * that the entrance animations and focus colours inside the forms read.
 */
export default function AuthShell({ children, compactPanel = false }: AuthShellProps) {
  return (
    <div className="lp-login-root bg-paper text-fg">
      <LoginShowcase compact={compactPanel} />

      <main className="relative flex min-w-0 items-center justify-center px-6 py-16 sm:px-10 lg:col-span-3">
        <div className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-10">
          <ThemeToggle />
        </div>

        <div className="flex w-full flex-col items-center">
          {/* The panel is hidden below lg, so the mark moves above the form.
              LoginForm renders its own copy of this, so only the compact
              screens add it here. */}
          {compactPanel && (
            <div className="mb-10 w-full max-w-sm lg:hidden">
              <BrandMark />
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
