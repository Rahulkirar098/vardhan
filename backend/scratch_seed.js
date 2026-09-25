const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const User = require("./src/models/user.model");
const Hospital = require("./src/models/hospital.model");
const Position = require("./src/models/position.model");
const Employee = require("./src/models/employee.model");
const { hashPassword } = require("./src/utils/password");
const { PERMISSIONS } = require("./src/config/permissions");

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);

  const timestamp = Date.now();
  const creatorId = new mongoose.Types.ObjectId();
  const hospital = await Hospital.create({
    name: "City Care General Hospital",
    code: `CCGH${String(timestamp).slice(-4)}`,
    email: `citycare_${timestamp}@hospital.com`,
    phone: "9876543210",
    address: { city: "Bhopal", state: "MP", country: "India" },
    createdBy: creatorId,
  });

  const position = await Position.create({
    hospitalId: hospital._id,
    name: "Staff Nurse",
    code: "SN_01",
    status: "active",
    createdBy: creatorId,
  });

  const hashedPassword = await hashPassword("password123");

  const employeeUser = await User.create({
    name: "Rahul Sharma",
    email: `employee_${timestamp}@test.com`,
    password: hashedPassword,
    role: "employee",
    hospitalId: hospital._id,
    status: "active",
    modules: ["core", "hrms"],
    permissions: [PERMISSIONS.ATTENDANCE_VIEW_OWN],
  });

  const employee = await Employee.create({
    hospitalId: hospital._id,
    userId: employeeUser._id,
    positionId: position._id,
    firstName: "Rahul",
    lastName: "Sharma",
    email: employeeUser.email,
    phone: "9876543210",
    employeeId: `EMP-${String(timestamp).slice(-4)}`,
    dateOfJoining: new Date(),
    status: "active",
    createdBy: creatorId,
  });

  employeeUser.employeeId = employee._id;
  await employeeUser.save();

  console.log("SEEDED_USER_EMAIL:" + employeeUser.email);
  console.log("SEEDED_USER_PASSWORD:password123");

  await mongoose.disconnect();
}

seed().catch(console.error);
