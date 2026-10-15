# Nuvince — Project Context

Status: Standardized Target Architecture  
Updated: 2026-10-14  
Purpose: Single source of truth for developers and coding agents.

---

## 1. PRIMARY ARCHITECTURE

```
NUVINCE SaaS
│
├── CORE PLATFORM
│   ├── Authentication (JWT with token revocation, secure password hashing, reset & confirmation)
│   ├── Hospital / Tenant (Strict tenant isolation & IANA Hospital Timezone support)
│   ├── Users (Authentication & Identity)
│   ├── Roles (super_admin, admin, employee)
│   ├── Permissions (Generic granular capability registry)
│   ├── Module Access (core, hrms, hospital_structure)
│   ├── Access Management (Generic workforce permissions & module configuration)
│   ├── Hospital Structure
│   │   ├── Floor
│   │   └── Room
│   └── Positions (Hospital designation master, rosterEligible toggle, per-day structured work schedule & shift timing)
│
└── MODULES
    └── HRMS
        ├── Employees (Workforce staff records reciprocal to User, LWD boundary enforcement, cross-tenant email uniqueness checks)
        ├── Invitations (Centralized invitation flow with SHA-256 token hashing, 48h expiration, resend & cancel actions)
        ├── Leave Management (Apply, My Leave, Workforce Leave, Approval, Cancellation, Balance, Stats, Approved Leave Roster & Attendance Blocking)
        ├── Attendance & Regularization (Check-in/out, My Attendance, Workforce Attendance with date-wise grouping, search & filtering, Hospital Timezone Aware Background Automatic Absence Scheduler, Dual-Model Expectations, Regularizations & Atomic Approval Transactions)
        └── Roster Module (Roster Templates with Active/Inactive lifecycle, Multiple Active Rosters with Roster Switcher, Direct Architecture, Shifts, Duty Areas, Draft/Published/History Lifecycle, Delete Draft Roster, Populated Staff Contact Info & Phone Display, Single-Page PDF Summary Exporter, Approved Leave Blocking, UnifiedCalendar)
```

---

## 2. CORE DATA MODEL & CONCEPTS

### User (`models/user.model.js`)
- **Purpose:** Represents an authentication login identity.
- **Fields:** `name`, `email`, `password`, `role`, `status`, `hospitalId`, `employeeId`, `modules[]`, `permissions[]`, `createdBy`, timestamps.
- **Roles:** `super_admin`, `admin`, `employee`. (HR is an Employee Position with `role = employee` and granted permissions).
- **Validation:** Enforces password confirmation during registration and password reset; stateless JWT with token revocation (`RevokedToken` model) upon logout.
- **Note:** `permissions[]` stores explicit user-level permissions granted on top of role defaults. `effectivePermissions` are dynamically computed at runtime and NEVER persisted in DB.

### Employee (`models/employee.model.js`) & Invitation (`models/invitation.model.js`)
- **Purpose:** Represents workforce staff records and onboarding invitations for a hospital tenant.
- **Employee Fields:** `employeeId`, `firstName`, `lastName`, `email`, `phone`, `dateOfJoining`, `lastWorkingDay`, `positionId`, `employmentStatus` (ACTIVE/INACTIVE), `hospitalId`, `userId`, `createdBy`, `updatedBy`, timestamps.
- **Invitation Flow (`models/invitation.model.js`):**
  - **Fields:** `hospitalId`, `email`, `firstName`, `lastName`, `phone`, `positionId`, `tokenHash`, `expiresAt`, `status` (`PENDING`, `ACCEPTED`, `CANCELLED`, `EXPIRED`), `createdBy`, `updatedBy`.
  - **Token Security:** SHA-256 hashed token with 48-hour expiration. Public endpoints `/api/v1/hrms/employee-invitations/:token` and `/:token/accept`.
  - **Invitation Actions:**
    - `POST /api/v1/hrms/employees/invitations/:id/resend`: Regenerates token hash and extends validity by 48 hours for pending invitations.
    - `PATCH /api/v1/hrms/employees/invitations/:id/cancel`: Marks invitation as `CANCELLED`, invalidating acceptance attempts.
  - **Cross-Tenant Email Uniqueness:** Prevents inviting an email that is already registered or actively employed across any tenant (`TC-EMAIL-001` through `TC-EMAIL-010`).
