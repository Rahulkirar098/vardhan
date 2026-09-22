# Vardhan — Project Context

Status: Standardized Target Architecture
Updated: 2026-09-22
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
│   ├── Roles (super_admin, admin, hr, employee)
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
        └── Invitations (Single generic invitation system)
        ├── Attendance (Future)
        ├── Leave (Future)
        └── Roster (Future)
```

---

## 2. CORE DATA MODEL & CONCEPTS

### User (`models/user.model.js`)
- **Purpose:** Represents an authentication login identity.
- **Fields:** `name`, `email`, `password`, `role`, `status`, `hospitalId`, `employeeId`, `modules[]`, `permissions[]`, `createdBy`, timestamps.
- **Roles:** `super_admin`, `admin`, `hr`, `employee`.
- **Note:** `permissions[]` stores explicit user-level permissions granted on top of role defaults. `effectivePermissions` are dynamically computed at runtime and NEVER persisted in DB.

### Employee (`models/employee.model.js`)
- **Purpose:** Represents the single workforce staff record in a hospital.
- **Fields:** `employeeId`, `firstName`, `lastName`, `email`, `phone`, `dateOfJoining`, `positionId`, `employmentStatus` (ACTIVE/INACTIVE), `leavingDate`, `hospitalId`, `userId`, `createdBy`, `updatedBy`, timestamps.
- **Relationship:** Every invited employee receives a Vardhan login account. `Employee.userId` <-> `User.employeeId` form a reciprocal link.

### Position (`models/position.model.js`)
- **Purpose:** Hospital-specific designation master.
- **Fields:** `hospitalId`, `name`, `defaultModules[]`, `status` (active/inactive), timestamps.
- **Rules:**
  - Independent of system `role`. (Changing Position never alters Role; changing Role never alters Position).
  - Contains `defaultModules[]` used as onboarding defaults when accepting invitations.
  - Inactive positions cannot be selected for new invitations/employees. Existing employees maintain their position links.

### Hospital (`models/hospital.model.js`)
- **Purpose:** Multi-tenant boundary. Every hospital-scoped resource is filtered by `hospitalId`.

### Hospital Structure (`models/floor.model.js`, `models/room.model.js`)
- **Hierarchy:** `Hospital` -> `Floor` -> `Room`.
- Part of Core Platform, not HRMS.

### Invitation (`models/invitation.model.js`)
- **Purpose:** Unified invitation system for all workforce roles (`employee`, `hr`).
- **Security:** Stores SHA-256 `tokenHash` and expiration. Raw tokens are never stored in the database.
- **Creator:** `createdBy` is automatically populated from the authenticated user.

---

## 3. ACCESS MANAGEMENT & PERMISSION MODEL

- **Generic Access Management:** Admin manages permissions and module access for ANY workforce user (`hr` or `employee`) from `/access-management`.
- **Decoupled Responsibilities:**
  - **Employee Edit:** Only updates employee profile fields (`firstName`, `lastName`, `email`, `phone`, `dateOfJoining`, `positionId` if authorized).
  - **Access Management:** Exclusively manages `modules` and `permissions`.
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
- `/api/v1/modules/*` (Module Catalog & Access)
- `/api/v1/super-admin/*` (Platform administration)

---

## 5. FRONTEND STRUCTURE

- `pages/auth/` (Landing, Login, Register, ForgotPassword, ResetPassword, AcceptEmployeeInvitation)
- `pages/admin/` (AdminDashboard, Hospital, StructurePage, FloorDetails, PositionsPage, AccessManagementPage)
- `pages/hr/` (HRDashboard, HRProfile, MyHospital, EmployeesPage)
- `pages/shared/` (Profile)
- `pages/super-admin/` (SuperAdminDashboard, SuperAdminHospitals, SuperAdminHospitalDetails)
- `components/` (AppLayout, Navbar, Sidebar, DataTable, StatCard, StatusBadge, Modal, ConfirmDialog)
- `services/` (auth.service, employee.service, position.service, accessManagement.service, structure.service, hospital.service)
- `utils/` (permissions.js with centralized permission registry)

---

## 6. VERIFICATION & TESTING

All flows are covered by automated integration test suites under `backend/tests/`:
- `access-management.test.js` (Access management, tenant isolation, privilege protection)
- `employee-lifecycle-e2e.test.js` (Full lifecycle, invitations, edit, deactivation/reactivation)
- `hr-profile-hospital.test.js` (HR profile, hospital assignment)
- `core-platform.test.js` (Auth, profile, passwords, module catalog)
- `hr-permission-flow.test.js` (Role & permission flows)
- `phase3-role-permission.test.js` (Granular capability checks)
- `hospital-structure.test.js` (Structure isolation & hierarchy)
