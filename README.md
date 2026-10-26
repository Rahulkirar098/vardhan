# Nuvince

A full-stack hospital management SaaS platform built with Node.js, Express, MongoDB, React, Vite, and Material UI. Designed for role-based hospital administration, multi-tenant isolation, hospital structure (floors and rooms), position management with dual-model attendance expectations (roster-based vs normal working days/shift timing), IANA hospital timezone support, workforce employee management with invitations lifecycle and Last Working Day (LWD) enforcement, leave management, attendance & regularization with date-wise grouping and hospital timezone-aware background automatic absence scheduling, simplified duty roster planning with staff contact visibility, roster history auditing, and generic access management.

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" alt="Node.js 18+" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/MUI-9.x-007FFF?logo=mui&logoColor=white" alt="MUI" />
</p>

---

## 🏛️ System Architecture

```
NUVINCE SaaS
│
├── CORE PLATFORM
│   ├── Authentication (JWT with token revocation, password confirmation & reset)
│   ├── Hospital / Tenant (Strict tenant isolation & IANA Hospital Timezone support)
│   ├── Users (Authentication & Identity)
│   ├── Roles (super_admin, admin, employee)
│   ├── Permissions (Centralized granular capability registry)
│   ├── Module Access (core, hrms, hospital_structure)
│   ├── Access Management (Workforce permissions & module configuration)
│   ├── Hospital Structure
│   │   ├── Floor
│   │   └── Room
│   └── Positions (Hospital designation master, rosterEligible flag & per-day work schedule/timing)
│
└── MODULES
    └── HRMS
        ├── Employees (Workforce staff record reciprocal to User, LWD boundary enforcement, cross-tenant email uniqueness checks)
        ├── Invitations (Centralized invitation flow with SHA-256 token hashing, 48h expiration, resend & cancel actions)
        ├── Leave Management (Apply, My Leave, Approval, Balance, Stats, Workforce Leave, Approved Leave Roster & Attendance Blocking)
        ├── Attendance & Regularization (Clock-In/Out, Regularization Requests & Atomic Approvals, Date-Wise Grouping, Search & Filtering, Dual-Model Expectations & Hospital Timezone-Aware Background Scheduler)
        └── Roster Module (Simplified Direct Architecture, Multiple Active Rosters with Roster Switcher, Shift Columns, Duty Areas, Draft/Current/History Lifecycle, Delete Draft, Immutability, Leave Warnings, Populated Staff Contact Info & Phone Display, Single-Page PDF Summary Export)
```

---

## ✨ Features

### 1. Authentication & Security
- Admin registration and multi-role login (`super_admin`, `admin`, `employee`).
- Password confirmation validation on registration and password reset.
- Stateless JWT-based authentication with `RevokedToken` support for explicit logout.
- In-app profile updates and password changes.
- Password reset via secure email tokens.
- Strict tenant and hospital isolation enforced server-side on all tenant queries.

### 2. Hospital Administration & Multi-Tenancy
- Hospital creation and management (1:1 Admin to Hospital ownership).
- Configurable **Hospital Timezone** using IANA identifiers (`Asia/Kolkata`, `Asia/Dubai`, `Asia/Singapore`, etc.) ensuring shift timings, attendance cutoffs, and automatic absence logic execute in local hospital time.
- Hospital Structure: Floors and generic Rooms with deletion/deactivation safety checks.

### 3. Positions Master & Attendance Expectations
- Hospital-specific position/designation master (e.g. HR Manager, Staff Nurse, Medical Officer, Doctor).
- Configurable default module access assigned during employee onboarding.
- Position active/inactive status lifecycle.
- **Roster Eligibility Toggle (`rosterEligible`):**
  - `rosterEligible = true`: Expected work shifts derived strictly from Roster assignments.
  - `rosterEligible = false`: Expected work schedule derived from Position per-day working days & shift start/end times (`workSchedule`).

