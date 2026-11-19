import type { Ref } from "react";
import { AlertCircle } from "lucide-react";

interface FormErrorMessageProps {
  /** One message, or several separated by "\n" (what `useFormError` stores). */
  message: string;
  errorRef?: Ref<HTMLElement>;
  className?: string;
}

/**
 * The red banner at the top of a form. A single message looks exactly like
 * before; several messages are listed one per line so none is hidden.
 */
export default function FormErrorMessage({ message, errorRef, className = "mt-4" }: FormErrorMessageProps) {
  const messages = message.split("\n").filter(Boolean);
  const classes = `${className} animate-shake rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-3 text-sm font-medium text-danger`;

  if (messages.length <= 1) {
    return (
      <p ref={errorRef as Ref<HTMLParagraphElement>} role="alert" className={`${classes} flex items-start gap-2.5`}>
        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{messages[0] ?? message}</span>
      </p>
    );
  }

  return (
    <div ref={errorRef as Ref<HTMLDivElement>} role="alert" className={`${classes} flex items-start gap-2.5`}>
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="mb-1 font-semibold">Please fix the following:</p>
        <ul className="list-disc space-y-1 pl-4 font-normal">
          {messages.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
