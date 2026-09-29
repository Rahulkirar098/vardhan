# Vardhan

A full-stack hospital management SaaS platform built with Node.js, Express, MongoDB, React, Vite, and Material UI. Designed for role-based hospital administration, multi-tenant isolation, hospital structure (floors and rooms), position management, workforce employee management, leave management, attendance & regularization with background automatic absence scheduling, simplified duty roster planning, roster history auditing, and generic access management.

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
VARDHAN SaaS
│
├── CORE PLATFORM
│   ├── Authentication (JWT with token revocation)
│   ├── Hospital / Tenant (Strict tenant isolation)
│   ├── Users (Authentication & Identity)
│   ├── Roles (super_admin, admin, employee)
│   ├── Permissions (Centralized capability registry)
│   ├── Module Access (core, hrms, hospital_structure)
│   ├── Access Management (Workforce permissions & module configuration)
│   ├── Hospital Structure
│   │   ├── Floor
│   │   └── Room
│   └── Positions (Hospital-scoped designation master with default modules)
│
└── MODULES
    └── HRMS
        ├── Employees (Workforce staff record reciprocal to User)
        ├── Invitations (Centralized invitation flow with token hashing)
        ├── Leave Management (Apply, My Leave, Approval, Balance, Stats, Workforce Leave)
        ├── Attendance & Regularization (Clock-In/Out, Regularization Requests, Background Automatic Absence Scheduler)
        └── Roster Module (Simplified Direct Architecture, Shift Columns, Duty Areas, Draft/Current/History Lifecycle, Delete Draft, Immutability, Leave Warnings)
```

---

## ✨ Features

### 1. Authentication & Security
- Admin registration and multi-role login (`super_admin`, `admin`, `employee`).
- Stateless JWT-based authentication with `RevokedToken` support for explicit logout.
- In-app profile updates and password changes.
- Password reset via secure email tokens.
- Strict tenant and hospital isolation enforced server-side on all tenant queries.

### 2. Hospital Administration & Multi-Tenancy
- Hospital creation and management (1:1 Admin to Hospital ownership).
- Hospital Structure: Floors and generic Rooms with deletion/deactivation safety checks.

### 3. Positions Master
- Hospital-specific position/designation master (e.g. HR Manager, Staff Nurse, Medical Officer, Doctor).
- Configurable default module access assigned during employee onboarding.
- Position active/inactive status lifecycle.

### 4. Workforce & Employee Management
- Centralized Employee table with reciprocal references between User and Employee records.
- Status filters (`All`, `Active`, `Inactive`).
- Single generic invitation flow with SHA-256 token hashing and 48-hour expiration.
- Every invited employee receives a linked Vardhan login account.
- Employee deactivation disables login without deleting historical data; reactivation restores login.
- Employee Edit manages profile details and is strictly decoupled from Access Management.

### 5. Leave Management
- Self-service leave applications (`leave.apply`, `leave.view_own`, `leave.cancel_own`).
- Workforce Leave access control (`leave.view_workforce`, `leave.approve`, `leave.manage`).
- Real-time leave balance tracking and non-blocking leave conflict detection during shift roster allocation.

### 6. Attendance & Background Automatic Absence
- Employee check-in/out tracking with working duration computation.
- Attendance regularization submission, cancellation, and atomic approval transactions.
- Automated background scheduler executing periodic absence marking for un-checked-in employees driven strictly by the current published roster.

### 7. Simplified Roster Module
- **Direct Model Architecture:** `Roster` documents directly contain embedded `columns` (shift titles, start/end times) and `dutyAreas` (operational rows). Obsolete Roster Templates have been permanently removed.
- **Roster Lifecycle:** `DRAFT` → `PUBLISHED`.
- **Delete Draft Roster:** Authorized managers (`roster.manage`) can delete draft rosters cleanly via modal confirmation dialogs. Published rosters cannot be deleted.
- **Single Current Roster Rule:** The main screen displays the single active published roster directly. No multiple-published-roster dropdowns.
- **Roster History & Immutability:** Previously published rosters move to **Roster History**. Historical rosters are read-only (API rejects updates, deletion, or re-publishing with HTTP `409 Conflict`).
- **Calendar & PDF Integration:** PDF downloading via `generateFrontendRosterPDF` and visual schedule integration via `UnifiedCalendar`.

### 8. Access Management
- Unified Access Management screen for administrators to manage permissions and module access for workforce accounts (`employee` role).
- Grouped capability permissions (Hospital Structure, Workforce, Hospital Info, Positions, Leave, Attendance, Roster).
- Module access toggling (`hrms`).
- Privilege escalation protections preventing ordinary administrators from altering system-level admin accounts or self-modifying access.

---

## 🛠️ Tech Stack

### Backend
- **Runtime & Framework:** Node.js, Express.js
- **Database & ODM:** MongoDB, Mongoose
- **Auth & Cryptography:** JSON Web Tokens (jsonwebtoken), bcryptjs, crypto
- **Mailing:** Nodemailer
- **Environment & Config:** dotenv, cors

### Frontend
- **Framework & Build:** React 19, Vite
- **UI Library & Icons:** Material UI (MUI), Material Icons, @fontsource/roboto
- **Routing & Networking:** React Router DOM, Axios
- **Design Language:** Minimalist monochrome palette with high-contrast surfaces and micro-interactions

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
SMTP_FROM_NAME=Vardhan
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
The test suite includes:
- `roster.test.js`: Roster builder, draft updates, review comments, double-booking prevention, delete draft roster, and roster history immutability.
- `full-qa-audit.test.js`: Comprehensive permission matrix verification across all modules.
- `attendance-regularization.test.js`, `attendance.test.js`, `leave-management.test.js`, `access-management.test.js`, `unified-employees.test.js`, `hospital-structure.test.js`, `core-platform.test.js`.

---

## 📄 License

Internal Vardhan SaaS Platform.