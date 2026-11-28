# Mobile UI update (phones < 768px)

Laptops and tablets (>= 768px) look and behave exactly as before.
All animations are unchanged (row/cell entrances, fades, menus, theme switch).

## New files
- `src/app/mobile.css` – the whole phone layer (imported after globals.css)
- `src/features/dashboard/components/MobileBottomNav.tsx` – Home / Leads / Contacts / Deals / Menu tab bar
- `src/shared/components/MobileTableLabels.tsx` – tags table cells so rows can render as cards

## What changed on phones
- Lists (Leads, Contacts, Companies, Deals, Tasks, Meetings, Calls, Users, Platform tables):
  table rows → cards (name as title, ⋮ menu top-right, labelled fields, full-width Call Log button);
  column headings → horizontally scrollable "Sort" chips; whole page scrolls (no tiny inner scroll box).
- List header: title, full-width 46px search, Add filter, Import/Export as two equal buttons;
  "Create …" is a floating button above the tab bar.
- Date range: From/To side by side, quick ranges scroll sideways.
- Pagination: count + page on one line, page-size select and 44px prev/next below.
- Top bar: brand mark, 40px tap targets. Bottom tab bar with safe-area support.
- Modals become bottom sheets with a grab handle. Form buttons are full-width, 44px tall.
- Inputs are 16px so iOS Safari no longer zooms in on focus.
- `viewport-fit=cover` + theme-color added in `app/layout.tsx`.

## Small edits to existing files
Hook classes (`lp-head-*`, `lp-bulk`, `lp-modal-*`, `lp-date-strip`) and responsive Tailwind variants in:
`*List.tsx` headers, `DateRangeFilter`, `ServerPagination`, `BulkDeleteBar`, `Modal`, `FormLayout`,
`DashboardHeader`, `DashboardHero`, `dashboard/layout.tsx`, `platform/layout.tsx`, `app/layout.tsx`.
