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
                title: "September 11 to 20 Nursing Schedule",
                startDate: "2026-09-11",
                endDate: "2026-09-20",
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
        assert.strictEqual(res1.body.data.title, "September 11 to 20 Nursing Schedule");
        assert.strictEqual(res1.body.data.columns.length, 3);
        assert.strictEqual(res1.body.data.dutyAreas.length, 4);
        createdRosterId = res1.body.data._id;
        console.log("  ✓ 1. Authorized HR can create a Roster Draft directly with custom columns & duty areas");

        // 2. Unauthorized Roster Creation
        const res2 = await makeRequest("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${nurse2Token}` },
            body: { title: "Unauthorized Roster", startDate: "2026-09-11", endDate: "2026-09-20", columns: [], dutyAreas: [] },
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

        console.log("\n--- 3. SINGLE ASSIGNMENT & DOUBLE-BOOKING PREVENTION SCENARIOS ---");

        // DB 1: Employee can be assigned once on a date -> 201 PASS
        const dbRes1 = await makeRequest(`/api/v1/rosters/${createdRosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${hrToken}` },
            body: {
                employeeId: nurse1Employee._id,
                date: "2026-09-15",
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
                date: "2026-09-15",
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
                date: "2026-09-15",
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
                date: "2026-09-16",
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
                date: "2026-09-11",
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
                notes: "Updated notes for 15 Sep assignment",
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
                date: "2026-09-15",
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
                date: "2026-09-15",
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
                date: "2026-09-15",
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

        // 2. Fetch Roster History -> September Roster appears in history, October does not
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
