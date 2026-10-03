# Vardhan — Project Context

Status: Standardized Target Architecture
Updated: 2026-10-03
Purpose: Single source of truth for developers and coding agents.

---

## 1. PRIMARY ARCHITECTURE

```
VARDHAN SaaS
│
├── CORE PLATFORM
│   ├── Authentication (JWT with token revocation)
│   ├── Hospital / Tenant (Tenant isolation & IANA Hospital Timezone support)
│   ├── Users (Authentication & Identity)
│   ├── Roles (super_admin, admin, employee)
│   ├── Permissions (Generic granular capabilities)
│   ├── Module Access (core, hrms, hospital_structure)
│   ├── Access Management (Generic workforce permissions & modules)
│   ├── Hospital Structure
│   │   ├── Floor
│   │   └── Room
│   └── Positions (Hospital designation master, rosterEligible toggle, per-day structured work schedule & shift timing)
│
└── MODULES
    └── HRMS
        ├── Employees (Workforce staff records)
        ├── Invitations (Single generic invitation system)
        ├── Leave Management (Apply, My Leave, Workforce Leave, Approval, Cancellation, Balance, Stats, Approved Leave Roster & Attendance Blocking)
        ├── Attendance & Regularization (Check-in/out, My Attendance, Workforce Attendance, Hospital Timezone Aware Background Automatic Absence Scheduler, Dual-Model Attendance Expectations, Regularizations & Atomic Approval Transactions)
        └── Roster Module (Roster Templates with Active/Inactive lifecycle, Multiple Active Rosters with Roster Switcher, Direct Architecture, Shifts, Duty Areas, Draft/Published/History Lifecycle, Delete Draft Roster, Single-Page PDF Summary Exporter, Approved Leave Blocking, UnifiedCalendar)
```

---

## 2. CORE DATA MODEL & CONCEPTS

### User (`models/user.model.js`)
- **Purpose:** Represents an authentication login identity.
- **Fields:** `name`, `email`, `password`, `role`, `status`, `hospitalId`, `employeeId`, `modules[]`, `permissions[]`, `createdBy`, timestamps.
- **Roles:** `super_admin`, `admin`, `employee`. (HR is an Employee Position with `role = employee` and granted permissions).
- **Note:** `permissions[]` stores explicit user-level permissions granted on top of role defaults. `effectivePermissions` are dynamically computed at runtime and NEVER persisted in DB.

### Employee (`models/employee.model.js`)
- **Purpose:** Represents the single workforce staff record in a hospital.
- **Fields:** `employeeId`, `firstName`, `lastName`, `email`, `phone`, `dateOfJoining`, `lastWorkingDay`, `positionId`, `employmentStatus` (ACTIVE/INACTIVE), `hospitalId`, `userId`, `createdBy`, `updatedBy`, timestamps.
- **Last Working Day (LWD) Rules:**
  - `lastWorkingDay` (Date, default `null`) represents the inclusive last day of employment.
  - Employment date checks are evaluated in local Hospital Timezone via `utils/employment.utils.js` (`isEmployeeEmployedOnDate`).
  - LWD is inclusive: an employee is employed through LWD, and employment ends starting the day after LWD.
  - Post-LWD operational access is strictly blocked across Login, JWT middleware (`auth.middleware.js` returning HTTP 403 `EMPLOYMENT_ENDED`), Roster assignments (returns `EMPLOYMENT_ENDED`), Leaves, and Attendance automatic absence.
  - Data Safety: Historical records (attendance, leave, rosters) are never deleted or corrupted when LWD is set.
- **Relationship:** Every invited employee receives a Vardhan login account. `Employee.userId` <-> `User.employeeId` form a reciprocal link.

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
- **Purpose:** Real-time clock-in/out tracking, atomic regularization approval transactions, and automated background absence scheduler.
- **Dual-Model Attendance Expectation Logic:**
  - **Roster-Eligible Employees (`rosterEligible = true`):** Evaluated against active published roster assignments. If shift end time has passed in hospital timezone without clock-in and no approved leave exists, marked `ABSENT`.
  - **Normal Employment Employees (`rosterEligible = false`):** Evaluated against Position `workSchedule`. If today is marked `workingDay = true` and scheduled shift end time (or calendar day end) has passed in hospital timezone without clock-in and no approved leave exists, marked `ABSENT`. Non-working days (`workingDay = false`) produce zero absence records.
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

