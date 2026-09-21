# CloudCherry

A full-stack hospital management system built with Node.js, Express, MongoDB, React, Vite, and Material UI. The platform is designed for role-based hospital administration, covering registration, authentication, hospital setup, hospital structure (floors and rooms), HR onboarding, and secure invitation-based access.

*(Note: The Department feature has been retired and removed from the active application workflow in favor of Hospital Structure and direct hospital-scoped staffing).*

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" alt="Node.js 18+" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/MUI-9.x-007FFF?logo=mui&logoColor=white" alt="MUI" />
</p>

## Overview

CloudCherry enables a structured multi-role hospital workflow:

1. Admin registers
2. Admin logs in
3. Admin creates the hospital
4. Admin configures Hospital Structure (Floors and Rooms)
5. Admin invites HR users to the hospital
6. HR accepts the invitation and completes setup
7. The system routes users to role-specific dashboards and screens

The platform enforces controlled ownership and access rules:

- one admin owns one hospital
- hospital structure consists of Floors and generic Rooms
- HR records are linked directly to the hospital
- super admin can monitor all hospitals
- HR access remains restricted to the connected hospital

---

## ✨ Features

### Authentication and authorization

- Admin registration and login
- JWT-based authentication
- Logout with token revocation
- Protected routes with strict role enforcement
- Session validation through middleware
- Inactive account blocking
- Role-based redirect logic after login

### Super admin

- Super-admin dashboard
- Hospital overview and detail pages
- Cross-hospital visibility
- Secure role-gated admin access

### Hospital admin

- Create hospital profile
- Enforce one-hospital-per-admin rule
- Manage Hospital Structure (Floors and Rooms)
- Invite HR personnel
- Resend and cancel pending invitations
- View and manage hospital HR records
- Navigate a role-aware dashboard shell

### HR management

- Accept secure invitation links
- Create and update HR profile
- View hospital context
- Access dedicated HR dashboard and profile details
- Restrict access to relevant hospital data only

### Invitation workflow

- Create invite with hospital context
- Store hashed invite tokens with expiry timestamps
- Confirm invited email and hospital identity
- Accept invitation through secure front-end flow
- Prevent duplicate or invalid invites

### User experience

- Responsive dashboard layout with a 250px sidebar and 64px navbar
- Reusable app shell and role-based navigation config
- Premium black-and-white design system with Roboto typography
- Compact, shared UI primitives (DataTable, StatCard, SectionCard, InfoRow, StatusBadge)
- Shared Modal and ConfirmDialog for every create/edit/delete action
- Consistent single Loading component for all async states (no per-page skeletons)
- Show/hide password UX in auth forms

---

## 📂 Complete Folder Structure



---

## 📂 Complete Folder Structure

