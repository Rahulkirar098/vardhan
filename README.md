# Vardhan

A full-stack hospital management SaaS platform built with Node.js, Express, MongoDB, React, Vite, and Material UI. Designed for role-based hospital administration, multi-tenant isolation, hospital structure (floors and rooms), position management, workforce employee management, and generic access management.

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
        ├── Leave Management (Apply, My Leave, Approval, Balance, Stats)
        ├── Attendance (Planned)
        └── Roster (Planned)
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
- Hospital-specific position/designation master (e.g. HR Manager, Nurse, Payroll Manager, Doctor).
- Configurable default module access assigned during employee onboarding.
- Position active/inactive status lifecycle.

### 4. Workforce & Employee Management
- Centralized Employee table with reciprocal references between User and Employee records.
- Status filters (`All`, `Active`, `Inactive`).
- Single generic invitation flow with SHA-256 token hashing and 48-hour expiration.
- Every invited employee receives a linked Vardhan login account.
- Employee deactivation disables login without deleting historical data; reactivation restores login.
- Employee Edit manages profile details and is strictly decoupled from Access Management.

### 5. Access Management
- Unified Access Management screen for administrators to manage permissions and module access for workforce employees (`employee` role).
- Grouped capability permissions (Hospital Structure, Workforce, Hospital Info, Positions, Leave).
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
All 7 backend integration test suites verify authentication, employee lifecycle, access management, hospital isolation, and permissions.

---

## 📄 License

Internal Vardhan SaaS Platform.