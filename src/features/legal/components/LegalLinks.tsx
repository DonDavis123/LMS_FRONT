import Link from "next/link";
import { LEGAL } from "@/features/legal/config/legal.config";

/**
 * "Privacy Policy · Terms of Service" links. Shown on every signed-out screen
 * (including the login page, which is the app home page given to Google) and
 * on the legal pages themselves.
 */
export default function LegalLinks({ className = "" }: { className?: string }) {
  const link =
    "rounded font-medium underline-offset-4 transition hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber";
  return (
    <nav aria-label="Legal" className={`flex items-center gap-4 text-xs text-ink-soft ${className}`}>
      <Link href={LEGAL.privacyPath} className={link}>
        Privacy Policy
      </Link>
      <Link href={LEGAL.termsPath} className={link}>
        Terms of Service
      </Link>
    </nav>
  );
}
