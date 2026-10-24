# KaziPay Design System

> The source of truth for how the KaziPay frontend looks and behaves. It combines the premium UI/UX brief with the frontend rules in `KAZIPAY_PROJECT_SPEC.md` §15. Read it before building any screen. When a screen needs something this document doesn't cover, add it here first, then build it.

---

## 1. Direction

KaziPay is a calm, precise workspace for consultants who want to **do the work and get paid**. The interface should feel like a well-run studio: confident, quiet, financially trustworthy.

| We are | We are not |
|--------|-----------|
| Calm, spacious, deliberate | Busy, cramped, decorated |
| Blue-led, neutral-grounded | Rainbow palettes, heavy gradients |
| Money-first: amounts are crisp, tabular, aligned | Numbers in proportional fonts, misaligned decimals |
| Varied layouts chosen per page | Every page a table or the same card grid |
| Clear about state (loading, saved, failed, paid) | Silent actions, blank screens, browser alerts |

**Hard rules:** no emojis anywhere in the UI. One font family. Blue is the only brand color. Color never carries meaning alone: every status has a text label and usually an icon or dot.

---

## 2. Design tokens

Tokens are defined once as CSS variables in `frontend/src/styles.css` and exposed to Tailwind in `frontend/tailwind.config.js`. Components use token-backed classes (`bg-brand-600`, `text-ink-500`). Raw hex values in components are not allowed.

### 2.1 Color

**Brand (blue).** `brand-600` is the primary action color.

| Token | Hex | Use |
|-------|-----|-----|
| brand-50 | `#EFF4FF` | Selected rows, active nav background (light), info surfaces |
| brand-100 | `#DCE7FE` | Subtle highlights, chart fills |
| brand-200 | `#BCD1FD` | Focus ring tint, chart secondary |
| brand-300 | `#8EB2FB` | Chart tertiary |
| brand-400 | `#5A8CF7` | Hover on dark surfaces |
| brand-500 | `#3569F0` | Charts primary series |
| brand-600 | `#1F51E0` | **Primary buttons, links, focus border, active states** |
| brand-700 | `#1A41BA` | Primary hover |
| brand-800 | `#1B3894` | Primary pressed |
| brand-900 | `#1A3175` | Headings on brand surfaces |
| brand-950 | `#0E1A40` | Sidebar background |

**Ink (neutral, cool gray).**

| Token | Hex | Use |
|-------|-----|-----|
| ink-0 | `#FFFFFF` | Cards, inputs, modals |
| ink-25 | `#FAFBFC` | Table header, subtle wells |
| ink-50 | `#F5F7FA` | App background |
| ink-100 | `#EDF0F5` | Hover rows, disabled fields, skeleton base |
| ink-200 | `#E1E6EE` | Borders, dividers |
| ink-300 | `#C9D1DD` | Input borders, strong dividers |
| ink-400 | `#98A3B5` | Placeholder, disabled text, icons (inactive) |
| ink-500 | `#66728A` | Secondary text, captions |
| ink-600 | `#4A556B` | Body text (secondary emphasis) |
| ink-700 | `#343E52` | Body text |
| ink-800 | `#202939` | Strong text |
| ink-900 | `#121826` | Headings, amounts |

**Feedback.** Each has a text/icon color, a soft background, and a border.

| Role | Text/icon | Soft bg | Border | Use |
|------|-----------|---------|--------|-----|
| success | `#0F7B53` | `#E7F6EF` | `#B4E3CD` | Paid, approved, saved |
| warning | `#A15C07` | `#FEF5E6` | `#F8D9A0` | Partially paid, due soon, unsaved changes |
| danger | `#C8321F` | `#FDEEEC` | `#F5C2BA` | Overdue, errors, destructive actions |
| info | brand-700 | brand-50 | brand-200 | Neutral notices |

Danger buttons use `#C8321F` with hover `#A82918`.

