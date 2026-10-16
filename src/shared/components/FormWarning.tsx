import { AlertTriangle } from "lucide-react";

/** Amber inline warning shown above a form's fields (e.g. "no changes to update"). */
export default function FormWarning({ message, className = "mt-4" }: { message: string; className?: string }) {
  return (
    <p
      role="status"
      className={`${className} flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300`}
    >
      <AlertTriangle size={16} className="shrink-0" />
      {message}
    </p>
  );
}
