# Vardhan — Project Context

Status: Standardized Target Architecture
Updated: 2026-09-30
Purpose: Single source of truth for developers and coding agents.

---

## 1. PRIMARY ARCHITECTURE

```
VARDHAN SaaS
│
├── CORE PLATFORM
│   ├── Authentication (JWT with token revocation)
│   ├── Hospital / Tenant (Tenant isolation)
│   ├── Users (Authentication & Identity)
│   ├── Roles (super_admin, admin, employee)
│   ├── Permissions (Generic granular capabilities)
│   ├── Module Access (core, hrms, hospital_structure)
│   ├── Access Management (Generic workforce permissions & modules)
│   ├── Hospital Structure
│   │   ├── Floor
│   │   └── Room
│   └── Positions (Hospital designation master with onboarding defaults)
│
└── MODULES
    └── HRMS
        ├── Employees (Workforce staff records)
        ├── Invitations (Single generic invitation system)
        ├── Leave Management (Apply, My Leave, Workforce Leave, Approval, Cancellation, Balance, Stats)
        ├── Attendance & Regularization (Check-in/out, My Attendance, Workforce Attendance, Background Automatic Absence Scheduler, Regularizations & Atomic Approval Transactions)
        └── Roster Module (Simplified Direct Architecture, Shifts, Duty Areas, Draft/Published/History Lifecycle, Delete Draft Roster, Read-Only Immutability, Leave Warnings, UnifiedCalendar, Roster PDF)
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
- **Fields:** `employeeId`, `firstName`, `lastName`, `email`, `phone`, `dateOfJoining`, `positionId`, `employmentStatus` (ACTIVE/INACTIVE), `leavingDate`, `hospitalId`, `userId`, `createdBy`, `updatedBy`, timestamps.
- **Relationship:** Every invited employee receives a Vardhan login account. `Employee.userId` <-> `User.employeeId` form a reciprocal link.

### Position (`models/position.model.js`)
- **Purpose:** Hospital-specific designation master (e.g. HR Manager, Staff Nurse, Medical Officer).
- **Fields:** `hospitalId`, `name`, `defaultModules[]`, `status` (active/inactive), timestamps.
- **Rules:**
  - Independent of system `role`. (Changing Position never alters Role; changing Role never alters Position).
  - Contains `defaultModules[]` used as onboarding defaults when accepting invitations.
  - Inactive positions cannot be selected for new invitations/employees. Existing employees maintain their position links.

### Hospital (`models/hospital.model.js`)
- **Purpose:** Multi-tenant boundary. Every hospital-scoped resource is filtered by `hospitalId`.

### Hospital Structure (`models/floor.model.js`, `models/room.model.js`)
- **Hierarchy:** `Hospital` -> `Floor` -> `Room`.
- Part of Core Platform, independent of Roster Duty Areas.

### Roster Models (`models/roster.model.js`, `models/rosterAssignment.model.js`)
- **Direct Model Architecture:** No `RosterTemplate` model or `rosterTemplateId`. `Roster` stores `columns` (id, title, startTime, endTime, order) and `dutyAreas` (id, name, order) directly on the document.
- **Roster:** Actual duty roster instance (`title`, `startDate`, `endDate`, `status` [DRAFT / PUBLISHED], `columns[]`, `dutyAreas[]`, `sharedWith[]`, `comments[]`).
- **Single Current Roster Rule:** The latest published roster for a hospital (sorted by `startDate DESC`) is the single **Current Published Roster**.
- **Delete Draft Roster:** Draft rosters can be permanently deleted by authorized managers (`roster.manage`) via `DELETE /api/v1/rosters/:id`.
- **Roster History:** Previously published rosters move to **Roster History** (`GET /api/v1/rosters/history`). Historical rosters are strictly **read-only** (API rejects updates, deletion, or re-publishing with HTTP `409 Conflict`).
- **RosterAssignment:** Staff duty record (`rosterId`, `hospitalId`, `employeeId`, `date`, `columnId`, `shiftTitle`, `startTime`, `endTime`, `dutyArea`, `notes`). Identity links to `Employee` via `employeeId` without duplicating personal info.
- **Duty Area:** Dynamic operational duty area rows (e.g. "General Ward Female + Male + Day Care", "NICU 2nd Floor", "PICU", "ICU 3rd Floor", "OT"). Does NOT depend on Floor/Room structure.

### Leave (`models/leave.model.js`)
- **Purpose:** Employee leave request management with conflict warnings during roster assignment.
- **Permissions:** `leave.apply`, `leave.view_own`, `leave.cancel_own` (default self-service), `leave.view_workforce`, `leave.approve`, `leave.manage` (workforce management).

### Attendance & Background Automatic Absence (`models/attendance.model.js`, `models/attendanceRegularization.model.js`)
- **Purpose:** Real-time clock-in/out tracking, atomic regularization approval transactions, and automated background absence scheduler.
- **Rule:** Automatic absence processing runs periodically and uses **ONLY** the single current published roster for each hospital, explicitly excluding historical rosters.

---

## 3. ACCESS MANAGEMENT & PERMISSION MODEL

- **Canonical Roles:** `super_admin`, `admin`, `employee`.
- **Default Employee Self-Service Permissions:**
  - `leave.apply`, `leave.view_own`, `leave.cancel_own`
  - `attendance.view_own`
  - `roster.view` (View current published workforce hospital duty roster matrix and roster history)
- **Workforce Management Permissions:**
  - `roster.view`: View workforce published hospital duty rosters & roster history
  - `roster.manage`: Create draft rosters, edit draft layout, share drafts for review, assign staff, delete draft rosters, publish rosters, edit current published roster
  - `leave.view_workforce`, `leave.approve`, `leave.manage`
  - `attendance.view`, `attendance.regularization.view`, `attendance.regularization.approve`, `attendance.regularization.reject`, `attendance.regularization.manage`, `attendance.manage`
- **Generic Access Management:** Admin manages permissions and module access for workforce users from `/access-management`.
- **Authorization Pipeline:**
  `Authentication` -> `User` -> `Hospital Scope` -> `Role` -> `Module Access` -> `Permission` -> `Controller` -> `Service` -> `Database`

---

## 4. CANONICAL API ROUTES

- `/api/v1/auth/*` (Login, Register, Me, Profile, Password Reset)
- `/api/v1/hospitals/*` (Hospital Details & Administration)
- `/api/v1/positions/*` (Position Master CRUD & Status)
- `/api/v1/access-management/*` (Workforce access listing, get & update access)
- `/api/v1/structure/*` and `/api/v1/hospitals/:id/floors/*` (Hospital Structure)
- `/api/v1/employees/*` and `/api/v1/hrms/employees/*` (Employees & Invitations)
- `/api/v1/hrms/leaves/*` (Leave Applications, Approvals & Cancellations)
- `/api/v1/hrms/attendance/*` (Attendance Clock-In/Out & Regularizations)
- `/api/v1/rosters/*` (List, Get, History, Create, Update Draft, Delete Draft, Publish, Review Comments, Assignments, My Roster)
- `/api/v1/modules/*` (Module Catalog & Access)
- `/api/v1/super-admin/*` (Platform administration)

---

## 5. FRONTEND STRUCTURE

- `pages/auth/` (Landing, Login, Register, ForgotPassword, ResetPassword, AcceptEmployeeInvitation)
- `pages/admin/` (AdminDashboard, Hospital, StructurePage, FloorDetails, PositionsPage, AccessManagementPage, LeaveManagementPage, AttendancePage, RosterManagementPage)
- `pages/shared/` (Profile)
- `pages/super-admin/` (SuperAdminDashboard, SuperAdminHospitals, SuperAdminHospitalDetails)
- `components/` (AppLayout, PageHeader, Sidebar, DataTable, StatCard, StatusBadge, Modal, ConfirmDialog, UnifiedCalendar)
- `services/` (auth.service, employee.service, position.service, accessManagement.service, structure.service, leave.service, attendance.service, roster.service)
- `utils/` (permissions.js with centralized permission registry, rosterPdfGenerator.js for client-side PDF export)

---

## 6. VERIFICATION & TESTING

All flows are covered by automated integration test suites under `backend/tests/`:
- `roster.test.js` (Roster creation, draft updates, review comments, shift assignments, single-assignment date rules, delete draft roster scenarios, roster history & read-only immutability scenarios)
- `full-qa-audit.test.js` (Complete Access Management permissions matrix audit across all system modules)
- `attendance-regularization.test.js` (Atomic regularization approval transactions & rollbacks)
- `attendance.test.js` (Clock-in/out, workforce logs, tenant isolation)
- `leave-management.test.js` (Leave lifecycle, balance, self-service & workforce manager approvals)
- `access-management.test.js` (Access management, tenant isolation, privilege protection)
- `unified-employees.test.js` (Full workforce employee lifecycle & invitations)
- `hospital-structure.test.js` (Structure isolation & hierarchy)
- `core-platform.test.js` (Auth, profile, passwords, module catalog)
