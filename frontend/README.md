# Vardhan — Frontend

The React + Vite + Material UI dashboard for Vardhan's hospital management platform. See the [root README](../README.md) for the full project overview, setup, and role flows.

## Stack

- React 19
- Vite (build) + Oxlint (lint)
- Material UI 9 (`@mui/material`, `@mui/icons-material`)
- React Router DOM 7
- Axios
- `@fontsource/roboto` (self-hosted Roboto 400/500/700)

## Scripts

```bash
npm run dev      # start the Vite dev server
npm run build    # production build
npm run lint     # oxlint
npm run preview  # preview the production build
```

## Structure

- `src/components/` — app shell (`AppLayout`, `Navbar`, `Sidebar`) and shared UI primitives (`DataTable`, `StatCard`, `SectionCard`, `InfoRow`, `StatusBadge`, `Modal`, `ConfirmDialog`, `Loading`, etc.)
- `src/pages/` — grouped by role: `auth/` (login, register, password flows, landing, HR invite), `admin/` (`AdminDashboard`, `Hospital`, `Departments`, `DepartmentDetails`), `hr/` (`HRDashboard`, `HRProfile`, `MyHospital`, `MyDepartment`), `super-admin/` (dashboard + hospitals views), `shared/` (`Profile`); page-scoped create/edit/invite modals are inlined in their pages
- `src/routes/index.jsx` — data-driven route array with role guards and role-aware redirects
- `src/services/` — feature API wrappers over the shared axios client in `api/client.js` (token injection + 401 handling in `api/interceptors.js`)
- `src/theme/theme.js` — the monochrome design system (radii, spacing, typography, component overrides)

## Design system highlights

- Monochrome palette: black actions, white surfaces, light-gray borders and canvas
- Explicit pixel corner radii (8px controls, 12px cards, 14px dialogs) — no numeric-radius multiplier surprises
- Roboto typography with a strict hierarchy (28–32px titles, 18px sections, 13–15px body)
- Shared `InfoRow` for consistent label/value rows; `DataTable` collapses to cards on mobile
- Single `Loading` spinner component for every async state; skeletons were removed

## Environment

```env
VITE_API_URL=http://localhost:3000/api
```

Defaults to `http://localhost:3000/api` if unset.