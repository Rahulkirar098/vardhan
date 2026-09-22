const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
const assert = require("assert");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = require("../index");
const User = require("../src/models/user.model");
const Employee = require("../src/models/employee.model");
const Hospital = require("../src/models/hospital.model");
const Position = require("../src/models/position.model");
const Invitation = require("../src/models/invitation.model");
const { hashPassword } = require("../src/utils/password");
const { generateToken } = require("../src/utils/jwt");

let server;
let baseUrl;

const testTimestamp = Date.now();

const request = async (url, options = {}) => {
    const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

    const fetchOptions = {
        method: options.method || "GET",
        headers,
    };

    if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(fullUrl, fetchOptions);
    let data;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    return { status: response.status, body: data };
};

const runTests = async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    console.log(`\n=== Running HR Profile & Hospital Assignment Tests on port ${port} ===\n`);

    try {
        // Setup Hospital A & Admin A
        const passwordHash = await hashPassword("Test@1234");

        const adminA = await User.create({
            name: `Admin A ${testTimestamp}`,
            email: `admin_a_${testTimestamp}@test.com`,
            password: passwordHash,
            role: "admin",
            status: "active",
        });

        const hospitalA = await Hospital.create({
            name: `Hospital A ${testTimestamp}`,
            code: `HA${String(testTimestamp).slice(-5)}`,
            status: "active",
            createdBy: adminA._id,
        });

        adminA.hospitalId = hospitalA._id;
        await adminA.save();

        const positionA = await Position.create({
            hospitalId: hospitalA._id,
            name: `HR Lead ${testTimestamp}`,
            status: "active",
        });

        const tokenAdminA = generateToken({ id: adminA._id, role: adminA.role, hospitalId: hospitalA._id });

        // Setup Hospital B & Admin B (for isolation tests)
        const adminB = await User.create({
            name: `Admin B ${testTimestamp}`,
            email: `admin_b_${testTimestamp}@test.com`,
            password: passwordHash,
            role: "admin",
            status: "active",
        });

        const hospitalB = await Hospital.create({
            name: `Hospital B ${testTimestamp}`,
            code: `HB${String(testTimestamp).slice(-5)}`,
            status: "active",
            createdBy: adminB._id,
        });

        adminB.hospitalId = hospitalB._id;
        await adminB.save();

        // ─── Test 1: Existing HR Account (Shalu Jain) ─────────────────────────
        console.log("Test 1: Verifying existing HR (Shalu Jain) profile & hospital resolution...");
        const shaluUser = await User.findOne({ email: "salu@yopmail.com" });
        if (shaluUser) {
            const shaluToken = generateToken({ id: shaluUser._id, role: shaluUser.role, hospitalId: shaluUser.hospitalId });

            // 1a: GET /api/hr/me
            const hrMeRes = await request("/api/hr/me", {
                headers: { Authorization: `Bearer ${shaluToken}` },
            });
            assert.strictEqual(hrMeRes.status, 200, "Shalu /api/hr/me should return 200");
            assert.strictEqual(hrMeRes.body.success, true);
            assert.strictEqual(hrMeRes.body.data.email, "salu@yopmail.com");
            assert.strictEqual(hrMeRes.body.data.employeeId, "EMP002");
            assert.strictEqual(hrMeRes.body.data.position, "hr tt");
            assert.strictEqual(hrMeRes.body.data.role, "hr");
            assert.ok(hrMeRes.body.data.modules.includes("hrms"), "Shalu should have hrms module");
            assert.ok(hrMeRes.body.data.hospitalId, "Shalu should have hospitalId");
            assert.strictEqual(hrMeRes.body.data.hospitalId.name, "admin hospital");
            console.log("  ✓ /api/hr/me returns complete employee & hospital details for Shalu");

            // 1b: GET /api/hr/hospital
            const hrHospRes = await request("/api/hr/hospital", {
                headers: { Authorization: `Bearer ${shaluToken}` },
            });
            assert.strictEqual(hrHospRes.status, 200, "Shalu /api/hr/hospital should return 200");
            assert.strictEqual(hrHospRes.body.success, true);
            assert.strictEqual(hrHospRes.body.data.name, "admin hospital");
            assert.strictEqual(hrHospRes.body.data.code, "01");
            console.log("  ✓ /api/hr/hospital returns assigned hospital for Shalu");

            // 1c: GET /api/v1/hrms/employees/stats
            const statsRes = await request("/api/v1/hrms/employees/stats", {
                headers: { Authorization: `Bearer ${shaluToken}` },
            });
            assert.strictEqual(statsRes.status, 200, "Shalu /api/v1/hrms/employees/stats should return 200");
            assert.strictEqual(statsRes.body.success, true);
            assert.ok(statsRes.body.data.total >= 1, "Employee stats should return counts");
            console.log("  ✓ /api/v1/hrms/employees/stats accessible with HRMS module access");
        } else {
            console.log("  (Skipping Shalu check, user not found in DB)");
        }

        // ─── Test 2: New HR Invitation, Acceptance, and Login Flow ───────────
        console.log("\nTest 2: New HR Invitation -> Acceptance -> Login flow...");
        const newHREmail = `testhr_${testTimestamp}@example.com`;

        // 2a: Admin A invites new HR
        const inviteRes = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${tokenAdminA}` },
            body: {
                firstName: "Test",
                lastName: "HR",
                email: newHREmail,
                phone: "9876543210",
                positionId: positionA._id,
                role: "hr",
            },
        });
        assert.strictEqual(inviteRes.status, 201, "Admin should be able to invite new HR");
        console.log("  ✓ New HR invitation created");

        // 2b: Find invitation and retrieve rawToken hash
        const invitation = await Invitation.findOne({ email: newHREmail });
        assert.ok(invitation, "Invitation record must exist in DB");
        assert.strictEqual(invitation.role, "hr");
        assert.strictEqual(invitation.type, "HR");

        // 2c: Public accept invitation
        const { hashTokenValue } = require("../src/services/invitation.service");
        // Create mock rawToken match
        const crypto = require("crypto");
        const rawToken = crypto.randomBytes(32).toString("hex");
        invitation.tokenHash = hashTokenValue(rawToken);
        await invitation.save();

        const acceptRes = await request(`/api/v1/hrms/employee-invitations/${rawToken}/accept`, {
            method: "POST",
            body: { password: "Password@123" },
        });
        assert.strictEqual(acceptRes.status, 200, "New HR invitation acceptance should succeed");
        console.log("  ✓ New HR accepted invitation");

        // 2d: Verify User & Employee records after acceptance
        const createdHRUser = await User.findOne({ email: newHREmail });
        assert.ok(createdHRUser, "New HR User must exist");
        assert.strictEqual(createdHRUser.role, "hr", "User role must be hr");
        assert.ok(createdHRUser.modules.includes("hrms"), "New HR User must have hrms module");
        assert.ok(createdHRUser.employeeId, "New HR User must have employeeId linked");

        const createdHREmployee = await Employee.findOne({ email: newHREmail });
        assert.ok(createdHREmployee, "New HR Employee must exist");
        assert.strictEqual(createdHREmployee.userId.toString(), createdHRUser._id.toString(), "Employee.userId must match User._id");
        assert.strictEqual(createdHRUser.employeeId.toString(), createdHREmployee._id.toString(), "User.employeeId must match Employee._id");
        assert.strictEqual(createdHREmployee.hospitalId.toString(), hospitalA._id.toString(), "Employee.hospitalId must match Hospital._id");
        assert.strictEqual(createdHREmployee.positionId.toString(), positionA._id.toString(), "Employee.positionId must match Position._id");
        console.log("  ✓ Verified complete User <-> Employee <-> Hospital relationship chain");

        // 2e: New HR Login
        const hrLoginRes = await request("/api/v1/auth/login", {
            method: "POST",
            body: { email: newHREmail, password: "Password@123" },
        });
        assert.strictEqual(hrLoginRes.status, 200, "New HR login should succeed");
        const newHRToken = hrLoginRes.body.data.token;
        assert.ok(hrLoginRes.body.data.user.modules.includes("hrms"), "Login response includes hrms module");
        assert.strictEqual(hrLoginRes.body.data.user.employeeId.toString(), createdHREmployee._id.toString());
        console.log("  ✓ New HR login successful with hrms module & employeeId");

        // 2f: New HR GET /api/hr/me
        const newHRMeRes = await request("/api/hr/me", {
            headers: { Authorization: `Bearer ${newHRToken}` },
        });
        assert.strictEqual(newHRMeRes.status, 200, "New HR /api/hr/me should return 200");
        assert.strictEqual(newHRMeRes.body.data.name, "Test HR");
        assert.strictEqual(newHRMeRes.body.data.position, `HR Lead ${testTimestamp}`);
        assert.strictEqual(newHRMeRes.body.data.hospitalName, `Hospital A ${testTimestamp}`);
        console.log("  ✓ New HR /api/hr/me resolves profile, position, and hospital");

        // 2g: New HR GET /api/hr/hospital
        const newHRHospRes = await request("/api/hr/hospital", {
            headers: { Authorization: `Bearer ${newHRToken}` },
        });
        assert.strictEqual(newHRHospRes.status, 200, "New HR /api/hr/hospital should return 200");
        assert.strictEqual(newHRHospRes.body.data.name, `Hospital A ${testTimestamp}`);
        console.log("  ✓ New HR /api/hr/hospital returns assigned hospital");

        // 2h: New HR GET /api/v1/hrms/employees/stats
        const newHRStatsRes = await request("/api/v1/hrms/employees/stats", {
            headers: { Authorization: `Bearer ${newHRToken}` },
        });
        assert.strictEqual(newHRStatsRes.status, 200, "New HR can access employee stats");
        console.log("  ✓ New HR employee stats accessible");

        // ─── Test 3: Normal Employee Flow (No Regressions) ────────────────────
        console.log("\nTest 3: Normal Employee Invitation -> Acceptance -> Login flow...");
        const empEmail = `staff_nurse_${testTimestamp}@example.com`;

        const empInviteRes = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${tokenAdminA}` },
            body: {
                firstName: "Staff",
                lastName: "Nurse",
                email: empEmail,
                positionId: positionA._id,
                role: "employee",
            },
        });
        assert.strictEqual(empInviteRes.status, 201, "Admin should invite employee");

        const empInvitation = await Invitation.findOne({ email: empEmail });
        const empRawToken = crypto.randomBytes(32).toString("hex");
        empInvitation.tokenHash = hashTokenValue(empRawToken);
        await empInvitation.save();

        const empAcceptRes = await request(`/api/v1/hrms/employee-invitations/${empRawToken}/accept`, {
            method: "POST",
            body: { password: "Password@123" },
        });
        assert.strictEqual(empAcceptRes.status, 200, "Employee invitation accept should succeed");

        const empLoginRes = await request("/api/v1/auth/login", {
            method: "POST",
            body: { email: empEmail, password: "Password@123" },
        });
        assert.strictEqual(empLoginRes.status, 200, "Employee login should succeed");
        assert.strictEqual(empLoginRes.body.data.user.role, "employee");
        console.log("  ✓ Normal Employee onboarding and login works perfectly");

        // ─── Test 4: Hospital Isolation ───────────────────────────────────────
        console.log("\nTest 4: Hospital Isolation...");
        // New HR of Hospital A cannot access Hospital B's structure or HR profiles
        const crossHospRes = await request(`/api/v1/hospitals/${hospitalB._id}/floors`, {
            headers: { Authorization: `Bearer ${newHRToken}` },
        });
        assert.strictEqual(crossHospRes.status, 403, "HR from Hospital A must be denied access to Hospital B");
        console.log("  ✓ Hospital isolation verified (HR from Hospital A denied access to Hospital B)");

        console.log("\n=========================================");
        console.log("ALL BACKEND HR TESTS PASSED SUCCESSFULLY!");
        console.log("=========================================\n");
    } finally {
        server.close();
        await mongoose.disconnect();
    }
};

runTests().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
});
