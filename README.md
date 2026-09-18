# Vardhan

A full-stack hospital management system built with Node.js, Express, MongoDB, React, Vite, and Material UI. The platform is designed for role-based hospital administration, covering registration, authentication, hospital setup, department management, HR onboarding, and secure invitation-based access.

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" alt="Node.js 18+" />
  <img src="https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/MUI-9.x-007FFF?logo=mui&logoColor=white" alt="MUI" />
</p>

## Overview

Vardhan enables a structured multi-role hospital workflow:

1. Admin registers
2. Admin logs in
3. Admin creates the hospital
4. Admin creates departments
5. Admin invites HR users to the hospital
6. HR accepts the invitation and completes setup
7. The system routes users to role-specific dashboards and screens

The platform enforces controlled ownership and access rules:

- one admin owns one hospital
- departments are created under the hospital
- HR records are linked to the hospital and department
- super admin can monitor all hospitals
- HR access remains restricted to the connected hospital and department

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
- Manage departments
- Invite HR personnel
- Resend and cancel pending invitations
- View and manage hospital HR records
- Navigate a role-aware dashboard shell

### HR management

- Accept secure invitation links
- Create and update HR profile
- View hospital and department context
- Access dedicated HR dashboard and profile details
- Restrict access to relevant hospital data only

### Invitation workflow

- Create invite with hospital and department context
- Store hashed invite tokens with expiry timestamps
- Confirm invited email and hospital identity
- Accept invitation through secure front-end flow
- Prevent duplicate or invalid invites

### User experience

- Responsive dashboard layout
- Shared sidebar navigation by role
- Reusable app shell and layout system
- Premium black-and-white design system
- Show/hide password UX in auth forms
- Skeleton/loading states for role-driven session screens

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

### Design system

- Custom MUI theme
- Minimal monochrome palette
- Rounded cards and surfaces
- Consistent dashboard components
- Clean and modern admin UI

---

## 📁 Project Structure

```text
vardhan/
├── backend/
│   ├── .env
│   ├── index.js
│   ├── package.json
│   └── src/
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── department.controller.js
│       │   ├── hospital.controller.js
│       │   ├── hr.controller.js
│       │   ├── hrInvitation.controller.js
│       │   ├── index.js
│       │   └── superAdmin.controller.js
│       ├── middleware/
│       │   ├── auth.middleware.js
│       │   ├── index.js
│       │   └── role.middleware.js
│       ├── routes/
│       │   ├── auth.route.js
│       │   ├── department.route.js
│       │   ├── hospital.route.js
│       │   ├── hr.route.js
│       │   ├── index.js
│       │   └── superAdmin.route.js
│       ├── schemas/
│       │   ├── department.schema.js
│       │   ├── hospital.schema.js
│       │   ├── hrInvitation.schema.js
│       │   ├── index.js
│       │   └── user.schema.js
│       ├── utils/
│       │   ├── index.js
│       │   ├── jwt.util.js
│       │   ├── mail.util.js
│       │   └── password.util.js
│       └──
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
│       ├── assets/
│       ├── components/
│       │   ├── common/
│       │   ├── layout/
│       │   │   ├── AppLayout.jsx
│       │   │   └── Sidebar/
│       │   │       ├── AppSidebar.jsx
│       │   │       ├── SidebarItem.jsx
│       │   │       ├── SidebarSection.jsx
│       │   │       ├── SidebarUser.jsx
│       │   │       ├── SidebarSkeleton.jsx
│       │   │       └── sidebar.config.js
│       ├── config/
│       ├── pages/
│       │   ├── Auth/
│       │   ├── Dashboard/
│       │   ├── Departments/
│       │   ├── Hospital/
│       │   ├── HR/
│       │   ├── Landing/
│       │   └── SuperAdmin/
│       ├── routes/
│       │   └── index.jsx
│       ├── services/
│       │   ├── endpoints.js
│       │   └── http.js
│       ├── theme/
│       │   └── theme.js
│       └── utils/
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
- Department
- HR Invitation

### Key business rules

- one hospital per admin
- unique department names and codes per hospital
- unique invite checks per hospital and email
- JWT payload contains role and hospital/department identifiers
- protected routes and controllers enforce role-based access

---

## 🎨 Theme and design

The frontend uses a custom Material UI theme with a premium, monochrome visual language:

- black primary actions
- white and light-gray surfaces
- rounded cards and inputs
- clean typography hierarchy
- consistent admin dashboard shell

### Theme file

- `frontend/src/theme/theme.js`

Key design choices include:

- white-paper surfaces
- subtle border styling
- large headline typography
- clean button treatment
- lowered shadows for a minimal office dashboard look

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

---

## 👥 Role flow

### Super admin

- accesses the super-admin dashboard
- views all hospitals
- monitors the platform-wide hospital ecosystem

### Admin

- registers and logs in
- creates a hospital profile
- creates departments
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
- hospital and department access remain scoped to the user's ownership chain
- logout revokes the current token

---

## 🧩 Important implementation notes

- backend route registration is centralized in `backend/src/routes/index.js`
- authentication middleware is in `backend/src/middleware/auth.middleware.js`
- role enforcement happens in the middleware layer
- frontend routing is centralized in `frontend/src/routes/index.jsx`
- sidebar navigation is managed through the shared layout system
- SMTP emails require valid configured credentials; otherwise, the app fails cleanly with a clear error message

---

## ✅ Current status

This project is a functioning hospital management platform with:

- auth flow
- role-based dashboards
- hospital creation and ownership checks
- department management
- HR invitation flow
- invitation acceptance flow
- protected routing and UI layout
- shared sidebar navigation

It is ready for local development and can be extended with modules like appointments, staff records, billing, patient modules, and analytics.

---

## 📄 License

This project is currently intended for internal or project-specific use and is not yet published under a public open-source license.
