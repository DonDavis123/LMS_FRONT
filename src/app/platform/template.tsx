/**
 * Re-mounts on every navigation inside `/platform` for a subtle fade-in.
 *
 * IMPORTANT: keep this opacity-only (`animate-fade-in`), never a transform
 * animation — a transform on this wrapper becomes the containing block for
 * every `position: fixed` descendant and traps dropdowns and menus inside it
 * (see the note in `app/dashboard/template.tsx`).
 */
export default function PlatformTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
