# Vardhan — Project Context

Status: Repository Audit
Generated: 2026-09-21
Purpose: Single source of truth for developers and coding agents.
Important: This document describes the repository as inspected at the time of generation. It must be updated when architecture changes.

---

## 1. PROJECT OVERVIEW

- **Product Name:** Vardhan (Historically referred to as CloudCherry; see Legacy Naming).
- **Description:** A full-stack hospital management SaaS platform designed for role-based hospital administration, structured hospital hierarchies (Floors and Rooms), and secure invitation-based onboarding for HR and Employees.
- **High-level Architecture:** Client-server model with a RESTful API, separated into Core Platform capabilities (Auth, Structure, Permissions) and Business Modules (HRMS).
- **Backend Stack:** Node.js, Express.js, MongoDB (Mongoose), JWT, bcryptjs.
- **Frontend Stack:** React 19, Vite, Material UI (MUI), React Router DOM, Axios.
- **Authentication:** JWT-based stateless authentication with token revocation for secure logout.

---

## 2. CURRENT ARCHITECTURE

The repository architecture is divided into the Core Platform and Business Modules.

**VARDHAN SaaS**
```
├── CORE PLATFORM
│   ├── Hospital / Tenant (Implemented)
│   ├── Authentication (Implemented)
│   ├── Users (Implemented)
│   ├── Roles (Implemented)
│   ├── Permissions (Implemented)
│   ├── Hospital Structure
│   │   ├── Floor (Implemented)
│   │   └── Room (Implemented)
│   └── Module Foundation (Implemented)
│
└── BUSINESS MODULES
    └── HRMS
        ├── HR Access (Implemented)
        ├── Employees (Implemented)
        ├── Reporting Manager (Not implemented)
        ├── Roster (Not implemented)
        ├── Attendance (Not implemented)
        └── Leave (Not implemented)
```

---

## 3. ACTUAL FOLDER STRUCTURE

The current authoritative folder structure as inspected in the repository:

**Backend (`backend/src/`)**
- `config/` (modules.config.js, permissions.js, rolePermissions.js)
- `controllers/` (auth, employee, hospital, hr, module, structure, superAdmin)
- `middleware/` (auth, module, permission, role)
- `migrations/` (migrateHrInvitationsToGeneric.js)
- `models/` (employee, floor, hospital, invitation, position, revokedToken, room, user)
- `routes/` (auth, employee, hospital, hr, module, position, structure, superAdmin)
- `services/` (employee, invitation, structure)
- `utils/` (jwt, mail, password, validate)
- `tests/` (Various Jest tests)

**Frontend (`frontend/src/`)**
- `components/` (AppLayout, AuthLayout, ConfirmDialog, DataTable, EmptyState, ErrorState, GlassCard, InfoRow, InitialsAvatar, Loading, Modal, Navbar, PageHeader, SectionCard, Sidebar, StatCard, StatusBadge, sidebar.config.js)
- `pages/`
  - `auth/` (AcceptEmployeeInvitation, AcceptHRInvitation, ForgotPassword, Landing, Login, Register, ResetPassword)
  - `admin/` (AdminDashboard, FloorDetails, Hospital, HRManagement, PositionsPage, StructurePage)
  - `hr/` (EmployeesPage, HRDashboard, HRProfile, MyHospital)
  - `shared/` (Profile)
  - `super-admin/` (SuperAdminDashboard, SuperAdminHospitalDetails, SuperAdminHospitals)
- `routes/` (index.jsx)
- `services/` (api/, auth, employee, hospital, hr, structure, superAdmin)
- `theme/` (theme.js)
- `utils/` (permissions.js)

---

## 4. NAMING CONVENTION

- **Model Files:** `camelCase.model.js` (e.g., `invitation.model.js`)
- **Controller Files:** `camelCase.controller.js` (e.g., `hr.controller.js`)
- **Service Files:** `camelCase.service.js` (e.g., `employee.service.js`)
- **Route Files:** `camelCase.route.js` (e.g., `hospital.route.js`)
- **Middleware Files:** `camelCase.middleware.js` (e.g., `auth.middleware.js`)
- **Frontend Components:** `PascalCase.jsx` (e.g., `SectionCard.jsx`)
- **Frontend Pages:** `PascalCase.jsx` or descriptive grouped names (e.g., `HRDashboard.jsx`)
- **Frontend Services:** `camelCase.service.js` (e.g., `employee.service.js`)