**Charts.** A single series uses brand-600 (area fills are brand-600 at about 10% opacity). Two series use **chart-1 brand-700 `#1A41BA`** and **chart-2 brand-400 `#5A8CF7`**. This pair passed the palette validator (lightness band, chroma floor, colorblind separation ΔE ≥ 20, contrast ≥ 3:1 on white). Neutral gray failed it as a series color, so gray is never used for a series. Ordered categories with one measure (A/R aging buckets) use one color. Feedback colors appear in charts only when the data *means* that state.

### 2.2 Typography

**Family:** Plus Jakarta Sans (self-hosted variable font via `@fontsource-variable/plus-jakarta-sans`), falling back to `system-ui, -apple-system, Segoe UI, sans-serif`. Numbers that line up (money, hours, tables) use `font-variant-numeric: tabular-nums` (`.tnum` utility).

| Style | Size / line height | Weight | Tracking | Use |
|-------|--------------------|--------|----------|-----|
| display | 30 / 38 | 700 | -0.02em | Dashboard hero figures, auth headings |
| title | 22 / 30 | 650 | -0.015em | Page titles |
| heading | 17 / 26 | 600 | -0.01em | Card and section titles |
| subheading | 15 / 22 | 600 | 0 | Sub-sections, modal titles |
| body | 14 / 22 | 450 | 0 | Default text |
| body-strong | 14 / 22 | 600 | 0 | Emphasis, table primary cell |
| small | 13 / 20 | 450 | 0 | Helper text, secondary cells |
| caption | 12 / 16 | 500 | 0.01em | Meta, timestamps, badges |
| overline | 11 / 16 | 600 | 0.08em, uppercase | Section labels, table headers |

Heading text is ink-900. Body text is ink-700. Secondary text is ink-500. Never go lighter than ink-500 for text that must be read.

### 2.3 Spacing and layout

A 4px base scale: `1=4 · 2=8 · 3=12 · 4=16 · 5=20 · 6=24 · 8=32 · 10=40 · 12=48 · 16=64`.

- Page padding: 32px desktop, 24px tablet, 16px mobile.
- Max content width: 1280px. Forms and detail reading columns max out at 720px.
- Card padding: 20px (compact) or 24px (default). Gap between cards: 20px desktop, 16px mobile.
- Vertical rhythm inside a card: 16px between groups, 8px between a label and its control, 24px between sections.
- Grid: 12 columns. Common splits are 8/4 (main plus side panel), 6/6, and 4/4/4.

### 2.4 Radii, borders, elevation

| Token | Value | Use |
|-------|-------|-----|
| radius-sm | 6px | Badges, chips, checkboxes |
| radius-md | 8px | Buttons, inputs, menus items |
| radius-lg | 12px | Cards, dropdown panels, table containers |
| radius-xl | 16px | Modals, auth card |
| radius-full | 9999px | Avatars, pills, toggles |

Borders are 1px ink-200. Inputs use ink-300.

| Shadow | Value | Use |
|--------|-------|-----|
| shadow-xs | `0 1px 2px rgb(18 24 38 / 0.05)` | Buttons (secondary), inputs |
| shadow-card | `0 1px 2px rgb(18 24 38 / 0.04), 0 1px 3px rgb(18 24 38 / 0.06)` | Cards |
| shadow-pop | `0 12px 32px -8px rgb(18 24 38 / 0.16), 0 2px 6px rgb(18 24 38 / 0.06)` | Dropdowns, popovers, toasts |
| shadow-modal | `0 24px 64px -16px rgb(18 24 38 / 0.32)` | Modals, command palette |

Surfaces get their depth from borders plus soft shadows. Never use a heavy shadow on a resting card.

### 2.5 Focus

Every interactive element shows a visible focus state when reached by keyboard (`:focus-visible`). Fields show it on any focus.

- **Ring:** `0 0 0 3px rgb(31 81 224 / 0.22)`. **Border** (fields): brand-600.
- **Error fields:** danger border with ring `0 0 0 3px rgb(200 50 31 / 0.18)`.

