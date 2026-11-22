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
const Leave = require("../src/models/leave.model");
const Roster = require("../src/models/roster.model");
const RosterAssignment = require("../src/models/rosterAssignment.model");
const Attendance = require("../src/models/attendance.model");
const { generateToken } = require("../src/utils/jwt");
const { PERMISSIONS } = require("../src/config/permissions");

let server;
let baseUrl;

const makeRequest = (pathUrl, { method = "GET", headers = {}, body = null } = {}) => {
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
            {
                method,
                headers: reqHeaders,
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    let parsed = data;
                    try {
                        parsed = JSON.parse(data);
                    } catch (e) {}
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

async function runMultiShiftTests() {
    console.log("\n=======================================================");
    console.log("=== VARDHAN MULTI-SHIFT PER EMPLOYEE PER DATE TEST SUITE ===");
    console.log("=======================================================\n");

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    let hospitalA, hospitalB;
    let hrToken, nurse1Token, nurse2Token;
    let hrUser, nurse1User, nurse2User;
    let hrEmployee, nurse1Employee, nurse2Employee;
    let nursingPosition;
    let rosterA, rosterB;

    try {
        const tempAdminIdA = new mongoose.Types.ObjectId();
        const tempAdminIdB = new mongoose.Types.ObjectId();
        const testSuffix = Date.now();

        hospitalA = await Hospital.create({
            name: `Vardhan MultiShift Hosp A ${testSuffix}`,
            code: `MSHA_${testSuffix}`,
            address: "123 Medical Way",
            email: `contact_${testSuffix}@mshA.com`,
            phone: "1234567890",
            status: "active",
            createdBy: tempAdminIdA,
        });

        hospitalB = await Hospital.create({
            name: `Vardhan MultiShift Hosp B ${testSuffix}`,
            code: `MSHB_${testSuffix}`,
            address: "456 City Way",
            email: `contact_${testSuffix}@mshB.com`,
            phone: "0987654321",
            status: "active",
            createdBy: tempAdminIdB,
        });

        hrUser = await User.create({
            name: "HR Manager A",
            email: `hr_${testSuffix}@mshA.com`,
            password: "password123",
            role: "admin",
            hospitalId: hospitalA._id,
            status: "active",
            customPermissions: [PERMISSIONS.ROSTER_MANAGE, PERMISSIONS.ROSTER_VIEW, PERMISSIONS.EMPLOYEE_MANAGE],
            modules: ["core", "hrms"],
        });
        hrToken = generateToken({ id: hrUser._id, role: hrUser.role, hospitalId: hospitalA._id });

        nursingPosition = await Position.create({
            hospitalId: hospitalA._id,
            name: `Staff Nurse ${testSuffix}`,
            code: `RN-${testSuffix}`,
            rosterEligible: true,
            createdBy: hrUser._id,
        });

        nurse1User = await User.create({
            name: "Nurse Priya Sharma",
            email: `priya_${testSuffix}@mshA.com`,
            password: "password123",
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            customPermissions: [PERMISSIONS.ROSTER_VIEW],
            modules: ["core", "hrms"],
        });

        nurse1Employee = await Employee.create({
            employeeId: `EMP-PRIYA-${testSuffix}`,
            firstName: "Priya",
            lastName: "Sharma",
            positionId: nursingPosition._id,
            email: nurse1User.email,
            hospitalId: hospitalA._id,
            userId: nurse1User._id,
            employmentStatus: "ACTIVE",
            createdBy: hrUser._id,
        });
        nurse1User.employeeId = nurse1Employee._id;
        await nurse1User.save();
        nurse1Token = generateToken({ id: nurse1User._id, role: nurse1User.role, hospitalId: hospitalA._id, employeeId: nurse1Employee._id });

        nurse2User = await User.create({
            name: "Nurse Anita Desai",
            email: `anita_${testSuffix}@mshA.com`,
            password: "password123",
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            customPermissions: [PERMISSIONS.ROSTER_VIEW],
            modules: ["core", "hrms"],
        });

        nurse2Employee = await Employee.create({
            employeeId: `EMP-ANITA-${testSuffix}`,
            firstName: "Anita",
            lastName: "Desai",
            positionId: nursingPosition._id,
            email: nurse2User.email,
            hospitalId: hospitalA._id,
            userId: nurse2User._id,
            employmentStatus: "ACTIVE",
            createdBy: hrUser._id,
        });
        nurse2User.employeeId = nurse2Employee._id;
        await nurse2User.save();
        nurse2Token = generateToken({ id: nurse2User._id, role: nurse2User.role, hospitalId: hospitalA._id, employeeId: nurse2Employee._id });

        // Create Roster A
        const resRosterA = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                title: "Multi-Shift Test Roster",
                startDate: "2026-11-20",
                endDate: "2026-12-31",
                columns: [
                    { id: "col-morning", title: "Morning", startTime: "07:00", endTime: "13:00", order: 1 },
                    { id: "col-evening", title: "Evening", startTime: "14:00", endTime: "20:00", order: 2 },
                    { id: "col-night", title: "Night", startTime: "21:00", endTime: "07:00", order: 3 },
                    { id: "col-overlap", title: "Overlap Shift", startTime: "11:00", endTime: "17:00", order: 4 },
                    { id: "col-early", title: "Early Morning", startTime: "06:00", endTime: "12:00", order: 5 },
                ],
                dutyAreas: [
                    { id: "da-icu", name: "ICU Ward", order: 1 },
                    { id: "da-ot", name: "Operation Theatre", order: 2 },
                ],
            },
        });
        assert.strictEqual(resRosterA.status, 201, "Failed to create Roster A");
        rosterA = resRosterA.body.data;
        const rosterAId = rosterA._id;

        // Publish Roster A
        const resPub = await makeRequest(`/api/v1/rosters/${rosterAId}/publish`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(resPub.status, 200, "Failed to publish Roster A");

        console.log("--- TEST 1: Same nurse, same date, Morning + Evening (non-overlapping) ---");
        // Morning: 07:00 - 13:00 on 2026-11-25
        const resMorn = await makeRequest(`/api/v1/rosters/${rosterAId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-11-25",
                columnId: "col-morning",
                shiftTitle: "Morning",
                startTime: "07:00",
                endTime: "13:00",
                dutyArea: "ICU Ward",
            },
        });
        assert.strictEqual(resMorn.status, 201, `Expected 201 for Morning shift, got ${resMorn.status}: ${JSON.stringify(resMorn.body)}`);
        const mornAssignId = resMorn.body.data._id;

        // Evening: 14:00 - 20:00 on 2026-11-25
        const resEve = await makeRequest(`/api/v1/rosters/${rosterAId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-11-25",
                columnId: "col-evening",
                shiftTitle: "Evening",
                startTime: "14:00",
                endTime: "20:00",
                dutyArea: "Operation Theatre",
            },
        });
        assert.strictEqual(resEve.status, 201, `Expected 201 for Evening shift, got ${resEve.status}: ${JSON.stringify(resEve.body)}`);
        const eveAssignId = resEve.body.data._id;
        console.log("  ✓ PASS: Nurse assigned to Morning and Evening on same date successfully.");

        console.log("\n--- TEST 2: Same nurse, same date, Morning + Evening + Night (non-overlapping) ---");
        // Night: 21:00 - 07:00 on 2026-11-25
        const resNight = await makeRequest(`/api/v1/rosters/${rosterAId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-11-25",
                columnId: "col-night",
                shiftTitle: "Night",
                startTime: "21:00",
                endTime: "07:00",
                dutyArea: "ICU Ward",
            },
        });
        assert.strictEqual(resNight.status, 201, `Expected 201 for Night shift, got ${resNight.status}: ${JSON.stringify(resNight.body)}`);
        const nightAssignId = resNight.body.data._id;
        console.log("  ✓ PASS: Nurse assigned to 3 non-overlapping shifts on same date (Morning + Evening + Night).");

        console.log("\n--- TEST 3: Same nurse, same date, overlapping shift rejected ---");
        // Overlap: 11:00 - 17:00 on 2026-11-25 (overlaps Morning 07:00-13:00 and Evening 14:00-20:00)
        const resOverlap = await makeRequest(`/api/v1/rosters/${rosterAId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-11-25",
                columnId: "col-overlap",
                shiftTitle: "Overlap Shift",
                startTime: "11:00",
                endTime: "17:00",
                dutyArea: "ICU Ward",
            },
        });
        assert.strictEqual(resOverlap.status, 409, `Expected 409 for overlapping shift, got ${resOverlap.status}`);
        assert.strictEqual(resOverlap.body.success, false);
        console.log("  ✓ PASS: Overlapping shift rejected with 409 Conflict:", resOverlap.body.message);

        console.log("\n--- TEST 4: Same nurse, same date, exact duplicate shift assignment rejected ---");
        // Exact duplicate of Morning shift on 2026-11-25
        const resDup = await makeRequest(`/api/v1/rosters/${rosterAId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-11-25",
                columnId: "col-morning",
                shiftTitle: "Morning",
                startTime: "07:00",
                endTime: "13:00",
                dutyArea: "ICU Ward",
            },
        });
        assert.strictEqual(resDup.status, 409, `Expected 409 for exact duplicate shift, got ${resDup.status}`);
        assert.strictEqual(resDup.body.success, false);
        console.log("  ✓ PASS: Exact duplicate shift rejected with 409 Conflict:", resDup.body.message);

        console.log("\n--- TEST 5: Different nurses assigned to the same shift allowed ---");
        // Nurse 2 assigned to Morning on 2026-11-25
        const resNurse2 = await makeRequest(`/api/v1/rosters/${rosterAId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                date: "2026-11-25",
                columnId: "col-morning",
                shiftTitle: "Morning",
                startTime: "07:00",
                endTime: "13:00",
                dutyArea: "ICU Ward",
            },
        });
        assert.strictEqual(resNurse2.status, 201, `Expected 201 for different nurse on same shift, got ${resNurse2.status}`);
        console.log("  ✓ PASS: Different nurses assigned to same shift allowed.");

        console.log("\n--- TEST 6: Same nurse assigned to different dates allowed ---");
        // Nurse 1 assigned to Morning on 2026-11-26
        const resNextDate = await makeRequest(`/api/v1/rosters/${rosterAId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-11-26",
                columnId: "col-morning",
                shiftTitle: "Morning",
                startTime: "07:00",
                endTime: "13:00",
                dutyArea: "ICU Ward",
            },
        });
        // Note: Night shift on 2026-11-25 ends at 07:00 on 2026-11-26.
        // Morning on 2026-11-26 starts at 07:00. This is contiguous (07:00 to 07:00), not overlapping!
        assert.strictEqual(resNextDate.status, 201, `Expected 201 for contiguous shift on next date, got ${resNextDate.status}: ${JSON.stringify(resNextDate.body)}`);
        const nextDateAssignId = resNextDate.body.data._id;
        console.log("  ✓ PASS: Same nurse assigned to contiguous shift on next date allowed (07:00 to 07:00).");

        console.log("\n--- TEST 7: Overnight shift overlapping next day's shift rejected ---");
        // Nurse 2: Assign Night shift on 2026-11-27: 21:00 - 07:00 (ends 2026-11-28 07:00)
        const resNight2 = await makeRequest(`/api/v1/rosters/${rosterAId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                date: "2026-11-27",
                columnId: "col-night",
                shiftTitle: "Night",
                startTime: "21:00",
                endTime: "07:00",
                dutyArea: "ICU Ward",
            },
        });
        assert.strictEqual(resNight2.status, 201);

        // Nurse 2: Attempt Early Morning on 2026-11-28: 06:00 - 12:00 (overlaps with 21:00-07:00 overnight from Nov 27)
        const resEarlyMorn = await makeRequest(`/api/v1/rosters/${rosterAId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                date: "2026-11-28",
                columnId: "col-early",
                shiftTitle: "Early Morning",
                startTime: "06:00",
                endTime: "12:00",
                dutyArea: "ICU Ward",
            },
        });
        assert.strictEqual(resEarlyMorn.status, 409, `Expected 409 for cross-midnight overlap, got ${resEarlyMorn.status}`);
        console.log("  ✓ PASS: Overnight shift overlapping next day's shift rejected with 409 Conflict:", resEarlyMorn.body.message);

        console.log("\n--- TEST 8: Overnight shift contiguous with next day's shift allowed ---");
        // Nurse 2: Assign Day Shift on 2026-11-28: 07:00 - 13:00 (Night ended exactly at 07:00)
        const resContigMorn = await makeRequest(`/api/v1/rosters/${rosterAId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                date: "2026-11-28",
                columnId: "col-morning",
                shiftTitle: "Morning",
                startTime: "07:00",
                endTime: "13:00",
                dutyArea: "ICU Ward",
            },
        });
        assert.strictEqual(resContigMorn.status, 201, `Expected 201 for contiguous shift, got ${resContigMorn.status}`);
        console.log("  ✓ PASS: Overnight shift contiguous with next day's shift allowed.");

        console.log("\n--- TEST 9: Approved leave conflict rejected ---");
        // Create an approved leave for Nurse 1 on 2026-11-30
        await Leave.create({
            hospitalId: hospitalA._id,
            employeeId: nurse1Employee._id,
            leaveType: "SICK",
            startDate: new Date("2026-11-30T00:00:00.000Z"),
            endDate: new Date("2026-11-30T23:59:59.999Z"),
            totalDays: 1,
            appliedBy: hrUser._id,
            status: "approved",
            reason: "Medical checkup",
            createdBy: hrUser._id,
        });

        const resLeaveConflict = await makeRequest(`/api/v1/rosters/${rosterAId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-11-30",
                columnId: "col-morning",
                shiftTitle: "Morning",
                startTime: "07:00",
                endTime: "13:00",
                dutyArea: "ICU Ward",
            },
        });
        assert.strictEqual(resLeaveConflict.status, 409, `Expected 409 for leave conflict, got ${resLeaveConflict.status}`);
        console.log("  ✓ PASS: Approved leave conflict rejected with 409 Conflict:", resLeaveConflict.body.message);

        console.log("\n--- TEST 10: Hospital tenant isolation preserved ---");
        // Try assigning Nurse 1 (Hospital A) in Hospital B or reading Hospital A roster as Hospital B
        const hospBAdmin = await User.create({
            name: "Hosp B Admin",
            email: `admin_${testSuffix}@mshB.com`,
            password: "password123",
            role: "admin",
            hospitalId: hospitalB._id,
            status: "active",
            customPermissions: [PERMISSIONS.ROSTER_MANAGE, PERMISSIONS.ROSTER_VIEW],
            modules: ["core", "hrms"],
        });
        const hospBToken = generateToken({ id: hospBAdmin._id, role: hospBAdmin.role, hospitalId: hospitalB._id });

        // Hosp B cannot access Hosp A's roster
        const resCrossHosp = await makeRequest(`/api/v1/rosters/${rosterAId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${hospBToken}` },
        });
        assert.strictEqual(resCrossHosp.status, 404, `Expected 404 for cross-hospital roster access, got ${resCrossHosp.status}`);
        console.log("  ✓ PASS: Hospital tenant isolation preserved.");

        console.log("\n--- TEST 11: Updating an assignment to an overlapping shift rejected ---");
        // Update Evening shift (14:00-20:00) to 08:00-14:00 (overlaps with Morning 07:00-13:00)
        const resUpdateOverlap = await makeRequest(`/api/v1/rosters/${rosterAId}/assignments/${eveAssignId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                startTime: "08:00",
                endTime: "14:00",
            },
        });
        assert.strictEqual(resUpdateOverlap.status, 409, `Expected 409 when updating to overlapping shift, got ${resUpdateOverlap.status}`);
        console.log("  ✓ PASS: Updating assignment to overlapping time rejected with 409 Conflict:", resUpdateOverlap.body.message);

        console.log("\n--- TEST 12: Deleting one assignment does NOT delete other shifts on that date ---");
        // Delete Evening shift
        const resDelEve = await makeRequest(`/api/v1/rosters/${rosterAId}/assignments/${eveAssignId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(resDelEve.status, 200, `Expected 200 deleting assignment, got ${resDelEve.status}`);

        // Verify Morning and Night shifts still exist for Nurse 1 on 2026-11-25
        const resRosterView = await makeRequest(`/api/v1/rosters/${rosterAId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(resRosterView.status, 200);
        const currentAssignments = resRosterView.body.data.assignments || [];
        const priyaNov25 = currentAssignments.filter(
            (a) => (a.employeeId._id?.toString() === nurse1Employee._id.toString() || a.employeeId.toString() === nurse1Employee._id.toString()) &&
                   new Date(a.date).toISOString().split("T")[0] === "2026-11-25"
        );
        assert.strictEqual(priyaNov25.length, 2, `Expected 2 remaining assignments (Morning and Night), found ${priyaNov25.length}`);
        const titles = priyaNov25.map((a) => a.shiftTitle).sort();
        assert.deepStrictEqual(titles, ["Morning", "Night"]);
        console.log("  ✓ PASS: Deleting Evening shift left Morning and Night intact on 2026-11-25.");

        console.log("\n--- TEST 13: Attendance-protected assignment cannot be modified or deleted ---");
        // Create an Attendance record linked to mornAssignId
        await Attendance.create({
            hospitalId: hospitalA._id,
            employeeId: nurse1Employee._id,
            rosterAssignmentId: mornAssignId,
            date: new Date("2026-11-25T00:00:00.000Z"),
            dateStr: "2026-11-25",
            status: "PRESENT",
            punchRecords: [{ type: "IN", timestamp: new Date("2026-11-25T07:05:00.000Z") }],
        });

        // Attempt to delete mornAssignId
        const resDelProtected = await makeRequest(`/api/v1/rosters/${rosterAId}/assignments/${mornAssignId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(resDelProtected.status, 409, `Expected 409 deleting attendance-linked assignment, got ${resDelProtected.status}`);

        // Attempt to change employee/time of mornAssignId
        const resEditProtected = await makeRequest(`/api/v1/rosters/${rosterAId}/assignments/${mornAssignId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                startTime: "06:00",
                endTime: "12:00",
            },
        });
        assert.strictEqual(resEditProtected.status, 409, `Expected 409 modifying attendance-linked assignment core fields, got ${resEditProtected.status}`);
        console.log("  ✓ PASS: Attendance-protected assignment cannot be deleted or modified.");

        console.log("\n--- TEST 14: Concurrent duplicate/overlapping requests ---");
        // Launch 2 parallel requests to assign Nurse 2 to Evening on 2026-11-26
        const req1 = makeRequest(`/api/v1/rosters/${rosterAId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                date: "2026-11-26",
                columnId: "col-evening",
                shiftTitle: "Evening",
                startTime: "14:00",
                endTime: "20:00",
                dutyArea: "ICU Ward",
            },
        });
        const req2 = makeRequest(`/api/v1/rosters/${rosterAId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                date: "2026-11-26",
                columnId: "col-evening",
                shiftTitle: "Evening",
                startTime: "14:00",
                endTime: "20:00",
                dutyArea: "ICU Ward",
            },
        });

        const [r1, r2] = await Promise.all([req1, req2]);
        const statuses = [r1.status, r2.status].sort();
        assert.strictEqual(statuses[0], 201, "One concurrent request must succeed");
        assert.strictEqual(statuses[1], 409, "Second concurrent request must fail with 409 Conflict");
        console.log("  ✓ PASS: Concurrent requests handled cleanly: 1 succeeded (201), 1 rejected (409).");

        console.log("\n=======================================================");
        console.log("=== ALL 14 MULTI-SHIFT TEST SCENARIOS PASSED! ===");
        console.log("=======================================================\n");

    } finally {
        if (server) {
            server.close();
        }
        await mongoose.disconnect();
    }
}

runMultiShiftTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("MultiShift Test Suite Failure:", err);
        process.exit(1);
    });