- **Last Working Day (LWD) Rules:**
  - `lastWorkingDay` (Date, default `null`) represents the inclusive last day of employment.
  - Evaluated in local Hospital Timezone via `utils/employment.utils.js` (`isEmployeeEmployedOnDate`).
  - LWD is inclusive: an employee is employed through LWD, and employment ends starting the day after LWD.
  - Post-LWD operational access is strictly blocked across Login, JWT middleware (`auth.middleware.js` returning HTTP 403 `EMPLOYMENT_ENDED`), Roster assignments (`EMPLOYMENT_ENDED`), Leaves, and Attendance automatic absence.
  - Historical records (attendance, leaves, rosters) are preserved immutably when LWD is set.
- **Relationship:** Every invited employee receives a Nuvince login account. `Employee.userId` <-> `User.employeeId` form a reciprocal link.

### Position (`models/position.model.js`)
- **Purpose:** Hospital-specific designation master (e.g. HR Manager, Staff Nurse, Medical Officer).
- **Fields:** `hospitalId`, `name`, `defaultModules[]`, `status` (active/inactive), `rosterEligible` (Boolean), `workSchedule` (Mixed), timestamps.
- **Scheduling Dual-Model System:**
  - **`rosterEligible = true` (Roster Model):** Expected work schedules and shifts are driven strictly by `RosterAssignment`. `workSchedule` is ignored/cleared. Position UI hides/disables normal schedule configuration.
  - **`rosterEligible = false` (Normal Employment Model):** Expected work schedules are defined directly on the Position via `workSchedule`.
- **Structured `workSchedule` Schema:**
  - Per-day key-value object (`monday` through `sunday`).
  - Day structure: `{ workingDay: Boolean, startTime: "HH:mm" | null, endTime: "HH:mm" | null }`. Non-working days have `startTime` and `endTime` set to `null`.
  - Supports backward compatibility with legacy boolean schedule maps (`{ monday: true, tuesday: true, ... }`).
  - Model utilizes `Schema.Types.Mixed` and explicit `position.markModified('workSchedule')` in services to ensure full MongoDB object persistence.

### Hospital (`models/hospital.model.js`)
- **Purpose:** Multi-tenant boundary. Every hospital-scoped resource is filtered by `hospitalId`.
- **Fields:** `name`, `code`, `address`, `phone`, `email`, `timezone` (IANA string, default `"Asia/Kolkata"`), status flags, timestamps.
- **Timezone Rules:** Hospital `timezone` dictates local working hours, shift start/end times, and automatic absence evaluation cutoffs. Evaluated via `utils/timezone.utils.js`.

### Hospital Structure (`models/floor.model.js`, `models/room.model.js`)
- **Hierarchy:** `Hospital` -> `Floor` -> `Room`.
- Part of Core Platform, independent of Roster Duty Areas.

### Roster Models (`models/roster.model.js`, `models/rosterTemplate.model.js`, `models/rosterAssignment.model.js`)
- **Roster & Template Architecture:**
  - `RosterTemplate`: Operational duty layout master (`title`, `description`, `status` [ACTIVE / INACTIVE], `columns[]`, `dutyAreas[]`). Deactivation toggles `status: INACTIVE` and retains the template visible in Template Management with an `Activate` action.
  - `Roster`: Duty roster instance (`title`, `startDate`, `endDate`, `status` [DRAFT / PUBLISHED], `columns[]`, `dutyAreas[]`, `sharedWith[]`, `comments[]`).
- **Multiple Active Rosters & Roster Switcher:** Multiple published rosters can coexist simultaneously in the same date range. The Current Roster UI provides a dropdown roster switcher enabling users to select and view any active roster.
- **Populated Staff Contact Details:** Assignments populate staff name, email, and phone number (`phone`), providing direct contact visibility in roster duty cells and mobile-responsive views.
- **My Roster (Current vs History):** Computes two independent datasets: Current/Upcoming (`assignment.date >= TODAY`) and Past Duty History (`assignment.date < TODAY`). Past history state does not restrict viewing current/upcoming duties.
- **Delete Draft Roster:** Draft rosters can be permanently deleted by authorized managers (`roster.manage`) via `DELETE /api/v1/rosters/:id`.
- **Roster History:** Published rosters past their end date move to **Roster History** (`GET /api/v1/rosters/history`). Historical rosters are strictly **read-only** (API rejects updates, deletion, or re-publishing with HTTP `409 Conflict`).
- **Single-Page Roster PDF Export:** Downloads an exact single-page summary PDF regardless of roster date range. Employees are deduplicated per Shift + Duty Area cell (no repeating daily entries), and unassigned cells remain empty without printing "No Staff Assigned".
- **RosterAssignment:** Staff duty record (`rosterId`, `hospitalId`, `employeeId`, `date`, `columnId`, `shiftTitle`, `startTime`, `endTime`, `dutyArea`, `notes`). Identity links to `Employee` via `employeeId` without duplicating personal info.
- **Duty Area:** Dynamic operational duty area rows (e.g. "General Ward Female + Male + Day Care", "NICU 2nd Floor", "PICU", "ICU 3rd Floor", "OT"). Does NOT depend on Floor/Room structure.

