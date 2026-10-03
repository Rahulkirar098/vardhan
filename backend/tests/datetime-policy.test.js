const assert = require('assert');
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
require('dotenv').config({ path: __dirname + '/../.env' });

const { hospitalRoute } = require('../src/routes/hospital.route');
const positionRoutes = require('../src/routes/position.route');
const Hospital = require('../src/models/hospital.model');
const User = require('../src/models/user.model');
const Employee = require('../src/models/employee.model');
const Position = require('../src/models/position.model');
const Attendance = require('../src/models/attendance.model');
const Leave = require('../src/models/leave.model');
const { generateToken } = require('../src/utils/jwt');
const { processAutomaticAbsence } = require('../src/services/attendance.service');
const {
  isValidTimezone,
  getHospitalTodayDateStr,
  getHospitalDayOfWeek,
  parseHospitalTimeToDate,
} = require('../src/utils/timezone.utils');

const PORT = 61899;
let server;
let adminUser;
let token;

async function setupApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/hospitals', hospitalRoute);
  app.use('/api/v1/positions', positionRoutes);

  return new Promise((resolve) => {
    server = app.listen(PORT, () => {
      resolve();
    });
  });
}

function makeRequest(method, path, body = null, userToken = token) {
  return new Promise((resolve, reject) => {
    const dataStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: `/api/v1${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (userToken) {
      options.headers['Authorization'] = `Bearer ${userToken}`;
    }
    if (dataStr) {
      options.headers['Content-Length'] = Buffer.byteLength(dataStr);
    }

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, body: responseBody });
        }
      });
    });

    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function runTests() {
  console.log('\n==================================================================');
  console.log('=== NUVINCE HOSPITAL TIMEZONE & ATTENDANCE DAY-END TEST SUITE ===');
  console.log('==================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  await setupApp();

  // Clear test DB state
  await Hospital.deleteMany({ code: { $in: ['TZH1', 'TZH2', 'TZH3'] } });
  await User.deleteMany({ email: { $in: ['tz_admin@hospital.com', 'neha@hospital.com'] } });

  // ─── TEST 1: Timezone Utility Functions ───
  console.log('--- Test Set 1: Central Timezone Utility Functions ---');
  assert.strictEqual(isValidTimezone('Asia/Kolkata'), true, 'Asia/Kolkata should be valid');
  assert.strictEqual(isValidTimezone('Asia/Dubai'), true, 'Asia/Dubai should be valid');
  assert.strictEqual(isValidTimezone('America/New_York'), true, 'America/New_York should be valid');
  assert.strictEqual(isValidTimezone('Invalid/Timezone'), false, 'Invalid timezone should be false');

  // Verify parseHospitalTimeToDate
  const kolkataInstant = parseHospitalTimeToDate('14:00', '2026-10-03', 'Asia/Kolkata');
  // 14:00 Asia/Kolkata = 08:30 UTC
  assert.strictEqual(kolkataInstant.toISOString(), '2026-10-03T08:30:00.000Z', '14:00 IST must parse to 08:30 UTC instant');

  const dubaiInstant = parseHospitalTimeToDate('14:00', '2026-10-03', 'Asia/Dubai');
  // 14:00 Asia/Dubai (+04:00) = 10:00 UTC
  assert.strictEqual(dubaiInstant.toISOString(), '2026-10-03T10:00:00.000Z', '14:00 GST must parse to 10:00 UTC instant');

  console.log('✓ TEST 1 PASSED: Timezone utility conversions exact & verified.\n');

  // ─── TEST 2: Hospital API Timezone Validation & Defaults ───
  console.log('--- Test Set 2: Hospital API Timezone Validation & Defaults ---');

  adminUser = await User.create({
    name: 'Timezone Admin',
    email: 'tz_admin@hospital.com',
    password: 'hashedpassword',
    role: 'admin',
    permissions: ['hospital.update', 'hospital.view', 'position.create', 'position.update'],
  });
  token = generateToken({ id: adminUser._id, role: adminUser.role });

  // Create Hospital without specifying timezone -> should default to "Asia/Kolkata"
  const createRes = await makeRequest('POST', '/hospitals', {
    name: 'Timezone Hospital 1',
    code: 'TZH1',
  });
  assert.strictEqual(createRes.status, 201, 'Hospital creation should succeed');
  assert.strictEqual(createRes.body.data.timezone, 'Asia/Kolkata', 'Default timezone must be Asia/Kolkata');

  const hosp1Id = createRes.body.data.id;
  await User.findByIdAndUpdate(adminUser._id, { hospitalId: hosp1Id });

  // Update with invalid timezone -> 400 Bad Request
  const invalidUpdateRes = await makeRequest('PATCH', `/hospitals/${hosp1Id}`, {
    timezone: 'Invalid/Timezone',
  });
  assert.strictEqual(invalidUpdateRes.status, 400, 'Invalid timezone update must return 400');

  // Update with valid timezone Asia/Dubai
  const validUpdateRes = await makeRequest('PATCH', `/hospitals/${hosp1Id}`, {
    timezone: 'Asia/Dubai',
  });
  assert.strictEqual(validUpdateRes.status, 200, 'Valid timezone update must return 200');
  assert.strictEqual(validUpdateRes.body.data.timezone, 'Asia/Dubai', 'Timezone should be updated to Asia/Dubai');

  // Reset back to Asia/Kolkata
  await makeRequest('PATCH', `/hospitals/${hosp1Id}`, { timezone: 'Asia/Kolkata' });

  console.log('✓ TEST 2 PASSED: Hospital timezone API validation & defaults verified.\n');

  // ─── TEST 3: Neha Real-World Regression Test (Step 17 & 18) ───
  console.log('--- Test Set 3: Neha Real-World Saturday Cutoff Regression Test ---');

  // Create HR Position
  const hrPos = await Position.create({
    hospitalId: hosp1Id,
    name: 'HR Neha Test',
    rosterEligible: false,
    workSchedule: {
      monday: { workingDay: true, startTime: '09:00', endTime: '18:00' },
      tuesday: { workingDay: true, startTime: '09:00', endTime: '18:00' },
      wednesday: { workingDay: true, startTime: '09:00', endTime: '18:00' },
      thursday: { workingDay: true, startTime: '09:00', endTime: '18:00' },
      friday: { workingDay: true, startTime: '09:00', endTime: '18:00' },
      saturday: { workingDay: true, startTime: '09:00', endTime: '14:00' },
      sunday: { workingDay: false, startTime: null, endTime: null },
    },
  });

  // Create Employee Neha
  const nehaUser = await User.create({
    name: 'Neha',
    email: 'neha@hospital.com',
    password: 'hashedpassword',
    role: 'employee',
    hospitalId: hosp1Id,
  });

  const nehaEmp = await Employee.create({
    hospitalId: hosp1Id,
    userId: nehaUser._id,
    positionId: hrPos._id,
    employeeId: 'EMP-NEHA',
    createdBy: adminUser._id,
    firstName: 'Neha',
    lastName: 'Sharma',
    email: 'neha@hospital.com',
    employmentStatus: 'ACTIVE',
    dateOfJoining: new Date('2026-01-01'),
  });

  // Date: Saturday, Oct 3, 2026
  const satDateStr = '2026-10-03';

  // 1. Current time = 13:59 Asia/Kolkata (08:29 UTC) -> Shift NOT ended yet -> NOT ABSENT
  const at1359IST = new Date('2026-10-03T08:29:00.000Z');
  await Attendance.deleteMany({ employeeId: nehaEmp._id });
  await processAutomaticAbsence({ hospitalId: hosp1Id, dateStr: satDateStr, now: at1359IST });

  let att1359 = await Attendance.findOne({ employeeId: nehaEmp._id, dateStr: satDateStr });
  assert.strictEqual(att1359, null, 'At 13:59 IST, shift has not ended; no ABSENT record should be created');

  // 2. Current time = 14:00 Asia/Kolkata (08:30 UTC) -> Shift ended exactly -> NOT ABSENT (now > shiftEnd rule)
  const at1400IST = new Date('2026-10-03T08:30:00.000Z');
  await Attendance.deleteMany({ employeeId: nehaEmp._id });
  await processAutomaticAbsence({ hospitalId: hosp1Id, dateStr: satDateStr, now: at1400IST });

  let att1400 = await Attendance.findOne({ employeeId: nehaEmp._id, dateStr: satDateStr });
  assert.strictEqual(att1400, null, 'At 14:00 IST exactly, shift has not exceeded end time; no ABSENT record should be created');

  // 3. Current time = 15:00 Asia/Kolkata (09:30 UTC) -> Shift HAS ended -> ABSENT created!
  const at1500IST = new Date('2026-10-03T09:30:00.000Z');
  await Attendance.deleteMany({ employeeId: nehaEmp._id });
  await processAutomaticAbsence({ hospitalId: hosp1Id, dateStr: satDateStr, now: at1500IST });

  let att1500 = await Attendance.findOne({ employeeId: nehaEmp._id, dateStr: satDateStr });
  assert.notStrictEqual(att1500, null, 'At 15:00 IST after 14:00 shift end, ABSENT record MUST be created');
  assert.strictEqual(att1500.status, 'ABSENT', 'Attendance status must be ABSENT');

  console.log('✓ TEST 3 PASSED: Neha Saturday 14:00 cutoff verified (13:59 no absent, 15:00 ABSENT).\n');

  // ─── TEST 4: Sunday Weekly Off ───
  console.log('--- Test Set 4: Sunday Weekly Off ---');
  const sunDateStr = '2026-10-04';
  const sun1500IST = new Date('2026-10-04T09:30:00.000Z');
  await Attendance.deleteMany({ employeeId: nehaEmp._id });
  await processAutomaticAbsence({ hospitalId: hosp1Id, dateStr: sunDateStr, now: sun1500IST });

  let attSun = await Attendance.findOne({ employeeId: nehaEmp._id, dateStr: sunDateStr });
  assert.strictEqual(attSun, null, 'Sunday is non-working day; no ABSENT record created');

  console.log('✓ TEST 4 PASSED: Sunday weekly off does not trigger ABSENT.\n');

  // ─── TEST 5: Multi-Timezone Isolation (Step 19) ───
  console.log('--- Test Set 5: Multi-Timezone Shift-End Isolation ---');

  // Hospital A: Asia/Kolkata (+05:30)
  // Hospital B: Asia/Dubai (+04:00)
  const hosp2 = await Hospital.create({
    name: 'Dubai Hospital',
    code: 'TZH2',
    timezone: 'Asia/Dubai',
    createdBy: new mongoose.Types.ObjectId(),
  });

  const dubaiPos = await Position.create({
    hospitalId: hosp2._id,
    name: 'HR Dubai',
    rosterEligible: false,
    workSchedule: {
      saturday: { workingDay: true, startTime: '09:00', endTime: '14:00' },
    },
  });

  const dubaiEmp = await Employee.create({
    hospitalId: hosp2._id,
    positionId: dubaiPos._id,
    employeeId: 'EMP-TARIQ',
    createdBy: adminUser._id,
    firstName: 'Tariq',
    lastName: 'Dubai',
    email: 'tariq@dubaihospital.com',
    employmentStatus: 'ACTIVE',
  });

  // At 09:30 UTC on 2026-10-03:
  // - In Kolkata (Hosp 1, +05:30): Local time is 15:00 IST (after 14:00 shift end) -> ABSENT
  // - In Dubai (Hosp 2, +04:00): Local time is 13:30 GST (before 14:00 shift end) -> NOT ABSENT
  const at0930UTC = new Date('2026-10-03T09:30:00.000Z');

  await Attendance.deleteMany({ employeeId: { $in: [nehaEmp._id, dubaiEmp._id] } });

  await processAutomaticAbsence({ dateStr: satDateStr, now: at0930UTC });

  const nehaAtt = await Attendance.findOne({ employeeId: nehaEmp._id, dateStr: satDateStr });
  const dubaiAtt = await Attendance.findOne({ employeeId: dubaiEmp._id, dateStr: satDateStr });

  assert.notStrictEqual(nehaAtt, null, 'Kolkata employee at 15:00 IST (09:30 UTC) MUST be marked ABSENT');
  assert.strictEqual(nehaAtt.status, 'ABSENT');
  assert.strictEqual(dubaiAtt, null, 'Dubai employee at 13:30 GST (09:30 UTC) MUST NOT be marked ABSENT');

  console.log('✓ TEST 5 PASSED: Multi-timezone shift-end isolation verified 100%.\n');

  // ─── TEST 6: Automatic Absence Scheduler Empty Call Regression Test ───
  console.log('--- Test Set 6: Scheduler Empty Call hospitalId Regression ---');
  // Must execute processAutomaticAbsence() with no arguments and with {} without throwing Cast to ObjectId error
  await processAutomaticAbsence();
  await processAutomaticAbsence({});
  console.log('✓ TEST 6 PASSED: Scheduler empty parameter calls (hospitalId={}) execute cleanly without CastError.\n');

  // Clean up
  await Hospital.deleteMany({ code: { $in: ['TZH1', 'TZH2', 'TZH3'] } });
  await User.deleteMany({ email: { $in: ['tz_admin@hospital.com', 'neha@hospital.com'] } });
  server.close();
  await mongoose.disconnect();

  console.log('==================================================================');
  console.log('=== ALL DATETIME POLICY & TIMEZONE TESTS PASSED 100% ===');
  console.log('==================================================================\n');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  if (server) server.close();
  mongoose.disconnect();
  process.exit(1);
});
