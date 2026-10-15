# Nuvince — Frontend

The React 19 + Vite + Material UI web application for the Nuvince Hospital SaaS Platform. Designed for high-density clinical and administrative workflows with modern design tokens, custom components, responsive layouts, and granular role/permission-based access control.

See the [root README](../README.md) for full project architecture, backend setup, and comprehensive operational guidelines.

---

## 🛠️ Stack

- **Framework:** React 19 (`react`, `react-dom`)
- **Build Tool:** Vite 8.x
- **UI & Component System:** Material UI 9.x (`@mui/material`, `@mui/icons-material`), Emotion (`@emotion/react`, `@emotion/styled`)
- **Routing:** React Router DOM (v7)
- **HTTP Client:** Axios (configured with token injection interceptor & automated 401 handling)
- **Document Export:** jsPDF (`jspdf`, `jspdf-autotable`) for single-page client-side roster PDF summaries
- **Typography:** Self-hosted Roboto (`@fontsource/roboto` 400, 500, 700)
- **Linter:** oxlint

---

## 🚀 Scripts

```bash
npm run dev      # Start Vite development server (HMR enabled)
npm run build    # Production build to dist/
npm run lint     # Fast linter using oxlint
npm run preview  # Local preview of the production build
```

---

## 🎨 Design System & Tokens

The frontend uses a centralized design token architecture (`src/theme/tokens.js`) coupled with custom styled components and standard brand tokens.

### Brand Color Palette
- **Primary Charcoal (`#252525`):** Primary branding, key action buttons, and prominent headings.
- **Strong Blue (`#0284C7`):** Focus rings, interactive highlights, active links, and accent elements.
- **Light Blue (`#E0F2FE`):** Active sidebar navigation backgrounds, selected row highlights, and subtle pill badges.
- **Light Gray Canvas (`#F9FAFB` / `#F3F4F6`):** Clean page backgrounds, card borders (`#E5E7EB`), and soft neutral panels.
- **Status Palettes:**
  - **Success:** `#1C985A` (Light: `#F0FDF4`, Border: `#BBF7D0`, Text: `#166534`)
  - **Warning:** `#DA950B` (Light: `#FEF3C7`, Border: `#FDE68A`, Text: `#92400E`)
  - **Danger:** `#DF2225` (Light: `#FEF2F2`, Border: `#FECACA`, Text: `#991B1B`)
  - **Info:** `#0080CC` (Light: `#F0F9FF`, Border: `#BAE6FD`, Text: `#075985`)
  - **Neutral:** `#6B7280` (Light: `#F3F4F6`, Border: `#E5E7EB`, Text: `#374151`)

### Component Primitives & Styling Guidelines
- **Custom Inputs (`AppInput` & `AppSelect`):** Built on brand design tokens, replacing standard MUI input fields across pages and modals. Features consistent height, custom focus borders, integrated adornments, and error states.
- **Action Buttons (`AppButton` & `StyledButton`):** Standardized variants (`primary`, `secondary`, `destructive`, `outline`, `ghost`) with consistent height, padding, and hover transitions.
- **Metric Cards (`KPIGrid`, `KPICard`, `KPICardWithAction`):** High-density KPI cards with micro-trend indicators, contextual actions, and responsive grid layouts.
- **Initials Avatar (`InitialsAvatar`):** Generates deterministic brand avatar colors derived from staff names with consistent contrast.
- **Global Toast Feedback (`SnackbarProvider`):** Context provider (`useSnackbar`) powering unified snackbar notifications across asynchronous actions.
- **Explicit Corner Radii:** 6px small controls, 10px standard inputs/buttons, 12px cards/tables, 14px modals and dialogs.

---

## 📁 Project Structure

