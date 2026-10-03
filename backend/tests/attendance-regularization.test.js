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
const { generateToken } = require("../src/utils/jwt");
const { hashPassword } = require("../src/utils/password");
const { PERMISSIONS } = require("../src/config/permissions");
const { REGULARIZATION_STATUSES } = require("../src/constants/attendance.constants");

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
    console.log("=== NUVINCE ATTENDANCE REGULARIZATION TEST SUITE ===");
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
            name: `Regularization Test Hospital A ${testTimestamp}`,
            code: `RTHA${String(testTimestamp).slice(-4)}`,
            email: `rtha_${testTimestamp}@test.com`,
            phone: "9998883333",
            address: { city: "Bhopal", state: "MP", country: "India" },
            createdBy: creatorIdA,
        });

        // 2. Setup Test Hospital B (for Tenant Isolation)
        const hospitalB = await Hospital.create({
            name: `Regularization Test Hospital B ${testTimestamp}`,
            code: `RTHB${String(testTimestamp).slice(-4)}`,
            email: `rthb_${testTimestamp}@test.com`,
            phone: "9998884444",
            address: { city: "Indore", state: "MP", country: "India" },
            createdBy: creatorIdB,
        });

        const hashedPassword = await hashPassword("password123");

        // Admin User (Hospital A)
        const adminUser = await User.create({
            name: "Hospital A Admin",
            email: `admin_reg_${testTimestamp}@test.com`,
            password: hashedPassword,
            role: "admin",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hospital_structure", "hrms"],
            permissions: Object.values(PERMISSIONS),
        });

        // Staff Position Hospital A
        const staffPositionA = await Position.create({
            hospitalId: hospitalA._id,
            name: `Staff Position A ${testTimestamp}`,
            code: `STFA_${String(testTimestamp).slice(-4)}`,
            status: "active",
            createdBy: adminUser._id,
        });

        // Staff Employee 1 (Hospital A)
        const staffUser1 = await User.create({
            name: "Staff Regularization One",
            email: `staff_reg1_${testTimestamp}@test.com`,
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
            positionId: staffPositionA._id,
            firstName: "Staff",
            lastName: "One",
            email: staffUser1.email,
            phone: "9876543220",
            employeeId: `REG-EMP1-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date(),
            status: "active",
            createdBy: adminUser._id,
        });
        staffUser1.employeeId = staffEmp1._id;
        await staffUser1.save();

        const staff1Token = generateToken({ id: staffUser1._id, role: staffUser1.role });

        // Staff Employee 2 (Hospital A - peer employee)
        const staffUser2 = await User.create({
            name: "Staff Regularization Two",
            email: `staff_reg2_${testTimestamp}@test.com`,
            password: hashedPassword,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.ATTENDANCE_VIEW_OWN],
        });

        const staffEmp2 = await Employee.create({
            hospitalId: hospitalA._id,
            userId: staffUser2._id,
            positionId: staffPositionA._id,
            firstName: "Staff",
            lastName: "Two",
            email: staffUser2.email,
            phone: "9876543221",
            employeeId: `REG-EMP2-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date(),
            status: "active",
            createdBy: adminUser._id,
        });
        staffUser2.employeeId = staffEmp2._id;
        await staffUser2.save();

        const staff2Token = generateToken({ id: staffUser2._id, role: staffUser2.role });

        // Staff Position Hospital B
        const staffPositionB = await Position.create({
            hospitalId: hospitalB._id,
            name: `Staff Position B ${testTimestamp}`,
            code: `STFB_${String(testTimestamp).slice(-4)}`,
            status: "active",
            createdBy: creatorIdB,
        });

        // Staff Employee 3 (Hospital B - Tenant Isolation)
        const staffUser3 = await User.create({
            name: "Staff Hospital B",
            email: `staff_reg3_${testTimestamp}@test.com`,
            password: hashedPassword,
            role: "employee",
            hospitalId: hospitalB._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.ATTENDANCE_VIEW_OWN],
        });

        const staffEmp3 = await Employee.create({
            hospitalId: hospitalB._id,
            userId: staffUser3._id,
            positionId: staffPositionB._id,
            firstName: "Staff",
            lastName: "Three",
            email: staffUser3.email,
            phone: "9876543222",
            employeeId: `REG-EMP3-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date(),
            status: "active",
            createdBy: creatorIdB,
        });
        staffUser3.employeeId = staffEmp3._id;
        await staffUser3.save();

        const staff3Token = generateToken({ id: staffUser3._id, role: staffUser3.role });

        // Create an existing Attendance record for date 2026-09-20 for Staff 1
        const existingAttendanceRecord = await Attendance.create({
            hospitalId: hospitalA._id,
            employeeId: staffEmp1._id,
            userId: staffUser1._id,
            dateStr: "2026-09-20",
            date: new Date("2026-09-20T00:00:00.000Z"),
            status: "ABSENT",
            notes: "Missed punch",
        });

        console.log("Setup completed. Running Regularization Test Scenarios...\n");

        // ─────────────────────────────────────────────────────────────
        // 1. SUBMISSION & AUTHORIZATION SCENARIOS
        // ─────────────────────────────────────────────────────────────
        console.log("--- 1. SUBMISSION & AUTHORIZATION SCENARIOS ---");

        // Test 1: Employee can submit regularization request
        const createRes1 = await request("/api/v1/attendance/regularization", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: {
                date: "2026-09-20",
                requestedStatus: "Present",
                requestedCheckIn: "09:15 AM",
                requestedCheckOut: "06:00 PM",
                reason: "I was present, but my attendance was marked absent.",
            },
        });

        assert.strictEqual(createRes1.status, 201, `Create should return 201 Created. Got: ${createRes1.status}`);
        assert.strictEqual(createRes1.body.success, true);
        assert.strictEqual(String(createRes1.body.data.status).toUpperCase(), "PENDING");
        assert.strictEqual(createRes1.body.data.requestedStatus, "PRESENT");
        assert.strictEqual(createRes1.body.data.dateStr, "2026-09-20");
        assert.ok(createRes1.body.data.requestedCheckIn, "requestedCheckIn should be stored");
        assert.ok(createRes1.body.data.requestedCheckOut, "requestedCheckOut should be stored");
        assert.strictEqual(
            String(createRes1.body.data.attendanceId),
            String(existingAttendanceRecord._id),
            "attendanceId should reference the existing Attendance record"
        );
        const req1Id = createRes1.body.data._id;
        console.log("  ✓ 1. Employee can submit regularization (status = pending, attendanceId linked)");

        // Test 2: employeeId is taken from authenticated user (ignoring any passed employeeId)
        const spoofEmpId = new mongoose.Types.ObjectId();
        const createRes2 = await request("/api/v1/attendance/regularization", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: {
                employeeId: spoofEmpId.toString(),
                date: "2026-09-21",
                requestedStatus: "Half Day",
                requestedCheckIn: "09:00",
                requestedCheckOut: "13:30",
                reason: "Half day punch missed",
            },
        });

        assert.strictEqual(createRes2.status, 201);
        assert.strictEqual(
            String(createRes2.body.data.employeeId),
            String(staffEmp1._id),
            "employeeId must be derived from authenticated user, not request body"
        );
        console.log("  ✓ 2. employeeId is authoritatively derived from authenticated user");

        // Test 3: hospitalId is taken from authenticated user (ignoring spoofed hospitalId)
        const spoofHospitalId = hospitalB._id;
        const createRes3 = await request("/api/v1/attendance/regularization", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: {
                hospitalId: spoofHospitalId.toString(),
                date: "2026-09-22",
                requestedStatus: "PRESENT",
                reason: "Regularization for 22nd",
            },
        });

        assert.strictEqual(createRes3.status, 201);
        assert.strictEqual(
            String(createRes3.body.data.hospitalId),
            String(hospitalA._id),
            "hospitalId must be derived from authenticated user, not request body"
        );
        console.log("  ✓ 3. hospitalId is authoritatively derived from authenticated user context");

        // Test 4: Submitting without existing Attendance sets attendanceId to null without creating Attendance
        assert.strictEqual(createRes3.body.data.attendanceId, null);
        const attCheck = await Attendance.findOne({
            hospitalId: hospitalA._id,
            employeeId: staffEmp1._id,
            dateStr: "2026-09-22",
        });
        assert.strictEqual(attCheck, null, "Attendance record must NOT be created during regularization submission");
        console.log("  ✓ 4. Submitting regularization does NOT create or mutate Attendance records");

        // ─────────────────────────────────────────────────────────────
        // 2. DUPLICATE & PENDING PROTECTION
        // ─────────────────────────────────────────────────────────────
        console.log("\n--- 2. DUPLICATE & PENDING PROTECTION ---");

        // Test 5: Duplicate pending request for the same date is rejected (409 Conflict)
        const dupRes = await request("/api/v1/attendance/regularization", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: {
                date: "2026-09-20",
                requestedStatus: "PRESENT",
                reason: "Duplicate attempt for 20th",
            },
        });

        assert.strictEqual(dupRes.status, 409, `Duplicate pending request should return 409. Got: ${dupRes.status}`);
        assert.strictEqual(dupRes.body.success, false);
        console.log("  ✓ 5. Duplicate pending request for the same employee/date is rejected (409 Conflict)");

        // ─────────────────────────────────────────────────────────────
        // 3. VALIDATION RULES
        // ─────────────────────────────────────────────────────────────
        console.log("\n--- 3. VALIDATION RULES ---");

        // Test 6: Missing reason is rejected (400)
        const noReasonRes = await request("/api/v1/attendance/regularization", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: {
                date: "2026-09-23",
                requestedStatus: "PRESENT",
                reason: "   ",
            },
        });

        assert.strictEqual(noReasonRes.status, 400);
        assert.strictEqual(noReasonRes.body.success, false);
        console.log("  ✓ 6. Missing / empty reason is rejected (400 Bad Request)");

        // Test 7: Invalid date is rejected (400)
        const invalidDateRes = await request("/api/v1/attendance/regularization", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: {
                date: "invalid-date-format",
                requestedStatus: "PRESENT",
                reason: "Valid reason",
            },
        });

        assert.strictEqual(invalidDateRes.status, 400);
        console.log("  ✓ 7. Invalid date string is rejected (400 Bad Request)");

        // Test 8: Invalid attendance status is rejected (400)
        const invalidStatusRes = await request("/api/v1/attendance/regularization", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: {
                date: "2026-09-23",
                requestedStatus: "HOLIDAY_OFF",
                reason: "Valid reason",
            },
        });

        assert.strictEqual(invalidStatusRes.status, 400);
        console.log("  ✓ 8. Invalid requested status is rejected (400 Bad Request)");

        // Test 9: Check-out before check-in is rejected (400)
        const invalidTimesRes = await request("/api/v1/attendance/regularization", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: {
                date: "2026-09-23",
                requestedStatus: "PRESENT",
                requestedCheckIn: "18:00",
                requestedCheckOut: "09:00",
                reason: "Valid reason",
            },
        });

        assert.strictEqual(invalidTimesRes.status, 400);
        assert.strictEqual(invalidTimesRes.body.message, "Check-out time cannot be before check-in time.");
        console.log("  ✓ 9. Check-out time before check-in time is rejected (400 Bad Request)");

        // ─────────────────────────────────────────────────────────────
        // 4. MY REQUESTS & RETRIEVAL
        // ─────────────────────────────────────────────────────────────
        console.log("\n--- 4. MY REQUESTS & RETRIEVAL ---");

        // Test 10: Employee can retrieve own requests (/my)
        const myRequestsRes = await request("/api/v1/attendance/regularization/my", {
            method: "GET",
            headers: { Authorization: `Bearer ${staff1Token}` },
        });

        assert.strictEqual(myRequestsRes.status, 200);
        assert.strictEqual(myRequestsRes.body.success, true);
        assert.ok(Array.isArray(myRequestsRes.body.data));
        assert.strictEqual(myRequestsRes.body.data.length, 3);
        console.log("  ✓ 10. Employee can retrieve own regularization requests list");

        // Test 11: Employee 2 gets empty list (does not see Employee 1's requests)
        const emp2RequestsRes = await request("/api/v1/attendance/regularization/my", {
            method: "GET",
            headers: { Authorization: `Bearer ${staff2Token}` },
        });

        assert.strictEqual(emp2RequestsRes.status, 200);
        assert.strictEqual(emp2RequestsRes.body.data.length, 0);
        console.log("  ✓ 11. Employee cannot view another employee's regularization requests");

        // ─────────────────────────────────────────────────────────────
        // 5. CANCELLATION SCENARIOS
        // ─────────────────────────────────────────────────────────────
        console.log("\n--- 5. CANCELLATION SCENARIOS ---");

        // Test 12: Employee cannot cancel another employee's request (403 Forbidden)
        const cancelOtherRes = await request(`/api/v1/attendance/regularization/${req1Id}/cancel`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${staff2Token}` },
        });

        assert.strictEqual(cancelOtherRes.status, 403, `Should return 403 Forbidden. Got: ${cancelOtherRes.status}`);
        console.log("  ✓ 12. Employee cannot cancel another employee's request (403 Forbidden)");

        // Test 13: Employee can cancel their own pending request
        const cancelOwnRes = await request(`/api/v1/attendance/regularization/${req1Id}/cancel`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${staff1Token}` },
        });

        assert.strictEqual(cancelOwnRes.status, 200);
        assert.strictEqual(cancelOwnRes.body.success, true);
        assert.strictEqual(String(cancelOwnRes.body.data.status).toUpperCase(), "CANCELLED");
        assert.ok(cancelOwnRes.body.data.cancelledAt, "cancelledAt should be timestamped");
        console.log("  ✓ 13. Employee can cancel their own pending regularization request");

        // Test 14: Cancelled request does not block a new request for that date
        const reSubmitRes = await request("/api/v1/attendance/regularization", {
            method: "POST",
            headers: { Authorization: `Bearer ${staff1Token}` },
            body: {
                date: "2026-09-20",
                requestedStatus: "Present",
                requestedCheckIn: "09:30 AM",
                requestedCheckOut: "06:15 PM",
                reason: "Resubmitting after fixing time details.",
            },
        });

        assert.strictEqual(reSubmitRes.status, 201, `Resubmission after cancel should succeed. Got: ${reSubmitRes.status}`);
        assert.strictEqual(String(reSubmitRes.body.data.status).toUpperCase(), "PENDING");
        console.log("  ✓ 14. Cancelled request does NOT block a new request for the same date");

        // Test 15: Already cancelled request cannot be cancelled again (400)
        const reCancelRes = await request(`/api/v1/attendance/regularization/${req1Id}/cancel`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${staff1Token}` },
        });

        assert.strictEqual(reCancelRes.status, 400);
        assert.strictEqual(reCancelRes.body.message, "Only pending regularization requests can be cancelled.");
        console.log("  ✓ 15. Non-pending (cancelled) request cannot be cancelled again (400 Bad Request)");

        // Test 16: Approved or Rejected request cannot be cancelled
        const mockApprovedReq = await AttendanceRegularization.create({
            hospitalId: hospitalA._id,
            employeeId: staffEmp1._id,
            date: new Date("2026-09-10T00:00:00.000Z"),
            dateStr: "2026-09-10",
            requestedStatus: "PRESENT",
            reason: "Approved previously",
            status: REGULARIZATION_STATUSES.APPROVED,
        });

        const cancelApprovedRes = await request(`/api/v1/attendance/regularization/${mockApprovedReq._id}/cancel`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${staff1Token}` },
        });

        assert.strictEqual(cancelApprovedRes.status, 400);
        console.log("  ✓ 16. Approved request cannot be cancelled by employee (400 Bad Request)");

        const mockRejectedReq = await AttendanceRegularization.create({
            hospitalId: hospitalA._id,
            employeeId: staffEmp1._id,
            date: new Date("2026-09-11T00:00:00.000Z"),
            dateStr: "2026-09-11",
            requestedStatus: "PRESENT",
            reason: "Rejected previously",
            status: REGULARIZATION_STATUSES.REJECTED,
        });

        const cancelRejectedRes = await request(`/api/v1/attendance/regularization/${mockRejectedReq._id}/cancel`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${staff1Token}` },
        });

        assert.strictEqual(cancelRejectedRes.status, 400);
        console.log("  ✓ 17. Rejected request cannot be cancelled by employee (400 Bad Request)");

        // Test 18: Legacy Lowercase Pending request ("pending") can be cancelled
        const legacyPendingReq = await AttendanceRegularization.collection.insertOne({
            hospitalId: hospitalA._id,
            employeeId: staffEmp1._id,
            date: new Date("2026-09-05T00:00:00.000Z"),
            dateStr: "2026-09-05",
            requestedStatus: "PRESENT",
            reason: "Legacy request with lowercase status",
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const cancelLegacyRes = await request(`/api/v1/attendance/regularization/${legacyPendingReq.insertedId}/cancel`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${staff1Token}` },
        });

        assert.strictEqual(cancelLegacyRes.status, 200, `Legacy 'pending' status cancellation should return 200. Got: ${cancelLegacyRes.status}`);
        assert.strictEqual(cancelLegacyRes.body.success, true);
        assert.strictEqual(String(cancelLegacyRes.body.data.status).toUpperCase(), "CANCELLED");
        console.log("  ✓ 18. Legacy lowercase 'pending' request can be cancelled successfully");

        // Test 19: Employee Identity Resolution when user.employeeId is null
        const staffUserNoEmpId = await User.create({
            name: "Unlinked Token Employee",
            email: `unlinked_emp_${testTimestamp}@test.com`,
            password: hashedPassword,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.ATTENDANCE_VIEW_OWN],
        });

        const staffEmpUnlinked = await Employee.create({
            hospitalId: hospitalA._id,
            userId: staffUserNoEmpId._id,
            positionId: staffPositionA._id,
            firstName: "Unlinked",
            lastName: "Employee",
            email: staffUserNoEmpId.email,
            phone: "9876543299",
            employeeId: `REG-UNLINK-${String(testTimestamp).slice(-4)}`,
            dateOfJoining: new Date(),
            status: "active",
            createdBy: adminUser._id,
        });
        // Deliberately DO NOT set staffUserNoEmpId.employeeId on User document to simulate unpopulated employeeId field

        const unlinkedToken = generateToken({ id: staffUserNoEmpId._id, role: staffUserNoEmpId.role });

        const unlinkedReq = await AttendanceRegularization.create({
            hospitalId: hospitalA._id,
            employeeId: staffEmpUnlinked._id,
            date: new Date("2026-09-04T00:00:00.000Z"),
            dateStr: "2026-09-04",
            requestedStatus: "PRESENT",
            reason: "Unlinked user employee ID resolution test",
            status: REGULARIZATION_STATUSES.PENDING,
        });

        const cancelUnlinkedRes = await request(`/api/v1/attendance/regularization/${unlinkedReq._id}/cancel`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${unlinkedToken}` },
        });

        assert.strictEqual(cancelUnlinkedRes.status, 200, `Employee identity resolution cancellation should return 200. Got: ${cancelUnlinkedRes.status}`);
        assert.strictEqual(cancelUnlinkedRes.body.success, true);
        assert.strictEqual(String(cancelUnlinkedRes.body.data.status).toUpperCase(), "CANCELLED");
        console.log("  ✓ 19. Cancellation succeeds when user.employeeId is unpopulated but Employee record matches");

        // ─────────────────────────────────────────────────────────────
        // 7. ATOMIC APPROVAL TRANSACTION & ROLLBACK SCENARIOS (PHASE 8D)
        // ─────────────────────────────────────────────────────────────
        console.log("\n--- 7. ATOMIC APPROVAL TRANSACTION & ROLLBACK SCENARIOS (PHASE 8D) ---");

        const adminToken = generateToken({ id: adminUser._id, role: adminUser.role });

        // TEST A: Approval with existing attendance record
        const pendingWithAttReq = await AttendanceRegularization.create({
            hospitalId: hospitalA._id,
            employeeId: staffEmp1._id,
            attendanceId: existingAttendanceRecord._id,
            date: new Date("2026-09-19T00:00:00.000Z"),
            dateStr: "2026-09-19",
            requestedStatus: "PRESENT",
            requestedCheckIn: new Date("2026-09-19T09:00:00.000Z"),
            requestedCheckOut: new Date("2026-09-19T17:00:00.000Z"),
            reason: "Correction with existing attendance",
            status: REGULARIZATION_STATUSES.PENDING,
        });

        const approveResA = await request(`/api/v1/attendance/regularization/${pendingWithAttReq._id}/approve`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        assert.strictEqual(approveResA.status, 200, `Approval should return 200 OK. Got: ${approveResA.status}`);
        assert.strictEqual(approveResA.body.success, true);
        assert.strictEqual(String(approveResA.body.data.status).toUpperCase(), "APPROVED");
        assert.ok(approveResA.body.data.reviewedBy, "reviewedBy should be set");
        assert.ok(approveResA.body.data.reviewedAt, "reviewedAt should be set");

        const updatedAttA = await Attendance.findById(existingAttendanceRecord._id);
        assert.strictEqual(updatedAttA.status, "PRESENT");
        assert.strictEqual(updatedAttA.workingMinutes, 480);
        console.log("  ✓ TEST A: Approval with existing attendance updates Attendance and sets status = APPROVED atomically");

        // TEST B: Approval without existing attendance record (creates new Attendance)
        const pendingNoAttReq = await AttendanceRegularization.create({
            hospitalId: hospitalA._id,
            employeeId: staffEmp1._id,
            attendanceId: null,
            date: new Date("2026-09-18T00:00:00.000Z"),
            dateStr: "2026-09-18",
            requestedStatus: "HALF_DAY",
            requestedCheckIn: new Date("2026-09-18T09:00:00.000Z"),
            requestedCheckOut: new Date("2026-09-18T13:00:00.000Z"),
            reason: "Attendance missing for 18th",
            status: REGULARIZATION_STATUSES.PENDING,
        });

        const approveResB = await request(`/api/v1/attendance/regularization/${pendingNoAttReq._id}/approve`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        assert.strictEqual(approveResB.status, 200);
        assert.strictEqual(String(approveResB.body.data.status).toUpperCase(), "APPROVED");
        assert.ok(approveResB.body.data.attendanceId, "New attendanceId should be linked");

        const createdAttB = await Attendance.findById(approveResB.body.data.attendanceId);
        assert.ok(createdAttB, "Created Attendance document should exist");
        assert.strictEqual(createdAttB.status, "HALF_DAY");
        assert.strictEqual(createdAttB.workingMinutes, 240);
        console.log("  ✓ TEST B: Approval without existing attendance creates Attendance and links attendanceId atomically");

        // TEST C: Approval is idempotently protected (Cannot approve already approved request)
        const reApproveRes = await request(`/api/v1/attendance/regularization/${pendingNoAttReq._id}/approve`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        assert.strictEqual(reApproveRes.status, 400);
        assert.strictEqual(reApproveRes.body.success, false);
        console.log("  ✓ TEST C: Idempotency protected - already approved request cannot be approved again (400 Bad Request)");

        // TEST D: Rejected request cannot be approved
        const approveRejectedRes = await request(`/api/v1/attendance/regularization/${mockRejectedReq._id}/approve`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        assert.strictEqual(approveRejectedRes.status, 400);
        console.log("  ✓ TEST D: Rejected request cannot be approved (400 Bad Request)");

        // TEST E: Cancelled request cannot be approved
        const approveCancelledRes = await request(`/api/v1/attendance/regularization/${req1Id}/approve`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        assert.strictEqual(approveCancelledRes.status, 400);
        console.log("  ✓ TEST E: Cancelled request cannot be approved (400 Bad Request)");

        // TEST F: Cross-hospital approval attempt rejected
        const hospitalBAdmin = await User.create({
            name: "Hospital B Admin Reg",
            email: `admin_b_reg_${testTimestamp}@test.com`,
            password: hashedPassword,
            role: "admin",
            hospitalId: hospitalB._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: Object.values(PERMISSIONS),
        });
        const adminBToken = generateToken({ id: hospitalBAdmin._id, role: hospitalBAdmin.role });

        const crossApproveReq = await AttendanceRegularization.create({
            hospitalId: hospitalA._id,
            employeeId: staffEmp1._id,
            date: new Date("2026-09-17T00:00:00.000Z"),
            dateStr: "2026-09-17",
            requestedStatus: "PRESENT",
            reason: "Cross hospital test",
            status: REGULARIZATION_STATUSES.PENDING,
        });

        const crossApproveRes = await request(`/api/v1/attendance/regularization/${crossApproveReq._id}/approve`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminBToken}` },
        });

        assert.strictEqual(crossApproveRes.status, 404);
        const unapprovedReq = await AttendanceRegularization.findById(crossApproveReq._id);
        assert.strictEqual(String(unapprovedReq.status).toUpperCase(), "PENDING");
        console.log("  ✓ TEST F: Cross-hospital approval is rejected with 404 (Tenant Isolation enforced)");

        // REAL TRANSACTION ROLLBACK TEST
        const rollbackTestReq = await AttendanceRegularization.create({
            hospitalId: hospitalA._id,
            employeeId: staffEmp1._id,
            attendanceId: null,
            date: new Date("2026-09-16T00:00:00.000Z"),
            dateStr: "2026-09-16",
            requestedStatus: "PRESENT",
            requestedCheckIn: new Date("2026-09-16T09:00:00.000Z"),
            requestedCheckOut: new Date("2026-09-16T18:00:00.000Z"),
            reason: "Rollback test request",
            status: REGULARIZATION_STATUSES.PENDING,
        });

        const attendanceService = require("../src/services/attendance.service");
        let transactionFailed = false;

        try {
            await attendanceService.approveRegularizationRequest({
                hospitalId: hospitalA._id,
                regularizationId: rollbackTestReq._id,
                reviewerId: "FORCE_ROLLBACK_TEST_ERR",
            });
        } catch (err) {
            transactionFailed = true;
            assert.strictEqual(err.code, "TRANSACTION_TEST_ERROR");
        }

        assert.strictEqual(transactionFailed, true, "Transaction should throw error and trigger abortTransaction()");

        // Verify Rollback: Regularization status must remain PENDING
        const checkRollbackReq = await AttendanceRegularization.findById(rollbackTestReq._id);
        assert.strictEqual(String(checkRollbackReq.status).toUpperCase(), "PENDING", "Regularization status must remain PENDING after rollback");

        // Verify Rollback: Attendance document must NOT exist for 2026-09-16
        const checkRollbackAtt = await Attendance.findOne({
            hospitalId: hospitalA._id,
            employeeId: staffEmp1._id,
            dateStr: "2026-09-16",
        });
        assert.strictEqual(checkRollbackAtt, null, "Created Attendance record must be rolled back and not exist in DB");
        console.log("  ✓ REAL TRANSACTION ROLLBACK TEST: Forced failure aborts transaction, Attendance creation rolled back, Regularization remains PENDING");

        console.log("\n=======================================================");
        console.log("=== ALL PHASE 8D REGULARIZATION & TRANSACTION TESTS PASSED 100% ===");
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
