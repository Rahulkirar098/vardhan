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
const AttendanceRegularization = require("../src/models/attendanceRegularization.model");
const Roster = require("../src/models/roster.model");
const RosterAssignment = require("../src/models/rosterAssignment.model");
const Leave = require("../src/models/leave.model");
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
    console.log("\n=======================================================");
    console.log("=== NUVINCE PHASE 8C ATTENDANCE + REGULARIZATION TEST SUITE ===");
    console.log("=======================================================\n");

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

        // 1. Setup Test Hospital A
        const hospitalA = await Hospital.create({
            name: `Attendance Test Hospital A ${testTimestamp}`,
            code: `ATHA${String(testTimestamp).slice(-4)}`,
            email: `atha_${testTimestamp}@test.com`,
            phone: "9998881111",
            address: { city: "Bhopal", state: "MP", country: "India" },
            createdBy: creatorIdA,
        });

        // 2. Setup Test Hospital B (for Tenant Isolation)
        const hospitalB = await Hospital.create({
            name: `Attendance Test Hospital B ${testTimestamp}`,
            code: `ATHB${String(testTimestamp).slice(-4)}`,
            email: `athb_${testTimestamp}@test.com`,
            phone: "9998882222",
            address: { city: "Indore", state: "MP", country: "India" },
            createdBy: creatorIdB,
        });

        const hashedPassword = await hashPassword("password123");

        // Admin User (Hospital A)
        const adminUser = await User.create({
            name: "Admin User",
            email: `admin_${testTimestamp}@test.com`,
            password: hashedPassword,
            role: "admin",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hospital_structure", "hrms"],
            permissions: Object.values(PERMISSIONS),
        });
        const adminToken = generateToken({ id: adminUser._id, role: adminUser.role });

        // Staff Position
        const staffPosition = await Position.create({
            hospitalId: hospitalA._id,
            name: `Staff Position ${testTimestamp}`,
            code: `STF_${String(testTimestamp).slice(-4)}`,
            rosterEligible: true,
            status: "active",
            createdBy: adminUser._id,
        });

        // Staff Employee 1 User (Hospital A)
        const staffUser1 = await User.create({
            name: "Staff Employee One",
            email: `staff1_${testTimestamp}@test.com`,
            password: hashedPassword,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.ATTENDANCE_VIEW_OWN],
        });

        const staffEmp1 = await Employee.create({
            hospitalId: hospitalA._id,
            userId: staffUser1._id,
            positionId: staffPosition._id,
            firstName: "Staff",
            lastName: "One",
            email: staffUser1.email,
            phone: "9876543210",
            employeeId: `EMP1-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date(),
            status: "active",
            createdBy: adminUser._id,
        });
        staffUser1.employeeId = staffEmp1._id;
        await staffUser1.save();

        const staff1Token = generateToken({ id: staffUser1._id, role: staffUser1.role });

        // Staff Position for Hospital B
        const staffPositionB = await Position.create({
            hospitalId: hospitalB._id,
            name: `Staff Position B ${testTimestamp}`,
            code: `STFB_${String(testTimestamp).slice(-4)}`,
            rosterEligible: true,
            status: "active",
            createdBy: creatorIdB,
        });

        // Staff Employee 2 User (Hospital B - Tenant Isolation)
        const staffUser2 = await User.create({
            name: "Staff Employee Two",
            email: `staff2_${testTimestamp}@test.com`,
            password: hashedPassword,
            role: "employee",
            hospitalId: hospitalB._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.ATTENDANCE_VIEW_OWN],
        });

        const staffEmp2 = await Employee.create({
            hospitalId: hospitalB._id,
            userId: staffUser2._id,
            positionId: staffPositionB._id,
            firstName: "Staff",
            lastName: "Two",
            email: staffUser2.email,
            phone: "9876543211",
            employeeId: `EMP2-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date(),
            status: "active",
            createdBy: creatorIdB,
        });
        staffUser2.employeeId = staffEmp2._id;
        await staffUser2.save();

        const staff2Token = generateToken({ id: staffUser2._id, role: staffUser2.role });

        // Inactive Staff Employee
        const inactiveStaffUser = await User.create({
            name: "Inactive Staff",
            email: `inactive_${testTimestamp}@test.com`,
            password: hashedPassword,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.ATTENDANCE_VIEW_OWN],
        });

        const inactiveStaffEmp = await Employee.create({
            hospitalId: hospitalA._id,
            userId: inactiveStaffUser._id,
            positionId: staffPosition._id,
            firstName: "Inactive",
            lastName: "Staff",
            email: inactiveStaffUser.email,
            phone: "9876543212",
            employeeId: `EMP-INACT-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date(),
            employmentStatus: "INACTIVE",
            status: "inactive",
            createdBy: adminUser._id,
        });
        inactiveStaffUser.employeeId = inactiveStaffEmp._id;
        await inactiveStaffUser.save();

        const inactiveStaffToken = generateToken({ id: inactiveStaffUser._id, role: inactiveStaffUser.role });

        console.log("Setup completed successfully. Running Attendance test scenarios...\n");

        // ─────────────────────────────────────────────────────────────
        // 1. CHECK IN SCENARIOS
        // ─────────────────────────────────────────────────────────────
        console.log("--- 1. CHECK IN SCENARIOS ---");

        // Test 1: Staff Employee can Check In
        const checkInRes = await request("/api/v1/hrms/attendance/check-in", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: { notes: "Morning check-in on time" },
        });

        assert.strictEqual(checkInRes.status, 201, `Check-in should return 201 Created. Got: ${checkInRes.status}`);
        assert.strictEqual(checkInRes.body.success, true);
        assert.strictEqual(checkInRes.body.data.status, "PRESENT");
        assert.ok(checkInRes.body.data.checkIn, "checkIn timestamp should be present");
        console.log("  ✓ 1. Employee can check in successfully (status = PRESENT)");

        // Test 2: Duplicate check-in on same date is rejected with 409 Conflict
        const dupCheckInRes = await request("/api/v1/hrms/attendance/check-in", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: { notes: "Attempting duplicate check-in" },
        });

        assert.strictEqual(dupCheckInRes.status, 409, `Duplicate check-in should return 409 Conflict. Got: ${dupCheckInRes.status}`);
        assert.strictEqual(dupCheckInRes.body.success, false);
        console.log("  ✓ 2. Duplicate check-in on same date rejected with 409 Conflict");

        // Test 3: Inactive employee cannot check in
        const inactiveCheckInRes = await request("/api/v1/hrms/attendance/check-in", {
            method: "POST",
            headers: { Authorization: `Bearer ${inactiveStaffToken}` },
        });

        assert.strictEqual(inactiveCheckInRes.status, 403, `Inactive employee check-in should return 403. Got: ${inactiveCheckInRes.status}`);
        console.log("  ✓ 3. Inactive employee cannot mark attendance (403 Forbidden)");

        // ─────────────────────────────────────────────────────────────
        // 2. TODAY'S ATTENDANCE STATUS
        // ─────────────────────────────────────────────────────────────
        console.log("\n--- 2. TODAY'S ATTENDANCE STATUS ---");

        // Test 4: Get today's attendance for checked-in employee
        const todayRes = await request("/api/v1/hrms/attendance/today", {
            method: "GET",
            headers: { Authorization: `Bearer ${staff1Token}` },
        });

        assert.strictEqual(todayRes.status, 200);
        assert.strictEqual(todayRes.body.success, true);
        assert.ok(todayRes.body.data, "Today's record should be returned");
        assert.strictEqual(todayRes.body.data.status, "PRESENT");
        console.log("  ✓ 4. Employee can retrieve today's attendance status");

        // Test 5: Employee who has not checked in returns null data cleanly
        const todayNotCheckedInRes = await request("/api/v1/hrms/attendance/today", {
            method: "GET",
            headers: { Authorization: `Bearer ${staff2Token}` },
        });

        assert.strictEqual(todayNotCheckedInRes.status, 200);
        assert.strictEqual(todayNotCheckedInRes.body.data, null);
        console.log("  ✓ 5. Un-checked-in employee returns null for today's status");

        // ─────────────────────────────────────────────────────────────
        // 3. CHECK OUT SCENARIOS
        // ─────────────────────────────────────────────────────────────
        console.log("\n--- 3. CHECK OUT SCENARIOS ---");

        // Test 6: Check out without check-in fails with 404
        const checkOutNoInRes = await request("/api/v1/hrms/attendance/check-out", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff2Token}` },
        });

        assert.strictEqual(checkOutNoInRes.status, 404, `Checkout without checkin should return 404. Got: ${checkOutNoInRes.status}`);
        console.log("  ✓ 6. Check out without prior check-in returns 404 Not Found");

        // Test 7: Checked-in employee can Check Out
        const checkOutRes = await request("/api/v1/hrms/attendance/check-out", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: { notes: "Shift completed" },
        });

        assert.strictEqual(checkOutRes.status, 200, `Check-out should return 200 OK. Got: ${checkOutRes.status}`);
        assert.strictEqual(checkOutRes.body.success, true);
        assert.ok(checkOutRes.body.data.checkOut, "checkOut timestamp should be set");
        assert.ok(typeof checkOutRes.body.data.workingMinutes === "number", "workingMinutes should be calculated");
        console.log("  ✓ 7. Checked-in employee can check out successfully (working duration calculated)");

        // Test 8: Duplicate checkout is blocked with 400 Bad Request
        const dupCheckOutRes = await request("/api/v1/hrms/attendance/check-out", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
        });

        assert.strictEqual(dupCheckOutRes.status, 400, `Duplicate check-out should return 400. Got: ${dupCheckOutRes.status}`);
        console.log("  ✓ 8. Repeated check-out rejected with 400 Bad Request");

        // ─────────────────────────────────────────────────────────────
        // 4. ATTENDANCE HISTORY & STATS
        // ─────────────────────────────────────────────────────────────
        console.log("\n--- 4. ATTENDANCE HISTORY & STATS ---");

        // Test 9: Employee can view own history (/my)
        const myHistoryRes = await request("/api/v1/hrms/attendance/my", {
            method: "GET",
            headers: { Authorization: `Bearer ${staff1Token}` },
        });

        assert.strictEqual(myHistoryRes.status, 200);
        assert.strictEqual(myHistoryRes.body.success, true);
        assert.ok(Array.isArray(myHistoryRes.body.data), "History should be an array");
        assert.strictEqual(myHistoryRes.body.data.length, 1);
        console.log("  ✓ 9. Employee can view own attendance history");

        // Test 10: Attendance Stats calculation (/stats)
        const statsRes = await request("/api/v1/hrms/attendance/stats", {
            method: "GET",
            headers: { Authorization: `Bearer ${staff1Token}` },
        });

        assert.strictEqual(statsRes.status, 200);
        assert.strictEqual(statsRes.body.success, true);
        assert.strictEqual(statsRes.body.data.present, 1);
        assert.strictEqual(statsRes.body.data.workingDays, 1);
        console.log("  ✓ 10. Attendance summary statistics computed correctly");

        // ─────────────────────────────────────────────────────────────
        // 5. WORKFORCE ATTENDANCE & AUTHORIZATION RULES
        // ─────────────────────────────────────────────────────────────
        console.log("\n--- 5. WORKFORCE ATTENDANCE & AUTHORIZATION RULES ---");

        // Test 11: Normal staff employee without attendance.view cannot view hospital attendance (403)
        const staffWorkforceRes = await request("/api/v1/hrms/attendance", {
            method: "GET",
            headers: { Authorization: `Bearer ${staff1Token}` },
        });

        assert.strictEqual(staffWorkforceRes.status, 403, `Normal employee without attendance.view should be rejected with 403. Got: ${staffWorkforceRes.status}`);
        console.log("  ✓ 11. Normal employee without management permission cannot view workforce records (403 Forbidden)");

        // Test 12: Admin can view hospital workforce attendance
        const adminWorkforceRes = await request("/api/v1/hrms/attendance", {
            method: "GET",
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        assert.strictEqual(adminWorkforceRes.status, 200);
        assert.strictEqual(adminWorkforceRes.body.success, true);
        assert.ok(Array.isArray(adminWorkforceRes.body.data));
        assert.strictEqual(adminWorkforceRes.body.data.length, 1);
        console.log("  ✓ 12. Admin can view hospital workforce attendance");

        // Test 13: Tenant Isolation - Hospital A attendance not visible in Hospital B
        const hospitalBAdmin = await User.create({
            name: "Hospital B Admin",
            email: `admin_b_${testTimestamp}@test.com`,
            password: hashedPassword,
            role: "admin",
            hospitalId: hospitalB._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: Object.values(PERMISSIONS),
        });
        const adminBToken = generateToken({ id: hospitalBAdmin._id, role: hospitalBAdmin.role });

        const hospitalBRecordsRes = await request("/api/v1/hrms/attendance", {
            method: "GET",
            headers: { Authorization: `Bearer ${adminBToken}` },
        });

        assert.strictEqual(hospitalBRecordsRes.status, 200);
        assert.strictEqual(hospitalBRecordsRes.body.data.length, 0, "Hospital B should not see Hospital A records");
        console.log("  ✓ 13. Tenant isolation enforced across hospitals");

        // ─────────────────────────────────────────────────────────────
        // 6. ATTENDANCE REGULARIZATION TESTS
        // ─────────────────────────────────────────────────────────────
        console.log("\n--- 6. ATTENDANCE REGULARIZATION ---");

        // Use a past dateStr for regularization (not today, to avoid conflict with check-in)
        const pastDateStr = "2026-01-15";

        // Test 14: Employee can submit a regularization request
        const regSubmitRes = await request("/api/v1/hrms/attendance/regularization", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: {
                date: pastDateStr,
                requestedStatus: "PRESENT",
                requestedCheckIn: `${pastDateStr}T09:00:00`,
                requestedCheckOut: `${pastDateStr}T18:00:00`,
                reason: "Was present but forgot to check in on the system.",
            },
        });

        assert.strictEqual(regSubmitRes.status, 201, `Regularization submit should return 201. Got: ${regSubmitRes.status} — ${JSON.stringify(regSubmitRes.body)}`);
        assert.strictEqual(regSubmitRes.body.success, true);
        assert.strictEqual(regSubmitRes.body.data.status, "PENDING");
        assert.strictEqual(regSubmitRes.body.data.requestedStatus, "PRESENT");
        const createdRegId = regSubmitRes.body.data._id;
        console.log("  ✓ 14. Employee can submit a regularization request (status = PENDING)");

        // Test 15: Duplicate pending regularization for same date is rejected with 409
        const dupRegRes = await request("/api/v1/hrms/attendance/regularization", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: {
                date: pastDateStr,
                requestedStatus: "PRESENT",
                reason: "Attempting a duplicate request.",
            },
        });

        assert.strictEqual(dupRegRes.status, 409, `Duplicate regularization should return 409. Got: ${dupRegRes.status}`);
        assert.strictEqual(dupRegRes.body.success, false);
        console.log("  ✓ 15. Duplicate pending regularization for same date rejected (409 Conflict)");

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 5);
        const y = tomorrow.getFullYear();
        const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
        const d = String(tomorrow.getDate()).padStart(2, "0");
        const futureDateStr = `${y}-${m}-${d}`;

        const futureRegRes = await request("/api/v1/hrms/attendance/regularization", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: {
                date: futureDateStr,
                requestedStatus: "PRESENT",
                reason: "Future date regularization attempt.",
            },
        });

        assert.strictEqual(futureRegRes.status, 400, `Future date regularization should return 400. Got: ${futureRegRes.status}`);
        assert.strictEqual(futureRegRes.body.success, false);
        console.log("  ✓ 16. Regularization request for future date rejected (400 Bad Request)");

        // Test 17: Regularization without reason is rejected with 400
        const noReasonRegRes = await request("/api/v1/hrms/attendance/regularization", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: {
                date: "2026-01-10",
                requestedStatus: "PRESENT",
                reason: "",
            },
        });

        assert.strictEqual(noReasonRegRes.status, 400, `Missing reason should return 400. Got: ${noReasonRegRes.status}`);
        assert.strictEqual(noReasonRegRes.body.success, false);
        console.log("  ✓ 17. Regularization without reason rejected (400 Bad Request)");

        // Test 18: Employee can list their own regularization requests
        const myRegRes = await request("/api/v1/hrms/attendance/regularization/my", {
            method: "GET",
            headers: { Authorization: `Bearer ${staff1Token}` },
        });

        assert.strictEqual(myRegRes.status, 200);
        assert.strictEqual(myRegRes.body.success, true);
        assert.ok(Array.isArray(myRegRes.body.data), "Should return array");
        assert.strictEqual(myRegRes.body.data.length, 1);
        assert.strictEqual(myRegRes.body.data[0]._id, createdRegId);
        console.log("  ✓ 18. Employee can list their own regularization requests");

        // Test 19: Employee from Hospital B cannot see Hospital A employee's regularization
        const myRegIsolationRes = await request("/api/v1/hrms/attendance/regularization/my", {
            method: "GET",
            headers: { Authorization: `Bearer ${staff2Token}` },
        });

        assert.strictEqual(myRegIsolationRes.status, 200);
        assert.strictEqual(myRegIsolationRes.body.data.length, 0, "Hospital B employee should not see Hospital A requests");
        console.log("  ✓ 19. Tenant isolation: Hospital B employee cannot see Hospital A's regularizations");

        // Test 20: Employee can cancel their own pending regularization request
        const cancelRegRes = await request(`/api/v1/hrms/attendance/regularization/${createdRegId}/cancel`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${staff1Token}` },
        });

        assert.strictEqual(cancelRegRes.status, 200, `Cancel regularization should return 200. Got: ${cancelRegRes.status} — ${JSON.stringify(cancelRegRes.body)}`);
        assert.strictEqual(cancelRegRes.body.success, true);
        assert.strictEqual(cancelRegRes.body.data.status, "CANCELLED");
        assert.ok(cancelRegRes.body.data.cancelledAt, "cancelledAt timestamp should be set");
        console.log("  ✓ 20. Employee can cancel their own pending regularization request");

        // Test 21: Cannot cancel an already-cancelled regularization (400)
        const doubleCancelRes = await request(`/api/v1/hrms/attendance/regularization/${createdRegId}/cancel`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${staff1Token}` },
        });

        assert.strictEqual(doubleCancelRes.status, 400, `Cancelling already-cancelled request should return 400. Got: ${doubleCancelRes.status}`);
        assert.strictEqual(doubleCancelRes.body.success, false);
        console.log("  ✓ 21. Cannot cancel an already-cancelled regularization request (400 Bad Request)");

        // ─────────────────────────────────────────────────────────────
        // 7. AUTOMATIC ABSENCE & SHIFT LIFECYCLE TESTS
        // ─────────────────────────────────────────────────────────────
        console.log("\n--- 7. AUTOMATIC ABSENCE & SHIFT LIFECYCLE TESTS ---");

        const nowObj = new Date();
        const yStr = nowObj.getFullYear();
        const mStr = String(nowObj.getMonth() + 1).padStart(2, "0");
        const dStr = String(nowObj.getDate()).padStart(2, "0");
        const todayDateStr = `${yStr}-${mStr}-${dStr}`;
        const todayDateObj = new Date(`${todayDateStr}T00:00:00.000Z`);

        // Create Employee 3 (Hospital A) for automatic absence tests
        const staffUser3 = await User.create({
            name: "Staff Employee Three",
            email: `staff3_${testTimestamp}@test.com`,
            password: hashedPassword,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.ATTENDANCE_VIEW_OWN],
        });

        const staffEmp3 = await Employee.create({
            hospitalId: hospitalA._id,
            userId: staffUser3._id,
            positionId: staffPosition._id,
            firstName: "Staff",
            lastName: "Three",
            email: staffUser3.email,
            phone: "9876543219",
            employeeId: `EMP3-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date(),
            status: "active",
            createdBy: adminUser._id,
        });
        staffUser3.employeeId = staffEmp3._id;
        await staffUser3.save();
        const staff3Token = generateToken({ id: staffUser3._id, role: staffUser3.role });

        // Published Roster for Hospital A with a shift that ended in the past (e.g. 01:00 AM to 02:00 AM today)
        const pastRoster = await Roster.create({
            hospitalId: hospitalA._id,
            title: `Past Roster ${testTimestamp}`,
            startDate: todayDateObj,
            endDate: todayDateObj,
            status: "PUBLISHED",
            publishedAt: new Date(),
            createdBy: adminUser._id,
        });

        await RosterAssignment.create({
            hospitalId: hospitalA._id,
            rosterId: pastRoster._id,
            employeeId: staffEmp3._id,
            date: todayDateObj,
            shiftTitle: "Past Shift",
            startTime: "00:00",
            endTime: "00:01",
            dutyArea: "General Ward",
            createdBy: adminUser._id,
        });

        // Test 22: Querying today's attendance for scheduled employee with past shift end automatically marks ABSENT
        const autoAbsenceRes = await request("/api/v1/hrms/attendance/today", {
            method: "GET",
            headers: { Authorization: `Bearer ${staff3Token}` },
        });

        assert.strictEqual(autoAbsenceRes.status, 200);
        assert.ok(autoAbsenceRes.body.data, "Attendance record should exist for past shift");
        assert.strictEqual(autoAbsenceRes.body.data.status, "ABSENT", "Scheduled employee after shift end should be ABSENT");
        console.log("  ✓ 22. Scheduled employee with no check-in automatically marked ABSENT after shift end");

        // Test 23: Check In after automatically marked ABSENT is rejected
        const checkInAfterAbsentRes = await request("/api/v1/hrms/attendance/check-in", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff3Token}` },
        });
        assert.strictEqual(checkInAfterAbsentRes.status, 403, `Check-in after ABSENT should return 403. Got: ${checkInAfterAbsentRes.status}`);
        console.log("  ✓ 23. Check In after ABSENT is rejected (requires regularization)");

        // Test 24: Employee with shift in the FUTURE (not ended yet) is NOT marked absent
        const staffUser4 = await User.create({
            name: "Staff Employee Four",
            email: `staff4_${testTimestamp}@test.com`,
            password: hashedPassword,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.ATTENDANCE_VIEW_OWN],
        });
        const staffEmp4 = await Employee.create({
            hospitalId: hospitalA._id,
            userId: staffUser4._id,
            positionId: staffPosition._id,
            firstName: "Staff",
            lastName: "Four",
            email: staffUser4.email,
            phone: "9876543214",
            employeeId: `EMP4-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date(),
            status: "active",
            createdBy: adminUser._id,
        });
        staffUser4.employeeId = staffEmp4._id;
        await staffUser4.save();
        const staff4Token = generateToken({ id: staffUser4._id, role: staffUser4.role });

        await RosterAssignment.create({
            hospitalId: hospitalA._id,
            rosterId: pastRoster._id,
            employeeId: staffEmp4._id,
            date: todayDateObj,
            shiftTitle: "Future Shift",
            startTime: "23:00",
            endTime: "23:59",
            dutyArea: "ICU",
            createdBy: adminUser._id,
        });

        const futureShiftRes = await request("/api/v1/hrms/attendance/today", {
            method: "GET",
            headers: { Authorization: `Bearer ${staff4Token}` },
        });
        assert.strictEqual(futureShiftRes.status, 200);
        assert.strictEqual(futureShiftRes.body.data, null, "Future shift employee before shift end should NOT be ABSENT");
        console.log("  ✓ 24. Scheduled employee before shift end is NOT marked ABSENT");

        // Test 25: Employee with approved leave is NOT marked ABSENT
        const staffUser5 = await User.create({
            name: "Staff Employee Five",
            email: `staff5_${testTimestamp}@test.com`,
            password: hashedPassword,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.ATTENDANCE_VIEW_OWN],
        });
        const staffEmp5 = await Employee.create({
            hospitalId: hospitalA._id,
            userId: staffUser5._id,
            positionId: staffPosition._id,
            firstName: "Staff",
            lastName: "Five",
            email: staffUser5.email,
            phone: "9876543215",
            employeeId: `EMP5-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date(),
            status: "active",
            createdBy: adminUser._id,
        });
        staffUser5.employeeId = staffEmp5._id;
        await staffUser5.save();
        const staff5Token = generateToken({ id: staffUser5._id, role: staffUser5.role });

        await RosterAssignment.create({
            hospitalId: hospitalA._id,
            rosterId: pastRoster._id,
            employeeId: staffEmp5._id,
            date: todayDateObj,
            shiftTitle: "Past Shift Leave",
            startTime: "01:00",
            endTime: "02:00",
            dutyArea: "Emergency",
            createdBy: adminUser._id,
        });

        await Leave.create({
            hospitalId: hospitalA._id,
            employeeId: staffEmp5._id,
            userId: staffUser5._id,
            appliedBy: staffUser5._id,
            leaveType: "CASUAL",
            startDate: todayDateObj,
            endDate: todayDateObj,
            totalDays: 1,
            status: "approved",
            reason: "Vacation",
        });

        const approvedLeaveRes = await request("/api/v1/hrms/attendance/today", {
            method: "GET",
            headers: { Authorization: `Bearer ${staff5Token}` },
        });
        assert.strictEqual(approvedLeaveRes.status, 200);
        assert.strictEqual(approvedLeaveRes.body.data, null, "Approved leave employee should NOT be marked ABSENT");
        console.log("  ✓ 25. Scheduled employee with approved leave is NOT marked ABSENT");

        // Test 26: Employee without roster assignment is NOT automatically ABSENT
        const staffUser6 = await User.create({
            name: "Staff Employee Six",
            email: `staff6_${testTimestamp}@test.com`,
            password: hashedPassword,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.ATTENDANCE_VIEW_OWN],
        });
        const staffEmp6 = await Employee.create({
            hospitalId: hospitalA._id,
            userId: staffUser6._id,
            positionId: staffPosition._id,
            firstName: "Staff",
            lastName: "Six",
            email: staffUser6.email,
            phone: "9876543216",
            employeeId: `EMP6-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date(),
            status: "active",
            createdBy: adminUser._id,
        });
        staffUser6.employeeId = staffEmp6._id;
        await staffUser6.save();
        const staff6Token = generateToken({ id: staffUser6._id, role: staffUser6.role });

        const noRosterRes = await request("/api/v1/hrms/attendance/today", {
            method: "GET",
            headers: { Authorization: `Bearer ${staff6Token}` },
        });
        assert.strictEqual(noRosterRes.status, 200);
        assert.strictEqual(noRosterRes.body.data, null, "Employee without roster assignment should NOT be ABSENT");
        console.log("  ✓ 26. Employee without roster assignment is NOT automatically ABSENT");

        // ─────────────────────────────────────────────────────────────
        // 8. BACKGROUND SCHEDULER INTEGRATION TESTS
        // ─────────────────────────────────────────────────────────────
        console.log("\n--- 8. BACKGROUND SCHEDULER INTEGRATION TESTS ---");

        // Test 27: Scheduler exported functions exist on app
        assert.strictEqual(typeof app.startAutomaticAbsenceScheduler, "function", "startAutomaticAbsenceScheduler should be exported on app");
        assert.strictEqual(typeof app.stopAutomaticAbsenceScheduler, "function", "stopAutomaticAbsenceScheduler should be exported on app");
        assert.strictEqual(typeof app.runAutomaticAbsenceJob, "function", "runAutomaticAbsenceJob should be exported on app");
        console.log("  ✓ 27. Scheduler control functions are exposed on app instance");

        // Test 28: Scheduler invocation executes processAutomaticAbsence without error
        await app.runAutomaticAbsenceJob();
        console.log("  ✓ 28. Scheduler job execution runs processAutomaticAbsence() cleanly");

        // Test 29: Starting scheduler returns timer and does not duplicate timers on repeated start
        const timer1 = app.startAutomaticAbsenceScheduler(60000);
        const timer2 = app.startAutomaticAbsenceScheduler(60000);
        assert.strictEqual(timer1, timer2, "Repeated startAutomaticAbsenceScheduler calls must return existing timer instance");
        app.stopAutomaticAbsenceScheduler();
        console.log("  ✓ 29. Scheduler prevents duplicate running timer instances and cleans up properly");

        // ─────────────────────────────────────────────────────────────
        // 9. MULTIPLE ACTIVE ROSTERS ATTENDANCE TESTS (PHASE 1 CORRECTIONS)
        // ─────────────────────────────────────────────────────────────
        console.log("\n--- 9. MULTIPLE ACTIVE ROSTERS ATTENDANCE TESTS ---");

        const targetDateStr1 = "2026-09-25";
        const targetDateObj1 = new Date(`${targetDateStr1}T00:00:00.000Z`);

        // Roster A: 20 Sep -> 30 Sep (Hospital A)
        const rosterA = await Roster.create({
            hospitalId: hospitalA._id,
            title: `Roster A ${testTimestamp}`,
            startDate: new Date("2026-09-20T00:00:00.000Z"),
            endDate: new Date("2026-09-30T00:00:00.000Z"),
            status: "PUBLISHED",
            publishedAt: new Date(),
            createdBy: adminUser._id,
        });

        // Roster B: 24 Sep -> 05 Oct (Hospital A - Overlapping Published Roster)
        const rosterB = await Roster.create({
            hospitalId: hospitalA._id,
            title: `Roster B ${testTimestamp}`,
            startDate: new Date("2026-09-24T00:00:00.000Z"),
            endDate: new Date("2026-10-05T00:00:00.000Z"),
            status: "PUBLISHED",
            publishedAt: new Date(),
            createdBy: adminUser._id,
        });

        // Employee assigned to Roster A
        const empRosterA = await Employee.create({
            hospitalId: hospitalA._id,
            positionId: staffPosition._id,
            firstName: "RosterA",
            lastName: "Emp",
            email: `rostera_${testTimestamp}@test.com`,
            phone: "9876500001",
            employeeId: `EMPA-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date("2026-09-01"),
            status: "active",
            createdBy: adminUser._id,
        });

        await RosterAssignment.create({
            hospitalId: hospitalA._id,
            rosterId: rosterA._id,
            employeeId: empRosterA._id,
            date: targetDateObj1,
            shiftTitle: "Morning Shift",
            startTime: "01:00",
            endTime: "02:00",
            dutyArea: "General Ward",
            createdBy: adminUser._id,
        });

        // Employee assigned to Roster B
        const empRosterB = await Employee.create({
            hospitalId: hospitalA._id,
            positionId: staffPosition._id,
            firstName: "RosterB",
            lastName: "Emp",
            email: `rosterb_${testTimestamp}@test.com`,
            phone: "9876500002",
            employeeId: `EMPB-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date("2026-09-01"),
            status: "active",
            createdBy: adminUser._id,
        });

        await RosterAssignment.create({
            hospitalId: hospitalA._id,
            rosterId: rosterB._id,
            employeeId: empRosterB._id,
            date: targetDateObj1,
            shiftTitle: "Night Shift",
            startTime: "01:00",
            endTime: "02:00",
            dutyArea: "ICU",
            createdBy: adminUser._id,
        });

        // TEST 1 & 2 & 3: Run automatic absence for targetDateStr1
        const attendanceService = require("../src/services/attendance.service");
        await attendanceService.processAutomaticAbsence({
            hospitalId: hospitalA._id,
            dateStr: targetDateStr1,
        });

        const empAAbsence = await Attendance.findOne({
            hospitalId: hospitalA._id,
            employeeId: empRosterA._id,
            dateStr: targetDateStr1,
        });
        assert.ok(empAAbsence, "Employee on Roster A should be processed");
        assert.strictEqual(empAAbsence.status, "ABSENT");

        const empBAbsence = await Attendance.findOne({
            hospitalId: hospitalA._id,
            employeeId: empRosterB._id,
            dateStr: targetDateStr1,
        });
        assert.ok(empBAbsence, "Employee on Roster B should be processed");
        assert.strictEqual(empBAbsence.status, "ABSENT");
        console.log("  ✓ TEST 1, 2, 3. Automatic absence processes assignments across ALL multiple published rosters");

        // TEST 4 & 10: Existing Attendance is NOT duplicated on re-run
        await attendanceService.processAutomaticAbsence({
            hospitalId: hospitalA._id,
            dateStr: targetDateStr1,
        });
        const empAAbsenceCount = await Attendance.countDocuments({
            hospitalId: hospitalA._id,
            employeeId: empRosterA._id,
            dateStr: targetDateStr1,
        });
        assert.strictEqual(empAAbsenceCount, 1, "Must never create duplicate Attendance record for same employee/date");
        console.log("  ✓ TEST 4 & 10. Existing Attendance is preserved without creating duplicate records");

        // TEST 5: Employee with APPROVED leave is NOT marked ABSENT
        const empLeave = await Employee.create({
            hospitalId: hospitalA._id,
            positionId: staffPosition._id,
            firstName: "Leave",
            lastName: "Approved",
            email: `leaveapp_${testTimestamp}@test.com`,
            phone: "9876500003",
            employeeId: `EMPLV-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date(),
            status: "active",
            createdBy: adminUser._id,
        });
        await RosterAssignment.create({
            hospitalId: hospitalA._id,
            rosterId: rosterA._id,
            employeeId: empLeave._id,
            date: targetDateObj1,
            shiftTitle: "Morning",
            startTime: "01:00",
            endTime: "02:00",
            dutyArea: "General Ward",
            createdBy: adminUser._id,
        });
        await Leave.create({
            hospitalId: hospitalA._id,
            employeeId: empLeave._id,
            leaveType: "CASUAL",
            startDate: targetDateObj1,
            endDate: targetDateObj1,
            totalDays: 1,
            status: "approved",
            reason: "On leave",
            appliedBy: adminUser._id,
        });

        await attendanceService.processAutomaticAbsence({
            hospitalId: hospitalA._id,
            dateStr: targetDateStr1,
        });
        const empLeaveAbsence = await Attendance.findOne({
            hospitalId: hospitalA._id,
            employeeId: empLeave._id,
            dateStr: targetDateStr1,
        });
        assert.strictEqual(empLeaveAbsence, null, "Employee with approved leave must NOT be marked ABSENT");
        console.log("  ✓ TEST 5. Approved leave prevents automatic ABSENT");

        // TEST 6: Employee with PENDING leave IS marked ABSENT
        const empPendingLeave = await Employee.create({
            hospitalId: hospitalA._id,
            positionId: staffPosition._id,
            firstName: "Leave",
            lastName: "Pending",
            email: `leavepend_${testTimestamp}@test.com`,
            phone: "9876500004",
            employeeId: `EMPPEND-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date("2026-09-01"),
            status: "active",
            createdBy: adminUser._id,
        });
        await RosterAssignment.create({
            hospitalId: hospitalA._id,
            rosterId: rosterA._id,
            employeeId: empPendingLeave._id,
            date: targetDateObj1,
            shiftTitle: "Morning",
            startTime: "01:00",
            endTime: "02:00",
            dutyArea: "General Ward",
            createdBy: adminUser._id,
        });
        await Leave.create({
            hospitalId: hospitalA._id,
            employeeId: empPendingLeave._id,
            leaveType: "CASUAL",
            startDate: targetDateObj1,
            endDate: targetDateObj1,
            totalDays: 1,
            status: "pending",
            reason: "Pending approval",
            appliedBy: adminUser._id,
        });
        await attendanceService.processAutomaticAbsence({
            hospitalId: hospitalA._id,
            dateStr: targetDateStr1,
        });
        const empPendingAbsence = await Attendance.findOne({
            hospitalId: hospitalA._id,
            employeeId: empPendingLeave._id,
            dateStr: targetDateStr1,
        });
        assert.ok(empPendingAbsence);
        assert.strictEqual(empPendingAbsence.status, "ABSENT", "Pending leave is not approved leave");
        console.log("  ✓ TEST 6. Pending leave does not prevent automatic ABSENT");

        // TEST 7: Employee with REJECTED leave IS marked ABSENT
        const empRejectedLeave = await Employee.create({
            hospitalId: hospitalA._id,
            positionId: staffPosition._id,
            firstName: "Leave",
            lastName: "Rejected",
            email: `leaverej_${testTimestamp}@test.com`,
            phone: "9876500005",
            employeeId: `EMPREJ-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date("2026-09-01"),
            status: "active",
            createdBy: adminUser._id,
        });
        await RosterAssignment.create({
            hospitalId: hospitalA._id,
            rosterId: rosterA._id,
            employeeId: empRejectedLeave._id,
            date: targetDateObj1,
            shiftTitle: "Morning",
            startTime: "01:00",
            endTime: "02:00",
            dutyArea: "General Ward",
            createdBy: adminUser._id,
        });
        await Leave.create({
            hospitalId: hospitalA._id,
            employeeId: empRejectedLeave._id,
            leaveType: "CASUAL",
            startDate: targetDateObj1,
            endDate: targetDateObj1,
            totalDays: 1,
            status: "rejected",
            reason: "Denied",
            appliedBy: adminUser._id,
        });
        await attendanceService.processAutomaticAbsence({
            hospitalId: hospitalA._id,
            dateStr: targetDateStr1,
        });
        const empRejectedAbsence = await Attendance.findOne({
            hospitalId: hospitalA._id,
            employeeId: empRejectedLeave._id,
            dateStr: targetDateStr1,
        });
        assert.ok(empRejectedAbsence);
        assert.strictEqual(empRejectedAbsence.status, "ABSENT");
        console.log("  ✓ TEST 7. Rejected/Cancelled leave does not prevent automatic ABSENT");

        // TEST 8: Employee without roster assignment and rosterEligible=false is NOT marked ABSENT
        const nonRosterPosition = await Position.create({
            hospitalId: hospitalA._id,
            name: `Non Roster Pos ${testTimestamp}`,
            rosterEligible: false,
            status: "active",
            createdBy: adminUser._id,
        });
        const empNonRoster = await Employee.create({
            hospitalId: hospitalA._id,
            firstName: "NonRoster",
            lastName: "Staff",
            email: `nonroster_${testTimestamp}@test.com`,
            phone: "9876500006",
            employeeId: `EMPNR-${String(testTimestamp).slice(-4)}`,
            positionId: nonRosterPosition._id,
            dateOfJoining: new Date(),
            status: "active",
            createdBy: adminUser._id,
        });
        await attendanceService.processAutomaticAbsence({
            hospitalId: hospitalA._id,
            dateStr: targetDateStr1,
        });
        const empNonRosterAbsence = await Attendance.findOne({
            hospitalId: hospitalA._id,
            employeeId: empNonRoster._id,
            dateStr: targetDateStr1,
        });
        assert.strictEqual(empNonRosterAbsence, null, "Non-roster employee without assignment is not automatically ABSENT");
        console.log("  ✓ TEST 8. Employee without roster assignment and rosterEligible=false is NOT marked ABSENT");

        // TEST 9: Tenant Isolation — Hospital B rosters do NOT affect Hospital A automatic absence
        const rosterHospitalB = await Roster.create({
            hospitalId: hospitalB._id,
            title: `Roster Hosp B ${testTimestamp}`,
            startDate: new Date("2026-10-01T00:00:00.000Z"),
            endDate: new Date("2026-10-15T00:00:00.000Z"),
            status: "PUBLISHED",
            publishedAt: new Date(),
            createdBy: creatorIdB,
        });
        await RosterAssignment.create({
            hospitalId: hospitalB._id,
            rosterId: rosterHospitalB._id,
            employeeId: staffEmp2._id,
            date: targetDateObj1,
            shiftTitle: "Hosp B Shift",
            startTime: "01:00",
            endTime: "02:00",
            dutyArea: "Hosp B Ward",
            createdBy: creatorIdB,
        });
        await attendanceService.processAutomaticAbsence({
            hospitalId: hospitalA._id,
            dateStr: targetDateStr1,
        });
        const hospBAbsenceInA = await Attendance.findOne({
            hospitalId: hospitalA._id,
            employeeId: staffEmp2._id,
            dateStr: targetDateStr1,
        });
        assert.strictEqual(hospBAbsenceInA, null, "Hospital B employee must not receive attendance record under Hospital A");
        console.log("  ✓ TEST 9. Cross-hospital tenant isolation enforced during automatic absence processing");

        console.log("\n=======================================================");
        console.log("=== ALL ATTENDANCE + SCHEDULER TESTS PASSED 100% ===");
        console.log("=======================================================\n");

    } catch (err) {
        console.error("\n❌ TEST FAILED:", err);
        process.exitCode = 1;
    } finally {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        await mongoose.disconnect();
    }
};

if (require.main === module) {
    runTests();
}

module.exports = runTests;
