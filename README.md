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
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── hospital.controller.js
│       │   ├── hr.controller.js
│       │   ├── structure.controller.js
│       │   ├── superAdmin.controller.js
│       ├── middleware/
│       │   ├── auth.middleware.js
│       │   └── role.middleware.js
│       ├── models/
│       │   ├── floor.model.js
│       │   ├── hospital.model.js
│       │   ├── hrInvitation.model.js
│       │   ├── revokedToken.model.js
│       │   ├── room.model.js
│       │   └── user.model.js
│       ├── routes/
│       │   ├── auth.route.js
│       │   ├── hospital.route.js
│       │   ├── hr.route.js
│       │   ├── structure.route.js
│       │   └── superAdmin.route.js
│       ├── services/
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
│       │   ├── hospital.service.js
│       │   ├── hr.service.js
│       │   ├── structure.service.js
│       │   └── superAdmin.service.js
│       └── theme/
│           └── theme.js
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
- HR Invitation
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

## 🔐 Security notes

- JWTs are used for authentication and authorization
- passwords are hashed before storage using bcrypt
- protected routes enforce authorization rules
- invitation tokens are hashed and expire after a set window
- revoked tokens are tracked server-side for logout
- hospital access remains scoped to the user's ownership chain
- logout revokes the current token

---

## 🧩 Important implementation notes

- backend route registration is centralized in `backend/src/routes`
- authentication middleware is in `backend/src/middleware/auth.middleware.js`
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
- **HR Portal**:
  - Secure invitation acceptance flow (`GET/POST /api/hr/invite/:token`, `/hr/invite/:token`)
  - HR dashboard workspace (`/hr/dashboard`)
  - HR hospital info view (`GET /api/hr/hospital`, `/hr/hospital`)

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
   ├── Permissions (Phase 3: UPCOMING)
   └── Employees -> Reporting Manager (Phase 4: UPCOMING)
          └── Roster, Shifts, Attendance & Leave (Phase 5: UPCOMING)
```

---

## 📄 License

This project is currently intended for internal or project-specific use and is not yet published under a public open-source license.