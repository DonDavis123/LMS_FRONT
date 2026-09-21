/**
 * Shared tab bar for record-detail pages (Lead / Contact / Account, ...).
 *
 * Previously each detail page implemented its own tab bar, and they'd
 * drifted apart visually — Contact/Account used an underline style while
 * Lead used a filled pill style. This standardizes on the underline style
 * (matches the reference CRM's tab pattern) so every record-detail screen
 * feels like the same product.
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
  return (
    <div className="mt-6 border-b border-line">
      <div className="flex gap-6" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.value === active;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.value)}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
                isActive
                  ? "border-slate text-fg"
                  : "border-transparent text-ink-soft hover:text-fg"
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
