export function confirmDelete(message: string): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4";

    const dialog = document.createElement("div");
    dialog.className = "w-full max-w-sm rounded-xl border border-line bg-surface p-5 shadow-2xl";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const title = document.createElement("h2");
    title.className = "text-base font-semibold text-fg";
    title.textContent = "Confirm to delete";

    const text = document.createElement("p");
    text.className = "mt-2 text-sm text-ink-soft";
    text.textContent = message;

    const actions = document.createElement("div");
    actions.className = "mt-5 flex justify-end gap-2";

    const no = document.createElement("button");
    no.type = "button";
    no.className = "rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-paper";
    no.textContent = "No";

    const yes = document.createElement("button");
    yes.type = "button";
    yes.className = "rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90";
    yes.textContent = "Yes";

    const finish = (result: boolean) => {
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
      resolve(result);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
    };

    no.addEventListener("click", () => finish(false));
    yes.addEventListener("click", () => finish(true));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) finish(false);
    });
    document.addEventListener("keydown", onKeyDown);

    actions.append(no, yes);
    dialog.append(title, text, actions);
    overlay.append(dialog);
    document.body.append(overlay);
    yes.focus();
  });
}