**Naming Inconsistencies:**
- **Product Name:** The codebase is transitioning from "CloudCherry" (found in old docs and directory names) to "Vardhan".
- **Invitations:** `hrInvitation.model.js` and `employeeInvitation.model.js` were deleted and safely migrated to a single `invitation.model.js` schema.

---

## 5. DATABASE MODELS

### `User` (user.model.js)
- **Purpose:** Represents a login account (Vardhan User).
- **Fields:** name, email, password, role, status, hospitalId, permissions, modules.
- **Relationships:** hospitalId (ref: Hospital).
- **Status:** Active.

### `Hospital` (hospital.model.js)
- **Purpose:** Multi-tenant boundary.
- **Fields:** name, code, contactEmail, adminId, status.
- **Relationships:** adminId (ref: User).
- **Status:** Active.

### `Floor` (floor.model.js)
- **Purpose:** Top-level hierarchy for Hospital Structure.
- **Fields:** name, code, status, hospitalId.
- **Relationships:** hospitalId (ref: Hospital).
- **Status:** Active.

### `Room` (room.model.js)
- **Purpose:** Second-level hierarchy belonging to a Floor.
- **Fields:** roomNumber, type, status, hospitalId, floorId.
- **Relationships:** hospitalId (ref: Hospital), floorId (ref: Floor).
- **Status:** Active.

### `Invitation` (invitation.model.js)
- **Purpose:** Generic invitation system supporting HR and Employee invites.
- **Fields:** hospitalId, type ("HR" | "EMPLOYEE"), email, tokenHash, expiresAt, status.
- **Relationships:** hospitalId (ref: Hospital), invitedBy (ref: User).
- **Status:** Active.

### `Employee` (employee.model.js)
- **Purpose:** Represents an HRMS Employee (SEPARATE from User).
- **Fields:** employeeId, firstName, lastName, email, employmentStatus, userId.
- **Relationships:** hospitalId (ref: Hospital), userId (ref: User - optional).
- **Status:** Active.

### `RevokedToken` (revokedToken.model.js)
- **Purpose:** Security model to blacklist JWT tokens upon explicit logout before they expire.

### `Position` (position.model.js)
- **Purpose:** Stores employee job titles/designations scoped per hospital. Used instead of roles for descriptive job titles.

---

## 6. USER VS EMPLOYEE

**USER (`user.model.js`):**
- Used strictly for Vardhan Platform Login and Authentication.
- Has a `role` (super_admin, admin, hr) and `permissions` array.
- Granted access to application modules.

**EMPLOYEE (`employee.model.js`):**
- Represents HRMS employee identity and employment data.
- Contains `employeeId`, `designation`, `dateOfJoining`, `employmentStatus`.
- Includes an optional `userId` field to link to a Vardhan login account, but **employees do not automatically receive Vardhan login accounts**.

---

## 7. INVITATION ARCHITECTURE

The application uses a single centralized `Invitation` model (`invitation.model.js`) for both HR and Employees.
- **Token:** Cryptographically random 32-byte hex string.
- **Storage:** Only the `tokenHash` (SHA-256) is stored in the database.
- **Service:** `invitation.service.js` centralizes token generation, hashing, and expiry calculations.
- **Legacy Models:** `hrInvitation.model.js` and `employeeInvitation.model.js` have been successfully migrated and deleted.
- **Status:** `pending`, `accepted`, `expired`, `cancelled`.

---

## 8. INVITATION DATA FLOW

**HR Invitation:**
1. Admin triggers invite via API (`POST /api/v1/hr/invite`).
2. `Invitation` record created (`type: "HR"`), token generated and sent.
3. HR accepts invitation link.
4. Vardhan `User` account created for HR (`role: "hr"`).
5. HR logs in.

**Employee Invitation:**
1. HR adds an employee and triggers invite (`POST /api/v1/hrms/employees`).
2. `Employee` record created (without a `userId`).
3. `Invitation` record created (`type: "EMPLOYEE"`), token generated and sent.
4. Employee accesses secure link to view onboarding details (non-user account).

---

## 9. AUTHENTICATION

