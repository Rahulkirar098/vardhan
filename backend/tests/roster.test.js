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
        const tempAdminIdA = new mongoose.Types.ObjectId();
        const tempAdminIdB = new mongoose.Types.ObjectId();
        const testSuffix = Date.now();

        hospitalA = await Hospital.create({
            name: `Metro General Hospital A ${testSuffix}`,
            code: `METROA_${testSuffix}`,
            address: "123 Health Ave",
            email: `contact_${testSuffix}@metroA.com`,
            phone: "1234567890",
            status: "active",
            createdBy: tempAdminIdA,
        });

        hospitalB = await Hospital.create({
            name: `City Hospital B ${testSuffix}`,
            code: `CITYB_${testSuffix}`,
            address: "456 Care Blvd",
            email: `contact_${testSuffix}@cityB.com`,
            phone: "0987654321",
            status: "active",
            createdBy: tempAdminIdB,
        });

        const adminUserA = await User.create({
            _id: tempAdminIdA,
            name: "Admin Hospital A",
            email: `admin_${testSuffix}@metroA.com`,
            password: "password123",
            role: "admin",
            hospitalId: hospitalA._id,
            status: "active",
        });
        adminToken = generateToken({ id: adminUserA._id, role: adminUserA.role, hospitalId: hospitalA._id });

        const adminUserB = await User.create({
            _id: tempAdminIdB,
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
            permissions: [PERMISSIONS.ROSTER_VIEW],
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

        console.log("\n--- 2. ROSTER DRAFT, REVIEW SHARING & PUBLISH SCENARIOS ---");

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

        // 7. Unshared Nurse cannot view DRAFT Roster
        const resDraftBlocked = await makeRequest(`/api/v1/rosters/${createdRosterId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${nurse1Token}` },
        });
        assert.strictEqual(resDraftBlocked.status, 403);
        console.log("  ✓ 7. Unshared employee cannot view unpublished DRAFT roster (403 Forbidden)");

        // 8. Share Draft Roster for Review
        const resShare = await makeRequest(`/api/v1/rosters/${createdRosterId}/share`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: { sharedWith: [nurse1User._id] },
        });
        assert.strictEqual(resShare.status, 200);
        assert.strictEqual(resShare.body.data.sharedWith.length, 1);
        console.log("  ✓ 8. Authorized HR can share DRAFT roster with selected employee for review");

        // 9. Shared Reviewer can view DRAFT Roster and add feedback comment
        const resSharedAccess = await makeRequest(`/api/v1/rosters/${createdRosterId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${nurse1Token}` },
        });
        assert.strictEqual(resSharedAccess.status, 200);

        const resComment = await makeRequest(`/api/v1/rosters/${createdRosterId}/comments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${nurse1Token}` },
            body: { comment: "Please move me to Morning shift on 15 Sep" },
        });
        assert.strictEqual(resComment.status, 200);
        assert.strictEqual(resComment.body.data.comments.length, 1);
        console.log("  ✓ 9. Shared reviewer can view draft roster and submit review comments");

        // 10. Add Assignment
        const res10 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
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
        assert.strictEqual(res10.status, 201);
        createdAssignmentId = res10.body.data._id;
        console.log("  ✓ 10. Authorized HR can assign employee to a shift");

        // 11. Publish Roster
        const res11 = await makeRequest(`/api/v1/rosters/${createdRosterId}/publish`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(res11.status, 200);
        assert.strictEqual(res11.body.data.status, "PUBLISHED");
        console.log("  ✓ 11. Authorized HR can publish the Roster draft");

        // 12. ALL Nurses can view PUBLISHED Roster
        const resPublishedNurseView = await makeRequest(`/api/v1/rosters/${createdRosterId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${nurse2Token}` },
        });
        assert.strictEqual(resPublishedNurseView.status, 200);
        assert.strictEqual(resPublishedNurseView.body.data.status, "PUBLISHED");
        console.log("  ✓ 12. All employees with roster.view can view the PUBLISHED workforce roster matrix");

        // 13. Authorized HR can EDIT PUBLISHED Roster assignments
        const resEditPublished = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                date: "2026-09-14",
                shiftTitle: "Night",
                startTime: "20:00",
                endTime: "08:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(resEditPublished.status, 201);
        console.log("  ✓ 13. Published rosters are EDITABLE by authorized managers with roster.manage");

        console.log("\n--- 3. CLEANUP & TEMPLATE DELETION ---");

        // 14. Delete Template
        const res14 = await makeRequest(`/api/v1/rosters/templates/${createdTemplateId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(res14.status, 200);
        console.log("  ✓ 14. Authorized HR can delete a Roster Template");

        console.log("\n=======================================================");
        console.log("=== ALL ROSTER TESTS PASSED 100% ===");
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