```text
├── backend
│   └── src
│       ├── config
│       │   ├── modules.config.js
│       │   ├── permissions.js
│       │   └── rolePermissions.js
│       ├── controllers
│       │   ├── auth.controller.js
│       │   ├── employee.controller.js
│       │   ├── hospital.controller.js
│       │   ├── hr.controller.js
│       │   ├── module.controller.js
│       │   ├── position.controller.js
│       │   ├── structure.controller.js
│       │   └── superAdmin.controller.js
│       ├── middleware
│       │   ├── auth.middleware.js
│       │   ├── module.middleware.js
│       │   ├── permission.middleware.js
│       │   └── role.middleware.js
│       ├── models
│       │   ├── employee.model.js
│       │   ├── floor.model.js
│       │   ├── hospital.model.js
│       │   ├── invitation.model.js
│       │   ├── position.model.js
│       │   ├── revokedToken.model.js
│       │   ├── room.model.js
│       │   └── user.model.js
│       ├── routes
│       │   ├── auth.route.js
│       │   ├── employee.route.js
│       │   ├── hospital.route.js
│       │   ├── hr.route.js
│       │   ├── module.route.js
│       │   ├── position.route.js
│       │   ├── structure.route.js
│       │   └── superAdmin.route.js
│       ├── services
│       │   ├── auth.service.js
│       │   ├── employee.service.js
│       │   ├── hospital.service.js
│       │   ├── hr.service.js
│       │   ├── invitation.service.js
│       │   └── structure.service.js
│       ├── utils
│       │   ├── jwt.js
│       │   ├── mail.js
│       │   ├── password.js
│       │   └── validate.js
│       └── validators
│           └── structure.validator.js
└── frontend
    └── src
        ├── App.jsx
        ├── components
        │   ├── AppLayout.jsx
        │   ├── AuthLayout.jsx
        │   ├── ConfirmDialog.jsx
        │   ├── DataTable.jsx
        │   ├── EmptyState.jsx
        │   ├── ErrorState.jsx
        │   ├── GlassCard.jsx
        │   ├── InfoRow.jsx
        │   ├── InitialsAvatar.jsx
        │   ├── Loading.jsx
        │   ├── Modal.jsx
        │   ├── Navbar.jsx
        │   ├── PageHeader.jsx
        │   ├── SectionCard.jsx
        │   ├── Sidebar.jsx
        │   ├── StatCard.jsx
        │   ├── StatusBadge.jsx
        │   └── sidebar.config.js
        ├── index.css
        ├── main.jsx
        ├── pages
        │   ├── admin
        │   │   ├── AdminDashboard.jsx
        │   │   ├── FloorDetails.jsx
        │   │   ├── HRManagement.jsx
        │   │   ├── Hospital.jsx
        │   │   └── StructurePage.jsx
        │   ├── auth
        │   │   ├── AcceptEmployeeInvitation.jsx
        │   │   ├── AcceptHRInvitation.jsx
        │   │   ├── ForgotPassword.jsx
        │   │   ├── Landing.jsx
        │   │   ├── Login.jsx
        │   │   ├── Register.jsx
        │   │   └── ResetPassword.jsx
        │   ├── hr
        │   │   ├── EmployeesPage.jsx
        │   │   ├── HRDashboard.jsx
        │   │   ├── HRProfile.jsx
        │   │   └── MyHospital.jsx
        │   ├── shared
        │   │   └── Profile.jsx
        │   └── super-admin
        │       ├── SuperAdminDashboard.jsx
        │       ├── SuperAdminHospitalDetails.jsx
        │       └── SuperAdminHospitals.jsx
        ├── routes
        │   └── index.jsx
        ├── services
        │   ├── api
        │   │   ├── client.js
        │   │   └── interceptors.js
        │   ├── auth.service.js
        │   ├── employee.service.js
        │   ├── hospital.service.js
        │   ├── hr.service.js
        │   ├── invitation.service.js
        │   ├── position.service.js
        │   ├── structure.service.js
        │   └── superAdmin.service.js
        ├── theme
        │   └── theme.js
        └── utils
            └── permissions.js
```

---

## 🛠️ Tech Stack

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcryptjs
- Nodemailer
- dotenv
- CORS

### Frontend

- React
- Vite
- JavaScript
- Material UI
- React Router DOM
- Axios
- @fontsource/roboto

### Design system

- Custom MUI theme
- Minimal monochrome palette
- Controlled border radius system (8px controls, 12px cards, 14px dialogs)
- Flat surfaces with subtle borders and near-flat shadows
- Shared information-row layout across all pages
- Responsive DataTable that collapses to cards on mobile

---

## 📁 Project Structure

