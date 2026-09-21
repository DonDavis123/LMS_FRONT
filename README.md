# LeadPulse CRM — Frontend

A Zoho-CRM-style lead management frontend built with Next.js (App Router),
TypeScript, and Tailwind CSS v4, talking to the Django + DRF backend
described in the project's backend handoff doc.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (theme tokens in `src/app/globals.css`)
- axios, with a request/response interceptor that attaches the access token
  and silently refreshes it on a 401
- lucide-react for icons

## Project structure

```
src/
├── app/
│   ├── login/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx        → Sidebar + top bar + auth guard for everything below
│   │   ├── page.tsx          → Home (KPIs + recent leads)
│   │   ├── leads/
│   │   │   ├── page.tsx      → Leads list (search, paginate, 3-dot menu)
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx       → Lead detail (status pipeline, Show/Hide Details)
│   │   │       └── edit/page.tsx
│   │   ├── contacts/         → same list/create/detail pattern
│   │   └── accounts/         → same list/create/detail pattern
│   └── layout.tsx / page.tsx (redirects to /login or /dashboard)
├── features/
│   ├── auth/        → LoginForm, authService, authStorage, auth.types
│   ├── dashboard/    → Sidebar, DashboardHeader (top bar), dashBoardStats
│   ├── teamspace/    → Super-Admin-only teamspace switcher (see note below)
│   ├── leads/        → LeadList, LeadForm, LeadDetail, LeadService, lead.types
│   ├── contacts/     → mirrors leads, backed by ContactService (see note below)
│   ├── accounts/     → mirrors leads, backed by AccountService (see note below)
│   └── users/        → userService (users list + GET /lead-owners/)
├── shared/components/OwnerPicker.tsx  → searchable "assign owner" combobox
└── infrastructure/api/client.ts       → shared axios instance + token refresh
```

## 1. Run the frontend

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

## 2. Endpoints this frontend calls

| Call | Method & path | Notes |
|---|---|---|
| Login | `POST /auth/login/` | `{ email, password }` → `{ access_token, refresh_token, token_type }` |
| Current user | `GET /users/me/` | `{ id, name, email, role }`. Drives the Super Admin gate (`role` is compared case/format-insensitively — `"SUPERADMIN"` matches). |
| Token refresh | `POST /auth/refresh/` | Body is `{ refresh_token }` (confirmed against your Postman collection — **not** SimpleJWT's default `refresh` key). |
| Lead owners | `GET /lead-owners/` | `[{ id, name, email }]` — powers the Lead Owner picker on create/edit. |
| Leads | `GET/POST /leads/`, `GET/PATCH/DELETE /leads/{id}/` | See field list below. |

### Lead fields

`Lead` mirrors the domain enums you supplied (`lead_source.py`, `lead_status.py`,
`lead_rating.py`, `lead_industry.py`) value-for-value — the dropdowns can't
send anything the API would reject.

**Only `email` and `owner_id` are required** to create a lead; every other
field (`name`, `company_name`, `title`, `phone`, `mobile_number`, `fax`,
`website`, `lead_source`, `lead_status`, `industry`, `rating`,
`number_of_employees`, `annual_revenue`, `address`, `city`, `state`,
`country`, `postal_code`, `description`) is optional. Your backend's
`CreateLeadDTO` / domain entity / `DjangoLeadModel` need to accept this
same shape — the migration for the extra columns from the previous round
plus `lead_status`, `rating`, `industry`, `fax`, `title` still needs to land
if it hasn't already.

### CORS

```python
CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]
```

## 3. What's built

- **Login** with JWT storage + silent refresh on 401.
- **Sidebar** (Zoho-style): Home, a Teamspace switcher, and Leads / Contacts
  / Accounts navigation.
- **Leads**: paginated list (10/page) with a row-hover 3-dot menu
  (Edit/Delete), full create/edit form matching the Zoho field layout
  (Lead Owner combobox showing name + email, sourced from
  `GET /lead-owners/`, defaulting to the signed-in user on create), and a
  detail page with the status pipeline strip and a Show Details/Hide
  Details toggle — all matching the two screen recordings.
- **Contacts** and **Accounts**: same list/create/detail UX as Leads.

### Note: Contacts, Accounts, and Teamspace are frontend-only for now

Your backend doc only defines a `leads` module — there's no
`/api/contacts/`, `/api/accounts/`, or `/api/teamspaces/` yet. So:

- `ContactService` and `AccountService` (`src/features/contacts/services`,
  `src/features/accounts/services`) persist to `localStorage` using the
  **exact same async method names** (`getX`, `createX`, `updateX`,
  `deleteX`) a real `apiClient`-backed service would use. Swapping them
  over later means changing the inside of those two files only — no page
  or component needs to change.
- `teamspaceService` (`src/features/teamspace/services`) is the same story:
  Super Admins can create a teamspace from the sidebar switcher, but it's
  stored locally rather than shared across users/devices until there's a
  backend endpoint for it.

### Note: role gating

There's no fixed `UserRole` union anymore — `isSuperAdmin(user)` /
`isAdmin(user)` (in `features/auth/types/auth.types.ts`) normalize
whatever string `GET /users/me/` returns (`"SUPERADMIN"`, `"Super Admin"`,
`"super_admin"` all match) rather than hardcoding one casing.

## Troubleshooting

- **Stuck on "Checking your session…":** no access token in the browser —
  log in again.
- **401 loop right after logging in:** check the `/auth/refresh/` request
  in the Network tab — the body key must be `refresh_token`, and the
  response must include `access_token`.
- **Lead Owner picker is empty:** confirm `GET /lead-owners/` is reachable
  and returns `[{ id, name, email }]`.

## 4. Recent additions

- **Dark mode / light mode** — toggle button (sun/moon icon) in the top bar
  and on the login page. Persisted in `localStorage`, applied before paint
  to avoid a flash. See the token-naming note in `AGENTS.md`/`CLAUDE.md`
  if you're adding new components (`text-fg` / `bg-surface`, not
  `text-ink` / `bg-white`).