### 2.6 Motion

| Token | Value | Use |
|-------|-------|-----|
| fast | 120ms ease-out | Hover, color, press |
| base | 180ms cubic-bezier(.2,.8,.2,1) | Dropdowns, tabs, toasts |
| slow | 240ms cubic-bezier(.2,.8,.2,1) | Modals, drawers |

Buttons press to `scale(0.98)`. Overlays fade and rise 4px into place. Skeletons shimmer. With `prefers-reduced-motion: reduce`, transitions drop to near zero and the shimmer stops.

### 2.7 Icons

Material icons (outlined) through `react-icons/md`, always rendered through the `Icon` component so sizes stay consistent:

| Size | px | Use |
|------|----|-----|
| xs | 14 | Inside badges, inline meta |
| sm | 16 | Buttons, inputs, table actions |
| md | 20 | Navigation, card headers, empty-state accents |
| lg | 24 | Feature tiles, modal icons |

Icons inherit `currentColor`. A decorative icon has `aria-hidden`. An icon-only button always has an `aria-label` and a tooltip.

---

## 3. Components

All components live in `frontend/src/components/ui`. Each owns its states: default, hover, focus, active, disabled, loading, and error where relevant.

### Buttons
| Variant | Look | Use |
|---------|------|-----|
| primary | brand-600 fill, white text | One per view region: the main next action |
| secondary | white, ink-300 border, ink-800 text, shadow-xs | Alternative actions |
| tertiary | transparent, ink-600 text, ink-100 hover | Low-emphasis actions, toolbars |
| danger | danger fill, white text | Destructive confirms only |
| link | brand-600 text, underline on hover | Inline navigation |

Sizes: **sm** 32px (13px text, 12px padding), **md** 40px (14px text, 16px padding, the default), **lg** 44px (15px text, 20px padding). Loading replaces the leading icon with a spinner, keeps the button's width, sets `aria-busy`, and blocks repeat clicks. Disabled is 50% opacity with `not-allowed`.

### Form fields
- `Field` wraps label, control, helper and error. The label is 13px/600 ink-800 and sits 6px above the control. A required field shows a danger-colored `*` and announces "required".
- Controls (input, select, textarea) are 40px tall (textarea grows), 12px horizontal padding, radius-md, ink-300 border, white background. Hover darkens the border to ink-400. Focus uses the brand border plus ring. Disabled uses an ink-100 background and ink-400 text. Errors use the danger border, an error icon, and a 13px danger message linked by `aria-describedby`.
- Helper text is 13px ink-500. Placeholders are ink-400 and show an example, never a label substitute.
- Validation uses **Zod schemas** that mirror backend rules. Errors appear on blur, and on submit for untouched fields. Submit focuses the first invalid field.
- **Unsaved changes:** an edited settings form shows a sticky save bar ("You have unsaved changes", Discard, Save). Leaving with unsaved edits asks for confirmation.

### Badges and status
Pill (radius-full), 22px tall, caption text, with a leading dot or icon. Statuses map to fixed tones:

| Status | Tone | Label |
|--------|------|-------|
| DRAFT, VOID, CANCELLED, ARCHIVED | neutral | Draft / Void / Cancelled / Archived |
| SENT, VIEWED, IN_PROGRESS, ACTIVE | brand | Sent / Viewed / In progress / Active |
| PARTIALLY_PAID, REVIEW, DUE_SOON | warning | Partially paid / In review / Due soon |
| PAID, DONE, APPROVED | success | Paid / Done / Approved |
| OVERDUE, REJECTED, FAILED | danger | Overdue / Rejected / Failed |

### Cards
White surface, 1px ink-200 border, radius-lg, shadow-card. An optional header has a heading, an optional description, and right-aligned actions, followed by a 1px divider or 16px gap. Never nest a card inside a card. Use a subtle ink-25 well instead.