### Leave (`models/leave.model.js`) & Leave ↔ Roster / Attendance Integration
- **Purpose:** Employee leave request management with strict roster assignment blocking and attendance absence suppression for approved leaves.
- **Approved Leave Blocking Rule:** An **APPROVED** leave (`status: { $in: ["APPROVED", "approved"] }`) strictly **BLOCKS** roster assignment creation or modification for all dates within the leave period (`startDate` to `endDate`).
  - Single-date assignment and update endpoints throw HTTP `409 Conflict` (`code: "LEAVE_CONFLICT"`).
  - Bulk range assignment skips dates with approved leaves (and returns `approvedLeaveConflicts`); if all dates in range are blocked, throws HTTP `409 Conflict`.
  - Zero `RosterAssignment` documents are generated for blocked dates.
  - Pending leaves emit non-blocking `leaveWarnings`. Rejected and Cancelled leaves are ignored.
- **Leave ↔ Automatic Absence Rule:** Approved leave entries prevent automatic absence marking for both rostered and normal employment scheduled employees.
- **Permissions:** `leave.apply`, `leave.view_own`, `leave.cancel_own` (default self-service), `leave.view_workforce`, `leave.approve`, `leave.manage` (workforce management).

### Attendance & Background Automatic Absence (`models/attendance.model.js`, `models/attendanceRegularization.model.js`)
- **Purpose:** Real-time clock-in/out tracking, atomic regularization approval transactions, date-wise workforce attendance table, and automated background absence scheduler.
- **Workforce Attendance Table:**
  - Date-wise collapsible grouping displaying daily attendance metrics.
  - Search by employee name, employee code, or position title.
  - Filter by date range and status (`PRESENT`, `HALF_DAY`, `ABSENT`).
- **Dual-Model Attendance Expectation Logic:**
  - **Roster-Eligible Employees (`rosterEligible = true`):** Evaluated against active published roster assignments. If shift end time has passed in hospital timezone without clock-in and no approved leave exists, marked `ABSENT`.
  - **Normal Employment Employees (`rosterEligible = false`):** Evaluated against Position `workSchedule`. If today is marked `workingDay = true` and scheduled shift end time (or calendar day end) has passed in hospital timezone without clock-in and no approved leave exists, marked `ABSENT`. Non-working days (`workingDay = false`) produce zero absence records.
- **Regularization Workflow:** Employee submits clock-in/out regularization; managers approve/reject with atomic database rollback guarantees.
- **Scheduler Robustness:** Empty or missing arguments (`processAutomaticAbsence()`) normalize `hospitalId` gracefully without casting empty objects to Mongoose `ObjectId`.

---

## 3. ACCESS MANAGEMENT & PERMISSION MODEL

- **Canonical Roles:** `super_admin`, `admin`, `employee`.
- **Default Employee Self-Service Permissions:**
  - `leave.apply`, `leave.view_own`, `leave.cancel_own`
  - `attendance.view_own`
  - `roster.view` (View active workforce hospital duty roster matrix, My Roster, and roster history)
- **Workforce Management Permissions:**
  - `roster.view`: View workforce published hospital duty rosters & roster history
  - `roster.manage`: Create draft rosters, edit draft layout, share drafts for review, assign staff, delete draft rosters, publish rosters, edit active published rosters, manage roster templates
  - `leave.view_workforce`, `leave.approve`, `leave.manage`
  - `attendance.view`, `attendance.regularization.view`, `attendance.regularization.approve`, `attendance.regularization.reject`, `attendance.regularization.manage`, `attendance.manage`
- **Generic Access Management:** Admin manages permissions and module access for workforce users from `/access-management`.
- **Authorization Pipeline:**
  `Authentication` -> `User` -> `Hospital Scope` -> `Role` -> `Module Access` -> `Permission` -> `Controller` -> `Service` -> `Database`

---

