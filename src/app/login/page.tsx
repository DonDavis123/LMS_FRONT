import LoginForm from "@/features/auth/components/LoginForm";
import LoginShowcase from "@/features/auth/components/LoginShowcase";
import ThemeToggle from "@/shared/components/ThemeToggle";

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen grid-cols-1 lg:grid-cols-5">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <LoginShowcase />

      <div className="lp-page-bg flex items-center justify-center px-6 py-12 sm:px-8 lg:col-span-3">
        <LoginForm />
      </div>
    </main>
  );
}
