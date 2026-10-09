import type { CSSProperties } from "react";
import { Bell, CalendarCheck, Users, type LucideIcon } from "lucide-react";
import BrandMark from "@/features/auth/components/BrandMark";
import LoginIllustration from "@/features/auth/components/LoginIllustration";

interface Highlight {
  icon: LucideIcon;
  text: string;
}

const HIGHLIGHTS: Highlight[] = [
  { icon: Users, text: "Every lead has an owner" },
  { icon: CalendarCheck, text: "Calls, meetings and tasks on one record" },
  { icon: Bell, text: "Reminders before a follow-up slips" },
];

const stagger = (i: number): CSSProperties => ({ ["--i" as string]: i });

interface LoginShowcaseProps {
  /**
   * Drop the pipeline graphic and highlight list, keeping the brand,
   * headline and one-line pitch. For single-task screens such as forgot and
   * reset password.
   */
  compact?: boolean;
}

/** Brand panel shown beside the auth forms on large screens. */
export default function LoginShowcase({ compact = false }: LoginShowcaseProps) {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-12 text-fg lg:col-span-2 lg:flex xl:p-14 dark:border-transparent dark:bg-ink">
      <div className="lp-login-rise" style={stagger(0)}>
        <BrandMark textClassName="text-fg" />
      </div>

      <div>
        <h2
          className="lp-login-rise max-w-md font-serif text-4xl leading-[1.12] tracking-tight xl:text-5xl"
          style={stagger(1)}
        >
          Know where every lead stands.
        </h2>
        <p
          className="lp-login-rise mt-5 max-w-sm text-[15px] leading-relaxed text-ink-soft"
          style={stagger(2)}
        >
          Follow each lead from first contact to conversion, with its owner,
          activities and reminders together.
        </p>

        {!compact && (
          <>
            <LoginIllustration className="mt-8" />

            <ul className="lp-ill-hide-short mt-8 space-y-3.5">
              {HIGHLIGHTS.map(({ icon: Icon, text }, i) => (
                <li
                  key={text}
                  className="lp-login-rise flex items-center gap-3 text-sm text-fg/80"
                  style={stagger(i + 3)}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-fg/[0.06] text-amber-dark dark:text-amber">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <p className="text-xs text-ink-soft/80">
        © {new Date().getFullYear()} LeadPulse CRM
      </p>
    </aside>
  );
}
