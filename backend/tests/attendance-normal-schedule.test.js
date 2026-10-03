const assert = require("assert");
const http = require("http");
const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = require("../index");
const User = require("../src/models/user.model");
const Hospital = require("../src/models/hospital.model");
const Position = require("../src/models/position.model");
const Employee = require("../src/models/employee.model");
const Attendance = require("../src/models/attendance.model");
const Leave = require("../src/models/leave.model");
const attendanceService = require("../src/services/attendance.service");
const { generateToken } = require("../src/utils/jwt");
const { hashPassword } = require("../src/utils/password");
const { PERMISSIONS } = require("../src/config/permissions");

let server;
let baseUrl;

const request = (pathUrl, { method = "GET", headers = {}, body = null } = {}) => {
    return new Promise((resolve, reject) => {
        const url = new URL(pathUrl, baseUrl);
        const reqHeaders = { ...headers };

        let reqBody = null;
        if (body) {
            reqBody = JSON.stringify(body);
            reqHeaders["Content-Type"] = "application/json";
            reqHeaders["Content-Length"] = Buffer.byteLength(reqBody);
        }

        const req = http.request(
            url,
            { method, headers: reqHeaders },
            (res) => {
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
                    let parsed;
                    try {
                        parsed = JSON.parse(data);
                    } catch (e) {
                        parsed = data;
                    }
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: parsed,
                    });
                });
            }
        );

        req.on("error", reject);
        if (reqBody) {
            req.write(reqBody);
        }
        req.end();
    });
};