- **Convert Lead** — a "Convert" button on the lead detail page opens
  `/dashboard/leads/[id]/convert`, which creates a new Account + Contact
  from the lead's details (via the mocked `AccountService`/
  `ContactService` — see the note above about these not being wired to a
  real backend yet). The original lead is left untouched.
- **Overview / Timeline tabs** on the lead detail page, matching Zoho.
  Timeline currently synthesizes "created" / "last updated" entries from
  `created_at`/`updated_at` — real activity history needs a backend
  activity-log endpoint.
- **Save and Next** — on both Create and Edit lead forms, a button to the
  left of "Save". On create, it saves and clears the form for the next
  entry in place. On edit, it saves and jumps to the next lead in the list.
- **Lead deletion now shows the backend's own message** (e.g. "Lead
  deleted successfully") rather than a hardcoded string —
  `LeadService.deleteLead()` reads `message`/`detail` off the response
  body and only falls back to a default if the backend sends neither.
- **Corrected Lead endpoints** to match the real backend routes:
  `POST /leads/create/`, `PATCH /leads/{id}/update/`,
  `DELETE /leads/{id}/delete/` (list/detail GET stayed at `/leads/` and
  `/leads/{id}/`).

## 5. Contacts and Accounts now mirror the real Django models

The backend team shared the actual `DjangoContactModel` and
`DjangoAccountModel`. The frontend types/forms were rebuilt field-for-field
to match (still against the localStorage mock services — see §3 — since
`/api/contacts/` and `/api/accounts/` still don't exist yet):

- **Contact**: single `name` field (no first/last split — the Django model
  only has `name`), plus `account` (FK, optional — picked via a searchable
  `RecordPicker`), `contact_owner` (FK, required), `secondary_email`,
  `other_phone`, `home_phone`, `assistant_phone`, `department`,
  `lead_source`, `vendor_name`, `date_of_birth`, `assistant`,
  `email_opt_out`, `reporting_to` (self-referential FK to another Contact,
  also via `RecordPicker`), and a `mailing_*` / `other_address` address
  block. **Only `name` is required** — everything else, including
  `contact_owner_id`, is optional in the UI (it's still auto-filled with
  the signed-in user by default).
- **Account**: `account_name` (required), `account_owner` (required FK,
  auto-filled), plus `account_site`, `account_number`, `account_type`,
  `ownership` (exact `TextChoices` from the model: None/Other/Private/
  Public/Subsidiary/Partnership/Government/Privately Held/Public Company),
  `ticker_symbol`, `sic_code`, and a `billing_*` address block.
- New shared `src/shared/components/RecordPicker.tsx` — like
  `OwnerPicker`, but for **optional, clearable** relational fields
  (Contact → Account, Contact → Reporting To).

## 6. Lead mandatory-field rule changed again

Per the latest instruction, creating a Lead now only requires **Name and
Company Name** — Email and Lead Owner are no longer validation-blocking
(Owner is still auto-filled with the signed-in user behind the scenes,
since the backend's `Lead.owner` is a non-nullable FK). Industry and
Rating now default to the real `"None"` enum value instead of an empty
placeholder, matching the backend enums exactly.
