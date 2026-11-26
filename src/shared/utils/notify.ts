/**
 * Non-blocking error toast, replacing `window.alert`.
 *
 * Same imperative approach as `confirmDelete`: no provider or context, so it
 * can be called from any handler. Toasts stack bottom-right, are announced to
 * screen readers (`role="alert"`), dismiss on their own and can be closed with
 * the button.
 */
const REGION_ID = "lp-toast-region";
const AUTO_DISMISS_MS = 6000;

function getRegion(): HTMLElement {
  let region = document.getElementById(REGION_ID);
  if (!region) {
    region = document.createElement("div");
    region.id = REGION_ID;
    region.className =
      "pointer-events-none fixed bottom-4 right-4 z-[1100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2";
    document.body.append(region);
  }
  return region;
}

export function notifyError(message: string): void {
  if (typeof document === "undefined") return;

  const toast = document.createElement("div");
  toast.setAttribute("role", "alert");
  toast.className =
    "pointer-events-auto flex items-start gap-3 rounded-lg border border-line border-l-4 border-l-danger bg-surface px-4 py-3 text-sm text-fg shadow-xl";

  const text = document.createElement("p");
  text.className = "min-w-0 flex-1";
  text.textContent = message;

  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss notification");
  close.className = "shrink-0 rounded px-1 text-ink-soft hover:text-fg";
  close.textContent = "×";

  let timer = 0;
  const dismiss = () => {
    window.clearTimeout(timer);
    toast.remove();
  };
  close.addEventListener("click", dismiss);
  timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);

  toast.append(text, close);
  getRegion().append(toast);
}
