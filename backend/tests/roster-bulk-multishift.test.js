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

async function runBulkMultiShiftTests() {
    console.log("\n=======================================================");
    console.log("=== VARDHAN PHASE 2: BULK MULTI-SHIFT TEST SUITE ===");
    console.log("=======================================================\n");

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    let hospitalA, hospitalB;
    let hrToken;
    let hrUser, nurse1User, nurse2User;
    let hrEmployee, nurse1Employee, nurse2Employee;
    let nursingPosition;
    let rosterA, rosterB;

    try {
        const tempAdminIdA = new mongoose.Types.ObjectId();
        const tempAdminIdB = new mongoose.Types.ObjectId();
        const testSuffix = Date.now();

        hospitalA = await Hospital.create({
            name: `Vardhan BulkMulti Hosp A ${testSuffix}`,
            code: `BMHA_${testSuffix}`,
            address: "123 Medical Way",
            email: `contact_${testSuffix}@bmhA.com`,
            phone: "1234567890",
            status: "active",
            timezone: "Asia/Kolkata",
            createdBy: tempAdminIdA,
        });

        hospitalB = await Hospital.create({
            name: `Vardhan BulkMulti Hosp B ${testSuffix}`,
            code: `BMHB_${testSuffix}`,
            address: "456 Health Blvd",
            email: `contact_${testSuffix}@bmhB.com`,
            phone: "0987654321",
            status: "active",
            timezone: "Asia/Kolkata",
            createdBy: tempAdminIdB,
        });

        nursingPosition = await Position.create({
            hospitalId: hospitalA._id,
            name: "Senior Nurse",
            code: `SNURSE_${testSuffix}`,
            rosterEligible: true,
            status: "active",
            createdBy: tempAdminIdA,
        });

        hrUser = await User.create({
            hospitalId: hospitalA._id,
            name: "HR Manager",
            firstName: "HR",
            lastName: "Manager",
            email: `hr_bulk_${testSuffix}@hospital.com`,
            password: "password123",
            role: "employee",
            status: "active",
            modules: ["hrms"],
            permissions: [PERMISSIONS.ROSTER_MANAGE, PERMISSIONS.ROSTER_VIEW, PERMISSIONS.EMPLOYEE_VIEW],
        });

        hrEmployee = await Employee.create({
            userId: hrUser._id,
            hospitalId: hospitalA._id,
            employeeId: `EMP-HR-${testSuffix}`,
            firstName: "HR",
            lastName: "Manager",
            email: hrUser.email,
            positionId: nursingPosition._id,
            employmentStatus: "ACTIVE",
            createdBy: tempAdminIdA,
        });

        nurse1User = await User.create({
            hospitalId: hospitalA._id,
            name: "Priya Sharma",
            firstName: "Priya",
            lastName: "Sharma",
            email: `priya_bulk_${testSuffix}@hospital.com`,
            password: "password123",
            role: "employee",
            status: "active",
            modules: ["hrms"],
            permissions: [PERMISSIONS.ROSTER_VIEW],
        });

        nurse1Employee = await Employee.create({
            userId: nurse1User._id,
            hospitalId: hospitalA._id,
            employeeId: `EMP-PRIYA-${testSuffix}`,
            firstName: "Priya",
            lastName: "Sharma",
            email: nurse1User.email,
            positionId: nursingPosition._id,
            employmentStatus: "ACTIVE",
            createdBy: tempAdminIdA,
        });

        nurse2User = await User.create({
            hospitalId: hospitalA._id,
            name: "Anita Desai",
            firstName: "Anita",
            lastName: "Desai",
            email: `anita_bulk_${testSuffix}@hospital.com`,
            password: "password123",
            role: "employee",
            status: "active",
            modules: ["hrms"],
            permissions: [PERMISSIONS.ROSTER_VIEW],
        });

        nurse2Employee = await Employee.create({
            userId: nurse2User._id,
            hospitalId: hospitalA._id,
            employeeId: `EMP-ANITA-${testSuffix}`,
            firstName: "Anita",
            lastName: "Desai",
            email: nurse2User.email,
            positionId: nursingPosition._id,
            employmentStatus: "ACTIVE",
            createdBy: tempAdminIdA,
        });

        hrToken = generateToken({
            id: hrUser._id,
            hospitalId: hospitalA._id,
            role: hrUser.role,
            modules: hrUser.modules,
            permissions: hrUser.permissions,
        });

        // Create Roster covering Dec 01 to Dec 31, 2026
        rosterA = await Roster.create({
            hospitalId: hospitalA._id,
            title: "DECEMBER 2026 BULK ROSTER",
            startDate: new Date("2026-12-01T00:00:00.000Z"),
            endDate: new Date("2026-12-31T23:59:59.999Z"),
            columns: [
                { id: "col-morn", title: "Morning", startTime: "07:00", endTime: "13:00", order: 1 },
                { id: "col-eve", title: "Evening", startTime: "14:00", endTime: "20:00", order: 2 },
                { id: "col-night", title: "Night", startTime: "21:00", endTime: "07:00", order: 3 },
            ],
            dutyAreas: [
                { id: "da-icu", name: "ICU", order: 1 },
                { id: "da-ot", name: "OT", order: 2 },
            ],
            status: "DRAFT",
            createdBy: hrUser._id,
        });

        console.log("--- TEST 1: Assigning two shifts across a date range ---");
        // Dec 01 to Dec 03 (3 days) x 2 shifts (Morning + Evening) = 6 assignments
        const test1Res = await makeRequest(`/api/v1/rosters/${rosterA._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                startDate: "2026-12-01",
                endDate: "2026-12-03",
                shiftColumnIds: ["col-morn", "col-eve"],
                dutyArea: "OT",
            },
        });
        assert.strictEqual(test1Res.status, 201, `Expected 201, got ${test1Res.status}`);
        assert.strictEqual(test1Res.body.data.length, 6, "Expected 6 assignments created");
        console.log("  ✓ PASS: Nurse assigned to 2 shifts across 3-day date range (6 assignments).");

        console.log("\n--- TEST 2: Assigning three shifts across a date range ---");
        // Dec 04 to Dec 05 (2 days) x 3 shifts (Morning + Evening + Night) = 6 assignments
        const test2Res = await makeRequest(`/api/v1/rosters/${rosterA._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                startDate: "2026-12-04",
                endDate: "2026-12-05",
                shiftColumnIds: ["col-morn", "col-eve", "col-night"],
                dutyArea: "OT",
            },
        });
        assert.strictEqual(test2Res.status, 201, `Expected 201, got ${test2Res.status}`);
        assert.strictEqual(test2Res.body.data.length, 6, "Expected 6 assignments created (3 shifts x 2 days)");
        console.log("  ✓ PASS: Nurse assigned to 3 non-overlapping shifts across date range.");

        console.log("\n--- TEST 3: Assigning shifts for the entire roster ---");
        // Create clean roster for Nurse Anita for full month Dec 01 to Dec 31
        const fullRoster = await Roster.create({
            hospitalId: hospitalA._id,
            title: "ANITA FULL MONTH ROSTER",
            startDate: new Date("2026-12-01T00:00:00.000Z"),
            endDate: new Date("2026-12-07T23:59:59.999Z"), // 7 days for test speed
            columns: [
                { id: "col-morn", title: "Morning", startTime: "08:00", endTime: "14:00", order: 1 },
                { id: "col-eve", title: "Evening", startTime: "14:00", endTime: "20:00", order: 2 },
            ],
            dutyAreas: [{ id: "da-icu", name: "ICU", order: 1 }],
            status: "DRAFT",
            createdBy: hrUser._id,
        });

        const test3Res = await makeRequest(`/api/v1/rosters/${fullRoster._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                startDate: "2026-12-01",
                endDate: "2026-12-07",
                shiftColumnIds: ["col-morn", "col-eve"],
                dutyArea: "ICU",
            },
        });
        assert.strictEqual(test3Res.status, 201);
        assert.strictEqual(test3Res.body.data.length, 14, "Expected 14 assignments (7 days x 2 shifts)");
        console.log("  ✓ PASS: Nurse assigned across entire roster range (14 assignments created).");

        console.log("\n--- TEST 4: Assigning shifts for selected dates only ---");
        // Specific dates: Dec 10, Dec 12, Dec 14 (3 non-consecutive dates) x 2 shifts = 6
        const test4Res = await makeRequest(`/api/v1/rosters/${rosterA._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                dates: ["2026-12-10", "2026-12-12", "2026-12-14"],
                shiftColumnIds: ["col-morn", "col-eve"],
                dutyArea: "OT",
            },
        });
        assert.strictEqual(test4Res.status, 201);
        assert.strictEqual(test4Res.body.data.length, 6, "Expected 6 assignments on selected dates");
        const createdDates = test4Res.body.data.map(a => new Date(a.date).toISOString().split("T")[0]);
        assert.ok(createdDates.includes("2026-12-10"));
        assert.ok(createdDates.includes("2026-12-12"));
        assert.ok(createdDates.includes("2026-12-14"));
        assert.ok(!createdDates.includes("2026-12-11"));
        console.log("  ✓ PASS: Shifts assigned for selected dates only.");

        console.log("\n--- TEST 5: Blocking duplicate assignments on any requested date ---");
        // Attempting to re-assign Morning shift on Dec 01–03 when Dec 01 already has Morning
        const test5Res = await makeRequest(`/api/v1/rosters/${rosterA._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                startDate: "2026-12-01",
                endDate: "2026-12-03",
                shiftColumnIds: ["col-morn"],
                dutyArea: "OT",
            },
        });
        assert.strictEqual(test5Res.status, 409, `Expected 409, got ${test5Res.status}`);
        assert.ok(test5Res.body.message.includes("already assigned") || test5Res.body.message.includes("duplicate"));
        console.log("  ✓ PASS: Duplicate assignment rejected with 409 Conflict:", test5Res.body.message);

        console.log("\n--- TEST 6: Blocking overlapping shifts on any requested date ---");
        // Priya has Morning (07:00-13:00) on Dec 01. Attempting to bulk-assign a custom shift (11:00-17:00) for Dec 01-03
        const test6Res = await makeRequest(`/api/v1/rosters/${rosterA._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                startDate: "2026-12-01",
                endDate: "2026-12-03",
                shifts: [
                    { shiftTitle: "Midday", startTime: "11:00", endTime: "17:00", dutyArea: "OT" }
                ],
                dutyArea: "OT",
            },
        });
        console.log("TEST 6 STATUS:", test6Res.status, "BODY:", test6Res.body);
        assert.strictEqual(test6Res.status, 409, `Expected 409, got ${test6Res.status}`);
        assert.ok(test6Res.body.message.includes("overlapping shift") || test6Res.body.message.includes("overlap"));
        console.log("  ✓ PASS: Overlapping shift rejected with 409 Conflict:", test6Res.body.message);

        console.log("\n--- TEST 7: Blocking assignments that conflict with approved leave ---");
        // Nurse Anita has approved leave on Dec 20
        await Leave.create({
            hospitalId: hospitalA._id,
            employeeId: nurse2Employee._id,
            leaveType: "SICK",
            startDate: new Date("2026-12-20T00:00:00.000Z"),
            endDate: new Date("2026-12-20T23:59:59.999Z"),
            totalDays: 1,
            appliedBy: hrUser._id,
            status: "approved",
            reason: "Flu",
            createdBy: tempAdminIdA,
        });

        // Request Dec 18 to Dec 22 (Dec 20 falls inside)
        const test7Res = await makeRequest(`/api/v1/rosters/${rosterA._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                startDate: "2026-12-18",
                endDate: "2026-12-22",
                shiftColumnIds: ["col-morn"],
                dutyArea: "OT",
            },
        });
        assert.strictEqual(test7Res.status, 409, `Expected 409, got ${test7Res.status}`);
        assert.ok(test7Res.body.message.includes("approved leave"));
        console.log("  ✓ PASS: Approved leave conflict rejected with 409 Conflict:", test7Res.body.message);

        console.log("\n--- TEST 8: Handling overnight shift conflicts across adjacent dates ---");
        // Assign Anita an overnight shift on Dec 23 (21:00 to 07:00 next day Dec 24)
        await RosterAssignment.create({
            rosterId: rosterA._id,
            hospitalId: hospitalA._id,
            employeeId: nurse2Employee._id,
            date: new Date("2026-12-23T12:00:00.000Z"),
            columnId: "col-night",
            shiftTitle: "Night",
            startTime: "21:00",
            endTime: "07:00",
            dutyArea: "OT",
            createdBy: hrUser._id,
        });

        // Request Morning shift starting early at 06:00 to 12:00 on Dec 24 (overlaps 06:00-07:00 with overnight shift from Dec 23)
        const test8Res = await makeRequest(`/api/v1/rosters/${rosterA._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                startDate: "2026-12-24",
                endDate: "2026-12-26",
                shifts: [
                    { shiftTitle: "Early Morning", startTime: "06:00", endTime: "12:00", dutyArea: "OT" }
                ],
            },
        });
        assert.strictEqual(test8Res.status, 409, `Expected 409, got ${test8Res.status}`);
        assert.ok(test8Res.body.message.includes("overlapping shift"));
        console.log("  ✓ PASS: Overnight shift conflict across adjacent dates rejected with 409 Conflict:", test8Res.body.message);

        console.log("\n--- TEST 9: Rejecting invalid shift column IDs ---");
        const test9Res = await makeRequest(`/api/v1/rosters/${rosterA._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                startDate: "2026-12-28",
                endDate: "2026-12-30",
                shiftColumnIds: ["col-nonexistent-1234"],
                dutyArea: "OT",
            },
        });
        assert.strictEqual(test9Res.status, 400, `Expected 400, got ${test9Res.status}`);
        assert.ok(test9Res.body.message.includes("does not belong to this roster"));
        console.log("  ✓ PASS: Non-existent shift column ID rejected with 400 Bad Request:", test9Res.body.message);

        console.log("\n--- TEST 10: Rejecting dates outside the roster range ---");
        // Roster A is Dec 01 to Dec 31. Requesting dates in November 2026
        const test10Res = await makeRequest(`/api/v1/rosters/${rosterA._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                startDate: "2026-11-20",
                endDate: "2026-11-25",
                shiftColumnIds: ["col-morn"],
                dutyArea: "OT",
            },
        });
        assert.strictEqual(test10Res.status, 400, `Expected 400, got ${test10Res.status}`);
        assert.ok(test10Res.body.message.includes("fall within the roster start and end date period"));
        console.log("  ✓ PASS: Date range outside roster bounds rejected with 400 Bad Request:", test10Res.body.message);

        console.log("\n--- TEST 11: Preventing partial assignments when any conflict exists (All-or-Nothing) ---");
        // Dates Dec 15 to Dec 17 (3 days).
        // Let's create an existing Morning shift on Dec 16 ONLY for Nurse Anita.
        await RosterAssignment.create({
            rosterId: rosterA._id,
            hospitalId: hospitalA._id,
            employeeId: nurse2Employee._id,
            date: new Date("2026-12-16T12:00:00.000Z"),
            columnId: "col-morn",
            shiftTitle: "Morning",
            startTime: "07:00",
            endTime: "13:00",
            dutyArea: "OT",
            createdBy: hrUser._id,
        });

        // Request Morning shift across Dec 15 to Dec 17.
        // Dec 15 and Dec 17 are completely free. Dec 16 conflicts.
        const test11Res = await makeRequest(`/api/v1/rosters/${rosterA._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                startDate: "2026-12-15",
                endDate: "2026-12-17",
                shiftColumnIds: ["col-morn"],
                dutyArea: "OT",
            },
        });
        assert.strictEqual(test11Res.status, 409, `Expected 409, got ${test11Res.status}`);

        // Verify that ZERO assignments were created for Dec 15 or Dec 17!
        const dec15Ass = await RosterAssignment.find({
            rosterId: rosterA._id,
            employeeId: nurse2Employee._id,
            date: {
                $gte: new Date("2026-12-15T00:00:00.000Z"),
                $lte: new Date("2026-12-17T23:59:59.999Z"),
            },
        });
        // Only the pre-existing Dec 16 assignment should exist!
        assert.strictEqual(dec15Ass.length, 1, "Expected exactly 1 assignment (the pre-existing one); zero partial assignments allowed");
        console.log("  ✓ PASS: All-or-Nothing enforced. Zero partial assignments created on conflict.");

        console.log("\n--- TEST 12: Preventing concurrent duplicate or overlapping assignments ---");
        // Two concurrent bulk requests for Dec 28 to Dec 29
        const reqPayload = {
            employeeId: nurse2Employee._id,
            startDate: "2026-12-28",
            endDate: "2026-12-29",
            shiftColumnIds: ["col-morn", "col-eve"],
            dutyArea: "OT",
        };

        const [resA, resB] = await Promise.all([
            makeRequest(`/api/v1/rosters/${rosterA._id}/assignments/bulk-range`, {
                method: "POST",
                headers: { Authorization: `Bearer ${hrToken}` },
                body: reqPayload,
            }),
            makeRequest(`/api/v1/rosters/${rosterA._id}/assignments/bulk-range`, {
                method: "POST",
                headers: { Authorization: `Bearer ${hrToken}` },
                body: reqPayload,
            }),
        ]);

        const statuses = [resA.status, resB.status];
        assert.ok(statuses.includes(201), "One concurrent request must succeed");
        assert.ok(statuses.includes(409), "The other concurrent request must be rejected with 409");
        console.log("  ✓ PASS: Concurrent bulk requests handled safely (one 201, one 409).");

        console.log("\n--- TEST 13: Ensuring different nurses can receive the same shifts ---");
        // Priya has Dec 28-29 shifts; Anita can also receive Dec 28-29 shifts
        const test13Res = await makeRequest(`/api/v1/rosters/${rosterA._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                startDate: "2026-12-28",
                endDate: "2026-12-29",
                shiftColumnIds: ["col-morn", "col-eve"],
                dutyArea: "OT",
            },
        });
        assert.strictEqual(test13Res.status, 201);
        console.log("  ✓ PASS: Different nurses can receive the same shifts on the same dates.");

        console.log("\n--- TEST 14: Verifying existing Phase 1 single-date functionality still works ---");
        // Test single-date assignment API: Dec 30 Morning
        const singleDateRes1 = await makeRequest(`/api/v1/rosters/${rosterA._id}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-12-30",
                columnId: "col-morn",
                shiftTitle: "Morning",
                startTime: "07:00",
                endTime: "13:00",
                dutyArea: "OT",
            },
        });
        assert.strictEqual(singleDateRes1.status, 201, "Phase 1 single-date assign Morning should succeed");

        // Same date non-overlapping Evening shift should succeed
        const singleDateRes2 = await makeRequest(`/api/v1/rosters/${rosterA._id}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-12-30",
                columnId: "col-eve",
                shiftTitle: "Evening",
                startTime: "14:00",
                endTime: "20:00",
                dutyArea: "OT",
            },
        });
        assert.strictEqual(singleDateRes2.status, 201, "Phase 1 single-date assign Evening should succeed");

        // Same date overlapping shift should fail (409)
        const singleDateRes3 = await makeRequest(`/api/v1/rosters/${rosterA._id}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-12-30",
                columnId: "col-morn",
                shiftTitle: "Morning",
                startTime: "09:00",
                endTime: "15:00",
                dutyArea: "OT",
            },
        });
        assert.strictEqual(singleDateRes3.status, 409, "Phase 1 overlapping shift must fail with 409");
        console.log("  ✓ PASS: Existing Phase 1 single-date multi-shift functionality verified 100%.");

        console.log("\n=======================================================");
        console.log("=== ALL 14 PHASE 2 BULK MULTI-SHIFT TESTS PASSED! ===");
        console.log("=======================================================\n");

    } finally {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
}

if (require.main === module) {
    runBulkMultiShiftTests()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error("Test failed with error:", err);
            process.exit(1);
        });
}

module.exports = runBulkMultiShiftTests;
