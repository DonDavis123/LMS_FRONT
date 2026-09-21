# Agent notes

- Stack: Next.js (App Router) + TypeScript + Tailwind v4 + axios + lucide-react.
  No TanStack Query, no form libraries — data fetching is plain
  `useEffect`/`useState` inside page components.
- Feature-first structure: business logic lives under `src/features/<name>/`
  (`components/`, `services/`, `types/`). Routing lives only under `src/app/`.
- All real HTTP calls go through `src/infrastructure/api/client.ts`. Never
  call `axios`/`fetch` directly from a component.
- `ContactService`, `AccountService`, and `teamspaceService` are
  **localStorage-backed mocks** (no backend endpoints exist yet) but expose
  the same async method shape a real API-backed service would. When the
  backend adds `/api/contacts/`, `/api/accounts/`, `/api/teamspaces/`,
  rewrite the inside of those three files only.
- **Activities (Tasks/Meetings/Calls)**, added under `features/tasks`,
  `features/meetings`, `features/calls`, follow the Zoho pattern of a
  quick-create **modal** (`shared/components/Modal.tsx`) rather than a
  full-page form — `app/dashboard/{tasks,meetings,calls}/page.tsx` render
  a list + that modal, no separate `/new` or `/[id]` routes.
  - **Tasks are real-backend**: confirmed endpoints are `GET/POST /tasks/`
    and `GET/PATCH/DELETE /tasks/{id}/` (`TaskService.ts`). `subject` and
    `owner_id` are the only required fields; `priority` defaults to
    `"Normal"`, `status` defaults to `"Not Started"` — see
    `task.types.ts` for the exact enum values mirrored from the backend.
  - **Meetings and Calls are localStorage mocks** (`MeetingService.ts`,
    `CallService.ts`) — no backend endpoint was given for either, so they
    follow the same "expose the same async shape a real API would" rule
    as Contacts/Accounts above. When real `/meetings/` and `/calls/`
    endpoints exist, only the insides of those two files should change.
  - All three share `shared/components/RelatedToPicker.tsx` for the
    single "pick one of lead/contact/account" association field.
- Tokens live in `authStorage`. Don't read `localStorage` directly for auth
  state elsewhere.
- Role checks always go through `isSuperAdmin()`/`isAdmin()`
  (`features/auth/types/auth.types.ts`) — never compare `user.role`
  directly, since the backend's casing isn't guaranteed.
- Any page that reads `useSearchParams()` must export a thin wrapper that
  renders the real component inside `<Suspense>` (see
  `src/app/dashboard/leads/page.tsx` for the pattern) — Next.js requires
  this at build time.
- Tailwind theme tokens (colors, fonts) are defined once in
  `src/app/globals.css` via `@theme`. Reuse `bg-ink`, `text-ink-soft`,
  `bg-amber`, etc.
- **Dark mode**: class-based via a `.dark` class on `<html>`
  (`@custom-variant dark` in `globals.css`), toggled by
  `src/shared/components/ThemeToggle.tsx` and persisted to
  `localStorage["crm.theme"]`. A pre-hydration script in `app/layout.tsx`
  applies the stored theme before paint to avoid a flash.
  **Two different token families exist on purpose — don't mix them up:**
  - `bg-ink` / `hover:bg-ink-2` / `border-ink` — the constant brand navy,
    used for solid button backgrounds and "active" states. Same value in
    both themes.
  - `text-fg` — the theme-aware body/heading text color (navy in light
    mode, near-white in dark mode). Use this for any plain text, **not**
    `text-ink`, which no longer exists as a class.
  - `bg-surface` — theme-aware card/input background (white in light
    mode, dark slate in dark mode). Use this instead of `bg-white`, which
    would stay white in dark mode and look wrong.
  - `bg-paper` / `border-line` / `text-ink-soft` — already theme-aware,
    unchanged names.
- The Lead Owner / Contact Owner / Account Owner picker is the shared
  `src/shared/components/OwnerPicker.tsx` — don't fork a new copy per form.
- `LeadForm` supports an optional `onSaveAndNext` prop rendering a "Save
  and Next" button left of "Save". On create it re-empties the form in
  place (Zoho's "Save and New"); on edit, the parent page
  (`leads/[id]/edit/page.tsx`) fetches the lead list and navigates to the
  next record's edit page.
- `LeadService.deleteLead()` returns the backend's own confirmation
  string (falls back to a default only if the response has no body) —
  always surface that returned string in the toast, don't hardcode it.