## 4. CANONICAL API ROUTES

- **Auth & Profile:**
  - `POST /api/v1/auth/register` (Admin registration)
  - `POST /api/v1/auth/login` (Authentication)
  - `POST /api/v1/auth/logout` (Revokes JWT token)
  - `GET /api/v1/auth/me` (Profile resolution)
  - `PATCH /api/v1/auth/profile` (Update profile)
  - `POST /api/v1/auth/change-password` (Password update)
  - `POST /api/v1/auth/forgot-password` & `POST /api/v1/auth/reset-password`
- **Hospitals & Timezone:**
  - `/api/v1/hospitals/*` (Hospital Details, Administration & IANA Timezone Configuration)
- **Positions Master:**
  - `/api/v1/positions/*` (Position Master CRUD, rosterEligible toggle & structured work schedule)
- **Access Management:**
  - `/api/v1/access-management/*` (Workforce access listing, get & update access)
- **Hospital Structure:**
  - `/api/v1/structure/*` and `/api/v1/hospitals/:id/floors/*` (Hospital Structure, Floors, Rooms)
- **Employees & Invitations:**
  - `GET /api/v1/hrms/employees/stats` (Workforce summary stats)
  - `GET /api/v1/hrms/employees` (List employees with status & position filters)
  - `POST /api/v1/hrms/employees/invite` (Send staff invitation)
  - `GET /api/v1/hrms/employees/invitations` (List pending hospital invitations)
  - `PATCH /api/v1/hrms/employees/invitations/:id/cancel` (Cancel pending invitation)
  - `POST /api/v1/hrms/employees/invitations/:id/resend` (Resend pending invitation)
  - `GET /api/v1/hrms/employee-invitations/:token` (Public token verification)
  - `POST /api/v1/hrms/employee-invitations/:token/accept` (Public invitation onboarding)
  - `GET /api/v1/hrms/employees/:id` (Employee record)
  - `PATCH /api/v1/hrms/employees/:id` (Update profile details)
  - `PATCH /api/v1/hrms/employees/:id/status` (Activate/Deactivate employee)
- **Leave Management:**
  - `POST /api/v1/hrms/leaves` (Submit leave application)
  - `GET /api/v1/hrms/leaves/my` (Self-service leave history)
  - `PATCH /api/v1/hrms/leaves/:id/cancel` (Cancel pending leave)
  - `GET /api/v1/hrms/leaves` (Workforce leave applications)
  - `PATCH /api/v1/hrms/leaves/:id/approve` & `PATCH /api/v1/hrms/leaves/:id/reject`
  - `GET /api/v1/hrms/leaves/balance` & `GET /api/v1/hrms/leaves/stats`
- **Attendance & Regularization:**
  - `POST /api/v1/hrms/attendance/check-in` & `POST /api/v1/hrms/attendance/check-out`
  - `GET /api/v1/hrms/attendance/today` & `GET /api/v1/hrms/attendance/my`
  - `GET /api/v1/hrms/attendance` (Workforce attendance records)
  - `GET /api/v1/hrms/attendance/stats` (Attendance statistics)
  - `POST /api/v1/hrms/attendance/regularization` (Submit regularization)
  - `GET /api/v1/hrms/attendance/regularization/my` & `PATCH /api/v1/hrms/attendance/regularization/:id/cancel`
  - `GET /api/v1/hrms/attendance/regularization` (Workforce regularization requests)
  - `PATCH /api/v1/hrms/attendance/regularization/:id/approve` & `PATCH /api/v1/hrms/attendance/regularization/:id/reject`
- **Rosters & Templates:**
  - `/api/v1/rosters/*` (List, Get, History, Create, Update Draft, Delete Draft, Publish, Review Comments, Assignments, Bulk Range Assignments, My Roster)
  - `/api/v1/roster-templates/*` (List, Get, Create, Update, Duplicate, Activate/Deactivate, Delete)
- **Platform Modules & Super Admin:**
  - `/api/v1/modules/*` (Module Catalog & Access)
  - `/api/v1/super-admin/*` (Super admin platform administration)

---

## 5. FRONTEND STRUCTURE & DESIGN SYSTEM

- **Design System & Tokens (`theme/tokens.js`, `theme/themeProvider.js`):**
  - Brand Palette: Charcoal (`#252525`), Strong Blue (`#0284C7`), Light Blue (`#E0F2FE`), Light Gray (`#F3F4F6` / `#F9FAFB`).
  - Semantic Status Colors: Success (`#1C985A`), Warning (`#DA950B`), Danger (`#DF2225`), Info (`#0080CC`), Neutral (`#6B7280`).
  - Global Notifications: `SnackbarProvider` toast context provider.