### 4. Workforce & Employee Management
- Centralized Employee table with reciprocal references between User and Employee records.
- Status filters (`All`, `Active`, `Inactive`).
- **Invitations Lifecycle:**
  - Secure invitation generation with SHA-256 token hashing and 48-hour expiration.
  - Public invitation onboarding flow creating linked User and Employee accounts.
  - Resend pending invitation with regenerated token and refreshed expiration.
  - Cancel pending invitation to immediately invalidate onboarding links.
  - Cross-tenant email uniqueness validation to prevent duplicated identities across hospitals.
- **Last Working Day (LWD) Operational Rules:**
  - LWD marks the inclusive last active day of employment in hospital local time.
  - Post-LWD operational access is strictly blocked across login, JWT authentication (HTTP 403 `EMPLOYMENT_ENDED`), roster assignments, leaves, and attendance marking.
  - Historical records (attendance, leaves, rosters) are immutably preserved upon employment termination.
- Self-protection and privilege rules preventing unauthorized status changes or self-deactivation.

### 5. Leave Management
- Self-service leave applications (`leave.apply`, `leave.view_own`, `leave.cancel_own`).
- Workforce Leave access control (`leave.view_workforce`, `leave.approve`, `leave.manage`).
- Real-time leave balance tracking and strict approved leave roster assignment blocking (HTTP 409 Conflict).
- Approved leaves suppress automatic absence marking across both rostered and normal employment employees.

### 6. Attendance & Background Automatic Absence
- Employee check-in/out tracking with working duration computation.
- **Workforce Attendance Table:**
  - Date-wise collapsible accordion grouping displaying daily attendance metrics.
  - Search by employee name, employee code, or position title.
  - Multi-filtering by date range and status (`PRESENT`, `HALF_DAY`, `ABSENT`).
- **Dual Expectation Evaluation Model:**
  - Roster assignments for `rosterEligible = true`.
  - Position `workSchedule` for `rosterEligible = false`.
- Attendance regularization submission, cancellation, and atomic approval transactions.
- Automated background scheduler executing periodic absence marking in local **Hospital Timezone** once shift end times pass.

### 7. Roster Module & Template Management
- **Roster Templates:** Full template actions (Edit, Copy/Duplicate, Activate/Deactivate, Delete). Deactivated templates remain visible with `Status: INACTIVE` and an `Activate` action.
- **Roster Switcher:** Current Roster tab supports multiple coexisting active rosters with a Roster Switcher dropdown selector.
- **Staff Contact Information Display:** Roster duty cells display staff name, initials avatar, email, and phone number (`phone`), providing immediate contact access for shift coordinators.
- **Roster Lifecycle:** `DRAFT` → `PUBLISHED`. Authorized managers (`roster.manage`) can delete draft rosters via modal confirmation dialogs.
- **Roster History & Immutability:** Published rosters past their end date move to **Roster History**. Historical rosters are read-only (API rejects updates, deletion, or re-publishing with HTTP `409 Conflict`).
- **Single-Page PDF Summary Export:** Clean single-page PDF export for any roster date range, deduplicating employee names per shift cell and omitting empty text placeholders.
- **Approved Leave Blocking:** Roster creation, editing, and bulk assignments automatically block assignment creation on dates covered by an employee's approved leave.

### 8. Access Management
- Unified Access Management screen for administrators to manage permissions and module access for workforce accounts (`employee` role).
- Grouped capability permissions (Hospital Structure, Workforce, Hospital Info, Positions, Leave, Attendance, Roster).
- Module access toggling (`hrms`, `hospital_structure`).
- Privilege escalation protections preventing ordinary administrators from altering system-level admin accounts or self-modifying access.

### 9. Centralized Pagination & Reusable DataTable
- **Backend Standardized Pagination (`pagination.util.js`):** Unified pagination parameter parsing, limit clamping, and metadata generation (`total`, `page`, `limit`, `totalPages`, `hasNextPage`, `hasPrevPage`) across Employee, Leave, Attendance, and Super Admin listing endpoints.
- **Dual-Mode Frontend DataTable (`DataTable.jsx`):**
  - Integrated **Serial Number (`S.No.`)** column with tabular numeric styling and automatic page-offset calculation across pages.
  - Built-in automatic client-side pagination (`pagination = true`, rows-per-page options `[10, 25, 50, 100]`) with automatic reset on search or filter updates.
  - Controlled server-side pagination mode for high-volume datasets.
  - Pinned bottom `<StyledPagination>` bar anchored within an outer `<TableWrapper>` card.