- `/api/v1/auth/*` (Login, Register, Me, Profile, Password Reset)
- `/api/v1/hospitals/*` (Hospital Details, Administration & Timezone Configuration)
- `/api/v1/positions/*` (Position Master CRUD, rosterEligible toggle & structured work schedule)
- `/api/v1/access-management/*` (Workforce access listing, get & update access)
- `/api/v1/structure/*` and `/api/v1/hospitals/:id/floors/*` (Hospital Structure)
- `/api/v1/employees/*` and `/api/v1/hrms/employees/*` (Employees & Invitations)
- `/api/v1/hrms/leaves/*` (Leave Applications, Approvals & Cancellations)
- `/api/v1/hrms/attendance/*` (Attendance Clock-In/Out, Automatic Absence Execution & Regularizations)
- `/api/v1/rosters/*` (List, Get, History, Create, Update Draft, Delete Draft, Publish, Review Comments, Assignments, Bulk Range Assignments, My Roster)
- `/api/v1/roster-templates/*` (List, Get, Create, Update, Duplicate, Activate/Deactivate, Delete)
- `/api/v1/modules/*` (Module Catalog & Access)
- `/api/v1/super-admin/*` (Platform administration)

---

## 5. FRONTEND STRUCTURE

- `pages/auth/` (Landing, Login, Register, ForgotPassword, ResetPassword, AcceptEmployeeInvitation)
- `pages/admin/` (AdminDashboard, Hospital [with IANA Timezone selector], StructurePage, FloorDetails, PositionsPage [with dynamic Roster Eligible toggle & day/shift timing schedule config], AccessManagementPage, LeaveManagementPage, AttendancePage, RosterManagementPage)
- `pages/shared/` (Profile)
- `pages/super-admin/` (SuperAdminDashboard, SuperAdminHospitals, SuperAdminHospitalDetails)
- `components/` (AppLayout, PageHeader, Sidebar, DataTable, StatCard, StatusBadge, Modal, ConfirmDialog, UnifiedCalendar)
- `services/` (auth.service, employee.service, position.service, accessManagement.service, structure.service, leave.service, attendance.service, roster.service, rosterTemplate.service)
- `utils/` (permissions.js with centralized permission registry, rosterPdfGenerator.js for single-page client-side PDF export)

---

## 6. VERIFICATION & TESTING

All flows are covered by automated integration test suites under `backend/tests/`:
- `employee-lwd.test.js` (Employee Last Working Day [LWD] inclusive boundaries, centralized employment access rules, post-LWD auth/JWT blocking, roster assignment blocking, leave suppression, automatic absence suppression, and multi-hospital timezone isolation)
- `datetime-policy.test.js` (Hospital IANA timezone validation, UTC instant resolution, shift timing boundary cutoffs, and timezone policy enforcement)
- `attendance-normal-schedule.test.js` (Normal employment working-day scheduling, per-day shift timing persistence, position `workSchedule` regression checks, and automatic absence evaluation)
- `roster.test.js` (Roster creation, draft updates, review comments, shift assignments, single-assignment date rules, delete draft roster scenarios, roster history & read-only immutability, roster templates lifecycle, bulk-range assignment, dedicated Leave ↔ Roster assignment blocking tests)
- `full-qa-audit.test.js` (Complete Access Management permissions matrix audit across all system modules)
- `attendance-regularization.test.js` (Atomic regularization approval transactions & rollbacks)
- `attendance.test.js` (Clock-in/out, workforce logs, tenant isolation)
- `leave-management.test.js` (Leave lifecycle, balance, self-service & workforce manager approvals)
- `access-management.test.js` (Access management, tenant isolation, privilege protection)
- `unified-employees.test.js` (Full workforce employee lifecycle & invitations)
- `hospital-structure.test.js` (Structure isolation & hierarchy)
- `core-platform.test.js` (Auth, profile, passwords, module catalog)


