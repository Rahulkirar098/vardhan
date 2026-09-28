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
const RosterTemplate = require("../src/models/rosterTemplate.model");
const Roster = require("../src/models/roster.model");
const RosterAssignment = require("../src/models/rosterAssignment.model");
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

async function runTests() {
    console.log("\n=======================================================");
    console.log("=== VARDHAN PHASE 9 ROSTER TEST SUITE ===");
    console.log("=======================================================\n");

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    let hospitalA, hospitalB;
    let adminToken, hrToken, nurse1Token, nurse2Token, hospitalBAdminToken;
    let hrUser, nurse1User, nurse2User;
    let hrEmployee, nurse1Employee, nurse2Employee;
    let nursingPosition;
    let createdTemplateId, createdRosterId, createdAssignmentId;

    try {
        const tempAdminId = new mongoose.Types.ObjectId();
        const testSuffix = Date.now();

        hospitalA = await Hospital.create({
            name: `Metro General Hospital A ${testSuffix}`,
            code: `METROA_${testSuffix}`,
            address: "123 Health Ave",
            email: `contact_${testSuffix}@metroA.com`,
            phone: "1234567890",
            status: "active",
            createdBy: tempAdminId,
        });

        hospitalB = await Hospital.create({
            name: `City Hospital B ${testSuffix}`,
            code: `CITYB_${testSuffix}`,
            address: "456 Care Blvd",
            email: `contact_${testSuffix}@cityB.com`,
            phone: "0987654321",
            status: "active",
            createdBy: tempAdminId,
        });

        const adminUserA = await User.create({
            _id: tempAdminId,
            name: "Admin Hospital A",
            email: `admin_${testSuffix}@metroA.com`,
            password: "password123",
            role: "admin",
            hospitalId: hospitalA._id,
            status: "active",
        });
        adminToken = generateToken({ id: adminUserA._id, role: adminUserA.role, hospitalId: hospitalA._id });

        const adminUserB = await User.create({
            name: "Admin Hospital B",
            email: `admin_${testSuffix}@cityB.com`,
            password: "password123",
            role: "admin",
            hospitalId: hospitalB._id,
            status: "active",
        });
        hospitalBAdminToken = generateToken({ id: adminUserB._id, role: adminUserB.role, hospitalId: hospitalB._id });

        nursingPosition = await Position.create({
            hospitalId: hospitalA._id,
            name: `Staff Nurse ${testSuffix}`,
            description: "Registered Staff Nurse",
            defaultModules: ["core", "hrms"],
            createdBy: adminUserA._id,
        });

        hrUser = await User.create({
            name: "HR Manager Neha",
            email: `hr.neha_${testSuffix}@metroA.com`,
            password: "password123",
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            permissions: [PERMISSIONS.ROSTER_VIEW, PERMISSIONS.ROSTER_MANAGE, PERMISSIONS.EMPLOYEE_VIEW],
            modules: ["core", "hrms"],
        });

        hrEmployee = await Employee.create({
            employeeId: `EMP-HR-${testSuffix}`,
            firstName: "Neha",
            lastName: "Sharma",
            positionId: nursingPosition._id,
            email: hrUser.email,
            hospitalId: hospitalA._id,
            userId: hrUser._id,
            employmentStatus: "ACTIVE",
            createdBy: adminUserA._id,
        });
        hrUser.employeeId = hrEmployee._id;
        await hrUser.save();
        hrToken = generateToken({ id: hrUser._id, role: hrUser.role, hospitalId: hospitalA._id, employeeId: hrEmployee._id });

        nurse1User = await User.create({
            name: "Nurse Priya",
            email: `priya_${testSuffix}@metroA.com`,
            password: "password123",
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            permissions: [PERMISSIONS.ROSTER_VIEW],
            modules: ["core", "hrms"],
        });

        nurse1Employee = await Employee.create({
            employeeId: `EMP-N1-${testSuffix}`,
            firstName: "Priya",
            lastName: "Singh",
            positionId: nursingPosition._id,
            email: nurse1User.email,
            hospitalId: hospitalA._id,
            userId: nurse1User._id,
            employmentStatus: "ACTIVE",
            createdBy: adminUserA._id,
        });
        nurse1User.employeeId = nurse1Employee._id;
        await nurse1User.save();
        nurse1Token = generateToken({ id: nurse1User._id, role: nurse1User.role, hospitalId: hospitalA._id, employeeId: nurse1Employee._id });

        nurse2User = await User.create({
            name: "Nurse Anjali",
            email: `anjali_${testSuffix}@metroA.com`,
            password: "password123",
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            permissions: [],
            modules: ["core", "hrms"],
        });

        nurse2Employee = await Employee.create({
            employeeId: `EMP-N2-${testSuffix}`,
            firstName: "Anjali",
            lastName: "Verma",
            positionId: nursingPosition._id,
            email: nurse2User.email,
            hospitalId: hospitalA._id,
            userId: nurse2User._id,
            employmentStatus: "ACTIVE",
            createdBy: adminUserA._id,
        });
        nurse2User.employeeId = nurse2Employee._id;
        await nurse2User.save();
        nurse2Token = generateToken({ id: nurse2User._id, role: nurse2User.role, hospitalId: hospitalA._id, employeeId: nurse2Employee._id });

        console.log("--- 1. TEMPLATE BUILDER SCENARIOS ---");

        // 1. Create Roster Template
        const res1 = await makeRequest("/api/v1/rosters/templates", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                title: "Nursing Duty Template",
                columns: [
                    { id: "col-1", title: "Morning", startTime: "08:00", endTime: "14:00", order: 1 },
                    { id: "col-2", title: "Afternoon", startTime: "14:00", endTime: "20:00", order: 2 },
                    { id: "col-3", title: "Night", startTime: "20:00", endTime: "08:00", order: 3 },
                ],
                dutyAreas: [
                    { id: "da-1", name: "General Ward", order: 1 },
                    { id: "da-2", name: "NICU 2nd Floor", order: 2 },
                    { id: "da-3", name: "ICU 3rd Floor", order: 3 },
                    { id: "da-4", name: "OT", order: 4 },
                ],
            },
        });
        assert.strictEqual(res1.status, 201);
        assert.strictEqual(res1.body.success, true);
        assert.strictEqual(res1.body.data.title, "Nursing Duty Template");
        assert.strictEqual(res1.body.data.columns.length, 3);
        assert.strictEqual(res1.body.data.dutyAreas.length, 4);
        createdTemplateId = res1.body.data._id;
        console.log("  ✓ 1. Authorized HR can create a Roster Template with custom columns & duty areas");

        // 2. Unauthorized Template Creation
        const res2 = await makeRequest("/api/v1/rosters/templates", {
            method: "POST",
            headers: { Authorization: `Bearer ${nurse2Token}` },
            body: { title: "Unauthorized Template", columns: [], dutyAreas: [] },
        });
        assert.strictEqual(res2.status, 403);
        console.log("  ✓ 2. User without roster.manage cannot create Roster Template (403 Forbidden)");

        // 3. List Templates
        const res3 = await makeRequest("/api/v1/rosters/templates", {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(res3.status, 200);
        assert.strictEqual(res3.body.data.length, 1);
        console.log("  ✓ 3. Authorized user can view Roster Templates list");

        // 4. Tenant Isolation
        const res4 = await makeRequest(`/api/v1/rosters/templates/${createdTemplateId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${hospitalBAdminToken}` },
        });
        assert.strictEqual(res4.status, 404);
        console.log("  ✓ 4. Tenant Isolation: Hospital B cannot access Hospital A templates");

        // 5. Update Template
        const res5 = await makeRequest(`/api/v1/rosters/templates/${createdTemplateId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: { title: "Updated September Roster Template" },
        });
        assert.strictEqual(res5.status, 200);
        assert.strictEqual(res5.body.data.title, "Updated September Roster Template");
        console.log("  ✓ 5. Authorized HR can update Roster Template");

        console.log("\n--- 2. ROSTER DRAFT & PUBLISH SCENARIOS ---");

        // 6. Create Roster Draft
        const res6 = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                templateId: createdTemplateId,
                title: "September 11 to 20 Nursing Schedule",
                startDate: "2026-09-11",
                endDate: "2026-09-20",
            },
        });
        assert.strictEqual(res6.status, 201);
        assert.strictEqual(res6.body.data.status, "DRAFT");
        createdRosterId = res6.body.data._id;
        console.log("  ✓ 6. Authorized HR can create an actual Roster draft from template");

        // 7. Add Assignment (with Leave Conflict Warning check)
        await Leave.create({
            hospitalId: hospitalA._id,
            employeeId: nurse1Employee._id,
            leaveType: "CASUAL",
            startDate: new Date("2026-09-12"),
            endDate: new Date("2026-09-12"),
            totalDays: 1,
            reason: "Family event",
            status: "APPROVED",
            createdBy: hrUser._id,
        });

        const res7 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-09-12",
                columnId: "col-1",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "NICU 2nd Floor",
                notes: "Handle incubator B",
            },
        });
        assert.strictEqual(res7.status, 201);
        assert.strictEqual(res7.body.data.dutyArea, "NICU 2nd Floor");
        assert.notStrictEqual(res7.body.leaveWarning, null);
        assert.strictEqual(res7.body.leaveWarning.hasLeave, true);
        createdAssignmentId = res7.body.data._id;
        console.log("  ✓ 7. Authorized HR can assign active employee to a shift (with Leave Conflict Warning check)");

        // 8. Assign Inactive Employee Rejected
        const inactiveEmployee = await Employee.create({
            employeeId: `EMP-IN-${testSuffix}`,
            firstName: "Inactive",
            lastName: "Staff",
            positionId: nursingPosition._id,
            email: `inactive_${testSuffix}@metroA.com`,
            hospitalId: hospitalA._id,
            employmentStatus: "INACTIVE",
            createdBy: hrUser._id,
        });

        const res8 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: inactiveEmployee._id,
                date: "2026-09-13",
                columnId: "col-1",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "General Ward",
            },
        });
        assert.strictEqual(res8.status, 400);
        console.log("  ✓ 8. Assigning an inactive employee is rejected (400 Bad Request)");

        // 9. Assign Hospital B Employee Rejected
        const hospitalBUser = await User.create({
            name: "Nurse Hospital B",
            email: `nurse_${testSuffix}@cityB.com`,
            password: "password123",
            role: "employee",
            hospitalId: hospitalB._id,
        });
        const hospitalBEmployee = await Employee.create({
            employeeId: `EMP-B-${testSuffix}`,
            firstName: "B-Staff",
            lastName: "Nurse",
            positionId: nursingPosition._id,
            email: hospitalBUser.email,
            hospitalId: hospitalB._id,
            userId: hospitalBUser._id,
            employmentStatus: "ACTIVE",
            createdBy: hospitalBUser._id,
        });

        const res9 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: hospitalBEmployee._id,
                date: "2026-09-13",
                columnId: "col-1",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "General Ward",
            },
        });
        assert.strictEqual(res9.status, 404);
        console.log("  ✓ 9. Assigning an employee from another hospital is rejected (404 Not Found)");

        // 10. Standard employee assignment blocked
        const res10 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${nurse2Token}` },
            body: {
                employeeId: nurse2Employee._id,
                date: "2026-09-13",
                shiftTitle: "Night",
                startTime: "20:00",
                endTime: "08:00",
                dutyArea: "ICU",
            },
        });
        assert.strictEqual(res10.status, 403);
        console.log("  ✓ 10. Standard employee cannot manage assignments (403 Forbidden)");

        // 11. Update Assignment
        const res11 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments/${createdAssignmentId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                startTime: "09:00",
                endTime: "15:00",
                notes: "Time overridden by HR Manager",
            },
        });
        assert.strictEqual(res11.status, 200);
        assert.strictEqual(res11.body.data.startTime, "09:00");
        console.log("  ✓ 11. Authorized HR can update assignment details (time override)");

        // 12. Publish Roster
        const res12 = await makeRequest(`/api/v1/rosters/${createdRosterId}/publish`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(res12.status, 200);
        assert.strictEqual(res12.body.data.status, "PUBLISHED");
        console.log("  ✓ 12. Authorized HR can publish the Roster draft");

        // 13. Modify Published Assignment Blocked
        const res13 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                date: "2026-09-14",
                shiftTitle: "Night",
                startTime: "20:00",
                endTime: "08:00",
                dutyArea: "ICU",
            },
        });
        assert.strictEqual(res13.status, 400);
        console.log("  ✓ 13. Modifying assignments on a PUBLISHED roster is blocked (400 Bad Request)");

        console.log("\n--- 3. MY ROSTER (Employee View) SCENARIOS ---");

        // 14. Nurse Priya fetches /my-roster
        const res14 = await makeRequest("/api/v1/rosters/my-roster", {
            method: "GET",
            headers: { Authorization: `Bearer ${nurse1Token}` },
        });
        assert.strictEqual(res14.status, 200);
        assert.strictEqual(res14.body.data.length, 1);
        assert.strictEqual(res14.body.data[0].dutyArea, "NICU 2nd Floor");
        console.log("  ✓ 14. Assigned Nurse Priya can fetch her own published roster via /my-roster");

        // 15. Unassigned Nurse Anjali fetches /my-roster
        const res15 = await makeRequest("/api/v1/rosters/my-roster", {
            method: "GET",
            headers: { Authorization: `Bearer ${nurse2Token}` },
        });
        assert.strictEqual(res15.status, 200);
        assert.strictEqual(res15.body.data.length, 0);
        console.log("  ✓ 15. Unassigned Nurse Anjali receives empty array for /my-roster");

        console.log("\n--- 4. CLEANUP & TEMPLATE DELETION ---");

        // 16. Delete Template
        const res16 = await makeRequest(`/api/v1/rosters/templates/${createdTemplateId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(res16.status, 200);
        console.log("  ✓ 16. Authorized HR can delete a Roster Template");

        console.log("\n=======================================================");
        console.log("=== ALL 16 ROSTER TESTS PASSED 100% ===");
        console.log("=======================================================\n");

    } catch (err) {
        console.error("Roster Test Suite Failure:", err);
        process.exit(1);
    } finally {
        if (server) server.close();
    }
}

if (require.main === module) {
    runTests();
}