### Tables (`DataTable`)
For records that benefit from rows and columns: clients, invoices, payments, the audit log.
- Header: 40px, ink-25 background, overline text. Sortable columns show an arrow and announce `aria-sort`.
- Rows: 56px, ink-200 dividers, hover ink-50. Selected rows use brand-50 with a checkbox.
- Money and numbers are right-aligned and tabular. Text is left-aligned. The first column holds the primary identity (avatar plus name plus secondary line).
- Row actions sit in a trailing kebab menu. A bulk-action bar replaces the toolbar when rows are selected.
- An optional column-visibility menu sits in the toolbar.
- **Pagination** footer: "Showing 1–10 of 48", a rows-per-page select (10/25/50/100), and Previous / page numbers / Next. The current page is a brand-600 filled square. Ellipses collapse long ranges.
- On mobile, tables collapse to stacked cards (identity, status and amount) rather than scrolling sideways, except for dense financial tables, which scroll inside their container.

### Overlays
- **Modal** sizes: sm 420px (confirmations), md 560px (forms), lg 760px (previews). Radius-xl and shadow-modal, with a scrim at ink-900 / 45% plus a light blur. Structure: title, optional description, body, then a footer with actions right-aligned (Cancel secondary, then the primary action). Focus is trapped and returns to the trigger. Escape and the scrim close it, except while submitting.
- **ConfirmDialog** is for destructive or irreversible actions only (archive client, void invoice, remove member). It has a danger icon tile, an explicit title ("Archive Acme Ltd?"), a one-sentence consequence, Cancel, and a danger confirm named for the action ("Archive client"). Routine actions don't ask for confirmation.
- **Dropdown menu:** radius-lg, shadow-pop, 6px padding, 36px items with 16px icons. A destructive item is danger text placed last after a divider.
- **Tooltip:** ink-900 background, white 12px text, radius-sm, 400ms delay.
- **Toasts:** bottom-right (top-center on mobile), 360px wide, white with a 3px left accent in the tone color, an icon, title, optional description, and optional action ("Retry", "Undo"). They auto-dismiss after 5s, or stay until dismissed for errors. Announced via `aria-live`.

### Feedback states
- **Skeletons** mirror the final layout (the same card shapes and row counts) with an ink-100 base and a subtle shimmer. A full-page spinner is never used.
- **Empty states:** a 40px icon in a soft brand tile, a title ("No clients yet"), one sentence of guidance, and the primary next action. Filtered-empty states say "No results for 'acme'" and offer "Clear filters".
- **Error states:** an inline card with a danger icon, what failed in plain language, and a Retry button. Errors never show stack traces or raw codes, though a correlation id can appear as small text.

### Navigation
- **Sidebar** (desktop ≥1024px): 256px wide on a brand-950 background, with the workspace switcher at the top, grouped nav (Workspace: Dashboard, Clients, Projects, Time, Invoices, Payments; Insights: Reports; Settings at the bottom), and a plan usage meter. Items are 40px tall with 20px icons. Inactive items are white at 70%. Hover is white at 6%. The active item is white at 10% with a brand-400 3px left indicator and white text. Below 1024px the sidebar becomes a drawer opened from the top bar.
- **Top bar:** 64px tall, white, bottom border. It holds the page breadcrumb or title, global search (opens the command palette, shows `Ctrl K`), the running-timer widget, notifications, and the user menu.
- **Command palette** (Ctrl/Cmd+K): 640px modal with a search input, grouped results (Navigate, Create, Recent), arrow-key navigation, Enter to run, and Escape to close.

### Charts
Built with Recharts and wrapped in `ChartCard` (title, key figure, comparison delta, range selector).
- Subtle grid lines (ink-100, horizontal only). Axis text is 12px ink-500 with no axis lines. Currency values are abbreviated (KES 1.2M).
- Tooltips use popover styling (white, shadow-pop, radius-md) with tabular figures.
- Comparison deltas: an arrow icon plus a signed percentage plus "vs last month", green or red for direction *and* with the sign and arrow, never color alone.
- Containers are responsive, with a fixed aspect on mobile. Never more than 4 series.