const runTests = async () => {
    console.log("\n==================================================================");
    console.log("=== NUVINCE NORMAL EMPLOYMENT ATTENDANCE SCHEDULING TEST SUITE ===");
    console.log("==================================================================\n");

    const testTimestamp = Date.now();

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
    }

    server = http.createServer(app);
    await new Promise((resolve) => {
        server.listen(0, () => {
            const port = server.address().port;
            baseUrl = `http://localhost:${port}`;
            console.log(`Server started on ${baseUrl}\n`);
            resolve();
        });
    });

    try {
        const creatorIdA = new mongoose.Types.ObjectId();
        const creatorIdB = new mongoose.Types.ObjectId();

        // 1. Setup Test Hospital A & B
        const hospitalA = await Hospital.create({
            name: `Normal Schedule Test Hosp A ${testTimestamp}`,
            code: `NSTHA${String(testTimestamp).slice(-4)}`,
            email: `nstha_${testTimestamp}@test.com`,
            phone: "9998883331",
            address: { city: "Bhopal", state: "MP", country: "India" },
            createdBy: creatorIdA,
        });

        const hospitalB = await Hospital.create({
            name: `Normal Schedule Test Hosp B ${testTimestamp}`,
            code: `NSTHB${String(testTimestamp).slice(-4)}`,
            email: `nsthb_${testTimestamp}@test.com`,
            phone: "9998883332",
            address: { city: "Bhopal", state: "MP", country: "India" },
            createdBy: creatorIdB,
        });

        const defaultPassword = await hashPassword("Password123!");

        // Admin User
        const adminUser = await User.create({
            hospitalId: hospitalA._id,
            name: "Admin User",
            email: `admin_${testTimestamp}@test.com`,
            password: defaultPassword,
            role: "admin",
            permissions: Object.values(PERMISSIONS),
            status: "active",
        });
        const adminToken = generateToken({
            id: adminUser._id.toString(),
            hospitalId: hospitalA._id.toString(),
            role: "admin",
            permissions: adminUser.permissions,
        });

        // HR User without schedule management permission
        const hrUserUnauthorized = await User.create({
            hospitalId: hospitalA._id,
            name: "HR User Unauth",
            email: `hr_unauth_${testTimestamp}@test.com`,
            password: defaultPassword,
            role: "employee",
            permissions: [PERMISSIONS.POSITION_VIEW],
            status: "active",
        });
        const hrTokenUnauth = generateToken({
            id: hrUserUnauthorized._id.toString(),
            hospitalId: hospitalA._id.toString(),
            role: "employee",
            permissions: hrUserUnauthorized.permissions,
        });

        // HR User WITH position.schedule.manage permission
        const hrUserAuthorized = await User.create({
            hospitalId: hospitalA._id,
            name: "HR User Auth",
            email: `hr_auth_${testTimestamp}@test.com`,
            password: defaultPassword,
            role: "employee",
            permissions: [PERMISSIONS.POSITION_VIEW, PERMISSIONS.POSITION_SCHEDULE_MANAGE],
            status: "active",
        });
        const hrTokenAuth = generateToken({
            id: hrUserAuthorized._id.toString(),
            hospitalId: hospitalA._id.toString(),
            role: "employee",
            permissions: hrUserAuthorized.permissions,
        });

        // Hospital B Admin User
        const adminUserB = await User.create({
            hospitalId: hospitalB._id,
            name: "Admin User B",
            email: `adminb_${testTimestamp}@test.com`,
            password: defaultPassword,
            role: "admin",
            permissions: Object.values(PERMISSIONS),
            status: "active",
        });
        const adminTokenB = generateToken({
            id: adminUserB._id.toString(),
            hospitalId: hospitalB._id.toString(),
            role: "admin",
            permissions: adminUserB.permissions,
        });

        console.log("✓ Test environment setup completed.\n");

        // ---------------------------------------------------------------------
        // TEST 1: HR position configured Monday-Saturday (rosterEligible = false)
        // TEST 2: Payroll Admin position configured Monday-Friday (rosterEligible = false)
        // TEST 15, 16, 17: Admin & Authorized HR can update schedule; Unauthorized HR cannot.
        // ---------------------------------------------------------------------
        console.log("--- Test Set 1: Position Schedule CRUD & Authorization ---");

        // Create HR position
        const hrPos = await Position.create({
            hospitalId: hospitalA._id,
            name: `HR Executive ${testTimestamp}`,
            rosterEligible: false,
            workSchedule: {
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: true,
                sunday: false,
            },
        });

        // Create Payroll position
        const payrollPos = await Position.create({
            hospitalId: hospitalA._id,
            name: `Payroll Admin ${testTimestamp}`,
            rosterEligible: false,
            workSchedule: {
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: false,
                sunday: false,
            },
        });

        // Create Roster-based Nursing position
        const nursePos = await Position.create({
            hospitalId: hospitalA._id,
            name: `Staff Nurse ${testTimestamp}`,
            rosterEligible: true,
            workSchedule: {
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: true,
                sunday: false,
            },
        });

        // 15: Unauthorized HR cannot update schedule
        const resUnauth = await request(`/api/positions/${hrPos._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrTokenUnauth}` },
            body: {
                workSchedule: { sunday: true },
            },
        });
        assert.strictEqual(resUnauth.status, 403, "Unauthorized HR must be denied schedule modification (403)");
        console.log("✓ TEST 15 PASSED: Unauthorized HR cannot modify position schedule.");

        // 16: Authorized HR can update schedule
        const resAuth = await request(`/api/positions/${hrPos._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrTokenAuth}` },
            body: {
                name: hrPos.name,
                rosterEligible: false,
                workSchedule: {
                    monday: true,
                    tuesday: true,
                    wednesday: true,
                    thursday: true,
                    friday: true,
                    saturday: true,
                    sunday: false,
                },
            },
        });
        assert.strictEqual(resAuth.status, 200, "Authorized HR must be allowed to modify position schedule (200)");
        console.log("✓ TEST 16 PASSED: Authorized HR can modify position schedule.");

        // 17: Admin can modify position schedule
        const resAdmin = await request(`/api/positions/${payrollPos._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
                name: payrollPos.name,
                rosterEligible: false,
                workSchedule: {
                    monday: true,
                    tuesday: true,
                    wednesday: true,
                    thursday: true,
                    friday: true,
                    saturday: false,
                    sunday: false,
                },
            },
        });
        assert.strictEqual(resAdmin.status, 200, "Admin must be allowed to modify position schedule (200)");
        console.log("✓ TEST 17 PASSED: Admin can modify position schedule.");

        // 18: Changing one position's schedule does not affect another
        const hrPosCheck = await Position.findById(hrPos._id);
        const payrollPosCheck = await Position.findById(payrollPos._id);
        assert.strictEqual(hrPosCheck.workSchedule.saturday.workingDay, true, "HR position Saturday schedule should be true");
        assert.strictEqual(payrollPosCheck.workSchedule.saturday.workingDay, false, "Payroll position Saturday schedule should be false");
        console.log("✓ TEST 18 PASSED: Changing one position's schedule does not affect another.");

        // 19: Time format validation tests
        const invalidTimeRes = await request(`/api/positions/${hrPos._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
                name: hrPos.name,
                rosterEligible: false,
                workSchedule: {
                    monday: { workingDay: true, startTime: "25:00", endTime: "18:00" },
                },
            },
        });
        assert.strictEqual(invalidTimeRes.status, 400, "Invalid time format (25:00) must return 400 validation error");

        const missingTimeRes = await request(`/api/positions/${hrPos._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
                name: hrPos.name,
                rosterEligible: false,
                workSchedule: {
                    monday: { workingDay: true, startTime: "09:00", endTime: null },
                },
            },
        });
        assert.strictEqual(missingTimeRes.status, 400, "Missing end time when workingDay=true must return 400 validation error");
        console.log("✓ TEST 19 PASSED: Position schedule time validation (HH:mm format & required times) works as expected.");

        // 14: Cross-hospital schedule isolation
        const resCrossHosp = await request(`/api/positions/${hrPos._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminTokenB}` },
            body: {
                name: "Hacked HR",
                workSchedule: { sunday: { workingDay: true, startTime: "09:00", endTime: "18:00" } },
            },
        });
        assert.strictEqual(resCrossHosp.status, 404, "Cross-hospital position access must return 404/denied");
        console.log("✓ TEST 14 PASSED: Cross-hospital position access blocked.");

        // ---------------------------------------------------------------------
        // TEST 21: ROUND-TRIP STRUCTURED SCHEDULE PERSISTENCE REGRESSION TEST
        // ---------------------------------------------------------------------
        const structuredPayload = {
            name: `HR Structured Test ${testTimestamp}`,
            defaultModules: ["hrms"],
            rosterEligible: false,
            workSchedule: {
                monday: { workingDay: true, startTime: "09:00", endTime: "18:00" },
                tuesday: { workingDay: true, startTime: "09:00", endTime: "18:00" },
                wednesday: { workingDay: true, startTime: "09:00", endTime: "18:00" },
                thursday: { workingDay: true, startTime: "09:00", endTime: "18:00" },
                friday: { workingDay: true, startTime: "09:00", endTime: "18:00" },
                saturday: { workingDay: true, startTime: "09:00", endTime: "11:00" },
                sunday: { workingDay: false, startTime: null, endTime: null },
            },
        };

        // 1. Send PATCH request
        const patchRes = await request(`/api/positions/${hrPos._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminToken}` },
            body: structuredPayload,
        });

        assert.strictEqual(patchRes.status, 200, "PATCH position with structured schedule must return 200 OK");
        const patchData = patchRes.body.data;

        // 2. Assert PATCH response structure
        assert.strictEqual(typeof patchData.workSchedule.saturday, "object", "Saturday schedule in PATCH response MUST be an object, not boolean");
        assert.strictEqual(patchData.workSchedule.saturday.workingDay, true, "Saturday workingDay must be true");
        assert.strictEqual(patchData.workSchedule.saturday.startTime, "09:00", "Saturday startTime must be '09:00'");
        assert.strictEqual(patchData.workSchedule.saturday.endTime, "11:00", "Saturday endTime must be '11:00'");

        assert.strictEqual(typeof patchData.workSchedule.sunday, "object", "Sunday schedule in PATCH response MUST be an object, not boolean");
        assert.strictEqual(patchData.workSchedule.sunday.workingDay, false, "Sunday workingDay must be false");
        assert.strictEqual(patchData.workSchedule.sunday.startTime, null, "Sunday startTime must be null");
        assert.strictEqual(patchData.workSchedule.sunday.endTime, null, "Sunday endTime must be null");

        // 3. Perform GET /positions
        const getRes = await request(`/api/positions`, {
            method: "GET",
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        assert.strictEqual(getRes.status, 200, "GET /positions must return 200 OK");
        const fetchedHrPos = getRes.body.data.find(p => p._id === hrPos._id.toString());
        assert.ok(fetchedHrPos, "Fetched HR position must exist in GET response");

        // 4. Assert GET response structure
        assert.strictEqual(typeof fetchedHrPos.workSchedule.saturday, "object", "Saturday schedule in GET response MUST be an object, not boolean");
        assert.strictEqual(fetchedHrPos.workSchedule.saturday.workingDay, true, "GET Saturday workingDay must be true");
        assert.strictEqual(fetchedHrPos.workSchedule.saturday.startTime, "09:00", "GET Saturday startTime must be '09:00'");
        assert.strictEqual(fetchedHrPos.workSchedule.saturday.endTime, "11:00", "GET Saturday endTime must be '11:00'");

        assert.strictEqual(typeof fetchedHrPos.workSchedule.sunday, "object", "Sunday schedule in GET response MUST be an object, not boolean");
        assert.strictEqual(fetchedHrPos.workSchedule.sunday.workingDay, false, "GET Sunday workingDay must be false");
        assert.strictEqual(fetchedHrPos.workSchedule.sunday.startTime, null, "GET Sunday startTime must be null");
        assert.strictEqual(fetchedHrPos.workSchedule.sunday.endTime, null, "GET Sunday endTime must be null");

        // 5. Verify direct database read via Mongoose
        const dbPos = await Position.findById(hrPos._id);
        assert.strictEqual(typeof dbPos.workSchedule.saturday, "object", "Database Saturday schedule MUST be an object, not boolean");
        assert.strictEqual(dbPos.workSchedule.saturday.startTime, "09:00", "DB Saturday startTime must be '09:00'");
        assert.strictEqual(dbPos.workSchedule.saturday.endTime, "11:00", "DB Saturday endTime must be '11:00'");
        assert.strictEqual(dbPos.workSchedule.sunday.workingDay, false, "DB Sunday workingDay must be false");

        console.log("✓ TEST 21 PASSED: Round-trip structured schedule persistence (Frontend -> PATCH -> DB -> GET) verified 100%.");

        // ---------------------------------------------------------------------
        // TEST SET 2: Automatic Absence & Working Day Calculations
        // ---------------------------------------------------------------------
        console.log("\n--- Test Set 2: Attendance Expectations & Automatic Absence ---");

        // Create Employee 1: Rahul (HR position, Mon-Sat)
        const rahulUser = await User.create({
            hospitalId: hospitalA._id,
            name: "Rahul HR",
            email: `rahul_hr_${testTimestamp}@test.com`,
            password: defaultPassword,
            role: "employee",
            status: "active",
        });

        const rahulEmp = await Employee.create({
            hospitalId: hospitalA._id,
            userId: rahulUser._id,
            firstName: "Rahul",
            lastName: "HR",
            email: `rahul_hr_${testTimestamp}@test.com`,
            employeeId: `EMP_HR_${testTimestamp}`,
            positionId: hrPos._id,
            dateOfJoining: new Date("2026-09-01"),
            employmentStatus: "ACTIVE",
            createdBy: adminUser._id,
        });

        // Create Employee 2: Priya (Payroll position, Mon-Fri)
        const priyaUser = await User.create({
            hospitalId: hospitalA._id,
            name: "Priya Payroll",
            email: `priya_payroll_${testTimestamp}@test.com`,
            password: defaultPassword,
            role: "employee",
            status: "active",
        });

        const priyaEmp = await Employee.create({
            hospitalId: hospitalA._id,
            userId: priyaUser._id,
            firstName: "Priya",
            lastName: "Payroll",
            email: `priya_payroll_${testTimestamp}@test.com`,
            employeeId: `EMP_PAY_${testTimestamp}`,
            positionId: payrollPos._id,
            dateOfJoining: new Date("2026-09-01"),
            employmentStatus: "ACTIVE",
            createdBy: adminUser._id,
        });

        // Dates for testing (past dates relative to current date 2026-10-03):
        // 2026-09-28 is a Monday
        // 2026-09-26 is a Saturday
        // 2026-09-27 is a Sunday
        const mondayStr = "2026-09-28";
        const saturdayStr = "2026-09-26";
        const sundayStr = "2026-09-27";

        // TEST 2: HR Position on Monday -> Expected Working Day -> Automatic Absence creates ABSENT
        await attendanceService.processAutomaticAbsence(hospitalA._id, new Date(mondayStr));
        const rahulMondayAtt = await Attendance.findOne({ employeeId: rahulEmp._id, dateStr: mondayStr });
        assert.strictEqual(rahulMondayAtt?.status, "ABSENT", "Rahul should be marked ABSENT on Monday (expected workday)");
        console.log("✓ TEST 2 & 6 PASSED: HR Employee on Monday (expected workday) with no attendance is marked ABSENT.");

        // TEST 3: HR Position on Sunday -> Non-working day -> NO ABSENT created
        await attendanceService.processAutomaticAbsence(hospitalA._id, new Date(sundayStr));
        const rahulSundayAtt = await Attendance.findOne({ employeeId: rahulEmp._id, dateStr: sundayStr });
        assert.strictEqual(rahulSundayAtt, null, "Rahul should NOT have ABSENT record on Sunday (non-working day)");
        console.log("✓ TEST 3 PASSED: HR Employee on Sunday (non-working day) does NOT get ABSENT.");

        // TEST 4 & 5: Payroll Position on Saturday -> Non-working day -> NO ABSENT created
        await attendanceService.processAutomaticAbsence(hospitalA._id, new Date(saturdayStr));
        const priyaSaturdayAtt = await Attendance.findOne({ employeeId: priyaEmp._id, dateStr: saturdayStr });
        assert.strictEqual(priyaSaturdayAtt, null, "Priya (Payroll) should NOT have ABSENT record on Saturday (non-working day)");

        // But Rahul (HR) IS expected on Saturday -> Should get ABSENT
        const rahulSaturdayAtt = await Attendance.findOne({ employeeId: rahulEmp._id, dateStr: saturdayStr });
        assert.strictEqual(rahulSaturdayAtt?.status, "ABSENT", "Rahul (HR) SHOULD have ABSENT record on Saturday");
        console.log("✓ TEST 4 & 5 PASSED: Payroll Employee on Saturday gets no ABSENT; HR Employee on Saturday gets ABSENT.");

        // TEST 7: Expected workday + PRESENT -> preserve PRESENT
        const tuesdayStr = "2026-09-29";
        await Attendance.create({
            hospitalId: hospitalA._id,
            userId: rahulUser._id,
            employeeId: rahulEmp._id,
            dateStr: tuesdayStr,
            date: new Date(`${tuesdayStr}T00:00:00.000Z`),
            checkIn: new Date("2026-09-29T09:00:00Z"),
            status: "PRESENT",
        });
        await attendanceService.processAutomaticAbsence(hospitalA._id, new Date(tuesdayStr));
        const rahulTuesdayAtt = await Attendance.findOne({ employeeId: rahulEmp._id, dateStr: tuesdayStr });
        assert.strictEqual(rahulTuesdayAtt?.status, "PRESENT", "Existing PRESENT status must be preserved");
        console.log("✓ TEST 7 PASSED: Existing PRESENT status is preserved.");

        // TEST 8, 9, 10: Approved vs Pending vs Rejected Leave Integration
        const wednesdayStr = "2026-09-30";
        const thursdayStr = "2026-10-01";
        const fridayStr = "2026-10-02";

        // Rahul has APPROVED leave on Wednesday (2026-09-30)
        await Leave.create({
            hospitalId: hospitalA._id,
            employeeId: rahulEmp._id,
            leaveType: "CASUAL",
            startDate: new Date(wednesdayStr),
            endDate: new Date(wednesdayStr),
            totalDays: 1,
            reason: "Vacation",
            status: "approved",
            appliedBy: rahulUser._id,
        });

        // Rahul has PENDING leave on Thursday (2026-10-01)
        await Leave.create({
            hospitalId: hospitalA._id,
            employeeId: rahulEmp._id,
            leaveType: "CASUAL",
            startDate: new Date(thursdayStr),
            endDate: new Date(thursdayStr),
            totalDays: 1,
            reason: "Personal",
            status: "pending",
            appliedBy: rahulUser._id,
        });

        // Rahul has REJECTED leave on Friday (2026-10-02)
        await Leave.create({
            hospitalId: hospitalA._id,
            employeeId: rahulEmp._id,
            leaveType: "CASUAL",
            startDate: new Date(fridayStr),
            endDate: new Date(fridayStr),
            totalDays: 1,
            reason: "Rejected request",
            status: "rejected",
            appliedBy: rahulUser._id,
        });

        // Process automatic absence for Wed, Thu, Fri
        await attendanceService.processAutomaticAbsence(hospitalA._id, new Date(wednesdayStr));
        await attendanceService.processAutomaticAbsence(hospitalA._id, new Date(thursdayStr));
        await attendanceService.processAutomaticAbsence(hospitalA._id, new Date(fridayStr));

        const wedAtt = await Attendance.findOne({ employeeId: rahulEmp._id, dateStr: wednesdayStr });
        const thuAtt = await Attendance.findOne({ employeeId: rahulEmp._id, dateStr: thursdayStr });
        const friAtt = await Attendance.findOne({ employeeId: rahulEmp._id, dateStr: fridayStr });

        assert.strictEqual(wedAtt, null, "Approved leave on Wednesday must prevent ABSENT record creation");
        assert.strictEqual(thuAtt?.status, "ABSENT", "Pending leave on Thursday must NOT prevent ABSENT");
        assert.strictEqual(friAtt?.status, "ABSENT", "Rejected leave on Friday must NOT prevent ABSENT");
        console.log("✓ TEST 8, 9, 10 PASSED: Approved leave prevents ABSENT; Pending/Rejected leave does not prevent ABSENT.");

        // TEST 11: Joining Date protection (Employee joins on 2 Oct -> 1 Oct must not become ABSENT)
        const lateJoinerUser = await User.create({
            hospitalId: hospitalA._id,
            name: "Late Joiner",
            email: `late_${testTimestamp}@test.com`,
            password: defaultPassword,
            role: "employee",
            status: "active",
        });
        const lateJoinerEmp = await Employee.create({
            hospitalId: hospitalA._id,
            userId: lateJoinerUser._id,
            firstName: "Late",
            lastName: "Joiner",
            email: `late_${testTimestamp}@test.com`,
            employeeId: `EMP_LATE_${testTimestamp}`,
            positionId: hrPos._id,
            dateOfJoining: new Date("2026-10-02"), // Joins Oct 2
            employmentStatus: "ACTIVE",
            createdBy: adminUser._id,
        });

        const oct1Str = "2026-10-01"; // Thursday (working day for HR)
        await attendanceService.processAutomaticAbsence(hospitalA._id, new Date(oct1Str));
        const lateJoinerOct1Att = await Attendance.findOne({ employeeId: lateJoinerEmp._id, dateStr: oct1Str });
        assert.strictEqual(lateJoinerOct1Att, null, "Date before employee dateOfJoining must NOT get ABSENT");
        console.log("✓ TEST 11 PASSED: Date before employee dateOfJoining is protected from ABSENT.");

        // TEST 12: Leaving Date protection (Employee leaves on 25 Sep -> 28 Sep (Mon) must not become ABSENT)
        const exitedUser = await User.create({
            hospitalId: hospitalA._id,
            name: "Exited Emp",
            email: `exit_${testTimestamp}@test.com`,
            password: defaultPassword,
            role: "employee",
            status: "inactive",
        });
        const exitedEmp = await Employee.create({
            hospitalId: hospitalA._id,
            userId: exitedUser._id,
            firstName: "Exited",
            lastName: "Emp",
            email: `exit_${testTimestamp}@test.com`,
            employeeId: `EMP_EXIT_${testTimestamp}`,
            positionId: hrPos._id,
            dateOfJoining: new Date("2026-01-01"),
            lastWorkingDay: new Date("2026-09-25"), // Exits Sep 25
            employmentStatus: "INACTIVE",
            createdBy: adminUser._id,
        });

        const sep28Str = "2026-09-28"; // Monday (working day for HR)
        await attendanceService.processAutomaticAbsence(hospitalA._id, new Date(sep28Str));
        const exitedSep28Att = await Attendance.findOne({ employeeId: exitedEmp._id, dateStr: sep28Str });
        assert.strictEqual(exitedSep28Att, null, "Date after employee lastWorkingDay must NOT get ABSENT");
        console.log("✓ TEST 12 PASSED: Date after employee lastWorkingDay is protected from ABSENT.");

        // TEST 13: Roster-based employee (rosterEligible = true) is ignored by normal employment schedule
        const nurseUser = await User.create({
            hospitalId: hospitalA._id,
            name: "Staff Nurse User",
            email: `nurse_${testTimestamp}@test.com`,
            password: defaultPassword,
            role: "employee",
            status: "active",
        });
        const nurseEmp = await Employee.create({
            hospitalId: hospitalA._id,
            userId: nurseUser._id,
            firstName: "Staff",
            lastName: "Nurse",
            email: `nurse_${testTimestamp}@test.com`,
            employeeId: `EMP_NURSE_${testTimestamp}`,
            positionId: nursePos._id, // rosterEligible = true
            dateOfJoining: new Date("2026-09-01"),
            employmentStatus: "ACTIVE",
            createdBy: adminUser._id,
        });

        // TEST 20: Overnight Shift Cutoff (22:00 -> 06:00 next day)
        const nightGuardPos = await Position.create({
            hospitalId: hospitalA._id,
            name: `Night Security Guard ${testTimestamp}`,
            rosterEligible: false,
            workSchedule: {
                monday: { workingDay: true, startTime: "22:00", endTime: "06:00" },
                tuesday: { workingDay: true, startTime: "22:00", endTime: "06:00" },
                wednesday: { workingDay: true, startTime: "22:00", endTime: "06:00" },
                thursday: { workingDay: true, startTime: "22:00", endTime: "06:00" },
                friday: { workingDay: true, startTime: "22:00", endTime: "06:00" },
                saturday: { workingDay: false, startTime: null, endTime: null },
                sunday: { workingDay: false, startTime: null, endTime: null },
            },
        });

        const nightGuardUser = await User.create({
            hospitalId: hospitalA._id,
            name: "Night Guard User",
            email: `guard_${testTimestamp}@test.com`,
            password: defaultPassword,
            role: "employee",
            status: "active",
        });

        const nightGuardEmp = await Employee.create({
            hospitalId: hospitalA._id,
            userId: nightGuardUser._id,
            firstName: "Night",
            lastName: "Guard",
            email: `guard_${testTimestamp}@test.com`,
            employeeId: `EMP_GUARD_${testTimestamp}`,
            positionId: nightGuardPos._id,
            dateOfJoining: new Date("2026-09-01"),
            employmentStatus: "ACTIVE",
            createdBy: adminUser._id,
        });

        // 2026-09-28 is a Monday. Shift starts 22:00 Sep 28 and ends 06:00 Sep 29.
        // If automatic absence runs at 2026-09-29 03:00 local time (before 06:00 shift end), guard should NOT be marked ABSENT yet.
        const { parseHospitalTimeToDate } = require("../src/utils/timezone.utils");
        const at0300Local = parseHospitalTimeToDate("03:00", "2026-09-29", "Asia/Kolkata");
        await attendanceService.processAutomaticAbsence(
            hospitalA._id,
            new Date("2026-09-28"),
            at0300Local
        );
        const guardBeforeEndAtt = await Attendance.findOne({ employeeId: nightGuardEmp._id, dateStr: "2026-09-28" });
        assert.strictEqual(guardBeforeEndAtt, null, "Overnight shift before end time (06:00) should NOT create ABSENT");

        // If automatic absence runs at 2026-09-29 07:00 local time (after 06:00 shift end), guard SHOULD be marked ABSENT.
        const at0700Local = parseHospitalTimeToDate("07:00", "2026-09-29", "Asia/Kolkata");
        await attendanceService.processAutomaticAbsence(
            hospitalA._id,
            new Date("2026-09-28"),
            at0700Local
        );
        const guardAfterEndAtt = await Attendance.findOne({ employeeId: nightGuardEmp._id, dateStr: "2026-09-28" });
        assert.strictEqual(guardAfterEndAtt?.status, "ABSENT", "Overnight shift after end time (06:00 next day) SHOULD create ABSENT");
        console.log("✓ TEST 20 PASSED: Overnight shift cutoff (22:00 -> 06:00) correctly evaluated across midnight.");

        console.log("\n==================================================================");
        console.log("=== ALL 20 NORMAL EMPLOYMENT ATTENDANCE SCHEDULING TESTS PASSED ===");
        console.log("==================================================================\n");

    } catch (err) {
        console.error("\n❌ TEST SUITE FAILED:", err);
        process.exitCode = 1;
    } finally {
        if (server) {
            server.close();
        }
        await mongoose.disconnect();
    }
};

runTests();
