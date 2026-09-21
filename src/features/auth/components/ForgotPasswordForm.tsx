"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authService } from "@/features/auth/services/authService";
import Spinner from "@/shared/components/Spinner";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!EMAIL_PATTERN.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const detail = await authService.forgotPassword(email);
      setSuccessMessage(detail);
    } catch (err) {
      setError(resolveErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <div className="w-full max-w-sm animate-fade-in-up">
        <h1 className="font-serif text-3xl text-fg">Check your email</h1>
        <p className="mt-3 rounded-md border border-success/30 bg-success-soft px-3 py-2 text-sm text-success">
          {successMessage}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-slate hover:text-fg"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm animate-fade-in-up">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-fg">Forgot password?</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Enter the email on your account and we&apos;ll send you a link to reset it.
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

      <label className="mb-6 block">
        <span className="mb-1.5 block text-sm font-medium text-fg">Email</span>
        <input
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-ink py-2.5 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting && <Spinner size="sm" className="border-white/30 border-t-white" />}
        {isSubmitting ? "Sending…" : "Send reset link"}
      </button>

      <Link
        href="/login"
        className="mt-4 block text-center text-sm font-medium text-slate hover:text-fg"
      >
        ← Back to sign in
      </Link>
    </form>
  );
}

function resolveErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const response = (err as { response?: { status?: number; data?: { detail?: string } } })
      .response;
    if (response?.status && response.status >= 500) {
      return "The server ran into a problem. Try again shortly.";
    }
    if (response?.data?.detail) {
      return response.data.detail;
    }
  }
  return "Couldn't reach the server. Check your connection and try again.";
}
