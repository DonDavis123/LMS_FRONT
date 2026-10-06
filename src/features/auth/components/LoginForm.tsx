"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  Lock,
  Mail,
  TriangleAlert,
} from "lucide-react";
import AuthField from "@/features/auth/components/AuthField";
import BrandMark from "@/features/auth/components/BrandMark";
import { authService } from "@/features/auth/services/authService";
import Spinner from "@/shared/components/Spinner";
import { extractApiError } from "@/shared/utils/apiError";
import "@/features/auth/styles/login.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "submitting" | "success";
type FieldName = "email" | "password";
interface FormError {
  message: string;
  /** Which input to highlight and focus; absent for server-side errors. */
  field?: FieldName;
}

const stagger = (i: number): CSSProperties => ({ ["--i" as string]: i });

export default function LoginForm() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState<FormError | null>(null);
  // Bumped on every failed attempt so the alert re-mounts and shakes again.
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>("idle");

  const isBusy = status !== "idle";

  function validate(): FormError | null {
    if (!EMAIL_PATTERN.test(email)) {
      return { message: "Enter a valid email address.", field: "email" };
    }
    if (password.length < 6) {
      return { message: "Password must be at least 6 characters.", field: "password" };
    }
    return null;
  }

  function fail(next: FormError) {
    setError(next);
    setAttempt((n) => n + 1);
    if (next.field === "email") emailRef.current?.focus();
    if (next.field === "password") passwordRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isBusy) return;

    const validationError = validate();
    if (validationError) {
      fail(validationError);
      return;
    }

    setError(null);
    setStatus("submitting");
    try {
      await authService.login({ email, password });
      if (rememberMe) {
        window.localStorage.setItem("crm.last_email", email);
      }
      // Stay in "success" (button locked) while the router takes over.
      setStatus("success");
      router.push("/dashboard");
    } catch (err) {
      setStatus("idle");
      fail({ message: resolveErrorMessage(err) });
    }
  }

  function handlePasswordKey(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLockOn(event.getModifierState("CapsLock"));
  }

  return (
    <div className="w-full max-w-sm">
      {/* The brand panel is hidden below lg, so the mark moves here. */}
      <div className="lp-login-field-in mb-10 lg:hidden" style={stagger(0)}>
        <BrandMark />
      </div>

      <div className="lp-login-field-in mb-8" style={stagger(0)}>
        <h1 className="font-serif text-4xl tracking-tight text-fg">Welcome back</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
          Sign in to keep your pipeline moving.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <div
            key={attempt}
            role="alert"
            className="mb-5 flex animate-shake items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm text-danger"
          >
            <CircleAlert size={17} className="mt-px shrink-0" aria-hidden="true" />
            <span>{error.message}</span>
          </div>
        )}

        <AuthField
          ref={emailRef}
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          invalid={error?.field === "email"}
          disabled={isBusy}
          wrapperClassName="lp-login-field-in mb-4"
          wrapperStyle={stagger(1)}
        />

        <AuthField
          ref={passwordRef}
          label="Password"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handlePasswordKey}
          onKeyUp={handlePasswordKey}
          onBlur={() => setCapsLockOn(false)}
          placeholder="Enter your password"
          invalid={error?.field === "password"}
          disabled={isBusy}
          wrapperClassName="lp-login-field-in"
          wrapperStyle={stagger(2)}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition hover:bg-paper hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber active:scale-90"
            >
              {showPassword ? (
                <EyeOff size={17} aria-hidden="true" />
              ) : (
                <Eye size={17} aria-hidden="true" />
              )}
            </button>
          }
        />

        {capsLockOn && (
          <p
            role="status"
            className="animate-fade-in-up mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-dark dark:text-amber"
          >
            <TriangleAlert size={13} aria-hidden="true" />
            Caps Lock is on.
          </p>
        )}

        <div
          className="lp-login-field-in mb-7 mt-5 flex items-center justify-between"
          style={stagger(3)}
        >
          <label className="group flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="flex h-[18px] w-[18px] items-center justify-center rounded-md border border-line bg-surface text-transparent transition peer-checked:border-ink peer-checked:bg-ink peer-checked:text-amber peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber group-hover:border-slate"
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
                <path
                  d="M3.5 8.5l3 3 6-7"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="rounded text-sm font-medium text-slate transition hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isBusy}
          style={stagger(4)}
          className="lp-login-field-in lp-login-submit relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-ink py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(18,33,58,0.55)] transition hover:bg-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-90"
        >
          {status === "submitting" && (
            <Spinner size="sm" className="border-white/30 border-t-white" />
          )}
          {status === "success" && (
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-amber" fill="none" aria-hidden="true">
              <path
                className="lp-login-check"
                d="M4 10.5l4 4 8-9"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {status === "idle" && "Sign in"}
          {status === "submitting" && "Signing in…"}
          {status === "success" && "Signed in"}
          {status === "idle" && (
            <ArrowRight
              size={16}
              className="lp-login-submit-arrow"
              aria-hidden="true"
            />
          )}
        </button>
      </form>

      <p
        className="lp-login-field-in mt-8 text-center text-xs leading-relaxed text-ink-soft"
        style={stagger(5)}
      >
        Need an account? Ask your workspace admin to add you.
      </p>
    </div>
  );
}

function resolveErrorMessage(err: unknown): string {
  const status = (err as { response?: { status?: number } } | null)?.response?.status;

  // 400 field errors, 401 wrong credentials, 403 blocked/deleted account: the
  // backend's own message is the accurate one (e.g. "User account is inactive.").
  if (status === 400 || status === 401 || status === 403) {
    return extractApiError(err, "Incorrect email or password.");
  }
  if (typeof status === "number" && status >= 500) {
    return "The server ran into a problem. Try again shortly.";
  }
  return "Couldn't reach the server. Check your connection and try again.";
}
