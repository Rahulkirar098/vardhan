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
    console.log("=== VARDHAN PHASE 8B ATTENDANCE TEST SUITE ===");
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

        console.log("\n=======================================================");
        console.log("=== ALL 13 ATTENDANCE TESTS PASSED 100% ===");
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