```text
cloudcherry/
├── backend/
│   ├── .env
│   ├── index.js
│   ├── package.json
│   └── src/
│       ├── config/
│       │   ├── modules.config.js
│       │   ├── permissions.js
│       │   └── rolePermissions.js
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── employee.controller.js
│       │   ├── hospital.controller.js
│       │   ├── hr.controller.js
│       │   ├── module.controller.js
│       │   ├── structure.controller.js
│       │   └── superAdmin.controller.js
│       ├── middleware/
│       │   ├── auth.middleware.js
│       │   ├── module.middleware.js
│       │   ├── permission.middleware.js
│       │   └── role.middleware.js
│       ├── migrations/
│       │   └── migrateHrInvitationsToGeneric.js
│       ├── models/
│       │   ├── employee.model.js
│       │   ├── floor.model.js
│       │   ├── hospital.model.js
│       │   ├── invitation.model.js
│       │   ├── revokedToken.model.js
│       │   ├── room.model.js
│       │   └── user.model.js
│       ├── routes/
│       │   ├── auth.route.js
│       │   ├── employee.route.js
│       │   ├── hospital.route.js
│       │   ├── hr.route.js
│       │   ├── module.route.js
│       │   ├── structure.route.js
│       │   └── superAdmin.route.js
│       ├── services/
│       │   ├── employee.service.js
│       │   ├── invitation.service.js
│       │   └── structure.service.js
│       └── utils/
│           ├── jwt.js
│           ├── mail.js
│           ├── password.js
│           └── validate.js
│
├── frontend/
│   ├── .env
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── README.md
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       │   ├── AppLayout.jsx
│       │   ├── AuthLayout.jsx
│       │   ├── ConfirmDialog.jsx
│       │   ├── DataTable.jsx
│       │   ├── EmptyState.jsx
│       │   ├── ErrorState.jsx
│       │   ├── GlassCard.jsx
│       │   ├── InfoRow.jsx
│       │   ├── InitialsAvatar.jsx
│       │   ├── Loading.jsx
│       │   ├── Modal.jsx
│       │   ├── Navbar.jsx
│       │   ├── PageHeader.jsx
│       │   ├── SectionCard.jsx
│       │   ├── Sidebar.jsx
│       │   ├── StatCard.jsx
│       │   ├── StatusBadge.jsx
│       │   └── sidebar.config.js
│       ├── pages/
│       │   ├── auth/
│       │   │   ├── AcceptEmployeeInvitation.jsx
│       │   │   ├── AcceptHRInvitation.jsx
│       │   │   ├── ForgotPassword.jsx
│       │   │   ├── Landing.jsx
│       │   │   ├── Login.jsx
│       │   │   ├── Register.jsx
│       │   │   └── ResetPassword.jsx
│       │   ├── admin/
│       │   │   ├── AdminDashboard.jsx
│       │   │   ├── FloorDetails.jsx
│       │   │   ├── Hospital.jsx
│       │   │   └── StructurePage.jsx
│       │   ├── hr/
│       │   │   ├── EmployeesPage.jsx
│       │   │   ├── HRDashboard.jsx
│       │   │   ├── HRProfile.jsx
│       │   │   └── MyHospital.jsx
│       │   ├── shared/
│       │   │   └── Profile.jsx
│       │   └── super-admin/
│       │       ├── SuperAdminDashboard.jsx
│       │       ├── SuperAdminHospitalDetails.jsx
│       │       └── SuperAdminHospitals.jsx
│       ├── routes/
│       │   └── index.jsx
│       ├── services/
│       │   ├── api/
│       │   │   ├── client.js
│       │   │   └── interceptors.js
│       │   ├── auth.service.js
│       │   ├── employee.service.js
│       │   ├── hospital.service.js
│       │   ├── hr.service.js
│       │   ├── structure.service.js
│       │   └── superAdmin.service.js
│       ├── theme/
│       │   └── theme.js
│       └── utils/
│           └── permissions.js
│
└── README.md
```

---

The backend uses MongoDB and Mongoose to connect to a configured database instance.

### Connection setup

Environment variables are loaded from the backend project folder:

- `backend/.env`

The app connects using:

```js
mongoose.connect(process.env.MONGODB_URI)
```

### Example environment values

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
SMTP_FROM_NAME=Your App Name
SMTP_FROM_EMAIL=your_email@example.com
FRONTEND_URL=http://localhost:5173
```

### Core data models

- User
- Hospital
- Floor
- Room
- Invitation
- Employee
- Position
- Revoked Token

*(Department is legacy and removed from active models)*

### Key business rules

- one hospital per admin
- hospital structure hierarchy: Hospital → Floor → Room
- unique invite checks per hospital and email
- JWT payload contains role and hospital identifiers
- protected routes and controllers enforce role-based access

---

## 🎨 Theme and design

The frontend uses a custom Material UI theme with a premium, monochrome visual language:

- black primary actions
- white and light-gray surfaces
- controlled border radius system
- Roboto typography with a clear size hierarchy
- consistent dashboard shell (250px sidebar, 64px navbar, max-width content)

### Theme file

- `frontend/src/theme/theme.js`

Key design choices include:

- monochrome palette (`#0A0A0A` ink, `#6B6B6B` muted, `#E5E5E5` borders, `#FAFAFA` canvas)
- explicit pixel radius values — buttons and inputs `8px`, cards `12px`, dialogs `14px`
- subtle `0 1px 2px` shadows for a near-flat, minimal office look
- compact table cells and consistent 40px form inputs
- global `overflow-wrap` so long values wrap instead of overflowing
- shared `InfoRow` for label/value rows on every information section
- shared `DataTable` that renders a compact table on desktop and cards on mobile

---

## ⚙️ Setup

### Backend

Create or edit:

