import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BrandMark from "@/features/auth/components/BrandMark";
import LegalLinks from "@/features/legal/components/LegalLinks";
import ThemeToggle from "@/shared/components/ThemeToggle";
// BrandMark's bar animation lives in login.css.
import "@/features/auth/styles/login.css";

interface LegalPageShellProps {
  title: string;
  updated: string;
  intro: string;
  children: ReactNode;
}

/**
 * Frame for the public legal pages (/privacy, /terms).
 *
 * Needs no login and makes no API calls, so Google's reviewers and signed-out
 * visitors can read it. Uses the same tokens as the auth screens.
 */
export default function LegalPageShell({ title, updated, intro, children }: LegalPageShellProps) {
  return (
    <div className="lp-page-bg min-h-dvh bg-paper text-fg">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 pt-8 sm:px-10">
        <Link
          href="/login"
          aria-label="LeadPulse home"
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber"
        >
          <BrandMark />
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 pb-16 pt-10 sm:px-10">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate transition hover:text-fg"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to sign in
        </Link>

        <h1 className="font-serif text-4xl tracking-tight text-fg sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-ink-soft">Last updated {updated}</p>
        <p className="mt-6 text-[15px] leading-relaxed text-ink-soft">{intro}</p>

        <div className="mt-10 space-y-10">{children}</div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-ink-soft sm:flex-row sm:px-10">
          <p>© {new Date().getFullYear()} LeadPulse CRM</p>
          <LegalLinks />
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-8">
      <h2 id={`${id}-title`} className="font-serif text-2xl tracking-tight text-fg">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-soft [&_a]:font-medium [&_a]:text-fg [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-fg [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
