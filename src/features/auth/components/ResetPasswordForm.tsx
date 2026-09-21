"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authService } from "@/features/auth/services/authService";
import Spinner from "@/shared/components/Spinner";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!token) {
    return (
      <div className="w-full max-w-sm animate-fade-in-up">
        <h1 className="font-serif text-3xl text-fg">Invalid link</h1>
        <p className="mt-3 animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          This password reset link is missing its token. Request a new one below.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm font-medium text-slate hover:text-fg"
        >
          ← Request a new link
        </Link>
      </div>
    );
  }

  function validate(): string | null {
    if (newPassword.length < 8) return "Password must be at least 8 characters.";
    if (newPassword !== confirmPassword) return "Passwords don't match.";
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const detail = await authService.resetPassword(token as string, newPassword);
      setSuccessMessage(detail);
      window.setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(resolveErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <div className="w-full max-w-sm animate-fade-in-up">
        <h1 className="font-serif text-3xl text-fg">Password reset</h1>
        <p className="mt-3 rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
          {successMessage}
        </p>
        <p className="mt-4 text-sm text-ink-soft">Taking you to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm animate-fade-in-up">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-fg">Set a new password</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Choose a new password for your account.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {error}
        </div>
      )}

      <label className="mb-4 block">
        <span className="mb-1.5 block text-sm font-medium text-fg">New password</span>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            autoFocus
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-md border border-line bg-surface px-3 py-2.5 pr-16 text-sm text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate hover:text-fg"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </label>

      <label className="mb-6 block">
        <span className="mb-1.5 block text-sm font-medium text-fg">Confirm password</span>
        <input
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-ink py-2.5 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting && <Spinner size="sm" className="border-white/30 border-t-white" />}
        {isSubmitting ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}

function resolveErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const response = (err as { response?: { status?: number; data?: { detail?: string } } })
      .response;
    if (response?.status === 400 || response?.status === 404) {
      return response.data?.detail ?? "This reset link is invalid or has expired.";
    }
    if (response?.status && response.status >= 500) {
      return "The server ran into a problem. Try again shortly.";
    }
  }
  return "Couldn't reach the server. Check your connection and try again.";
}