---

## 4. Page patterns

Each page has a single obvious primary action and a layout chosen for its content.

| Page | Layout | Primary action |
|------|--------|----------------|
| Sign in / Register | Split: brand panel (value statement, product glimpse) plus form card | Sign in / Create workspace |
| Onboarding | Centered stepper (business, branding, tax, first client) | Continue |
| Dashboard | Greeting plus KPI strip (4 stat tiles), revenue chart (8 cols) with A/R aging (4 cols), then needs-attention list, recent activity timeline, and active projects | New invoice |
| Clients | Toolbar (search, status filter chips, import/export), then DataTable with pagination | New client |
| Client detail | Header (avatar, name, status, actions), stats row, then 8/4: tabs (Overview with activity timeline, Invoices, Projects, Contacts) and a side panel (billing details, primary contact, portal access) | New invoice for client |
| Projects | Card grid (progress ring, budget bar, due date, team avatars) with a status segmented control | New project |
| Project detail | Header with progress, tabs: Board (Kanban, drag-and-drop), Milestones (vertical timeline), Time, Activity | Add task |
| Time | Week header with navigation, weekly timesheet grid (projects × days, totals row and column), timer card | Start timer |
| Invoices | Status summary strip (Outstanding / Overdue / Paid this month), then DataTable | New invoice |
| Invoice detail | Document-style preview (paper card) plus side panel (status timeline, payments, actions: Send, Record payment, Void) | Send / Record payment |
| Settings | Left sub-nav (Workspace, Branding, Tax rates, Invoices, Team, Billing), a form column with an unsaved-changes bar | Save changes |

**M-Pesa pay dialog** (portal and staff "request payment"): phone input with `+254` prefix, then a step indicator ("Sending prompt", "Check your phone", "Enter M-Pesa PIN"), a 60-second countdown ring, then success (receipt number) or failure with Retry and Cancel.

**Client portal** (`/portal`) reuses every component, but the brand color comes from tenant settings via the `--brand-*` CSS variables. Same layout rules, simpler navigation.

---

## 5. Responsive behaviour

| Breakpoint | Width | Behaviour |
|------------|-------|-----------|
| mobile | < 640px | Single column, page padding 16px, tables become cards, modals become bottom sheets (full width, radius-xl on top), sticky primary action at the bottom where useful |
| tablet | 640–1023px | Two-column grids, sidebar as drawer |
| desktop | ≥ 1024px | Persistent sidebar, full grids |

Touch targets are at least 40px.

---

## 6. Accessibility checklist

- Text contrast at least 4.5:1 (ink-500 on white passes; ink-400 is for placeholders and disabled text only).
- Every control is reachable by keyboard in a logical order and has a visible focus ring.
- Labels are real `<label>` elements. Icon-only buttons have `aria-label`.
- Dialogs, menus, tabs and tooltips use Radix primitives for correct roles, focus trapping and Escape handling.
- Status always has a text label. Charts have a text summary (the key figure plus delta) next to them.
- Live regions announce toasts, async validation and loading completion.
- Motion respects `prefers-reduced-motion`.

---

## 7. Implementation notes

- Stack: React 19, TypeScript, Vite, Tailwind CSS 3 (tokens), React Router 7, TanStack Query, Radix UI primitives, cmdk (command palette), Recharts, react-hook-form with Zod, react-icons (Material), `clsx` + `tailwind-merge` (`cn()` helper).
- Until API integration, screens read from typed mock data in `src/mocks` through TanStack Query with a simulated delay, so loading, empty and error states are real and exercised. Replacing the mock fetchers with Axios calls must not change components.
- Formatting: money via `Intl.NumberFormat('en-KE', { style: 'currency', currency })`, dates via `Intl.DateTimeFormat('en-KE')`. Both will later follow the tenant locale.