---

## 🛠️ Tech Stack

### Backend
- **Runtime & Framework:** Node.js (18+), Express.js (v5)
- **Database & ODM:** MongoDB Atlas, Mongoose (v9)
- **Auth & Cryptography:** JSON Web Tokens (jsonwebtoken), bcryptjs, crypto
- **Mailing:** Nodemailer
- **Environment & Config:** dotenv, cors

### Frontend
- **Framework & Build:** React 19, Vite (v8)
- **UI Library & Components:** Material UI (v9), Emotion (`@emotion/react`, `@emotion/styled`), Material Icons, `@fontsource/roboto`
- **Routing & Networking:** React Router DOM (v7), Axios
- **Document Generation:** jsPDF (`jspdf`, `jspdf-autotable`)
- **Centralized Design System:**
  - Finalized Brand Color System: Charcoal (`#252525`), Strong Blue (`#0284C7`), Light Blue (`#E0F2FE`), Light Gray (`#F3F4F6` / `#F9FAFB`).
  - Layout & wrapper layer (`AppLayout`, `AuthLayout`, `KPIGrid`).
  - Custom UI primitives (`AppInput`, `AppSelect`, `AppButton`, `AppCheckbox`, `KPICard`, `KPICardWithAction`, `MainContentLoader`, `PageHeader`, `InitialsAvatar`).
  - Global toast notification system (`SnackbarProvider`).

---

## ⚙️ Setup & Running Locally

### 1. Backend Setup
Create `backend/.env`:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
SMTP_FROM_NAME=Nuvince
SMTP_FROM_EMAIL=your_email@example.com
FRONTEND_URL=http://localhost:5173
```

Run backend:
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend Setup
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

Run frontend:
```bash
cd frontend
npm install
npm run dev
```

### 3. Running Automated Tests
```bash
cd backend
npm test
```

The comprehensive backend test suite includes:
- `pagination.test.js`: Unit tests for backend query parsing, parameter sanitization, limit clamping, and pagination metadata generation.
- `schema.test.js`: MongoDB schema definition and constraint validation.
- `auth-foundation.test.js`: JWT lifecycle, password hashing, and token revocation.
- `structure.test.js`: Hospital floor and room hierarchy and multi-tenant isolation.
- `permission.test.js`: Capability authorization middleware and role enforcement.
- `core-platform.test.js`: Auth, user profile, password changes, and module catalog.
- `unified-employees.test.js`: Complete workforce employee lifecycle, invitations (invite, resend, cancel), cross-tenant email uniqueness, and self-protection rules.
- `employee-lwd.test.js`: Last Working Day (LWD) inclusive boundary rules, post-LWD auth/JWT blocking, roster assignment blocking, leave suppression, and automatic absence suppression.
- `datetime-policy.test.js`: IANA timezone parsing, UTC conversion, shift timing cutoffs, and timezone policy checks.
- `access-management.test.js`: Access management, tenant isolation, and privilege protection.
- `leave-management.test.js`: Leave applications, balances, self-service cancellations, and workforce manager approvals.
- `attendance.test.js`: Clock-in/out, workforce logs, and tenant isolation.
- `attendance-regularization.test.js`: Atomic regularization approval transactions and rollback guarantees.
- `attendance-leave-integration.test.js`: Integration verification between approved leaves and attendance absence suppression.
- `attendance-normal-schedule.test.js`: Normal employment per-day work schedule timing persistence and automatic absence evaluation.
- `roster.test.js` & `roster-r2.test.js`: Roster builder, draft updates, review comments, double-booking prevention, delete draft roster, roster history immutability, approved leave conflict blocking, and contact details display.
- `full-qa-audit.test.js`: Comprehensive permission matrix verification across all modules.

---

## 📄 License

Internal Nuvince SaaS Platform.