- **Layout & Wrapper Layer (`wrapper/`):**
  - `AppLayout.jsx`: Responsive layout shell with mobile drawer, collapsible sidebar, user session resolution, and automatic logout.
  - `AuthLayout.jsx`: Dedicated layout wrapper for authentication and onboarding views.
  - `KPIGrid.jsx`: Standardized CSS Grid wrapper for high-density metric summary cards.
- **Common UI Primitives (`components/common/`):**
  - `AppInput.jsx` & `AppSelect.jsx`: Custom-styled inputs with consistent focus rings, label states, and error handling.
  - `AppButton.jsx`: Standardized branded buttons (`primary`, `secondary`, `destructive`, `ghost`, `outline`).
  - `AppCheckbox.jsx`: Custom styled checkbox control.
  - `KPICard.jsx` & `KPICardWithAction.jsx`: Metric cards with micro-trends and quick actions.
  - `PageHeader.jsx`: Unified page title bar with breadcrumbs and action button slot.
  - `MainContentLoader.jsx`: Standard loading indicator for asynchronous data transitions.
  - `AppSnackbar.jsx`: Branded toast notification UI.
- **Shared Components (`components/`):**
  - `DataTable.jsx`: Responsive table with card-view collapse on small viewports.
  - `InitialsAvatar.jsx`: Deterministic color avatar from employee name initials.
  - `Modal.jsx` & `ConfirmDialog.jsx`: Standardized modal shells with responsive action bars.
  - `UnifiedCalendar.jsx`: Calendar matrix for leave and attendance visualization.
  - `StatusBadge.jsx`: Color-coded pill badge for status display.
- **Pages:**
  - `pages/auth/` (Landing, Login, Register, ForgotPassword, ResetPassword, AcceptInvitation)
  - `pages/admin/` (AdminDashboard, Hospital, StructurePage, FloorDetails, EmployeesPage, PositionsPage, AccessManagementPage, LeaveManagementPage, AttendancePage, RosterManagementPage)
  - `pages/shared/` (Profile, NotFoundPage)
  - `pages/super-admin/` (SuperAdminDashboard, SuperAdminHospitals, SuperAdminHospitalDetails)

---

## 6. VERIFICATION & TESTING

The test suite in `backend/tests/` covers complete end-to-end functionality, security boundaries, and regression testing:
- `schema.test.js` (Database schema validation and constraints)
- `auth-foundation.test.js` (JWT issuance, password hashing, and token revocation)
- `structure.test.js` (Hospital floor and room hierarchy isolation)
- `permission.test.js` (Capability enforcement and authorization middleware)
- `core-platform.test.js` (Auth, profile, passwords, module catalog)
- `unified-employees.test.js` (Full employee lifecycle, invitation creation, resend, cancel, cross-tenant email uniqueness, and self-protection rules)
- `employee-lwd.test.js` (Employee Last Working Day [LWD] inclusive boundaries, post-LWD auth/JWT blocking, roster assignment blocking, leave suppression, automatic absence suppression, and multi-hospital timezone isolation)
- `datetime-policy.test.js` (Hospital IANA timezone validation, UTC instant resolution, shift timing boundary cutoffs, and timezone policy enforcement)
- `access-management.test.js` (Workforce access management, tenant isolation, and privilege escalation protection)
- `leave-management.test.js` (Leave lifecycle, balance calculation, self-service applications, and workforce manager approvals)
- `attendance.test.js` (Clock-in/out, workforce logs, tenant isolation)
- `attendance-regularization.test.js` (Atomic regularization approval transactions & rollbacks)
- `attendance-leave-integration.test.js` (Comprehensive integration between leave approvals and attendance absence suppression)
- `attendance-normal-schedule.test.js` (Normal employment working-day scheduling, per-day shift timing persistence, position `workSchedule` regression checks, and automatic absence evaluation)
- `roster.test.js` & `roster-r2.test.js` (Roster creation, draft updates, review comments, shift assignments, single-assignment date rules, delete draft roster scenarios, roster history & read-only immutability, roster templates lifecycle, bulk-range assignment, dedicated Leave ↔ Roster assignment blocking)
- `full-qa-audit.test.js` (Complete Access Management permissions matrix audit across all system modules)