```
frontend/src/
├── api/
│   ├── client.js              # Central Axios instance with baseUrl
│   └── interceptors.js        # Auth token injection & 401 redirect interceptor
├── components/
│   ├── attendance/            # Attendance modal & regularization controls
│   ├── calendar/              # UnifiedCalendar for monthly attendance/leaves
│   ├── common/                # Shared custom primitives:
│   │   ├── AppButton.jsx      # Branded action button
│   │   ├── AppCheckbox.jsx    # Custom checkbox
│   │   ├── AppInput.jsx       # Custom styled text field & floating labels
│   │   ├── AppSelect.jsx      # Custom select dropdown
│   │   ├── AppSnackbar.jsx    # Toast notification component
│   │   ├── KPICard.jsx        # High-density metric card
│   │   ├── KPICardWithAction.jsx # Metric card with contextual quick-action
│   │   ├── MainContentLoader.jsx # Page loading spinner & skeleton
│   │   └── PageHeader.jsx     # Consistent header with breadcrumbs and action buttons
│   ├── styled/                # Emotion/MUI styled component primitives (StyledButton, StyledDialog, etc.)
│   ├── ConfirmDialog.jsx      # Reusable confirmation dialog
│   ├── DataTable.jsx          # Responsive data table with card collapse on mobile
│   ├── EmptyState.jsx         # Visual empty state illustration & action
│   ├── ErrorState.jsx         # Graceful error fallback
│   ├── InitialsAvatar.jsx     # Staff name initials avatar generator
│   ├── Modal.jsx              # Reusable modal shell with actions prop support
│   ├── Navbar.jsx             # Top bar with hospital info, role badge, user menu
│   ├── Sidebar.jsx            # Dynamic collapsible sidebar driven by sidebar.config.js
│   ├── StatusBadge.jsx        # Standardized status pill badge (active, draft, absent, etc.)
│   └── sidebar.config.js      # Navigation menu definition by role & module
├── pages/
│   ├── admin/                 # Hospital admin & HR manager views:
│   │   ├── AccessManagementPage.jsx # Granular workforce permission matrix
│   │   ├── AdminDashboard.jsx       # Admin analytics & metric overview
│   │   ├── AttendancePage.jsx       # Clock-in/out, date-grouped workforce attendance, regularization
│   │   ├── EmployeesPage.jsx        # Workforce staff list, invitations, resend/cancel, status toggle
│   │   ├── FloorDetails.jsx         # Hospital floor room structure & management
│   │   ├── Hospital.jsx             # Hospital configuration, IANA timezone selector
│   │   ├── LeaveManagementPage.jsx  # Leave applications, approvals, balance tracking
│   │   ├── PositionsPage.jsx        # Positions master, rosterEligible toggle, work schedule timings
│   │   ├── RosterManagementPage.jsx # Roster builder, templates, PDF export, staff phone display
│   │   └── StructurePage.jsx        # Hospital floor & room hierarchy overview
│   ├── auth/                  # Authentication flows:
│   │   ├── AcceptInvitation.jsx     # Staff onboarding & invitation acceptance
│   │   ├── ForgotPassword.jsx       # Password recovery request
│   │   ├── Landing.jsx              # Platform landing page
│   │   ├── Login.jsx                # Multi-role authentication
│   │   ├── Register.jsx             # Admin hospital registration
│   │   └── ResetPassword.jsx        # Token-based password reset
│   ├── shared/                # Shared views:
│   │   ├── NotFoundPage.jsx         # 404 fallback page
│   │   └── Profile.jsx              # User profile update & password change
│   └── super-admin/           # Platform super-admin views:
│       ├── SuperAdminDashboard.jsx
│       ├── SuperAdminHospitalDetails.jsx
│       └── SuperAdminHospitals.jsx
├── routes/
│   └── index.jsx              # Protected routes with role & permission guards
├── services/                  # Backend API service layers:
│   ├── accessManagement.service.js
│   ├── attendance.service.js
│   ├── auth.service.js
│   ├── employee.service.js
│   ├── hospital.service.js
│   ├── leave.service.js
│   ├── position.service.js
│   ├── roster.service.js
│   ├── rosterTemplate.service.js
│   └── structure.service.js
├── theme/
│   ├── SnackbarProvider.jsx   # Global toast notifications context
│   ├── themeProvider.js       # MUI theme configured with custom tokens
│   └── tokens.js              # Central brand token definitions
├── utils/
│   ├── dateUtils.js           # Date formatting, 12h/24h time, duration computations
│   ├── permissions.js         # Client-side permission constants & checking utilities
│   └── rosterPdfGenerator.js  # Client-side single-page roster PDF export
└── wrapper/
    ├── AppLayout.jsx          # Authenticated app shell layout
    ├── AuthLayout.jsx         # Authentication screens layout wrapper
    ├── KPIGrid.jsx            # High-density responsive metric card grid wrapper
    └── styles/                # Layout style declarations
```

---

## 🔒 Security & Route Protection

All private routes in `src/routes/index.jsx` are wrapped in `<ProtectedRoute>`:
- **Token Validation & Expiry:** Checks JWT presence and expiration timestamp; auto-purges expired sessions and redirects to `/login`.
- **Role Verification:** Restricts routes to allowed roles (`admin`, `employee`, `super_admin`).
- **Granular Capability Guards:** Checks required module access (`hrms`, `hospital_structure`) and explicit capabilities (e.g. `attendance.view`, `roster.manage`).
- **Role Default Redirection:** Authenticated users navigating to root or unauthorized paths are redirected to their designated dashboard.

---

## 🌐 Environment Configuration

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:3000/api
```

Defaults to `http://localhost:3000/api` if unspecified.