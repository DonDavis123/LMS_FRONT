/**
 * Shared tab switch for record-detail pages (Lead / Contact / Account /
 * Task / Meeting).
 *
 * Renders as a pill-shaped segmented switch — a highlighted thumb slides
 * behind the active option — so every record-detail screen has the same
 * Overview / Timeline control. Options share one width so the thumb can
 * glide with a plain CSS transform.
 */
export interface TabItem<T extends string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (value: T) => void;
}

export function Tabs<T extends string>({ tabs, active, onChange }: TabsProps<T>) {
  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.value === active),
  );

  return (
    <div className="mt-6">
      <div
        role="tablist"
        className="relative inline-grid grid-flow-col auto-cols-fr rounded-full border border-line bg-surface p-1"
      >
        {/* Sliding thumb: one option wide, moved by whole-width steps. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-full border border-slate bg-slate-light transition-transform duration-300 ease-out"
          style={{
            width: `calc((100% - 0.5rem) / ${tabs.length})`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        {tabs.map((tab) => {
          const isActive = tab.value === active;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.value)}
              className={`relative z-10 rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
                isActive ? "text-fg" : "text-ink-soft hover:text-fg"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
