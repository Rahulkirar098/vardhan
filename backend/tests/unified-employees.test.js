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
const { PERMISSIONS } = require("../src/config/permissions");

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

    console.log(`\n=== Running Unified Employees (Admin + HR) Test Suite on port ${port} ===\n`);

    try {
        const passwordHash = await hashPassword("Password@123");

        // 1. Setup Hospital A
        const adminA = await User.create({
            name: `Admin A ${testTimestamp}`,
            email: `adminA_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "admin",
            status: "active",
            modules: ["core", "hrms", "hospital_structure"],
            permissions: Object.values(PERMISSIONS),
        });

        const hospitalA = await Hospital.create({
            name: `Hospital A ${testTimestamp}`,
            code: `HA_${testTimestamp}`,
            createdBy: adminA._id,
            status: "active",
        });

        adminA.hospitalId = hospitalA._id;
        await adminA.save();

        const adminAToken = generateToken({ id: adminA._id.toString(), role: "admin" });

        // Positions for Hospital A
        const posDoctorA = await Position.create({
            name: "Senior Doctor",
            hospitalId: hospitalA._id,
            status: "active",
            defaultModules: ["hrms"],
        });

        const posNurseA = await Position.create({
            name: "Staff Nurse",
            hospitalId: hospitalA._id,
            status: "active",
            defaultModules: ["hrms"],
        });

        const posHRA = await Position.create({
            name: "HR Manager",
            hospitalId: hospitalA._id,
            status: "active",
            defaultModules: ["hrms"],
        });

        // Setup HR user & Employee in Hospital A
        const hrUserA = await User.create({
            name: `HR User A ${testTimestamp}`,
            email: `hrA_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "hr",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.EMPLOYEE_VIEW, PERMISSIONS.EMPLOYEE_UPDATE, PERMISSIONS.EMPLOYEE_CREATE],
        });

        const hrEmployeeA = await Employee.create({
            employeeId: `EMP_HR_${testTimestamp}`,
            firstName: "HR",
            lastName: "Manager A",
            email: hrUserA.email,
            positionId: posHRA._id,
            hospitalId: hospitalA._id,
            userId: hrUserA._id,
            employmentStatus: "ACTIVE",
            createdBy: adminA._id,
        });

        hrUserA.employeeId = hrEmployeeA._id;
        await hrUserA.save();

        const hrAToken = generateToken({ id: hrUserA._id.toString(), role: "hr" });

        // Setup Staff Nurse (Normal Employee) in Hospital A
        const nurseUserA = await User.create({
            name: `Nurse A ${testTimestamp}`,
            email: `nurseA_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
        });

        const nurseEmployeeA = await Employee.create({
            employeeId: `EMP_NURSE_${testTimestamp}`,
            firstName: "Nurse",
            lastName: "One",
            email: nurseUserA.email,
            positionId: posNurseA._id,
            hospitalId: hospitalA._id,
            userId: nurseUserA._id,
            employmentStatus: "ACTIVE",
            createdBy: adminA._id,
        });

        // Setup Inactive Doctor in Hospital A
        const docEmployeeA = await Employee.create({
            employeeId: `EMP_DOC_${testTimestamp}`,
            firstName: "Doctor",
            lastName: "Inactive",
            email: `docA_${testTimestamp}@hospital.com`,
            positionId: posDoctorA._id,
            hospitalId: hospitalA._id,
            employmentStatus: "INACTIVE",
            leavingDate: new Date(),
            createdBy: adminA._id,
        });

        // 2. Setup Hospital B & Admin B
        const adminB = await User.create({
            name: `Admin B ${testTimestamp}`,
            email: `adminB_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "admin",
            status: "active",
            modules: ["core", "hrms"],
        });

        const hospitalB = await Hospital.create({
            name: `Hospital B ${testTimestamp}`,
            code: `HB_${testTimestamp}`,
            createdBy: adminB._id,
            status: "active",
        });

        adminB.hospitalId = hospitalB._id;
        await adminB.save();

        const adminBToken = generateToken({ id: adminB._id.toString(), role: "admin" });

        const posHMB = await Position.create({
            name: "Hospital B Manager",
            hospitalId: hospitalB._id,
            status: "active",
        });

        const employeeB = await Employee.create({
            employeeId: `EMP_HB_${testTimestamp}`,
            firstName: "Secret",
            lastName: "HospitalB",
            email: `employeeB_${testTimestamp}@hospital.com`,
            positionId: posHMB._id,
            hospitalId: hospitalB._id,
            employmentStatus: "ACTIVE",
            createdBy: adminB._id,
        });

        // ====================================================================
        // TEST 1: Admin can see all employees belonging to their hospital
        // ====================================================================
        console.log("TEST 1: Admin A views hospital employee list...");
        const adminListRes = await request("/api/v1/hrms/employees", {
            headers: { Authorization: `Bearer ${adminAToken}` },
        });

        assert.strictEqual(adminListRes.status, 200, "Admin list should return 200");
        const adminEmployees = adminListRes.body.data.employees;
        assert(adminEmployees.length >= 3, "Admin A should see at least 3 employees (HR, Nurse, Doctor)");
        const adminEmpIds = adminEmployees.map(e => e._id.toString());
        assert(adminEmpIds.includes(hrEmployeeA._id.toString()), "Admin should see HR employee");
        assert(adminEmpIds.includes(nurseEmployeeA._id.toString()), "Admin should see Nurse employee");
        assert(adminEmpIds.includes(docEmployeeA._id.toString()), "Admin should see Doctor employee");
        console.log("  ✓ Admin A can see full hospital workforce (HR, Nurse, Doctor)\n");

        // ====================================================================
        // TEST 2: HR can see all employees belonging to their hospital
        // ====================================================================
        console.log("TEST 2: HR A views hospital employee list...");
        const hrListRes = await request("/api/v1/hrms/employees", {
            headers: { Authorization: `Bearer ${hrAToken}` },
        });

        assert.strictEqual(hrListRes.status, 200, "HR list should return 200");
        const hrEmployees = hrListRes.body.data.employees;
        assert(hrEmployees.length >= 3, "HR A should see full workforce, not just HR");
        const hrEmpIds = hrEmployees.map(e => e._id.toString());
        assert(hrEmpIds.includes(hrEmployeeA._id.toString()), "HR should see HR employee");
        assert(hrEmpIds.includes(nurseEmployeeA._id.toString()), "HR should see Nurse employee");
        assert(hrEmpIds.includes(docEmployeeA._id.toString()), "HR should see Doctor employee");
        console.log("  ✓ HR A can see full hospital workforce (HR, Nurse, Doctor)\n");

        // ====================================================================
        // TEST 3: HR cannot change employee position without permission
        // ====================================================================
        console.log("TEST 3: HR A attempts to update position without employee.position.update...");
        const hrPosUpdateRes = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrAToken}` },
            body: {
                firstName: "Nurse",
                lastName: "Updated",
                positionId: posDoctorA._id.toString(),
            },
        });

        assert.strictEqual(hrPosUpdateRes.status, 403, "HR should be blocked from changing position with 403");
        console.log("  ✓ HR cannot change employee position without employee.position.update (403 Forbidden)\n");

        // Normal field update by HR succeeds
        const hrNormalUpdateRes = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrAToken}` },
            body: {
                firstName: "Nurse Updated Name",
                phone: "+91 9988776655",
            },
        });
        assert.strictEqual(hrNormalUpdateRes.status, 200, "HR normal field update should succeed with 200");
        console.log("  ✓ HR can update basic employee fields (name, phone) with 200 OK\n");

        // ====================================================================
        // TEST 4: Admin can change employee position
        // ====================================================================
        console.log("TEST 4: Admin A updates employee position...");
        const adminPosUpdateRes = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                positionId: posDoctorA._id.toString(),
            },
        });

        assert.strictEqual(adminPosUpdateRes.status, 200, "Admin position change should succeed");
        assert.strictEqual(adminPosUpdateRes.body.data.positionId.toString(), posDoctorA._id.toString());
        console.log("  ✓ Admin can change employee position\n");

        // ====================================================================
        // TEST 5: Role is not editable through normal Employee Edit
        // ====================================================================
        console.log("TEST 5: Verify Role is not altered through normal Employee Edit...");
        const nurseBefore = await User.findById(nurseUserA._id).lean();
        assert.strictEqual(nurseBefore.role, "employee");

        await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                role: "admin", // Malicious attempt to change role via employee update
                firstName: "Nurse Name",
            },
        });

        const nurseAfter = await User.findById(nurseUserA._id).lean();
        assert.strictEqual(nurseAfter.role, "employee", "User role must remain unchanged");
        console.log("  ✓ Employee update cannot alter Vardhan Role\n");

        // ====================================================================
        // TEST 6: Hospital Isolation
        // ====================================================================
        console.log("TEST 6: Hospital Isolation verification...");
        // Admin A should not see Hospital B employee
        assert(!adminEmpIds.includes(employeeB._id.toString()), "Admin A must not see Hospital B employee");
        // HR A should not see Hospital B employee
        assert(!hrEmpIds.includes(employeeB._id.toString()), "HR A must not see Hospital B employee");

        // Admin B should see only Hospital B employee
        const adminBListRes = await request("/api/v1/hrms/employees", {
            headers: { Authorization: `Bearer ${adminBToken}` },
        });
        const bEmpIds = adminBListRes.body.data.employees.map(e => e._id.toString());
        assert(bEmpIds.includes(employeeB._id.toString()), "Admin B sees Hospital B employee");
        assert(!bEmpIds.includes(hrEmployeeA._id.toString()), "Admin B must not see Hospital A employee");

        // HR A attempting to access Hospital B employee by ID directly
        const crossAccessRes = await request(`/api/v1/hrms/employees/${employeeB._id}`, {
            headers: { Authorization: `Bearer ${hrAToken}` },
        });
        assert.strictEqual(crossAccessRes.status, 404, "Cross-hospital access must return 404");
        console.log("  ✓ Hospital isolation strictly enforced for Admin and HR\n");

        // ====================================================================
        // TEST 7: Role filter (All Roles / HR / Employee)
        // ====================================================================
        console.log("TEST 7: Testing Role Filter...");
        // Filter by HR
        const hrFilterRes = await request("/api/v1/hrms/employees?role=hr", {
            headers: { Authorization: `Bearer ${hrAToken}` },
        });
        assert.strictEqual(hrFilterRes.status, 200);
        const hrOnly = hrFilterRes.body.data.employees;
        assert(hrOnly.every(e => e.userId?.role === "hr"), "All results must have role hr");

        // Filter by Employee
        const empFilterRes = await request("/api/v1/hrms/employees?role=employee", {
            headers: { Authorization: `Bearer ${adminAToken}` },
        });
        assert.strictEqual(empFilterRes.status, 200);
        const empOnly = empFilterRes.body.data.employees;
        assert(empOnly.every(e => e.userId?.role === "employee"), "All results must have role employee");
        console.log("  ✓ Role filtering (hr, employee) works accurately\n");

        // ====================================================================
        // TEST 8: Status filter (Active / Inactive)
        // ====================================================================
        console.log("TEST 8: Testing Status Filter...");
        // Filter by Active
        const activeFilterRes = await request("/api/v1/hrms/employees?status=ACTIVE", {
            headers: { Authorization: `Bearer ${hrAToken}` },
        });
        assert.strictEqual(activeFilterRes.status, 200);
        assert(activeFilterRes.body.data.employees.every(e => e.employmentStatus === "ACTIVE"));

        // Filter by Inactive
        const inactiveFilterRes = await request("/api/v1/hrms/employees?status=INACTIVE", {
            headers: { Authorization: `Bearer ${hrAToken}` },
        });
        assert.strictEqual(inactiveFilterRes.status, 200);
        assert(inactiveFilterRes.body.data.employees.some(e => e.employmentStatus === "INACTIVE"));
        console.log("  ✓ Status filtering (ACTIVE, INACTIVE) works accurately\n");

        // ====================================================================
        // TEST 9: Employee Stats returns unified workforce counts
        // ====================================================================
        console.log("TEST 9: Employee Stats verification...");
        const adminStatsRes = await request("/api/v1/hrms/employees/stats", {
            headers: { Authorization: `Bearer ${adminAToken}` },
        });
        const hrStatsRes = await request("/api/v1/hrms/employees/stats", {
            headers: { Authorization: `Bearer ${hrAToken}` },
        });

        assert.strictEqual(adminStatsRes.status, 200);
        assert.strictEqual(hrStatsRes.status, 200);
        assert.deepStrictEqual(adminStatsRes.body.data, hrStatsRes.body.data, "Admin and HR must receive identical workforce stats");
        // ====================================================================
        // TEST 10: Admin invites employee -> creator is Admin User ID
        // ====================================================================
        console.log("TEST 10: Admin invites Employee (Staff Nurse)...");
        const adminInviteRes = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                firstName: "Rahul",
                lastName: "Staff",
                email: `rahul_nurse_${testTimestamp}@hospital.com`,
                positionId: posNurseA._id.toString(),
                role: "employee",
            },
        });
        assert.strictEqual(adminInviteRes.status, 201, "Admin invitation should succeed with 201");
        const invAdmin = await Invitation.findById(adminInviteRes.body.data.id).lean();
        assert.strictEqual(invAdmin.invitedBy.toString(), adminA._id.toString(), "invitedBy must be Admin ID");
        assert.strictEqual(invAdmin.createdBy.toString(), adminA._id.toString(), "createdBy must be Admin ID");
        assert.strictEqual(invAdmin.role, "employee", "Role must be employee");
        console.log("  ✓ Admin invitation automatically recorded createdBy = Admin User ID\n");

        // ====================================================================
        // TEST 11: HR invites employee -> creator is HR User ID
        // ====================================================================
        console.log("TEST 11: HR invites Employee (Staff Nurse)...");
        const hrInviteRes = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrAToken}` },
            body: {
                firstName: "Amit",
                lastName: "Staff",
                email: `amit_nurse_${testTimestamp}@hospital.com`,
                positionId: posNurseA._id.toString(),
                role: "employee",
            },
        });
        assert.strictEqual(hrInviteRes.status, 201, "HR invitation should succeed with 201");
        const invHR = await Invitation.findById(hrInviteRes.body.data.id).lean();
        assert.strictEqual(invHR.invitedBy.toString(), hrUserA._id.toString(), "invitedBy must be HR ID");
        assert.strictEqual(invHR.createdBy.toString(), hrUserA._id.toString(), "createdBy must be HR ID");
        assert.strictEqual(invHR.role, "employee", "Role must be employee");
        console.log("  ✓ HR invitation automatically recorded createdBy = HR User ID\n");

        // ====================================================================
        // TEST 12: Admin invites HR -> creator is Admin, role is HR
        // ====================================================================
        console.log("TEST 12: Admin invites HR (HR Manager)...");
        const adminHRInviteRes = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                firstName: "Priya",
                lastName: "HR",
                email: `priya_hr_${testTimestamp}@hospital.com`,
                positionId: posHRA._id.toString(),
                role: "hr",
            },
        });
        assert.strictEqual(adminHRInviteRes.status, 201, "Admin HR invitation should succeed with 201");
        const invAdminHR = await Invitation.findById(adminHRInviteRes.body.data.id).lean();
        assert.strictEqual(invAdminHR.invitedBy.toString(), adminA._id.toString(), "invitedBy must be Admin ID");
        assert.strictEqual(invAdminHR.createdBy.toString(), adminA._id.toString(), "createdBy must be Admin ID");
        assert.strictEqual(invAdminHR.role, "hr", "Role must be hr");
        console.log("  ✓ Admin invites HR correctly sets createdBy = Admin ID and role = hr\n");

        // ====================================================================
        // TEST 13: Request body createdBy is ignored, actual auth user recorded
        // ====================================================================
        console.log("TEST 13: Client attempts to tamper createdBy in request body...");
        const maliciousInviteRes = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrAToken}` },
            body: {
                firstName: "Spoofed",
                lastName: "Creator",
                email: `spoofed_${testTimestamp}@hospital.com`,
                positionId: posNurseA._id.toString(),
                role: "employee",
                createdBy: adminA._id.toString(), // Attempted spoof
                invitedBy: adminA._id.toString(),
            },
        });
        assert.strictEqual(maliciousInviteRes.status, 201);
        const invSpoofed = await Invitation.findById(maliciousInviteRes.body.data.id).lean();
        assert.strictEqual(invSpoofed.invitedBy.toString(), hrUserA._id.toString(), "Must ignore client-supplied createdBy");
        assert.strictEqual(invSpoofed.createdBy.toString(), hrUserA._id.toString(), "Must ignore client-supplied createdBy");
        console.log("  ✓ Backend ignores client-supplied createdBy and enforces authenticated user ID\n");

        // ====================================================================
        // TEST 14: HR without employee.create permission is rejected
        // ====================================================================
        console.log("TEST 14: HR without employee.create permission attempts to invite...");
        const hrNoPermUser = await User.create({
            name: `HR No Perm ${testTimestamp}`,
            email: `hrnoperm_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "hr",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.EMPLOYEE_VIEW], // Missing EMPLOYEE_CREATE
        });
        const hrNoPermToken = generateToken({ id: hrNoPermUser._id.toString(), role: "hr" });

        const unauthorizedInviteRes = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrNoPermToken}` },
            body: {
                firstName: "Blocked",
                lastName: "User",
                email: `blocked_${testTimestamp}@hospital.com`,
                positionId: posNurseA._id.toString(),
                role: "employee",
            },
        });
        assert.strictEqual(unauthorizedInviteRes.status, 403, "HR without employee.create should be rejected with 403");
        console.log("  ✓ HR without employee.create permission blocked with 403 Forbidden\n");

        // ====================================================================
        // TEST 15: Cross-hospital Position assignment is rejected
        // ====================================================================
        console.log("TEST 15: HR in Hospital A attempts to invite with Position from Hospital B...");
        const crossPosInviteRes = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrAToken}` },
            body: {
                firstName: "Cross",
                lastName: "Hospital",
                email: `cross_${testTimestamp}@hospital.com`,
                positionId: posHMB._id.toString(), // Hospital B position
                role: "employee",
            },
        });
        assert.strictEqual(crossPosInviteRes.status, 400, "Position from another hospital must be rejected with 400");
        console.log("  ✓ Cross-hospital Position assignment rejected with 400 Bad Request\n");

        // ====================================================================
        // TEST 16: Acceptance preserves creator on Employee and User records
        // ====================================================================
        console.log("TEST 16: Acceptance flow preserves creator on Employee & User...");
        const { invitation: acceptInv, rawToken } = await require("../src/services/employee.service").inviteEmployee({
            hospital: hospitalA,
            invitedBy: hrUserA._id,
            firstName: "Acceptance",
            lastName: "Test",
            email: `accept_${testTimestamp}@hospital.com`,
            positionId: posNurseA._id,
            role: "employee",
        });

        const acceptedEmp = await require("../src/services/employee.service").acceptInvitation(rawToken, "SecurePassword@123");
        assert.strictEqual(acceptedEmp.createdBy.toString(), hrUserA._id.toString(), "Employee.createdBy must be the original inviter");
        
        const acceptedUser = await User.findById(acceptedEmp.userId).lean();
        assert.strictEqual(acceptedUser.createdBy.toString(), hrUserA._id.toString(), "User.createdBy must be the original inviter");
        console.log("  ✓ Acceptance flow preserves createdBy on both Employee and User records\n");

        console.log("=================================================");
        console.log("ALL UNIFIED EMPLOYEES TESTS PASSED SUCCESSFULLY!");
        console.log("=================================================\n");
    } finally {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
    }
};

runTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Unified Employees Test Failed:", err);
        process.exit(1);
    });