- **Implementation:** Stateless JWT.
- **Login:** `/api/v1/auth/login` issues an HttpOnly cookie or Bearer token.
- **Logout:** `/api/v1/auth/logout` revokes the token (stored in `RevokedToken`).
- **Profile:** `/api/v1/auth/me` retrieves current session.
- **Security:** bcryptjs for password hashing. Password reset and change endpoints exist.
- **Middleware:** `auth.middleware.js` verifies token and session validity.

---

## 10. ROLES

- **`super_admin`:** Manages the entire Vardhan SaaS platform. Can view all hospitals. Cannot mutate hospital data.
- **`admin`:** Owns a single Hospital tenant. Full access to hospital structure and HR management.
- **`hr`:** Hospital staff. Access strictly scoped to their hospital. Permissions define exact capabilities.

*Note: Roles like `nurse`, `doctor`, `patient`, `user` might exist in historical enums but are unused and legacy.*

---

## 11. PERMISSIONS

- **Storage:** An array of strings on the `User` document.
- **Defaults:** Defined in `backend/src/config/rolePermissions.js`.
- **System:** Primarily user-specific but heavily influenced by role defaults.
- **Middleware:** `permission.middleware.js` enforces specific actions.
- **Examples:** `structure.view`, `structure.create`, `structure.update`, `structure.delete`.
- **HR Employee Access:** The `hr` role has `employee.*` permissions natively seeded in `rolePermissions.js`. However, HR users still cannot access employee data unless they are explicitly granted the `hrms` module, due to the `module.middleware.js` guard.

---

## 12. MODULE ACCESS

- **Definition:** Which major sections of the app a user can access (e.g., "core", "hrms", "hospital_structure").
- **Storage:** An array of strings on the `User` document (`modules`).
- **Difference from Permissions:** Module access dictates sidebar visibility and high-level routing; Permissions dictate granular actions (create, edit, delete).
- **Middleware:** `module.middleware.js` protects route groups.

---

## 13. AUTHORIZATION PIPELINE

**Request Flow:**
1. `auth.middleware.js` (Is the user logged in? Is the token valid?)
2. `role.middleware.js` (Does the user have an allowed role?)
3. `module.middleware.js` (Does the user have access to this application module?)
4. `permission.middleware.js` (Does the user have specific action permission?)
5. `Controller` (Hospital scope isolated via `req.user.hospitalId`)
6. `Service`
7. `Database`

---

## 14. HOSPITAL / TENANT ISOLATION

- **Mechanism:** Nearly every query relies on `hospitalId`.
- **Enforcement:** Controllers automatically inject `req.user.hospitalId` into queries for admins and HR users.
- **Super Admin:** Does not have a `hospitalId`, bypasses isolation, but UI is read-only.

---

## 15. HOSPITAL STRUCTURE

- **Status:** Fully implemented as part of the CORE PLATFORM.
- **Hierarchy:** Hospital → Floor → Room.
- **Deactivation:** Floors cannot be deactivated if they contain active Rooms (409 Conflict).
- **Not HRMS:** This structure serves the entire platform, not just HRMS.

---

## 16. HRMS

- **HR Access:** Implemented (Phase 2 - Rebuilt to use `Employee` model + `hr` role user. `HR` distinct model removed).
- **Employees:** Implemented (Phase 2 - Includes generic invitations, Employee model, creation, status toggling, and granular position updating).
- **Positions:** Implemented (Position Master module for CRUD of hospital-scoped designations).
- **Reporting Manager:** Not implemented.
- **Roster:** Not implemented.
- **Attendance:** Not implemented.
- **Leave:** Not implemented.

---

## 17. API MAP

*(Abridged Summary of Active Areas)*
| Area | Path | Purpose |
|------|------|---------|
| Auth | `/api/v1/auth/*` | Login, Register, Profile, Passwords |
| Hospital | `/api/v1/hospitals/*` | Create hospital, View Details |
| Structure | `/api/v1/hospitals/:id/floors/*` | Floors, Rooms |
| HR | `/api/v1/hr/*` | Invite HR, Grant Permissions |
| HRMS (Employees) | `/api/v1/hrms/employees/*` | Employee CRUD, Invites |
| Super Admin | `/api/v1/super-admin/*` | Platform Metrics, Directories |

---

## 18. FRONTEND ROUTES

