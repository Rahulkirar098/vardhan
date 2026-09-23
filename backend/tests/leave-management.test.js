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
    console.log("=== VARDHAN PHASE 7 LEAVE MANAGEMENT TEST SUITE ===");
    console.log("=======================================================\n");

    const testTimestamp = Date.now();
    const passwordHash = await hashPassword("TestPass@123");

    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI);
        }

        const testPort = 53100 + Math.floor(Math.random() * 500);
        server = http.createServer(app);
        await new Promise((resolve) => server.listen(testPort, resolve));
        baseUrl = `http://localhost:${testPort}`;
        console.log(`Server started on ${baseUrl}\n`);

        // ─── SETUP SEED DATA ────────────────────────────────────────────────
        const adminAId = new mongoose.Types.ObjectId();
        const hrUserId = new mongoose.Types.ObjectId();
        const staffUserId = new mongoose.Types.ObjectId();
        const inactiveUserId = new mongoose.Types.ObjectId();
        const adminBId = new mongoose.Types.ObjectId();

        // Hospital A
        const hospitalA = await Hospital.create({
            name: `Apex Hospital A ${testTimestamp}`,
            code: `HOSA_${testTimestamp}`,
            contactEmail: `adminA_${testTimestamp}@hospital.com`,
            contactPhone: "9876543210",
            createdBy: adminAId,
        });

        // Admin A User
        const adminA = await User.create({
            _id: adminAId,
            name: `Admin A ${testTimestamp}`,
            email: `adminA_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "admin",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms", "hospital_structure"],
            permissions: [],
        });
        const adminAToken = generateToken({ id: adminA._id.toString(), role: "admin", hospitalId: hospitalA._id });

        // Positions in Hospital A
        const posHR = await Position.create({
            name: `HR Manager ${testTimestamp}`,
            code: `HRM_${testTimestamp}`,
            hospitalId: hospitalA._id,
            status: "active",
            defaultModules: ["core", "hrms"],
        });

        const posNurse = await Position.create({
            name: `Staff Nurse ${testTimestamp}`,
            code: `NRS_${testTimestamp}`,
            hospitalId: hospitalA._id,
            status: "active",
            defaultModules: ["core", "hrms"],
        });

        // HR Manager User & Employee in Hospital A
        const hrUser = await User.create({
            _id: hrUserId,
            name: `HR Manager ${testTimestamp}`,
            email: `hr_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [
                PERMISSIONS.EMPLOYEE_VIEW,
                PERMISSIONS.LEAVE_APPLY,
                PERMISSIONS.LEAVE_VIEW_OWN,
                PERMISSIONS.LEAVE_VIEW,
                PERMISSIONS.LEAVE_APPROVE,
            ],
        });

        const hrEmployee = await Employee.create({
            employeeId: `EMP_HR_${testTimestamp}`,
            firstName: "Hannah",
            lastName: "Rostova",
            email: `hr_${testTimestamp}@hospital.com`,
            positionId: posHR._id,
            hospitalId: hospitalA._id,
            userId: hrUser._id,
            employmentStatus: "ACTIVE",
            createdBy: adminA._id,
        });

        hrUser.employeeId = hrEmployee._id;
        await hrUser.save();
        const hrToken = generateToken({ id: hrUser._id.toString(), role: "employee", hospitalId: hospitalA._id });

        // Staff Nurse User & Employee in Hospital A
        const staffUser = await User.create({
            _id: staffUserId,
            name: `Staff Nurse ${testTimestamp}`,
            email: `staff_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.LEAVE_APPLY, PERMISSIONS.LEAVE_VIEW_OWN],
        });

        const staffEmployee = await Employee.create({
            employeeId: `EMP_STF_${testTimestamp}`,
            firstName: "Sam",
            lastName: "Fisher",
            email: `staff_${testTimestamp}@hospital.com`,
            positionId: posNurse._id,
            hospitalId: hospitalA._id,
            userId: staffUser._id,
            employmentStatus: "ACTIVE",
            createdBy: adminA._id,
        });

        staffUser.employeeId = staffEmployee._id;
        await staffUser.save();
        const staffToken = generateToken({ id: staffUser._id.toString(), role: "employee", hospitalId: hospitalA._id });

        // Inactive Employee in Hospital A
        const inactiveUser = await User.create({
            _id: inactiveUserId,
            name: `Inactive Staff ${testTimestamp}`,
            email: `inactive_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.LEAVE_APPLY, PERMISSIONS.LEAVE_VIEW_OWN],
        });

        const inactiveEmployee = await Employee.create({
            employeeId: `EMP_INA_${testTimestamp}`,
            firstName: "Ian",
            lastName: "Inactive",
            email: `inactive_${testTimestamp}@hospital.com`,
            positionId: posNurse._id,
            hospitalId: hospitalA._id,
            userId: inactiveUser._id,
            employmentStatus: "INACTIVE",
            createdBy: adminA._id,
        });
        inactiveUser.employeeId = inactiveEmployee._id;
        await inactiveUser.save();
        const inactiveToken = generateToken({ id: inactiveUser._id.toString(), role: "employee", hospitalId: hospitalA._id });

        // Hospital B (for Tenant Isolation testing)
        const hospitalB = await Hospital.create({
            name: `Metro Hospital B ${testTimestamp}`,
            code: `HOSB_${testTimestamp}`,
            contactEmail: `adminB_${testTimestamp}@hospital.com`,
            contactPhone: "9876543211",
            createdBy: adminBId,
        });

        const adminB = await User.create({
            _id: adminBId,
            name: `Admin B ${testTimestamp}`,
            email: `adminB_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "admin",
            hospitalId: hospitalB._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [],
        });
        const adminBToken = generateToken({ id: adminB._id.toString(), role: "admin", hospitalId: hospitalB._id });

        console.log("Setup completed successfully. Running Leave test scenarios...\n");

        let leave1Id = null;
        let hrLeaveId = null;

        // ─── 1. APPLY LEAVE SCENARIOS ─────────────────────────────────────────
        console.log("--- 1. APPLY LEAVE SCENARIOS ---");

        // Test 1: Staff Employee applies for valid Casual Leave
        {
            const res = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${staffToken}` },
                body: {
                    leaveType: "CASUAL",
                    startDate: "2026-10-10",
                    endDate: "2026-10-12",
                    reason: "Family gathering",
                },
            });
            assert.strictEqual(res.status, 201, `Expected 201 Created but got ${res.status}: ${JSON.stringify(res.body)}`);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(res.body.data.leave.totalDays, 3);
            assert.strictEqual(res.body.data.leave.status, "pending");
            assert.strictEqual(res.body.data.leave.leaveType, "CASUAL");
            leave1Id = res.body.data.leave._id;
            console.log("  ✓ 1. Staff Employee applies for valid Casual Leave (totalDays calculated = 3)");
        }

        // Test 2: Employee cannot apply for leave on behalf of another employee
        {
            const res = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${staffToken}` },
                body: {
                    employeeId: hrEmployee._id.toString(),
                    leaveType: "SICK",
                    startDate: "2026-11-01",
                    endDate: "2026-11-02",
                    reason: "Unauthorized attempt",
                },
            });
            assert.strictEqual(res.status, 403, `Expected 403 Forbidden but got ${res.status}`);
            assert.strictEqual(res.body.success, false);
            console.log("  ✓ 2. Employee cannot apply for leave for another employee (403 Forbidden)");
        }

        // Test 3: Overlapping active leave is rejected with 409 Conflict
        {
            const res = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${staffToken}` },
                body: {
                    leaveType: "SICK",
                    startDate: "2026-10-11", // overlaps with 2026-10-10 to 2026-10-12
                    endDate: "2026-10-14",
                    reason: "Overlapping sick leave",
                },
            });
            assert.strictEqual(res.status, 409, `Expected 409 Conflict but got ${res.status}`);
            assert.strictEqual(res.body.success, false);
            console.log("  ✓ 3. Overlapping active leave request rejected with 409 Conflict");
        }

        // Test 4: End date before start date is rejected with 400 Bad Request
        {
            const res = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${staffToken}` },
                body: {
                    leaveType: "ANNUAL",
                    startDate: "2026-12-10",
                    endDate: "2026-12-05",
                    reason: "Invalid dates",
                },
            });
            assert.strictEqual(res.status, 400, `Expected 400 Bad Request but got ${res.status}`);
            assert.strictEqual(res.body.success, false);
            console.log("  ✓ 4. End date before start date rejected with 400 Bad Request");
        }

        // Test 5: Inactive employee cannot apply for leave
        {
            const res = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${inactiveToken}` },
                body: {
                    leaveType: "CASUAL",
                    startDate: "2026-12-01",
                    endDate: "2026-12-02",
                    reason: "Inactive application",
                },
            });
            assert.strictEqual(res.status, 403, `Expected 403 Forbidden for inactive employee but got ${res.status}`);
            console.log("  ✓ 5. Inactive employee cannot apply for leave (403 Forbidden)");
        }

        // ─── 2. VIEWING LEAVES ────────────────────────────────────────────────
        console.log("\n--- 2. VIEWING LEAVES ---");

        // Test 6: Employee can view own leaves (/my)
        {
            const res = await request("/api/v1/hrms/leaves/my", {
                headers: { Authorization: `Bearer ${staffToken}` },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert(Array.isArray(res.body.data.leaves));
            assert.strictEqual(res.body.data.leaves.length, 1);
            console.log("  ✓ 6. Employee can view own leaves (/my)");
        }

        // Test 7: Authorized HR Manager / Admin can view hospital leave list & stats
        {
            const listRes = await request("/api/v1/hrms/leaves", {
                headers: { Authorization: `Bearer ${hrToken}` },
            });
            assert.strictEqual(listRes.status, 200);
            assert(listRes.body.data.leaves.length >= 1);

            const statsRes = await request("/api/v1/hrms/leaves/stats", {
                headers: { Authorization: `Bearer ${adminAToken}` },
            });
            assert.strictEqual(statsRes.status, 200);
            assert.strictEqual(statsRes.body.data.stats.pending, 1);
            console.log("  ✓ 7. Authorized HR / Admin can view hospital leave list and stats");
        }

        // ─── 3. APPROVAL & SELF-PROTECTION RULES ──────────────────────────────
        console.log("\n--- 3. APPROVAL & SELF-PROTECTION RULES ---");

        // HR applies for their own leave
        {
            const res = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${hrToken}` },
                body: {
                    leaveType: "ANNUAL",
                    startDate: "2026-11-15",
                    endDate: "2026-11-18",
                    reason: "HR Vacation",
                },
            });
            assert.strictEqual(res.status, 201);
            hrLeaveId = res.body.data.leave._id;
        }

        // Test 8: Normal employee without leave.approve cannot approve leave
        {
            const res = await request(`/api/v1/hrms/leaves/${leave1Id}/approve`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${staffToken}` },
            });
            assert.strictEqual(res.status, 403, `Expected 403 Forbidden for unauthorized user`);
            console.log("  ✓ 8. User without leave.approve permission cannot approve leave (403 Forbidden)");
        }

        // Test 9: HR Manager CANNOT approve their OWN leave request (SELF-PROTECTION)
        {
            const res = await request(`/api/v1/hrms/leaves/${hrLeaveId}/approve`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${hrToken}` },
            });
            assert.strictEqual(res.status, 403, `Expected 403 Forbidden for self-approval`);
            assert.strictEqual(res.body.success, false);
            console.log("  ✓ 9. HR Manager cannot approve their OWN leave request (403 Forbidden - Self-Protection)");
        }

        // Test 10: HR Manager CANNOT reject their OWN leave request (SELF-PROTECTION)
        {
            const res = await request(`/api/v1/hrms/leaves/${hrLeaveId}/reject`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${hrToken}` },
                body: { rejectionReason: "Self reject test" },
            });
            assert.strictEqual(res.status, 403, `Expected 403 Forbidden for self-rejection`);
            console.log("  ✓ 10. HR Manager cannot reject their OWN leave request (403 Forbidden - Self-Protection)");
        }

        // Test 11: Authorized HR Manager can approve staff employee leave
        {
            const res = await request(`/api/v1/hrms/leaves/${leave1Id}/approve`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${hrToken}` },
            });
            assert.strictEqual(res.status, 200, `Expected 200 OK: ${JSON.stringify(res.body)}`);
            assert.strictEqual(res.body.data.leave.status, "approved");
            assert(res.body.data.leave.approvedBy);
            console.log("  ✓ 11. Authorized HR Manager can approve other employee leave");
        }

        // Test 12: Cannot re-approve an already approved leave (invalid status transition)
        {
            const res = await request(`/api/v1/hrms/leaves/${leave1Id}/approve`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${adminAToken}` },
            });
            assert.strictEqual(res.status, 400, "Expected 400 Bad Request for duplicate approval");
            console.log("  ✓ 12. Cannot approve an already approved leave (400 Bad Request)");
        }

        // ─── 4. REJECTION SCENARIOS ───────────────────────────────────────────
        console.log("\n--- 4. REJECTION SCENARIOS ---");

        // Staff applies for second leave
        let leave2Id = null;
        {
            const res = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${staffToken}` },
                body: {
                    leaveType: "EMERGENCY",
                    startDate: "2026-12-20",
                    endDate: "2026-12-21",
                    reason: "Emergency repair",
                },
            });
            assert.strictEqual(res.status, 201);
            leave2Id = res.body.data.leave._id;
        }

        // Test 13: Rejection requires a non-empty rejection reason
        {
            const res = await request(`/api/v1/hrms/leaves/${leave2Id}/reject`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${hrToken}` },
                body: { rejectionReason: "" },
            });
            assert.strictEqual(res.status, 400, "Expected 400 Bad Request on empty rejection reason");
            console.log("  ✓ 13. Rejection requires non-empty rejectionReason (400 Bad Request)");
        }

        // Test 14: Authorized user rejects leave with valid reason
        {
            const res = await request(`/api/v1/hrms/leaves/${leave2Id}/reject`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${hrToken}` },
                body: { rejectionReason: "Critical staffing shortage on ward" },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.leave.status, "rejected");
            assert.strictEqual(res.body.data.leave.rejectionReason, "Critical staffing shortage on ward");
            console.log("  ✓ 14. Authorized user rejects leave with reason stored");
        }

        // ─── 5. CANCELLATION SCENARIOS ────────────────────────────────────────
        console.log("\n--- 5. CANCELLATION SCENARIOS ---");

        // Staff applies for third leave
        let leave3Id = null;
        {
            const res = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${staffToken}` },
                body: {
                    leaveType: "UNPAID",
                    startDate: "2026-12-28",
                    endDate: "2026-12-29",
                    reason: "Personal travel",
                },
            });
            assert.strictEqual(res.status, 201);
            leave3Id = res.body.data.leave._id;
        }

        // Test 15: Another employee cannot cancel staff employee's leave
        {
            const anotherEmployeeUser = await User.create({
                name: `Other Staff ${testTimestamp}`,
                email: `other_${testTimestamp}@hospital.com`,
                password: passwordHash,
                role: "employee",
                hospitalId: hospitalA._id,
                status: "active",
                modules: ["core", "hrms"],
                permissions: [PERMISSIONS.LEAVE_APPLY],
            });
            const otherEmp = await Employee.create({
                employeeId: `EMP_OTH_${testTimestamp}`,
                firstName: "Other",
                lastName: "User",
                email: `other_${testTimestamp}@hospital.com`,
                positionId: posNurse._id,
                hospitalId: hospitalA._id,
                userId: anotherEmployeeUser._id,
                employmentStatus: "ACTIVE",
                createdBy: adminA._id,
            });
            anotherEmployeeUser.employeeId = otherEmp._id;
            await anotherEmployeeUser.save();
            const otherToken = generateToken({ id: anotherEmployeeUser._id.toString(), role: "employee", hospitalId: hospitalA._id });

            const res = await request(`/api/v1/hrms/leaves/${leave3Id}/cancel`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${otherToken}` },
            });
            assert.strictEqual(res.status, 403, "Expected 403 Forbidden when cancelling another's leave");
            console.log("  ✓ 15. Employee cannot cancel another employee's leave (403 Forbidden)");
        }

        // Test 16: Owner can cancel own pending leave
        {
            const res = await request(`/api/v1/hrms/leaves/${leave3Id}/cancel`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${staffToken}` },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.data.leave.status, "cancelled");
            console.log("  ✓ 16. Owner can cancel own pending leave");
        }

        // ─── 6. TENANT ISOLATION & SECURITY SCENARIOS ─────────────────────────
        console.log("\n--- 6. TENANT ISOLATION & SECURITY SCENARIOS ---");

        // Test 17: Hospital B user cannot view Hospital A leave (Tenant Isolation)
        {
            const res = await request(`/api/v1/hrms/leaves/${leave1Id}`, {
                headers: { Authorization: `Bearer ${adminBToken}` },
            });
            assert.strictEqual(res.status, 404, `Expected 404 Not Found for cross-hospital leave read`);
            console.log("  ✓ 17. Cross-hospital leave read returns 404 Not Found (Tenant Isolation)");
        }

        // Test 18: Hospital B user cannot approve Hospital A leave (Tenant Isolation)
        {
            const res = await request(`/api/v1/hrms/leaves/${hrLeaveId}/approve`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${adminBToken}` },
            });
            assert.strictEqual(res.status, 404, `Expected 404 Not Found for cross-hospital leave approve`);
            console.log("  ✓ 18. Cross-hospital leave approval returns 404 Not Found (Tenant Isolation)");
        }

        // Test 19: Invalid ObjectId returns 400 Bad Request cleanly without 500 error
        {
            const res = await request("/api/v1/hrms/leaves/invalid-mongo-id-1234", {
                headers: { Authorization: `Bearer ${adminAToken}` },
            });
            assert.strictEqual(res.status, 400, "Expected 400 Bad Request on invalid ObjectId");
            console.log("  ✓ 19. Invalid ObjectId returns 400 Bad Request cleanly (no unhandled 500)");
        }

        // ─── 7. PERMISSION GATING & ROLE/POSITION INDEPENDENCE SCENARIOS ───────
        console.log("\n--- 7. PERMISSION GATING & ROLE/POSITION INDEPENDENCE SCENARIOS ---");

        // Create test users for granular permission tests
        const zeroPermsUserId = new mongoose.Types.ObjectId();
        const zeroPermsUser = await User.create({
            _id: zeroPermsUserId,
            name: `Zero Perms User ${testTimestamp}`,
            email: `zeroperms_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [], // HRMS enabled, but 0 leave permissions
        });
        const zeroPermsEmp = await Employee.create({
            employeeId: `EMP_ZERO_${testTimestamp}`,
            firstName: "Zero",
            lastName: "Perms",
            email: `zeroperms_${testTimestamp}@hospital.com`,
            positionId: posNurse._id,
            hospitalId: hospitalA._id,
            userId: zeroPermsUser._id,
            employmentStatus: "ACTIVE",
            createdBy: adminA._id,
        });
        zeroPermsUser.employeeId = zeroPermsEmp._id;
        await zeroPermsUser.save();
        const zeroPermsToken = generateToken({ id: zeroPermsUser._id.toString(), role: "employee", hospitalId: hospitalA._id });

        // HR Manager with HRMS enabled but 0 leave permissions
        const zeroHRUserId = new mongoose.Types.ObjectId();
        const zeroHRUser = await User.create({
            _id: zeroHRUserId,
            name: `Zero Perms HR Manager ${testTimestamp}`,
            email: `zerohr_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.EMPLOYEE_VIEW], // Has HRMS, but NO leave permissions
        });
        const zeroHREmp = await Employee.create({
            employeeId: `EMP_ZEROHR_${testTimestamp}`,
            firstName: "Zero",
            lastName: "HR",
            email: `zerohr_${testTimestamp}@hospital.com`,
            positionId: posHR._id,
            hospitalId: hospitalA._id,
            userId: zeroHRUser._id,
            employmentStatus: "ACTIVE",
            createdBy: adminA._id,
        });
        zeroHRUser.employeeId = zeroHREmp._id;
        await zeroHRUser.save();
        const zeroHRToken = generateToken({ id: zeroHRUser._id.toString(), role: "employee", hospitalId: hospitalA._id });

        // Test 20: User with HRMS but zero Leave permissions receives 403 on all Leave APIs
        {
            const applyRes = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${zeroPermsToken}` },
                body: { leaveType: "CASUAL", startDate: "2026-12-01", endDate: "2026-12-02", reason: "Test" },
            });
            assert.strictEqual(applyRes.status, 403, `Expected 403 on POST /leaves for zero-perm user, got ${applyRes.status}`);

            const listRes = await request("/api/v1/hrms/leaves", {
                headers: { Authorization: `Bearer ${zeroPermsToken}` },
            });
            assert.strictEqual(listRes.status, 403, `Expected 403 on GET /leaves for zero-perm user, got ${listRes.status}`);

            const myRes = await request("/api/v1/hrms/leaves/my", {
                headers: { Authorization: `Bearer ${zeroPermsToken}` },
            });
            assert.strictEqual(myRes.status, 403, `Expected 403 on GET /leaves/my for zero-perm user, got ${myRes.status}`);

            const singleRes = await request(`/api/v1/hrms/leaves/${leave1Id}`, {
                headers: { Authorization: `Bearer ${zeroPermsToken}` },
            });
            assert.strictEqual(singleRes.status, 403, `Expected 403 on GET /leaves/:id for zero-perm user, got ${singleRes.status}`);

            const approveRes = await request(`/api/v1/hrms/leaves/${leave1Id}/approve`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${zeroPermsToken}` },
            });
            assert.strictEqual(approveRes.status, 403, `Expected 403 on PATCH /approve for zero-perm user, got ${approveRes.status}`);

            const cancelRes = await request(`/api/v1/hrms/leaves/${leave1Id}/cancel`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${zeroPermsToken}` },
            });
            assert.strictEqual(cancelRes.status, 403, `Expected 403 on PATCH /cancel for zero-perm user, got ${cancelRes.status}`);

            console.log("  ✓ 20. User with HRMS enabled but zero Leave permissions receives 403 Forbidden across all Leave APIs");
        }

        // Test 21: HR Manager without Leave permissions cannot access Leave APIs (Position != Permission)
        {
            const hrListRes = await request("/api/v1/hrms/leaves", {
                headers: { Authorization: `Bearer ${zeroHRToken}` },
            });
            assert.strictEqual(hrListRes.status, 403, "Expected 403 for HR Manager without leave.view");

            const hrApplyRes = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${zeroHRToken}` },
                body: { leaveType: "CASUAL", startDate: "2026-12-01", endDate: "2026-12-02", reason: "Test" },
            });
            assert.strictEqual(hrApplyRes.status, 403, "Expected 403 for HR Manager without leave.apply");

            const hrApproveRes = await request(`/api/v1/hrms/leaves/${leave1Id}/approve`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${zeroHRToken}` },
            });
            assert.strictEqual(hrApproveRes.status, 403, "Expected 403 for HR Manager without leave.approve");

            console.log("  ✓ 21. HR Manager without Leave permissions receives 403 (Position = HR Manager does NOT bypass permissions)");
        }

        // Test 22: Employee role does not grant default leave permissions
        {
            const empMyRes = await request("/api/v1/hrms/leaves/my", {
                headers: { Authorization: `Bearer ${zeroPermsToken}` },
            });
            assert.strictEqual(empMyRes.status, 403);
            console.log("  ✓ 22. Employee role without permissions cannot access Leave (role = employee does NOT grant default leave permissions)");
        }

        // Test 23: User with ONLY leave.apply
        {
            const applyOnlyUser = await User.create({
                name: `Apply Only User ${testTimestamp}`,
                email: `applyonly_${testTimestamp}@hospital.com`,
                password: passwordHash,
                role: "employee",
                hospitalId: hospitalA._id,
                status: "active",
                modules: ["core", "hrms"],
                permissions: [PERMISSIONS.LEAVE_APPLY],
            });
            const applyOnlyEmp = await Employee.create({
                employeeId: `EMP_APP_${testTimestamp}`,
                firstName: "Apply",
                lastName: "Only",
                email: `applyonly_${testTimestamp}@hospital.com`,
                positionId: posNurse._id,
                hospitalId: hospitalA._id,
                userId: applyOnlyUser._id,
                employmentStatus: "ACTIVE",
                createdBy: adminA._id,
            });
            applyOnlyUser.employeeId = applyOnlyEmp._id;
            await applyOnlyUser.save();
            const applyOnlyToken = generateToken({ id: applyOnlyUser._id.toString(), role: "employee", hospitalId: hospitalA._id });

            // Can apply
            const res = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${applyOnlyToken}` },
                body: { leaveType: "CASUAL", startDate: "2026-12-05", endDate: "2026-12-06", reason: "Apply test" },
            });
            assert.strictEqual(res.status, 201, `Expected 201 Created but got ${res.status}`);

            // Cannot view workforce leaves
            const listRes = await request("/api/v1/hrms/leaves", {
                headers: { Authorization: `Bearer ${applyOnlyToken}` },
            });
            assert.strictEqual(listRes.status, 403);

            // Cannot approve
            const appRes = await request(`/api/v1/hrms/leaves/${leave1Id}/approve`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${applyOnlyToken}` },
            });
            assert.strictEqual(appRes.status, 403);

            console.log("  ✓ 23. User with ONLY leave.apply can apply for leave but cannot view workforce leaves or approve");
        }

        // Test 24: User with ONLY leave.view_own
        {
            const viewOwnUser = await User.create({
                name: `View Own User ${testTimestamp}`,
                email: `viewown_${testTimestamp}@hospital.com`,
                password: passwordHash,
                role: "employee",
                hospitalId: hospitalA._id,
                status: "active",
                modules: ["core", "hrms"],
                permissions: [PERMISSIONS.LEAVE_VIEW_OWN],
            });
            const viewOwnEmp = await Employee.create({
                employeeId: `EMP_VWO_${testTimestamp}`,
                firstName: "View",
                lastName: "Own",
                email: `viewown_${testTimestamp}@hospital.com`,
                positionId: posNurse._id,
                hospitalId: hospitalA._id,
                userId: viewOwnUser._id,
                employmentStatus: "ACTIVE",
                createdBy: adminA._id,
            });
            viewOwnUser.employeeId = viewOwnEmp._id;
            await viewOwnUser.save();
            const viewOwnToken = generateToken({ id: viewOwnUser._id.toString(), role: "employee", hospitalId: hospitalA._id });

            // Can view own
            const myRes = await request("/api/v1/hrms/leaves/my", {
                headers: { Authorization: `Bearer ${viewOwnToken}` },
            });
            assert.strictEqual(myRes.status, 200);

            // Cannot apply
            const appRes = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${viewOwnToken}` },
                body: { leaveType: "CASUAL", startDate: "2026-12-05", endDate: "2026-12-06", reason: "Test" },
            });
            assert.strictEqual(appRes.status, 403);

            // Cannot view workforce leaves
            const listRes = await request("/api/v1/hrms/leaves", {
                headers: { Authorization: `Bearer ${viewOwnToken}` },
            });
            assert.strictEqual(listRes.status, 403);

            // Cannot view other employee's leave by ID
            const singleRes = await request(`/api/v1/hrms/leaves/${leave1Id}`, {
                headers: { Authorization: `Bearer ${viewOwnToken}` },
            });
            assert.strictEqual(singleRes.status, 403);

            console.log("  ✓ 24. User with ONLY leave.view_own can view own leaves but cannot apply, view workforce leaves, or view other's leave by ID");
        }

        // Test 25: User with ONLY leave.view
        {
            const viewUser = await User.create({
                name: `View User ${testTimestamp}`,
                email: `viewuser_${testTimestamp}@hospital.com`,
                password: passwordHash,
                role: "employee",
                hospitalId: hospitalA._id,
                status: "active",
                modules: ["core", "hrms"],
                permissions: [PERMISSIONS.LEAVE_VIEW],
            });
            const viewEmp = await Employee.create({
                employeeId: `EMP_VW_${testTimestamp}`,
                firstName: "View",
                lastName: "User",
                email: `viewuser_${testTimestamp}@hospital.com`,
                positionId: posNurse._id,
                hospitalId: hospitalA._id,
                userId: viewUser._id,
                employmentStatus: "ACTIVE",
                createdBy: adminA._id,
            });
            viewUser.employeeId = viewEmp._id;
            await viewUser.save();
            const viewToken = generateToken({ id: viewUser._id.toString(), role: "employee", hospitalId: hospitalA._id });

            // Can view workforce list
            const listRes = await request("/api/v1/hrms/leaves", {
                headers: { Authorization: `Bearer ${viewToken}` },
            });
            assert.strictEqual(listRes.status, 200);

            // Can view stats
            const statsRes = await request("/api/v1/hrms/leaves/stats", {
                headers: { Authorization: `Bearer ${viewToken}` },
            });
            assert.strictEqual(statsRes.status, 200);

            // Cannot apply
            const appRes = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${viewToken}` },
                body: { leaveType: "CASUAL", startDate: "2026-12-05", endDate: "2026-12-06", reason: "Test" },
            });
            assert.strictEqual(appRes.status, 403);

            // Cannot approve
            const aprRes = await request(`/api/v1/hrms/leaves/${leave1Id}/approve`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${viewToken}` },
            });
            assert.strictEqual(aprRes.status, 403);

            console.log("  ✓ 25. User with ONLY leave.view can view workforce leaves & stats but cannot apply or approve");
        }

        // Test 26: User with ONLY leave.approve
        {
            const approveUser = await User.create({
                name: `Approve User ${testTimestamp}`,
                email: `appruser_${testTimestamp}@hospital.com`,
                password: passwordHash,
                role: "employee",
                hospitalId: hospitalA._id,
                status: "active",
                modules: ["core", "hrms"],
                permissions: [PERMISSIONS.LEAVE_APPROVE],
            });
            const approveEmp = await Employee.create({
                employeeId: `EMP_APR_${testTimestamp}`,
                firstName: "Approve",
                lastName: "User",
                email: `appruser_${testTimestamp}@hospital.com`,
                positionId: posNurse._id,
                hospitalId: hospitalA._id,
                userId: approveUser._id,
                employmentStatus: "ACTIVE",
                createdBy: adminA._id,
            });
            approveUser.employeeId = approveEmp._id;
            await approveUser.save();
            const approveToken = generateToken({ id: approveUser._id.toString(), role: "employee", hospitalId: hospitalA._id });

            // Create a pending leave from staff
            const newLeaveRes = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${staffToken}` },
                body: { leaveType: "SICK", startDate: "2026-12-10", endDate: "2026-12-12", reason: "Sick leave test" },
            });
            assert.strictEqual(newLeaveRes.status, 201, `Expected 201 Created but got ${newLeaveRes.status}: ${JSON.stringify(newLeaveRes.body)}`);
            const pendingLeaveId = newLeaveRes.body.data.leave._id;

            // Can approve
            const appRes = await request(`/api/v1/hrms/leaves/${pendingLeaveId}/approve`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${approveToken}` },
            });
            assert.strictEqual(appRes.status, 200);
            assert.strictEqual(appRes.body.data.leave.status, "approved");

            // Cannot apply
            const applyRes = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${approveToken}` },
                body: { leaveType: "CASUAL", startDate: "2026-12-05", endDate: "2026-12-06", reason: "Test" },
            });
            assert.strictEqual(applyRes.status, 403);

            console.log("  ✓ 26. User with ONLY leave.approve can approve leave but cannot apply");
        }

        // Test 27: User with ONLY leave.manage (inherits apply, view_own, view, approve)
        {
            const manageUser = await User.create({
                name: `Manager User ${testTimestamp}`,
                email: `manuser_${testTimestamp}@hospital.com`,
                password: passwordHash,
                role: "employee",
                hospitalId: hospitalA._id,
                status: "active",
                modules: ["core", "hrms"],
                permissions: [PERMISSIONS.LEAVE_MANAGE],
            });
            const manageEmp = await Employee.create({
                employeeId: `EMP_MGR_${testTimestamp}`,
                firstName: "Manage",
                lastName: "User",
                email: `manuser_${testTimestamp}@hospital.com`,
                positionId: posNurse._id,
                hospitalId: hospitalA._id,
                userId: manageUser._id,
                employmentStatus: "ACTIVE",
                createdBy: adminA._id,
            });
            manageUser.employeeId = manageEmp._id;
            await manageUser.save();
            const manageToken = generateToken({ id: manageUser._id.toString(), role: "employee", hospitalId: hospitalA._id });

            // Inherits apply
            const appRes = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${manageToken}` },
                body: { leaveType: "CASUAL", startDate: "2026-12-25", endDate: "2026-12-26", reason: "Manage apply" },
            });
            assert.strictEqual(appRes.status, 201);

            // Inherits view_own
            const myRes = await request("/api/v1/hrms/leaves/my", {
                headers: { Authorization: `Bearer ${manageToken}` },
            });
            assert.strictEqual(myRes.status, 200);

            // Inherits view (workforce list)
            const listRes = await request("/api/v1/hrms/leaves", {
                headers: { Authorization: `Bearer ${manageToken}` },
            });
            assert.strictEqual(listRes.status, 200);

            // Inherits approve (for other employee's leave)
            const staffNewLeave = await request("/api/v1/hrms/leaves", {
                method: "POST",
                headers: { Authorization: `Bearer ${staffToken}` },
                body: { leaveType: "SICK", startDate: "2026-12-15", endDate: "2026-12-16", reason: "Sick" },
            });
            const staffLeaveId = staffNewLeave.body.data.leave._id;

            const aprRes = await request(`/api/v1/hrms/leaves/${staffLeaveId}/approve`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${manageToken}` },
            });
            assert.strictEqual(aprRes.status, 200);
            assert.strictEqual(aprRes.body.data.leave.status, "approved");

            console.log("  ✓ 27. User with ONLY leave.manage inherits leave.apply, leave.view_own, leave.view, and leave.approve");
        }

        console.log("\n=======================================================");
        console.log("=== ALL 27 LEAVE MANAGEMENT TESTS PASSED 100% ===");
        console.log("=======================================================\n");

        if (server) server.close();
        process.exit(0);
    } catch (err) {
        console.error("\n❌ TEST FAILED:", err);
        if (server) server.close();
        process.exit(1);
    }
};

runTests();

