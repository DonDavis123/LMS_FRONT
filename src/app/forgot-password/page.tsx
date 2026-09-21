import ForgotPasswordForm from "@/features/auth/components/ForgotPasswordForm";
import ThemeToggle from "@/shared/components/ThemeToggle";

export default function ForgotPasswordPage() {
  return (
    <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-5">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative hidden flex-col justify-between bg-ink p-12 text-white lg:col-span-2 lg:flex">
        <span className="font-serif text-xl tracking-tight">LeadPulse</span>

        <div>
          <p className="font-serif text-4xl leading-tight italic text-white animate-fade-in-up">
            “Pipeline visibility changed how fast our team closes.”
          </p>
          <p className="mt-6 text-sm text-white/60">
            Every lead, owner, and stage — in one place your whole team trusts.
          </p>
        </div>

        <p className="text-xs text-white/40">© {new Date().getFullYear()} LeadPulse CRM</p>
      </div>

      <div className="flex items-center justify-center p-8 lg:col-span-3">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