- **Public:** Landing, Login, Register, Forgot Password, Accept Invitations.
- **Admin:** `/dashboard`, `/hospital`, `/structure`, `/hr-management`.
- **HR:** `/hr/dashboard`, `/hr/hospital`, `/hr/employees`.
- **Super Admin:** `/super-admin/dashboard`, `/super-admin/hospitals`.
- **Guards:** Routes are protected by `ProtectedRoute.jsx` checking authentication, roles, and module access.

---

## 19. FRONTEND ARCHITECTURE

- **Shell:** `AppLayout` composes `Navbar` and `Sidebar`.
- **UI Primitives:** `SectionCard`, `StatCard`, `DataTable`, `StatusBadge`, `InfoRow`, `Modal`, `ConfirmDialog`.
- **API:** Centralized `api/client.js` Axios instance with JWT injection and 401 interceptors.
- **Theme:** Strict monochrome Material UI theme (`theme.js`).

---

## 20. CURRENT FEATURE STATUS

| Feature | Status | Evidence |
|---------|--------|----------|
| Authentication | COMPLETE | Auth routes, JWT, tests pass |
| Hospital | COMPLETE | Hospital model, isolation logic |
| Hospital Structure | COMPLETE | Floors, Rooms, tests pass |
| Roles | COMPLETE | Middleware, role defaults |
| Permissions | COMPLETE | Middleware, UI hooks |
| Module Foundation | COMPLETE | Config, Middleware, Sidebar |
| HR Access | COMPLETE | Invites, Dashboards |
| Employee Management | COMPLETE | Employee model, Generic Invites |
| Reporting Manager | NOT STARTED | Missing from codebase |
| Roster | NOT STARTED | Missing from codebase |
| Attendance | NOT STARTED | Missing from codebase |
| Leave | NOT STARTED | Missing from codebase |

---

## 21. LEGACY / DEPRECATED CODE

- **Legacy Model (`Department`):** Deprecated in favor of Hospital Structure. Code references may still exist in older controllers/views, but it is not active architecture.
- **Unused Roles:** `nurse`, `doctor`, `patient`, `user` exist in user model enum but have no logic or routing.
- **`hrInvitation` / `employeeInvitation`:** Deleted successfully. Replaced by `invitation.model.js`.

---

## 22. MIGRATION STATUS

- **`migrateHrInvitationsToGeneric.js`:**
  - **Purpose:** Migrate old `HrInvitation` documents to the generic `Invitation` model.
  - **Status:** Execution successful against test/dev data during Phase 2. Safe to keep as a historical record, but no longer actively run as old models are deleted.

---

## 23. KNOWN INCONSISTENCIES

| Area | Current Code | Documentation | Issue |
|------|--------------|---------------|-------|
| Product Name | "Vardhan" used in newer features | "cloudcherry" in git dir/legacy docs | Historical naming clash |
| Department | None active | Mentioned in older documentation | Phase 2 replaced it |

---

## 24. DEVELOPMENT RULES

1. **Architecture Boundaries:** Do not change Core Platform logic while building HRMS modules.
2. **Hospital Scope:** Do not bypass `req.user.hospitalId` filtering in APIs.
3. **No Duplicate Invitations:** Always use the generic `Invitation` model.
4. **Backend Authority:** Backend middleware determines authorization; frontend checks are solely for UX masking.
5. **No Early Implementation:** Implement only the current phase of the roadmap.
6. **Shared UI:** Always reuse existing components (`SectionCard`, `DataTable`, `StatusBadge`) instead of inventing new layouts.

---

## 25. FUTURE ROADMAP

- **CORE PLATFORM** (COMPLETED)
- **HRMS Core (HR Access + Employees)** (COMPLETED)
- **Reporting Manager** (UPCOMING - PHASE 5)
- **Roster, Shifts, Attendance & Leave** (UPCOMING - PHASE 6)

---

## 26. WHAT NOT TO CHANGE

**CORE PLATFORM (Do Not Modify for HRMS Tasks):**
- Authentication & JWT Logic
- Hospital Tenant Logic
- Role & Permission System Foundations
- Hospital Structure (Floors/Rooms)
- System Module Foundation

**HRMS MODULE (Actively Evolving):**
- Employee Management
- Future HRMS capabilities (Roster, Leave, etc.)

---

## 27. OPEN QUESTIONS

*No major open questions at this time. Architecture is verified via tests.*
