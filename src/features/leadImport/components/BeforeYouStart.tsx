import { Lightbulb } from "lucide-react";

const TIPS = [
  "Put the column names in one header row at the top of the file.",
  "Use one lead per row. Columns can be in any order.",
  "The owner and “Converted (Yes/No)” columns are optional.",
  "Duplicates are checked in a later step, so you can fix them before anything is added.",
];

export default function BeforeYouStart() {
  return (
    <aside className="rounded-lg border border-line bg-surface p-4" aria-labelledby="import-tips-title">
      <h3 id="import-tips-title" className="flex items-center gap-2 text-sm font-semibold text-fg">
        <Lightbulb size={15} className="text-amber-dark" aria-hidden="true" />
        Before you start
      </h3>
      <ul className="mt-3 space-y-2 text-sm text-ink-soft">
        {TIPS.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