```text
backend/.env
```

Required values:

- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_NAME`
- `SMTP_FROM_EMAIL`
- optional `FRONTEND_URL`

### Frontend

Create or edit:

```text
frontend/.env
```

Typical value:

```env
VITE_API_URL=http://localhost:3000/api
```

If unset, the axios instance defaults to `http://localhost:3000/api` (`frontend/src/services/api/client.js`).

---

## ▶️ Run locally

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The backend runs on port `3000` by default and the frontend uses Vite on `http://localhost:5173`.

### Verify a production build

```bash
cd frontend
npm run build   # vite build
npm run lint    # oxlint
```

---

## 👥 Role flow

### Super admin

- accesses the super-admin dashboard
- views all hospitals
- monitors the platform-wide hospital ecosystem

### Admin

- registers and logs in
- creates a hospital profile
- manages hospital structure (floors and rooms)
- invites HR staff
- manages HR and hospital-related sections

### HR

- accepts invitation link
- completes HR profile setup
- views their profile and hospital context
- accesses role-scoped dashboard pages

---

## 🔐 Security & Permission System (Phase 3)

The application implements a 4-tier security pipeline:

```text
Request
  ↓
JWT Authentication  (Who is this user?)
  ↓
Role Authorization  (What type of user is this?)
  ↓
Permission Authorization (What is this user allowed to do?)
  ↓
Hospital Scope Check (Can this user access this specific hospital?)
  ↓
Controller → Service → Database
```

- **Backend Authority**: Backend middleware (`authorizePermission`) is the final authority. Frontend permission utilities (`hasPermission`) are strictly for UX (hiding/disabling actions).
- **Static In-Code Mapping**: Permissions are derived directly from `user.role` via `backend/src/config/rolePermissions.js` without database query overhead.
- **Hospital Isolation**: Role permissions do not bypass hospital ownership/scoping checks.

---

## 🧩 Important implementation notes

- backend route registration is centralized in `backend/src/routes`
- authentication middleware is in `backend/src/middleware/auth.middleware.js`
- permission authorization middleware is in `backend/src/middleware/permission.middleware.js`
- role enforcement happens in the middleware layer
- frontend routing is centralized in `frontend/src/routes/index.jsx`
- sidebar navigation is role-driven from `frontend/src/components/sidebar.config.js`
- all API wrappers live in `frontend/src/services` over the shared axios client (`api/client.js`), with auth/injection + 401 handling in `api/interceptors.js`
- shared UI lives in `frontend/src/components` — pages stay thin and compose primitives
- SMTP emails require valid configured credentials; otherwise, the app fails cleanly with a clear error message

---

---

## 📊 Feature Status & Audit

### 1. Fully Implemented & Working Features (18)
These features are live, covered by automated test suites, and connected end-to-end (Backend + Frontend):

- **Authentication & Security**:
  - Admin registration (`POST /api/auth/register`)
  - Multi-role JWT login (`POST /api/auth/login`)
  - Route guards (`ProtectedRoute`, `PublicRoute` with strict role and authenticated session redirection)
  - Token revocation and logout (`POST /api/auth/logout`, `revokedToken.model.js`)
  - Password reset request & email token delivery (`POST /api/auth/forgot-password`)
  - Password reset completion (`POST /api/auth/reset-password`)
  - User profile retrieval (`GET /api/auth/me`)
- **Hospital Management**:
  - Hospital creation (`POST /api/hospitals`) with one-hospital-per-admin enforcement
  - Hospital overview & details (`GET /api/hospitals/overview`, `/hospital`)
- **Hospital Structure (Phase 2)**:
  - Floor creation, listing, updating (`POST/GET/PUT /api/v1/hospitals/:id/floors`, `/structure`)
  - Floor deactivation safety validation (blocks deactivating floors with active rooms, `409 Conflict`)
  - Generic Room creation, listing, updating (`POST/GET/PUT /api/v1/hospitals/:id/floors/:id/rooms`, `/structure/:floorId`)
  - Room status toggling (`PATCH /rooms/:roomId/status`)
- **Super Admin**:
  - Super admin platform metrics (`GET /api/super-admin/dashboard`, `/super-admin/dashboard`)
  - Cross-hospital directory & detail view (`GET /api/super-admin/hospitals`, `/super-admin/hospitals`)
