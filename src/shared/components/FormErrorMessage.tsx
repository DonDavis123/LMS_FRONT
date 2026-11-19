import type { Ref } from "react";

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
  const classes = `${className} animate-shake rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger`;

  if (messages.length <= 1) {
    return (
      <p ref={errorRef as Ref<HTMLParagraphElement>} role="alert" className={classes}>
        {messages[0] ?? message}
      </p>
    );
  }

  return (
    <div ref={errorRef as Ref<HTMLDivElement>} role="alert" className={classes}>
      <ul className="list-disc space-y-1 pl-5">
        {messages.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </div>
  );
}
