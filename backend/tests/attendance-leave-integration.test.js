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
const { LEAVE_STATUSES } = require("../src/constants/leave.constants");

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
    console.log("=== HR ATTENDANCE & LEAVE INTEGRATION TEST SUITE ===");
    console.log("=======================================================\n");

    const testTimestamp = Date.now();
    const passwordHash = await hashPassword("TestPass@123");

    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI);
        }

        const testPort = 54100 + Math.floor(Math.random() * 500);
        server = http.createServer(app);
        await new Promise((resolve) => server.listen(testPort, resolve));
        baseUrl = `http://localhost:${testPort}`;
        console.log(`Server running on ${baseUrl}\n`);

        const creatorIdA = new mongoose.Types.ObjectId();
        const creatorIdB = new mongoose.Types.ObjectId();

        // Create Seed Data: Hospital A & Hospital B
        const hospitalA = await Hospital.create({
            name: `Hospital A ${testTimestamp}`,
            code: `HOSA_${testTimestamp}`,
            contactEmail: `adminA_${testTimestamp}@hospa.com`,
            contactPhone: "9998887770",
            createdBy: creatorIdA,
        });

        const hospitalB = await Hospital.create({
            name: `Hospital B ${testTimestamp}`,
            code: `HOSB_${testTimestamp}`,
            contactEmail: `adminB_${testTimestamp}@hospb.com`,
            contactPhone: "9998887771",
            createdBy: creatorIdB,
        });

        // Positions
        const posHR = await Position.create({
            name: "HR",
            code: `HR_${testTimestamp}`,
            hospitalId: hospitalA._id,
            status: "active",
        });

        const posNurse = await Position.create({
            name: "Nurse",
            code: `NRS_${testTimestamp}`,
            hospitalId: hospitalA._id,
            status: "active",
        });

        // HR User (Neha Jha scenario)
        const hrUserId = new mongoose.Types.ObjectId();
        const hrEmpId = new mongoose.Types.ObjectId();

        const hrUser = await User.create({
            _id: hrUserId,
            name: "Neha Jha",
            email: `neha_${testTimestamp}@hospa.com`,
            password: passwordHash,
            role: "employee",
            hospitalId: hospitalA._id,
            employeeId: hrEmpId,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [
                PERMISSIONS.ATTENDANCE_VIEW,
                PERMISSIONS.LEAVE_VIEW_OWN,
                PERMISSIONS.LEAVE_VIEW_WORKFORCE,
            ],
        });

        const hrEmployee = await Employee.create({
            _id: hrEmpId,
            employeeId: `EMP_HR_${testTimestamp}`,
            firstName: "Neha",
            lastName: "Jha",
            email: hrUser.email,
            hospitalId: hospitalA._id,
            userId: hrUserId,
            positionId: posHR._id,
            employmentStatus: "ACTIVE",
            createdBy: creatorIdA,
        });

        const hrToken = generateToken({ id: hrUser._id.toString(), role: hrUser.role, hospitalId: hospitalA._id });

        // Staff Employee in Hospital A
        const staffUserId = new mongoose.Types.ObjectId();
        const staffEmpId = new mongoose.Types.ObjectId();

        const staffUser = await User.create({
            _id: staffUserId,
            name: "Staff Nurse",
            email: `nurse_${testTimestamp}@hospa.com`,
            password: passwordHash,
            role: "employee",
            hospitalId: hospitalA._id,
            employeeId: staffEmpId,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.LEAVE_VIEW_OWN],
        });

        const staffEmployee = await Employee.create({
            _id: staffEmpId,
            employeeId: `EMP_NRS_${testTimestamp}`,
            firstName: "Staff",
            lastName: "Nurse",
            email: staffUser.email,
            hospitalId: hospitalA._id,
            userId: staffUserId,
            positionId: posNurse._id,
            employmentStatus: "ACTIVE",
            createdBy: creatorIdA,
        });

        // User in Hospital B (for cross-hospital leakage test)
        const userBId = new mongoose.Types.ObjectId();
        const userB = await User.create({
            _id: userBId,
            name: "Hospital B User",
            email: `userb_${testTimestamp}@hospb.com`,
            password: passwordHash,
            role: "employee",
            hospitalId: hospitalB._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.LEAVE_VIEW_OWN],
        });

        console.log("--- TC-ATT-LEAVE-001: Paginated API response structure ---");
        {
            const res = await request("/api/v1/hrms/leaves/my", {
                headers: { Authorization: `Bearer ${hrToken}` },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.strictEqual(typeof res.body.data, "object");
            assert.ok(Array.isArray(res.body.data.leaves), "data.leaves should be an array");
            assert.ok("total" in res.body.data, "data should contain total");
            assert.ok("page" in res.body.data, "page should exist");
            assert.ok("limit" in res.body.data, "limit should exist");
            assert.ok("totalPages" in res.body.data, "totalPages should exist");
            console.log("  ✓ TC-ATT-LEAVE-001 Passed: API returns paginated envelope with data.leaves array.");
        }

        console.log("--- TC-ATT-LEAVE-002: Empty leave response ---");
        {
            const res = await request("/api/v1/hrms/leaves/my", {
                headers: { Authorization: `Bearer ${hrToken}` },
            });
            assert.strictEqual(res.status, 200);
            assert.deepStrictEqual(res.body.data.leaves, []);
            assert.strictEqual(res.body.data.total, 0);
            console.log("  ✓ TC-ATT-LEAVE-002 Passed: Empty leave response returns empty array in envelope.");
        }

        console.log("--- TC-ATT-LEAVE-003: HR identity resolution & tenant isolation ---");
        {
            const leaveHospB = await Leave.create({
                hospitalId: hospitalB._id,
                employeeId: new mongoose.Types.ObjectId(),
                leaveType: "CASUAL",
                startDate: new Date("2026-10-07T00:00:00.000Z"),
                endDate: new Date("2026-10-07T23:59:59.999Z"),
                totalDays: 1,
                reason: "Hospital B leave",
                status: LEAVE_STATUSES.APPROVED,
                appliedBy: userB._id,
            });

            const res = await request("/api/v1/hrms/leaves", {
                headers: { Authorization: `Bearer ${hrToken}` },
            });
            assert.strictEqual(res.status, 200);
            const returnedLeaves = res.body.data.leaves;
            const containsHospBLeave = returnedLeaves.some((l) => l._id.toString() === leaveHospB._id.toString());
            assert.strictEqual(containsHospBLeave, false, "HR must not see leaves from another hospital");
            console.log("  ✓ TC-ATT-LEAVE-003 Passed: Cross-hospital tenant isolation preserved.");
        }

        console.log("--- TC-ATT-LEAVE-004: Employee leave visibility for HR ---");
        {
            const staffLeave = await Leave.create({
                hospitalId: hospitalA._id,
                employeeId: staffEmployee._id,
                leaveType: "ANNUAL",
                startDate: new Date("2026-10-07T00:00:00.000Z"),
                endDate: new Date("2026-10-07T23:59:59.999Z"),
                totalDays: 1,
                reason: "Staff leave",
                status: LEAVE_STATUSES.APPROVED,
                appliedBy: staffUser._id,
            });

            const res = await request("/api/v1/hrms/leaves", {
                headers: { Authorization: `Bearer ${hrToken}` },
            });
            assert.strictEqual(res.status, 200);
            const leaves = res.body.data.leaves;
            const found = leaves.find((l) => l._id.toString() === staffLeave._id.toString());
            assert.ok(found, "HR should see workforce leave");
            assert.strictEqual(found.employeeId._id.toString(), staffEmployee._id.toString());
            console.log("  ✓ TC-ATT-LEAVE-004 Passed: Authorized HR can view workforce leaves.");
        }

        console.log("--- TC-ATT-LEAVE-005 & TC-ATT-LEAVE-006: October 7 single-day and inclusive date range ---");
        {
            const oct7SingleLeave = await Leave.create({
                hospitalId: hospitalA._id,
                employeeId: hrEmployee._id,
                leaveType: "SICK",
                startDate: new Date("2026-10-07T00:00:00.000Z"),
                endDate: new Date("2026-10-07T23:59:59.999Z"),
                totalDays: 1,
                reason: "Oct 7 Single Day",
                status: LEAVE_STATUSES.APPROVED,
                appliedBy: hrUser._id,
            });

            const octRangeLeave = await Leave.create({
                hospitalId: hospitalA._id,
                employeeId: hrEmployee._id,
                leaveType: "CASUAL",
                startDate: new Date("2026-10-06T00:00:00.000Z"),
                endDate: new Date("2026-10-08T23:59:59.999Z"),
                totalDays: 3,
                reason: "Oct 6-8 Range",
                status: LEAVE_STATUSES.APPROVED,
                appliedBy: hrUser._id,
            });

            const res = await request("/api/v1/hrms/leaves/my", {
                headers: { Authorization: `Bearer ${hrToken}` },
            });
            assert.strictEqual(res.status, 200);
            const myLeaves = res.body.data.leaves;

            const singleLeave = myLeaves.find((l) => l._id.toString() === oct7SingleLeave._id.toString());
            assert.ok(singleLeave, "Oct 7 single-day leave retrieved");
            assert.strictEqual(new Date(singleLeave.startDate).toISOString().split("T")[0], "2026-10-07");

            const rangeLeave = myLeaves.find((l) => l._id.toString() === octRangeLeave._id.toString());
            assert.ok(rangeLeave, "Inclusive range leave retrieved");
            assert.strictEqual(new Date(rangeLeave.startDate).toISOString().split("T")[0], "2026-10-06");
            assert.strictEqual(new Date(rangeLeave.endDate).toISOString().split("T")[0], "2026-10-08");

            console.log("  ✓ TC-ATT-LEAVE-005 & TC-ATT-LEAVE-006 Passed: Date range stored and formatted correctly.");
        }

        console.log("--- TC-ATT-LEAVE-007: Non-approved leave filtering ---");
        {
            const pendingLeave = await Leave.create({
                hospitalId: hospitalA._id,
                employeeId: hrEmployee._id,
                leaveType: "CASUAL",
                startDate: new Date("2026-10-15T00:00:00.000Z"),
                endDate: new Date("2026-10-15T23:59:59.999Z"),
                totalDays: 1,
                reason: "Pending leave",
                status: LEAVE_STATUSES.PENDING,
                appliedBy: hrUser._id,
            });

            const res = await request("/api/v1/hrms/leaves/my?status=approved", {
                headers: { Authorization: `Bearer ${hrToken}` },
            });
            assert.strictEqual(res.status, 200);
            const approvedLeaves = res.body.data.leaves;
            const containsPending = approvedLeaves.some((l) => l._id.toString() === pendingLeave._id.toString());
            assert.strictEqual(containsPending, false, "Pending leave must not be in approved filter");
            console.log("  ✓ TC-ATT-LEAVE-007 Passed: Status filtering isolates non-approved leaves.");
        }

        console.log("--- TC-ATT-LEAVE-008: Error handling ---");
        {
            const res = await request("/api/v1/hrms/leaves/my");
            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.body.success, false);
            console.log("  ✓ TC-ATT-LEAVE-008 Passed: Unauthorized access returns 401 error.");
        }

        console.log("--- TC-ATT-LEAVE-009: Regression ---");
        {
            const res = await request("/api/v1/hrms/leaves/balance", {
                headers: { Authorization: `Bearer ${hrToken}` },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.success, true);
            assert.ok(Array.isArray(res.body.data.balances));
            console.log("  ✓ TC-ATT-LEAVE-009 Passed: Leave balance endpoint works without regression.");
        }

        console.log("\nAll HR Attendance & Leave Integration tests passed successfully!\n");
    } finally {
        if (server) {
            server.close();
        }
        await mongoose.disconnect();
    }
};

runTests().catch((err) => {
    console.error("Test failure:", err);
    process.exit(1);
});