- **HR Portal (Phase 1)**:
  - Secure invitation acceptance flow for HR (`GET/POST /api/v1/hr/invite/:token`, `/hr/invite/:token`)
  - HR dashboard workspace (`/hr/dashboard`)
  - HR hospital info view (`GET /api/v1/hr/hospital`, `/hr/hospital`)
- **HRMS Module (Phase 2 - Employee Management)**:
  - Centralized generic `Invitation` model supporting both HR and Employees.
  - Employee creation, listing, status toggling (`POST/GET/PATCH /api/v1/hrms/employees`, `/hr/employees`).
  - Employee secure invitation flow (non-user Vardhan accounts) (`/employee/invite/:token`).
  - Dedicated Employee dashboard statistics.

---

### 2. Partially Implemented / Disconnected from UI (4)
These backend endpoints and models are active and tested, but currently lack dedicated frontend UI buttons:

- **Admin HR Invitation UI (`POST /api/hr/invite`)**: Backend invitation token generation and email dispatch are fully functional, but the trigger modal was previously nested inside the legacy Department view and is pending the Phase 4 Employee Onboarding screen.
- **Pending Invitation Management (`POST /resend`, `PATCH /cancel`)**: Endpoints exist in `hr.controller.js` to resend and cancel pending invitations, but no admin UI table currently lists pending invitations.
- **Hospital Edit Details (`PUT /api/hospitals/:id`)**: Backend supports full hospital updates, while frontend modal currently updates a subset of fields.
- **Super Admin Hospital Status Toggle (`PATCH /api/hospitals/:id/status`)**: Backend supports status changes; Super Admin UI is currently read-only.

---

### 3. Useless, Dead, or Deprecated Concepts in Codebase (4)
These items are remnants from previous prototypes and are not part of the CloudCherry HRMS architecture:

- **Unused User Roles in `user.model.js`**: `nurse`, `doctor`, `patient`, `user` are defined in the schema enum but have zero routes, logic, or screens (CloudCherry is an HRMS, not an EHR).
- **Direct HR Creation (`POST /api/hr`)**: Bypasses the secure invitation workflow and has no frontend caller.
- **Redundant `hr.getAll()` query in `Hospital.jsx`**: Overview statistics already calculate HR counts directly on the database.
- **Legacy Department Module**: Removed from active application code (historical database data preserved).

---

## 🗺️ Product Roadmap

```
Hospital
   ├── Floors -> Rooms (Phase 2: Hospital Structure - COMPLETED)
   ├── Permissions (Phase 3: Role & Permission System - COMPLETED)
   ├── HRMS Module 
   │      ├── Employee Management & Invitations (Phase 4: HRMS Core - COMPLETED)
   │      ├── Reporting Manager (Phase 5: UPCOMING)
   │      └── Roster, Shifts, Attendance & Leave (Phase 6: UPCOMING)
```

---

## 🏛️ Core Platform Architecture

Vardhan SaaS is cleanly separated into the **Core Platform** and modular **Business Modules**:

```
VARDHAN SaaS
│
├── CORE PLATFORM (Complete - 100%)
│   ├── 1. Hospital / Tenant (Tenant Isolation, 1:1 Admin Ownership, Active Status)
│   ├── 2. Authentication (JWT, Register, Login, Logout, Me, Password Reset, Password Change)
│   ├── 3. Users (User Model, Profile, Profile Update, Activation/Deactivation, Roles)
│   ├── 4. Roles (super_admin, admin, hr)
│   ├── 5. Permissions (User-specific permissions array, structure.* constants, authorization)
│   ├── 6. Hospital Structure (Hospital → Floors → generic Rooms)
│   └── 7. Module Foundation (System Module Catalog & Availability Resolution)
│
└── MODULES (Future Expansions)
    └── HRMS (Employees, Roster, Attendance, Leave, Reporting Manager)
```

### Module Foundation Endpoints
| Method | Path | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/modules` | Authenticated | Lists all registered system modules with availability and user accessibility resolution |
| `GET` | `/api/v1/modules/:moduleKey` | Authenticated | Retrieves detailed metadata and status for a single module |

### Additional Authentication & Profile Endpoints
| Method | Path | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/change-password` | Authenticated | In-app password change requiring current and new password (min 6 chars) |
| `PATCH` | `/api/v1/auth/profile` | Authenticated | In-app profile update for `name` and `phone` |

---

## 📄 License

This project is currently intended for internal or project-specific use and is not yet published under a public open-source license.