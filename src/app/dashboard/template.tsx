/**
 * Next.js re-mounts `template.tsx` on every navigation (unlike layout.tsx,
 * which persists). That gives every Home/Leads/Contacts/Accounts page a
 * subtle fade-in on entry with zero extra dependencies or client-side
 * routing logic.
 *
 * IMPORTANT: this must stay opacity-only (`animate-fade-in`), never a
 * transform-based animation like `animate-fade-in-up`. A `transform`
 * left on this wrapper (even a finished animation's "both" fill-mode
 * value) makes it the containing block for every `position: fixed`
 * descendant on the page — which silently traps dropdowns, filter
 * panels, and menus inside this div's box instead of the real viewport,
 * clipping them. (This has regressed once before — if you're re-adding
 * a page-transition animation here, keep it transform-free.)
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
