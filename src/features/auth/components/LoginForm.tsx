"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/features/auth/services/authService";
import Spinner from "@/shared/components/Spinner";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): string | null {
    if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
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
      await authService.login({ email, password });
      if (rememberMe) {
        window.localStorage.setItem("crm.last_email", email);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(resolveErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm animate-fade-in-up">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-fg">Welcome back</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Sign in to keep your pipeline moving.
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
        <span className="mb-1.5 block text-sm font-medium text-fg">Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-fg outline-none transition focus:border-slate focus:ring-2 focus:ring-slate-light"
        />
      </label>

      <label className="mb-2 block">
        <span className="mb-1.5 block text-sm font-medium text-fg">Password</span>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

      <div className="mb-6 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-ink"
          />
          Remember me
        </label>
        <a href="/forgot-password" className="text-sm font-medium text-slate hover:text-fg">
          Forgot password?
        </a>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-ink py-2.5 text-sm font-semibold text-white transition hover:bg-ink-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting && <Spinner size="sm" className="border-white/30 border-t-white" />}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

function resolveErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const response = (err as { response?: { status?: number; data?: { detail?: string } } })
      .response;
    if (response?.status === 401 || response?.status === 400) {
      return response.data?.detail ?? "Incorrect email or password.";
    }
    if (response?.status && response.status >= 500) {
      return "The server ran into a problem. Try again shortly.";
    }
  }
  return "Couldn't reach the server. Check your connection and try again.";
}
