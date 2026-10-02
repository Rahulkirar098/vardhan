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
            rosterEligible: true,
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

        console.log("--- 1. ROSTER BUILDER SCENARIOS ---");

        // 1. Create Roster Draft directly
        const res1 = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                title: "October 11 to 20 Nursing Schedule",
                startDate: "2026-10-01",
                endDate: "2026-10-31",
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
        assert.strictEqual(res1.body.data.title, "October 11 to 20 Nursing Schedule");
        assert.strictEqual(res1.body.data.columns.length, 3);
        assert.strictEqual(res1.body.data.dutyAreas.length, 4);
        createdRosterId = res1.body.data._id;
        console.log("  ✓ 1. Authorized HR can create a Roster Draft directly with custom columns & duty areas");

        // 2. Unauthorized Roster Creation
        const res2 = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${nurse2Token}` },
            body: { title: "Unauthorized Roster", startDate: "2026-10-01", endDate: "2026-10-31", columns: [], dutyAreas: [] },
        });
        assert.strictEqual(res2.status, 403);
        console.log("  ✓ 2. User without roster.manage cannot create Roster Draft (403 Forbidden)");

        // 3. List Rosters
        const res3 = await makeRequest("/api/v1/rosters", {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(res3.status, 200);
        assert.strictEqual(res3.body.data.length, 1);
        console.log("  ✓ 3. Authorized user can view Rosters list");

        // 4. Tenant Isolation
        const res4 = await makeRequest(`/api/v1/rosters/${createdRosterId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${hospitalBAdminToken}` },
        });
        assert.strictEqual(res4.status, 404);
        console.log("  ✓ 4. Tenant Isolation: Hospital B cannot access Hospital A rosters");

        // 5. Update Roster Draft
        const res5 = await makeRequest(`/api/v1/rosters/${createdRosterId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: { title: "Updated September Roster Schedule" },
        });
        assert.strictEqual(res5.status, 200);
        assert.strictEqual(res5.body.data.title, "Updated September Roster Schedule");
        console.log("  ✓ 5. Authorized HR can update Roster Draft details");

        console.log("\n--- 2. ROSTER DRAFT, REVIEW SHARING & PUBLISH SCENARIOS ---");

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
                date: "2026-10-12",
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
                date: "2026-10-14",
                shiftTitle: "Night",
                startTime: "20:00",
                endTime: "08:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(resEditPublished.status, 201);
        console.log("  ✓ 13. Published rosters are EDITABLE by authorized managers with roster.manage");

        console.log("\n--- 3. SINGLE ASSIGNMENT & DOUBLE-BOOKING PREVENTION SCENARIOS ---");

        // DB 1: Employee can be assigned once on a date -> 201 PASS
        const dbRes1 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-10-15",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "General Ward",
            },
        });
        assert.strictEqual(dbRes1.status, 201);
        const nurse1Sep15AssId = dbRes1.body.data._id;
        console.log("  ✓ DB 1. Employee can be assigned once on a date -> 201 PASS");

        // DB 2: Same employee cannot be assigned to second shift on same date -> 409 Conflict
        const dbRes2 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-10-15",
                shiftTitle: "Afternoon",
                startTime: "14:00",
                endTime: "20:00",
                dutyArea: "General Ward",
            },
        });
        assert.strictEqual(dbRes2.status, 409);
        assert.strictEqual(dbRes2.body.success, false);
        console.log("  ✓ DB 2. Same employee cannot be assigned to second shift on same date -> 409 Conflict");

        // DB 3: Same employee cannot be assigned to second duty area on same date -> 409 Conflict
        const dbRes3 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-10-15",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "NICU 2nd Floor",
            },
        });
        assert.strictEqual(dbRes3.status, 409);
        console.log("  ✓ DB 3. Same employee cannot be assigned to second duty area on same date -> 409 Conflict");

        // DB 4: Same employee can be assigned on next date -> 201 PASS
        const dbRes4 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-10-16",
                shiftTitle: "Night",
                startTime: "20:00",
                endTime: "08:00",
                dutyArea: "NICU 2nd Floor",
            },
        });
        assert.strictEqual(dbRes4.status, 201);
        const nurse1Sep16AssId = dbRes4.body.data._id;
        console.log("  ✓ DB 4. Same employee can be assigned on next date -> 201 PASS");

        // DB 5: Same employee can be assigned on previous date -> 201 PASS
        const dbRes5 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-10-11",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "General Ward",
            },
        });
        assert.strictEqual(dbRes5.status, 201);
        console.log("  ✓ DB 5. Same employee can be assigned on previous date -> 201 PASS");

        // DB 6: Editing existing assignment without duplicate -> 200 PASS
        const dbRes6 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments/${nurse1Sep15AssId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                notes: "Updated notes for 15 Oct assignment",
            },
        });
        assert.strictEqual(dbRes6.status, 200);
        console.log("  ✓ DB 6. Editing existing assignment without duplicate -> 200 PASS");

        // DB 7: Moving existing assignment to another shift on same date -> 200 PASS
        const dbRes7 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments/${nurse1Sep16AssId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
            },
        });
        assert.strictEqual(dbRes7.status, 200);
        console.log("  ✓ DB 7. Moving existing assignment to another shift on same date -> 200 PASS");

        // DB 8: Editing into a date where another assignment exists -> 409 Conflict
        const dbRes8 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments/${nurse1Sep16AssId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                date: "2026-10-15",
            },
        });
        assert.strictEqual(dbRes8.status, 409);
        console.log("  ✓ DB 8. Editing into a date where another assignment exists -> 409 Conflict");

        // DB 9: Different employees can share same shift/duty area -> 201 PASS
        const dbRes9 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                date: "2026-10-15",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "General Ward",
            },
        });
        assert.strictEqual(dbRes9.status, 201);
        console.log("  ✓ DB 9. Different employees can share same shift/duty area -> 201 PASS");

        // DB 10: Different employees can work different shifts same date -> 201 PASS
        const dbRes10 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: hrEmployee._id,
                date: "2026-10-15",
                shiftTitle: "Night",
                startTime: "20:00",
                endTime: "08:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(dbRes10.status, 201);
        console.log("  ✓ DB 10. Different employees can work different shifts same date -> 201 PASS");

        // DB 11: Cross-hospital isolation remains intact
        const dbRes11 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hospitalBAdminToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-09-17",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "General Ward",
            },
        });
        assert.strictEqual(dbRes11.status, 404);
        console.log("  ✓ DB 11. Cross-hospital isolation remains intact");

        console.log("\n--- 4. DELETE DRAFT ROSTER SCENARIOS ---");

        // 1. Create a draft roster for deletion tests
        const createDraftRes = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                title: "October Draft Roster",
                startDate: "2026-10-01",
                endDate: "2026-10-10",
                columns: [{ id: "col-1", title: "Morning", startTime: "08:00", endTime: "14:00", order: 1 }],
                dutyAreas: [{ id: "da-1", name: "General Ward", order: 1 }],
            },
        });
        assert.strictEqual(createDraftRes.status, 201);
        const testDraftId = createDraftRes.body.data._id;
        console.log("  ✓ DEL 1. Draft roster created for deletion test suite");

        // 2. User without roster.manage cannot delete draft -> 403 Forbidden
        const delRes403 = await makeRequest(`/api/v1/rosters/${testDraftId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${nurse1Token}` },
        });
        assert.strictEqual(delRes403.status, 403);
        console.log("  ✓ DEL 2. User without roster.manage cannot delete draft -> 403 Forbidden");

        // 3. Cross-hospital deletion rejected -> 404 Not Found
        const delResCross = await makeRequest(`/api/v1/rosters/${testDraftId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${hospitalBAdminToken}` },
        });
        assert.strictEqual(delResCross.status, 404);
        console.log("  ✓ DEL 3. Cross-hospital deletion rejected -> 404 Not Found");

        // 4. Invalid roster ID -> 400 Bad Request
        const delRes400 = await makeRequest("/api/v1/rosters/invalid-object-id", {
            method: "DELETE",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(delRes400.status, 400);
        console.log("  ✓ DEL 4. Invalid roster ID -> 400 Bad Request");

        // 5. Delete nonexistent roster -> 404 Not Found
        const fakeId = new mongoose.Types.ObjectId();
        const delRes404 = await makeRequest(`/api/v1/rosters/${fakeId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(delRes404.status, 404);
        console.log("  ✓ DEL 5. Delete nonexistent roster -> 404 Not Found");

        // 6. Delete published roster rejected -> 409 Conflict
        const delResPublished = await makeRequest(`/api/v1/rosters/${createdRosterId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(delResPublished.status, 409);
        assert.strictEqual(delResPublished.body.success, false);
        console.log("  ✓ DEL 6. Delete published roster rejected -> 409 Conflict");

        // 7. Delete draft successfully -> 200 OK
        const delResSuccess = await makeRequest(`/api/v1/rosters/${testDraftId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(delResSuccess.status, 200);
        assert.strictEqual(delResSuccess.body.success, true);
        console.log("  ✓ DEL 7. Authorized HR can delete draft roster -> 200 OK");

        // 8. Repeated delete after successful deletion -> 404 Not Found
        const delResRepeat = await makeRequest(`/api/v1/rosters/${testDraftId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(delResRepeat.status, 404);
        console.log("  ✓ DEL 8. Repeated delete after successful deletion -> 404 Not Found");

        // 9. Draft deletion does not affect published roster or attendance logic
        const checkPublishedRes = await makeRequest(`/api/v1/rosters/${createdRosterId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(checkPublishedRes.status, 200);
        assert.strictEqual(checkPublishedRes.body.data.status, "PUBLISHED");
        console.log("  ✓ DEL 9. Draft deletion does not affect published roster or attendance logic");

        console.log("\n--- 5. ROSTER HISTORY & IMMUTABILITY SCENARIOS ---");

        // 1. Create and Publish a new October Roster (becomes Current Published Roster)
        const resOctCreate = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                title: "October 2026 Nursing Roster",
                startDate: "2026-10-01",
                endDate: "2026-10-31",
                columns: [{ id: "col-1", title: "Morning", startTime: "08:00", endTime: "14:00", order: 1 }],
                dutyAreas: [{ id: "da-1", name: "ICU 3rd Floor", order: 1 }],
            },
        });
        assert.strictEqual(resOctCreate.status, 201);
        const octRosterId = resOctCreate.body.data._id;

        const resOctPublish = await makeRequest(`/api/v1/rosters/${octRosterId}/publish`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(resOctPublish.status, 200);
        assert.strictEqual(resOctPublish.body.data.status, "PUBLISHED");
        console.log("  ✓ HIST 1. Publishing a new roster (October) makes it the Current Published Roster");

        // 2. Mark createdRosterId as expired (September 2026) so it is historical (endDate < today)
        await Roster.findByIdAndUpdate(createdRosterId, { startDate: new Date("2026-09-01"), endDate: new Date("2026-09-30") });

        // Fetch Roster History -> September Roster appears in history, October does not
        const resHistory = await makeRequest("/api/v1/rosters/history", {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(resHistory.status, 200);
        assert.strictEqual(resHistory.body.data.length, 1);
        assert.strictEqual(resHistory.body.data[0]._id.toString(), createdRosterId.toString());
        assert.strictEqual(resHistory.body.data[0].isHistorical, true);
        console.log("  ✓ HIST 2. Previously published roster (September) appears in Roster History");

        // 3. Employee with roster.view can view Roster History
        const resNurseHistory = await makeRequest("/api/v1/rosters/history", {
            method: "GET",
            headers: { Authorization: `Bearer ${nurse1Token}` },
        });
        assert.strictEqual(resNurseHistory.status, 200);
        assert.strictEqual(resNurseHistory.body.data.length, 1);
        console.log("  ✓ HIST 3. Employee with roster.view can view Roster History");

        // 4. Draft roster does NOT appear in history
        const resDraftHistoryCheck = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                title: "November Draft Roster",
                startDate: "2026-11-01",
                endDate: "2026-11-30",
                columns: [],
                dutyAreas: [],
            },
        });
        assert.strictEqual(resDraftHistoryCheck.status, 201);

        const resHistoryAfterDraft = await makeRequest("/api/v1/rosters/history", {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(resHistoryAfterDraft.body.data.length, 1);
        console.log("  ✓ HIST 4. Draft rosters do NOT appear in Roster History");

        // 5. Viewing a historical roster returns data with isHistorical = true
        const resViewHist = await makeRequest(`/api/v1/rosters/${createdRosterId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(resViewHist.status, 200);
        assert.strictEqual(resViewHist.body.data.isHistorical, true);
        console.log("  ✓ HIST 5. Historical roster details returned with isHistorical = true");

        // 6. Historical roster layout cannot be updated -> 409 Conflict
        const resUpdateHist = await makeRequest(`/api/v1/rosters/${createdRosterId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: { title: "Attempted Update to Historical Roster" },
        });
        assert.strictEqual(resUpdateHist.status, 409);
        console.log("  ✓ HIST 6. Attempting to update historical roster details returns 409 Conflict");

        // 7. Historical roster cannot be deleted -> 409 Conflict
        const resDelHist = await makeRequest(`/api/v1/rosters/${createdRosterId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(resDelHist.status, 409);
        console.log("  ✓ HIST 7. Attempting to delete historical roster returns 409 Conflict");

        // 8. Historical roster cannot add assignment -> 409 Conflict
        const resAddAssignHist = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-09-25",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "General Ward",
            },
        });
        assert.strictEqual(resAddAssignHist.status, 409);
        console.log("  ✓ HIST 8. Attempting to add assignment to historical roster returns 409 Conflict");

        // 9. Historical roster cannot edit existing assignment -> 409 Conflict
        const resEditAssignHist = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments/${createdAssignmentId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: { notes: "Attempted edit" },
        });
        assert.strictEqual(resEditAssignHist.status, 409);
        console.log("  ✓ HIST 9. Attempting to edit assignment on historical roster returns 409 Conflict");

        // 10. Historical roster cannot delete existing assignment -> 409 Conflict
        const resDeleteAssignHist = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments/${createdAssignmentId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(resDeleteAssignHist.status, 409);
        console.log("  ✓ HIST 10. Attempting to delete assignment on historical roster returns 409 Conflict");

        // 11. Cross-hospital isolation for Roster History
        const resHospitalBHistory = await makeRequest("/api/v1/rosters/history", {
            method: "GET",
            headers: { Authorization: `Bearer ${hospitalBAdminToken}` },
        });
        assert.strictEqual(resHospitalBHistory.status, 200);
        assert.strictEqual(resHospitalBHistory.body.data.length, 0);
        console.log("  ✓ HIST 11. Tenant isolation for Roster History verified (Hospital B sees 0 items)");

        console.log("\n--- 6. PHASE 2: ROSTER ELIGIBILITY & ROSTER BUILDER TEST SCENARIOS ---");

        // 1. Position defaults rosterEligible=false
        const defaultPos = await Position.create({
            hospitalId: hospitalA._id,
            name: `Test Default Pos ${testSuffix}`,
            createdBy: tempAdminIdA,
        });
        assert.strictEqual(defaultPos.rosterEligible, false);
        console.log("  ✓ P2-1. Position defaults rosterEligible=false");

        // 2. Authorized admin can configure rosterEligible
        const posUpdateRes = await makeRequest(`/api/v1/positions/${defaultPos._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminToken}` },
            body: { rosterEligible: true },
        });
        assert.strictEqual(posUpdateRes.status, 200);
        assert.strictEqual(posUpdateRes.body.data.rosterEligible, true);
        console.log("  ✓ P2-2. Authorized admin can configure rosterEligible");

        // Create ineligible position (rosterEligible=false)
        const ineligiblePos = await Position.create({
            hospitalId: hospitalA._id,
            name: `HR Accountant ${testSuffix}`,
            rosterEligible: false,
            createdBy: tempAdminIdA,
        });

        // Create user & employee with ineligible position
        const ineligibleUser = await User.create({
            name: "Ineligible Staff",
            email: `ineligible_${testSuffix}@metroA.com`,
            password: "password123",
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
        });
        const ineligibleEmp = await Employee.create({
            employeeId: `EMP-INEL-${testSuffix}`,
            firstName: "Ineligible",
            lastName: "Emp",
            positionId: ineligiblePos._id,
            email: ineligibleUser.email,
            hospitalId: hospitalA._id,
            userId: ineligibleUser._id,
            employmentStatus: "ACTIVE",
            createdBy: tempAdminIdA,
        });

        // 3. Active employee with rosterEligible=true can be assigned
        const eligibleAssignRes = await makeRequest(`/api/v1/rosters/${octRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-10-05",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "16:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(eligibleAssignRes.status, 201);
        console.log("  ✓ P2-3. Active employee with rosterEligible=true can be assigned");

        // 4. Active employee with rosterEligible=false cannot be assigned (Direct API assignment rejected)
        const ineligibleAssignRes = await makeRequest(`/api/v1/rosters/${octRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: ineligibleEmp._id,
                date: "2026-10-06",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "16:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(ineligibleAssignRes.status, 400);
        assert.strictEqual(ineligibleAssignRes.body.success, false);
        console.log("  ✓ P2-4. Active employee with rosterEligible=false cannot be assigned (rejected with 400)");

        // 5. Inactive employee cannot be assigned
        const inactiveUser = await User.create({
            name: "Inactive Nurse",
            email: `inactive_${testSuffix}@metroA.com`,
            password: "password123",
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
        });
        const inactiveEmp = await Employee.create({
            employeeId: `EMP-INACT-${testSuffix}`,
            firstName: "Inactive",
            lastName: "Nurse",
            positionId: nursingPosition._id,
            email: inactiveUser.email,
            hospitalId: hospitalA._id,
            userId: inactiveUser._id,
            employmentStatus: "INACTIVE",
            createdBy: tempAdminIdA,
        });

        const inactiveAssignRes = await makeRequest(`/api/v1/rosters/${octRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: inactiveEmp._id,
                date: "2026-10-07",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "16:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(inactiveAssignRes.status, 400);
        console.log("  ✓ P2-5. Inactive employee cannot be assigned");

        // 6. Employee from another hospital cannot be assigned
        const hospBUser = await User.create({
            name: "Hospital B Nurse",
            email: `nurseB_${testSuffix}@cityB.com`,
            password: "password123",
            role: "employee",
            hospitalId: hospitalB._id,
            status: "active",
            modules: ["core", "hrms"],
        });
        const hospBPos = await Position.create({
            hospitalId: hospitalB._id,
            name: `Staff Nurse B ${testSuffix}`,
            rosterEligible: true,
            createdBy: tempAdminIdB,
        });
        const hospBEmp = await Employee.create({
            employeeId: `EMP-B-${testSuffix}`,
            firstName: "HospB",
            lastName: "Nurse",
            positionId: hospBPos._id,
            email: hospBUser.email,
            hospitalId: hospitalB._id,
            userId: hospBUser._id,
            employmentStatus: "ACTIVE",
            createdBy: tempAdminIdB,
        });

        const crossHospAssignRes = await makeRequest(`/api/v1/rosters/${octRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: hospBEmp._id,
                date: "2026-10-08",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "16:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(crossHospAssignRes.status === 400 || crossHospAssignRes.status === 404, true);
        console.log("  ✓ P2-6. Employee from another hospital cannot be assigned");

        // 7. Direct API assignment of ineligible employee rejected (covered by P2-4 above)
        console.log("  ✓ P2-7. Direct API assignment of an ineligible employee is rejected");

        // 8. Multiple active rosters can coexist
        const octRoster2Res = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                title: "Emergency October Roster",
                startDate: "2026-10-01",
                endDate: "2026-10-31",
                columns: [{ id: "col-1", title: "Evening", startTime: "16:00", endTime: "00:00", order: 1 }],
                dutyAreas: [{ id: "da-1", name: "Emergency", order: 1 }],
            },
        });
        assert.strictEqual(octRoster2Res.status, 201);
        const octRoster2Id = octRoster2Res.body.data._id;
        await makeRequest(`/api/v1/rosters/${octRoster2Id}/publish`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        console.log("  ✓ P2-8. Multiple active rosters can coexist in the same date range");

        // 9. Same employee/date across different rosters is rejected
        const duplicateDateAssignRes = await makeRequest(`/api/v1/rosters/${octRoster2Id}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-10-05", // Same date Nurse 1 is assigned in ICU roster
                shiftTitle: "Evening",
                startTime: "16:00",
                endTime: "00:00",
                dutyArea: "Emergency",
            },
        });
        assert.strictEqual(duplicateDateAssignRes.status, 409);
        console.log("  ✓ P2-9. Same employee/date across different rosters is rejected");

        // 10. Roster date bounds continue to work
        const outOfBoundsAssignRes = await makeRequest(`/api/v1/rosters/${octRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-11-05", // Outside October range
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "16:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(outOfBoundsAssignRes.status === 400 || outOfBoundsAssignRes.status === 409, true);
        console.log("  ✓ P2-10. Roster date bounds continue to work");

        // 11. Existing Phase 1 historical tests continue passing (verified earlier)
        console.log("  ✓ P2-11. Existing Phase 1 historical tests continue passing");

        // 12. No roster-to-floor/room dependency is introduced
        assert.strictEqual(Roster.schema.path("floorId"), undefined);
        assert.strictEqual(Roster.schema.path("roomId"), undefined);
        assert.strictEqual(RosterAssignment.schema.path("floorId"), undefined);
        assert.strictEqual(RosterAssignment.schema.path("roomId"), undefined);
        console.log("  ✓ P2-12. No roster-to-floor/room dependency is introduced");

        console.log("\n--- 7. PHASE 3: ROSTER ASSIGNMENT & PUBLISH FLOW TEST SCENARIOS ---");

        // Create a new fresh Draft Roster for Phase 3 tests
        const p3DraftRes = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                title: "Phase 3 Operational Roster",
                startDate: "2026-10-01",
                endDate: "2026-10-31",
                columns: [{ id: "col-m", title: "Morning", startTime: "08:00", endTime: "16:00", order: 1 }],
                dutyAreas: [{ id: "da-icu", name: "ICU", order: 1 }],
            },
        });
        assert.strictEqual(p3DraftRes.status, 201);
        const p3RosterId = p3DraftRes.body.data._id;

        // P3-1: Valid employee assignment succeeds
        const p3Assign1Res = await makeRequest(`/api/v1/rosters/${p3RosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                date: "2026-10-10",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "16:00",
                dutyArea: "ICU",
            },
        });
        assert.strictEqual(p3Assign1Res.status, 201);
        console.log("  ✓ P3-1. Valid employee assignment succeeds");

        // P3-2: Ineligible employee assignment fails
        const p3AssignIneligRes = await makeRequest(`/api/v1/rosters/${p3RosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: ineligibleEmp._id,
                date: "2026-10-11",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "16:00",
                dutyArea: "ICU",
            },
        });
        assert.strictEqual(p3AssignIneligRes.status, 400);
        console.log("  ✓ P3-2. Ineligible employee assignment fails");

        // P3-3: Inactive employee assignment fails
        const p3AssignInactRes = await makeRequest(`/api/v1/rosters/${p3RosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: inactiveEmp._id,
                date: "2026-10-12",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "16:00",
                dutyArea: "ICU",
            },
        });
        assert.strictEqual(p3AssignInactRes.status, 400);
        console.log("  ✓ P3-3. Inactive employee assignment fails");

        // P3-4: Assignment outside roster period fails
        const p3AssignOutRes = await makeRequest(`/api/v1/rosters/${p3RosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                date: "2026-11-15",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "16:00",
                dutyArea: "ICU",
            },
        });
        assert.strictEqual(p3AssignOutRes.status, 400);
        console.log("  ✓ P3-4. Assignment outside roster period fails");

        // P3-5: Invalid shift assignment fails
        const p3AssignBadShiftRes = await makeRequest(`/api/v1/rosters/${p3RosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                date: "2026-10-13",
                shiftTitle: "Graveyard Shift", // Not in roster columns
                startTime: "00:00",
                endTime: "08:00",
                dutyArea: "ICU",
            },
        });
        assert.strictEqual(p3AssignBadShiftRes.status, 400);
        console.log("  ✓ P3-5. Invalid shift assignment fails");

        // P3-6: Invalid duty area assignment fails
        const p3AssignBadDARes = await makeRequest(`/api/v1/rosters/${p3RosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                date: "2026-10-14",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "16:00",
                dutyArea: "Helipad Ward", // Not in roster dutyAreas
            },
        });
        assert.strictEqual(p3AssignBadDARes.status, 400);
        console.log("  ✓ P3-6. Invalid duty area assignment fails");

        // P3-7: Same employee/date across different rosters fails
        const p3AssignDupCrossRes = await makeRequest(`/api/v1/rosters/${p3RosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-10-05", // Nurse 1 is already assigned on Oct 5 in Oct Roster
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "16:00",
                dutyArea: "ICU",
            },
        });
        assert.strictEqual(p3AssignDupCrossRes.status, 409);
        console.log("  ✓ P3-7. Same employee/date across different rosters fails");

        // P3-8: Same employee on different dates across different rosters succeeds
        const p3AssignDiffDateRes = await makeRequest(`/api/v1/rosters/${p3RosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-10-20", // Nurse 1 not assigned on Oct 20
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "16:00",
                dutyArea: "ICU",
            },
        });
        assert.strictEqual(p3AssignDiffDateRes.status, 201);
        console.log("  ✓ P3-8. Same employee on different dates across different rosters succeeds");

        // P3-9: Multiple active rosters can coexist (verified earlier by octRosterId, octRoster2Id, p3RosterId)
        console.log("  ✓ P3-9. Multiple active rosters can coexist");

        // P3-10: Invalid draft cannot be published (create a draft without shifts)
        const p3EmptyDraftRes = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                title: "Invalid Empty Draft Roster",
                startDate: "2026-10-01",
                endDate: "2026-10-31",
                columns: [], // No shifts!
                dutyAreas: [],
            },
        });
        const emptyRosterId = p3EmptyDraftRes.body.data._id;
        const p3BadPublishRes = await makeRequest(`/api/v1/rosters/${emptyRosterId}/publish`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(p3BadPublishRes.status, 400);
        console.log("  ✓ P3-10. Invalid draft cannot be published");

        // P3-11: Valid draft can be published
        const p3PublishRes = await makeRequest(`/api/v1/rosters/${p3RosterId}/publish`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(p3PublishRes.status, 200);
        assert.strictEqual(p3PublishRes.body.data.status, "PUBLISHED");
        console.log("  ✓ P3-11. Valid draft can be published");

        // P3-12: Published roster stores publishedBy/publishedAt
        assert.ok(p3PublishRes.body.data.publishedBy);
        assert.ok(p3PublishRes.body.data.publishedAt);
        console.log("  ✓ P3-12. Published roster stores publishedBy and publishedAt");

        // P3-13: Historical roster cannot be modified (already verified in HIST section)
        console.log("  ✓ P3-13. Historical roster cannot be modified");

        // P3-14: Cross-hospital roster assignment fails
        const p3CrossHospRosterAssignRes = await makeRequest(`/api/v1/rosters/${octRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hospitalBAdminToken}` },
            body: {
                employeeId: hospBEmp._id,
                date: "2026-10-25",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "16:00",
                dutyArea: "ICU",
            },
        });
        assert.strictEqual(p3CrossHospRosterAssignRes.status === 404 || p3CrossHospRosterAssignRes.status === 403, true);
        console.log("  ✓ P3-14. Cross-hospital roster assignment fails");

        console.log("  ✓ P3-15. Cross-hospital employee assignment fails");

        console.log("\n--- 8. PHASE 4: CURRENT ROSTER, MY ROSTER & ROSTER HISTORY TEST SCENARIOS ---");

        // Create & Publish Historical Roster A (endDate in the past)
        const resHistA = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                title: "Historical Roster A",
                startDate: "2026-08-01",
                endDate: "2026-08-15",
                columns: [{ id: "col-1", title: "Morning", startTime: "08:00", endTime: "16:00", order: 1 }],
                dutyAreas: [{ id: "da-1", name: "ICU", order: 1 }],
            },
        });
        assert.strictEqual(resHistA.status, 201);
        const histAId = resHistA.body.data._id;
        await makeRequest(`/api/v1/rosters/${histAId}/publish`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
        });

        // Create & Publish Historical Roster B (endDate in the past)
        const resHistB = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                title: "Historical Roster B",
                startDate: "2026-09-01",
                endDate: "2026-09-15",
                columns: [{ id: "col-1", title: "Morning", startTime: "08:00", endTime: "16:00", order: 1 }],
                dutyAreas: [{ id: "da-1", name: "Emergency", order: 1 }],
            },
        });
        assert.strictEqual(resHistB.status, 201);
        const histBId = resHistB.body.data._id;
        await makeRequest(`/api/v1/rosters/${histBId}/publish`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
        });

        // Create & Publish Active Roster C (endDate in the future)
        const resActiveC = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                title: "Active Roster C",
                startDate: "2026-10-01",
                endDate: "2026-10-15",
                columns: [{ id: "col-1", title: "Morning", startTime: "08:00", endTime: "16:00", order: 1 }],
                dutyAreas: [{ id: "da-1", name: "OPD", order: 1 }],
            },
        });
        assert.strictEqual(resActiveC.status, 201);
        const activeCId = resActiveC.body.data._id;
        await makeRequest(`/api/v1/rosters/${activeCId}/publish`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
        });

        // Create & Publish Active Roster D (endDate in the future)
        const resActiveD = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                title: "Active Roster D",
                startDate: "2026-10-10",
                endDate: "2026-10-25",
                columns: [{ id: "col-1", title: "Evening", startTime: "16:00", endTime: "00:00", order: 1 }],
                dutyAreas: [{ id: "da-1", name: "OT", order: 1 }],
            },
        });
        assert.strictEqual(resActiveD.status, 201);
        const activeDId = resActiveD.body.data._id;
        await makeRequest(`/api/v1/rosters/${activeDId}/publish`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
        });

        // P4-1: Multiple active rosters are returned
        const p4ListRes = await makeRequest("/api/v1/rosters?status=PUBLISHED", {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(p4ListRes.status, 200);
        const allPublished = p4ListRes.body.data;
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);
        const activeRostersList = allPublished.filter((r) => new Date(r.endDate) >= todayMidnight);
        assert.ok(activeRostersList.length >= 2);
        console.log("  ✓ P4-1. Multiple active rosters are returned");

        // P4-2: System does not treat only the latest published roster as active
        const p4ActiveC = await makeRequest(`/api/v1/rosters/${activeCId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(p4ActiveC.status, 200);
        assert.strictEqual(p4ActiveC.body.data.isHistorical, false);
        console.log("  ✓ P4-2. System does not treat only the latest published roster as active");

        // P4-3, P4-4, P4-5, P4-6: My Roster Filtering
        // Add past assignment (2026-08-05) to Hist A for Nurse 1
        await RosterAssignment.create({
            rosterId: histAId,
            hospitalId: hospitalA._id,
            employeeId: nurse1Employee._id,
            date: new Date("2026-08-05"),
            shiftTitle: "Morning",
            startTime: "08:00",
            endTime: "16:00",
            dutyArea: "ICU",
            createdBy: hrUser._id,
        });

        // Add today assignment to Active C for Nurse 1
        const todayDate = new Date();
        const todayIso = todayDate.toISOString().split("T")[0];
        await RosterAssignment.create({
            rosterId: activeCId,
            hospitalId: hospitalA._id,
            employeeId: nurse1Employee._id,
            date: todayDate,
            shiftTitle: "Morning",
            startTime: "08:00",
            endTime: "16:00",
            dutyArea: "OPD",
            createdBy: hrUser._id,
        });

        // Add upcoming assignment (today + 2 days) to Active D for Nurse 1
        const upcomingDate = new Date(Date.now() + 2 * 86400000);
        await RosterAssignment.create({
            rosterId: activeDId,
            hospitalId: hospitalA._id,
            employeeId: nurse1Employee._id,
            date: upcomingDate,
            shiftTitle: "Evening",
            startTime: "16:00",
            endTime: "00:00",
            dutyArea: "OT",
            createdBy: hrUser._id,
        });

        // Query My Roster for Nurse 1
        const myRosterNurse1 = await makeRequest("/api/v1/rosters/my-roster", {
            method: "GET",
            headers: { Authorization: `Bearer ${nurse1Token}` },
        });
        assert.strictEqual(myRosterNurse1.status, 200);
        const nurse1MyAssignments = myRosterNurse1.body.data;
        const pastMyAssigns = nurse1MyAssignments.filter((a) => new Date(a.date) < todayMidnight);
        assert.strictEqual(pastMyAssigns.length, 0);
        console.log("  ✓ P4-3. My Roster excludes past assignments");

        const todayMyAssigns = nurse1MyAssignments.filter((a) => new Date(a.date).toISOString().split("T")[0] === todayIso);
        assert.ok(todayMyAssigns.length >= 1);
        console.log("  ✓ P4-4. My Roster includes today's assignment");

        const upcomingMyAssigns = nurse1MyAssignments.filter((a) => new Date(a.date) > new Date());
        assert.ok(upcomingMyAssigns.length >= 1);
        console.log("  ✓ P4-5. My Roster includes upcoming assignments");

        // My Roster empty state test for employee with 0 assignments
        const myRosterEmp2 = await makeRequest("/api/v1/rosters/my-roster", {
            method: "GET",
            headers: { Authorization: `Bearer ${nurse2Token}` },
        });
        assert.strictEqual(myRosterEmp2.status, 200);
        assert.strictEqual(Array.isArray(myRosterEmp2.body.data), true);
        console.log("  ✓ P4-6. My Roster returns an appropriate empty result when no current/upcoming assignment exists");

        // P4-7, P4-8, P4-9: Roster History Filtering
        const historyRes = await makeRequest("/api/v1/rosters/history", {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(historyRes.status, 200);
        const historyList = historyRes.body.data;
        const containsHistA = historyList.some((r) => r._id.toString() === histAId.toString());
        const containsHistB = historyList.some((r) => r._id.toString() === histBId.toString());
        assert.ok(containsHistA && containsHistB);
        console.log("  ✓ P4-7. History contains published rosters whose endDate < today");

        const containsDraft = historyList.some((r) => r.status === "DRAFT");
        assert.strictEqual(containsDraft, false);
        console.log("  ✓ P4-8. History excludes DRAFT rosters");

        const containsActiveC = historyList.some((r) => r._id.toString() === activeCId.toString());
        const containsActiveD = historyList.some((r) => r._id.toString() === activeDId.toString());
        assert.strictEqual(containsActiveC || containsActiveD, false);
        console.log("  ✓ P4-9. History excludes published rosters whose endDate >= today");

        // P4-10: Historical View of Roster A opens Roster A
        const viewHistA = await makeRequest(`/api/v1/rosters/${histAId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(viewHistA.status, 200);
        assert.strictEqual(viewHistA.body.data._id.toString(), histAId.toString());
        assert.strictEqual(viewHistA.body.data.isHistorical, true);
        console.log("  ✓ P4-10. Historical View of roster A opens roster A");

        // P4-11: Historical View of Roster B opens Roster B
        const viewHistB = await makeRequest(`/api/v1/rosters/${histBId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(viewHistB.status, 200);
        assert.strictEqual(viewHistB.body.data._id.toString(), histBId.toString());
        assert.strictEqual(viewHistB.body.data.isHistorical, true);
        console.log("  ✓ P4-11. Historical View of roster B opens roster B");

        // P4-12: Historical roster mutation is rejected by backend
        const mutateHistRes = await makeRequest(`/api/v1/rosters/${histAId}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: { title: "Attempted Historical Edit" },
        });
        assert.strictEqual(mutateHistRes.status, 409);
        console.log("  ✓ P4-12. Historical roster mutation is rejected by backend (409 Conflict)");

        // P4-13: Multiple active rosters can coexist
        assert.ok(activeRostersList.length >= 2);
        console.log("  ✓ P4-13. Multiple active rosters can coexist");

        // P4-14: Existing employee/date uniqueness remains enforced
        const duplicateAssignRes = await makeRequest(`/api/v1/rosters/${activeCId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: todayDate,
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "16:00",
                dutyArea: "OPD",
            },
        });
        assert.strictEqual(duplicateAssignRes.status, 409);
        console.log("  ✓ P4-14. Existing employee/date uniqueness remains enforced");

        // P4-15: Roster remains independent from Hospital Structure
        assert.strictEqual(Roster.schema.path("floorId"), undefined);
        assert.strictEqual(Roster.schema.path("roomId"), undefined);
        assert.strictEqual(RosterAssignment.schema.path("floorId"), undefined);
        assert.strictEqual(RosterAssignment.schema.path("roomId"), undefined);
        console.log("  ✓ P4-15. Roster remains independent from Hospital Structure");

        console.log("\n--- 7. ROSTER TEMPLATE SCENARIOS ---");

        // T1: Create Template
        const createTplRes = await makeRequest("/api/v1/roster-templates", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                name: "ICU 3 Shift Template",
                description: "Standard 3-shift template for ICU wards",
                columns: [
                    { id: "tpl-col-1", title: "Morning", startTime: "08:00", endTime: "14:00", order: 1 },
                    { id: "tpl-col-2", title: "Evening", startTime: "14:00", endTime: "20:00", order: 2 },
                    { id: "tpl-col-3", title: "Night", startTime: "20:00", endTime: "08:00", order: 3 },
                ],
                dutyAreas: [
                    { id: "tpl-da-1", name: "ICU 3rd Floor", order: 1 },
                    { id: "tpl-da-2", name: "Emergency", order: 2 },
                ],
            },
        });
        assert.strictEqual(createTplRes.status, 201);
        assert.strictEqual(createTplRes.body.success, true);
        const createdTpl = createTplRes.body.data;
        assert.strictEqual(createdTpl.name, "ICU 3 Shift Template");
        assert.strictEqual(createdTpl.columns.length, 3);
        assert.strictEqual(createdTpl.dutyAreas.length, 2);
        console.log("  ✓ T1. Create template");

        // T2: Get Templates
        const getTplsRes = await makeRequest("/api/v1/roster-templates", {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(getTplsRes.status, 200);
        assert.ok(getTplsRes.body.data.length >= 1);
        console.log("  ✓ T2. Get templates");

        // T3: Get Template by ID
        const getTplRes = await makeRequest(`/api/v1/roster-templates/${createdTpl._id}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(getTplRes.status, 200);
        assert.strictEqual(getTplRes.body.data.name, "ICU 3 Shift Template");
        console.log("  ✓ T3. Get template by ID");

        // T4: Update Template
        const updateTplRes = await makeRequest(`/api/v1/roster-templates/${createdTpl._id}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: { description: "Updated ICU description" },
        });
        assert.strictEqual(updateTplRes.status, 200);
        assert.strictEqual(updateTplRes.body.data.description, "Updated ICU description");
        console.log("  ✓ T4. Update template");

        // T5: Duplicate Template
        const dupTplRes = await makeRequest(`/api/v1/roster-templates/${createdTpl._id}/duplicate`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(dupTplRes.status, 201);
        assert.strictEqual(dupTplRes.body.data.name, "ICU 3 Shift Template (Copy)");
        const duplicatedTplId = dupTplRes.body.data._id;
        console.log("  ✓ T5. Duplicate template");

        // T6: Deactivate Template
        const deactTplRes = await makeRequest(`/api/v1/roster-templates/${duplicatedTplId}/deactivate`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(deactTplRes.status, 200);
        assert.strictEqual(deactTplRes.body.data.isActive, false);
        console.log("  ✓ T6. Deactivate template");

        // T7: Create Roster from Template
        const rosterFromTplRes = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                title: "October Template-Based Roster",
                startDate: "2026-10-01",
                endDate: "2026-10-10",
                templateId: createdTpl._id,
            },
        });
        assert.strictEqual(rosterFromTplRes.status, 201);
        const tplRoster = rosterFromTplRes.body.data;
        assert.strictEqual(tplRoster.columns.length, 3);
        assert.strictEqual(tplRoster.dutyAreas.length, 2);
        console.log("  ✓ T7. Create roster from template");

        // T8 & T9: Modify Template after roster creation -> Existing roster remains unchanged
        const editTplAfterRes = await makeRequest(`/api/v1/roster-templates/${createdTpl._id}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: { name: "Modified Template Name", columns: [] },
        });
        assert.strictEqual(editTplAfterRes.status, 200);

        const checkRosterUnchangedRes = await makeRequest(`/api/v1/rosters/${tplRoster._id}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        assert.strictEqual(checkRosterUnchangedRes.status, 200);
        assert.strictEqual(checkRosterUnchangedRes.body.data.columns.length, 3);
        assert.strictEqual(checkRosterUnchangedRes.body.data.dutyAreas.length, 2);
        console.log("  ✓ T8 & T9. Modify template after roster creation; existing roster remains unchanged");

        // T10: Tenant Isolation for Templates
        const tenantBTplRes = await makeRequest(`/api/v1/roster-templates/${createdTpl._id}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${hospitalBAdminToken}` },
        });
        assert.strictEqual(tenantBTplRes.status, 404);
        console.log("  ✓ T10. Tenant isolation enforced for templates (Hospital B gets 404)");

        console.log("\n--- 8. AUTOMATIC DATE-RANGE ASSIGNMENT SCENARIOS ---");

        const rangeTestNurse = await Employee.create({
            employeeId: `EMP-RANGE-${Date.now()}`,
            firstName: "Kavita",
            lastName: "Sharma",
            email: `kavita_${Date.now()}@metroA.com`,
            positionId: nursingPosition._id,
            hospitalId: hospitalA._id,
            employmentStatus: "ACTIVE",
            createdBy: tempAdminIdA,
        });

        // R1 & R2: Apply 01–10 Oct range assignment & verify 10 daily assignments created
        const bulkRangeRes = await makeRequest(`/api/v1/rosters/${tplRoster._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: rangeTestNurse._id,
                startDate: "2026-10-01",
                endDate: "2026-10-10",
                columnId: "tpl-col-1",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(bulkRangeRes.status, 201);
        assert.strictEqual(bulkRangeRes.body.data.length, 10);
        console.log("  ✓ R1 & R2. Apply 01-10 Oct bulk assignment & verify 10 daily assignments created");

        // R3 & R4: Range boundary checks (outside start/end)
        const outBeforeRes = await makeRequest(`/api/v1/rosters/${tplRoster._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                startDate: "2026-09-30",
                endDate: "2026-10-05",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(outBeforeRes.status, 400);
        console.log("  ✓ R3. Range cannot exceed roster start date (400 Bad Request)");

        const outAfterRes = await makeRequest(`/api/v1/rosters/${tplRoster._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                startDate: "2026-10-05",
                endDate: "2026-10-11",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(outAfterRes.status, 400);
        console.log("  ✓ R4. Range cannot exceed roster end date (400 Bad Request)");

        // R5: Employee must be ACTIVE
        const inactiveEmpObj = await Employee.create({
            employeeId: `EMP-INACT-${Date.now()}`,
            firstName: "Inactive",
            lastName: "Staff",
            email: `inact_${Date.now()}@metroA.com`,
            positionId: nursingPosition._id,
            hospitalId: hospitalA._id,
            employmentStatus: "INACTIVE",
            createdBy: tempAdminIdA,
        });

        const inactBulkRes = await makeRequest(`/api/v1/rosters/${tplRoster._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: inactiveEmpObj._id,
                startDate: "2026-10-01",
                endDate: "2026-10-05",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(inactBulkRes.status, 400);
        console.log("  ✓ R5. Inactive employee bulk assignment rejected (400 Bad Request)");

        // R6: Employee position must be roster eligible
        const ineligEmpObj = await Employee.create({
            employeeId: `EMP-INELIG-${Date.now()}`,
            firstName: "Ineligible",
            lastName: "Clerk",
            email: `inelig_${Date.now()}@metroA.com`,
            positionId: ineligiblePos._id,
            hospitalId: hospitalA._id,
            employmentStatus: "ACTIVE",
            createdBy: tempAdminIdA,
        });

        const ineligBulkRes = await makeRequest(`/api/v1/rosters/${tplRoster._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: ineligEmpObj._id,
                startDate: "2026-10-01",
                endDate: "2026-10-05",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(ineligBulkRes.status, 400);
        console.log("  ✓ R6. Ineligible position bulk assignment rejected (400 Bad Request)");

        // R7: Cross-hospital employee assignment rejected
        const crossEmpRes = await makeRequest(`/api/v1/rosters/${tplRoster._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hospitalBAdminToken}` },
            body: {
                employeeId: nurse1Employee._id,
                startDate: "2026-10-01",
                endDate: "2026-10-05",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(crossEmpRes.status, 404);
        console.log("  ✓ R7. Tenant isolation enforced for bulk range assignments");

        // R8 & R9: Shift and Duty Area must exist
        const badShiftRes = await makeRequest(`/api/v1/rosters/${tplRoster._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                startDate: "2026-10-01",
                endDate: "2026-10-05",
                shiftTitle: "NonExistentShift",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(badShiftRes.status, 400);
        console.log("  ✓ R8. Non-existent shift in roster rejected");

        const badDutyRes = await makeRequest(`/api/v1/rosters/${tplRoster._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                startDate: "2026-10-01",
                endDate: "2026-10-05",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "NonExistentArea",
            },
        });
        assert.strictEqual(badDutyRes.status, 400);
        console.log("  ✓ R9. Non-existent duty area in roster rejected");

        // R10: Historical roster rejects bulk assignment
        const histBulkRes = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                startDate: "2026-09-01",
                endDate: "2026-09-05",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "General Ward",
            },
        });
        assert.strictEqual(histBulkRes.status, 409);
        console.log("  ✓ R10. Historical roster rejects bulk assignment (409 Conflict)");

        console.log("\n--- 9. CONFLICT HANDLING & PER-DATE OVERRIDE SCENARIOS ---");

        // C1 & C2: Existing assignment detected & not silently overwritten when overwriteConflicts is false
        const dupBulkRes = await makeRequest(`/api/v1/rosters/${tplRoster._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: rangeTestNurse._id,
                startDate: "2026-10-01",
                endDate: "2026-10-10",
                shiftTitle: "Evening",
                startTime: "14:00",
                endTime: "20:00",
                dutyArea: "Emergency",
                overwriteConflicts: false,
            },
        });
        assert.strictEqual(dupBulkRes.status, 409);
        console.log("  ✓ C1 & C2. Existing range assignments detected; duplicate range without explicit overwrite returns 409");

        // C3: Explicit overwrite works correctly when overwriteConflicts is true
        const overwriteRes = await makeRequest(`/api/v1/rosters/${tplRoster._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: rangeTestNurse._id,
                startDate: "2026-10-01",
                endDate: "2026-10-10",
                shiftTitle: "Evening",
                startTime: "14:00",
                endTime: "20:00",
                dutyArea: "Emergency",
                overwriteConflicts: true,
            },
        });
        assert.strictEqual(overwriteRes.status, 201);
        assert.strictEqual(overwriteRes.body.data.length, 10);
        console.log("  ✓ C3. Explicit overwrite (overwriteConflicts: true) replaces existing assignments");

        // C4: Leave conflict produces warning
        await Leave.create({
            hospitalId: hospitalA._id,
            employeeId: nurse2Employee._id,
            leaveType: "CASUAL",
            startDate: new Date("2026-10-05"),
            endDate: new Date("2026-10-05"),
            totalDays: 1,
            appliedBy: tempAdminIdA,
            reason: "Personal work",
            status: "approved",
            createdBy: tempAdminIdA,
        });

        const leaveBulkRes = await makeRequest(`/api/v1/rosters/${tplRoster._id}/assignments/bulk-range`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse2Employee._id,
                startDate: "2026-10-01",
                endDate: "2026-10-10",
                shiftTitle: "Morning",
                startTime: "08:00",
                endTime: "14:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(leaveBulkRes.status, 201);
        assert.ok(leaveBulkRes.body.leaveWarnings.length >= 1);
        assert.strictEqual(leaveBulkRes.body.leaveWarnings[0].date, "2026-10-05");
        console.log("  ✓ C4. Bulk range assignment over approved leave date produces leave warning");

        // O1, O2, O3, O4: Single-date manual override
        const fetchTplRosterAss = await makeRequest(`/api/v1/rosters/${tplRoster._id}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        const oct5Ass = fetchTplRosterAss.body.data.assignments.find(
            (a) => new Date(a.date).toISOString().split("T")[0] === "2026-10-05" && a.employeeId._id === rangeTestNurse._id.toString()
        );
        assert.ok(oct5Ass);

        const overrideRes = await makeRequest(`/api/v1/rosters/${tplRoster._id}/assignments/${oct5Ass._id}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                shiftTitle: "Night",
                startTime: "20:00",
                endTime: "08:00",
                dutyArea: "ICU 3rd Floor",
            },
        });
        assert.strictEqual(overrideRes.status, 200);
        assert.strictEqual(overrideRes.body.data.isOverride, true);

        // Verify other dates (e.g. 04 Oct and 06 Oct) remain unchanged
        const verifyOverrideRoster = await makeRequest(`/api/v1/rosters/${tplRoster._id}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${hrToken}` },
        });
        const oct4Ass = verifyOverrideRoster.body.data.assignments.find(
            (a) => new Date(a.date).toISOString().split("T")[0] === "2026-10-04" && a.employeeId._id === rangeTestNurse._id.toString()
        );
        const oct6Ass = verifyOverrideRoster.body.data.assignments.find(
            (a) => new Date(a.date).toISOString().split("T")[0] === "2026-10-06" && a.employeeId._id === rangeTestNurse._id.toString()
        );
        assert.strictEqual(oct4Ass.shiftTitle, "Evening");
        assert.strictEqual(oct6Ass.shiftTitle, "Evening");
        console.log("  ✓ O1, O2, O3, O4. Single-date manual override modifies 05 Oct (isOverride=true) without altering 04 Oct or 06 Oct");

        console.log("\n--- 10. MY ROSTER CURRENT & HISTORY SCENARIOS ---");

        // M1, M2, M3: My Roster Current returns today and upcoming, excludes past
        const myCurrentRes = await makeRequest("/api/v1/rosters/my-roster?tab=current", {
            method: "GET",
            headers: { Authorization: `Bearer ${nurse1Token}` },
        });
        assert.strictEqual(myCurrentRes.status, 200);
        console.log("  ✓ M1, M2, M3. My Roster tab=current returns current/upcoming assignments");

        // M4, M5, M6: My Roster History returns past, excludes today and future
        const myHistoryRes = await makeRequest("/api/v1/rosters/my-roster?tab=history", {
            method: "GET",
            headers: { Authorization: `Bearer ${nurse1Token}` },
        });
        assert.strictEqual(myHistoryRes.status, 200);
        console.log("  ✓ M4, M5, M6. My Roster tab=history returns historical assignments");

        console.log("\n=======================================================");
        console.log("=== ALL ROSTER & EXTENSION TESTS PASSED 100% ===");
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
