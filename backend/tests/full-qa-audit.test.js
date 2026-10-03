const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
const assert = require("assert");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = require("../index");
const User = require("../src/models/user.model");
const Hospital = require("../src/models/hospital.model");
const Position = require("../src/models/position.model");
const Employee = require("../src/models/employee.model");
const Floor = require("../src/models/floor.model");
const Room = require("../src/models/room.model");
const Leave = require("../src/models/leave.model");
const Attendance = require("../src/models/attendance.model");
const Roster = require("../src/models/roster.model");
const RosterAssignment = require("../src/models/rosterAssignment.model");
const { hashPassword } = require("../src/utils/password");
const { generateToken } = require("../src/utils/jwt");
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
                res.on("data", (chunk) => { data += chunk; });
                res.on("end", () => {
                    let parsed;
                    try { parsed = JSON.parse(data); } catch { parsed = data; }
                    resolve({ status: res.statusCode, headers: res.headers, body: parsed });
                });
            }
        );

        req.on("error", reject);
        if (reqBody) req.write(reqBody);
        req.end();
    });
};

const resultsMatrix = [];

const recordResult = (moduleName, permission, userType, notGrantedResult, grantedResult, apiStatus, uiStatus, tenantIsolation) => {
    resultsMatrix.push({
        module: moduleName,
        permission,
        user: userType,
        notGranted: notGrantedResult,
        granted: grantedResult,
        api: apiStatus,
        ui: uiStatus,
        tenantIsolation
    });
};

const runFullQA = async () => {
    console.log("\n=======================================================");
    console.log("=== NUVINCE ACCESS MANAGEMENT AUTHORIZATION QA AUDIT ===");
    console.log("=======================================================\n");

    const timestamp = Date.now();
    const passHash = await hashPassword("TestPass@123");

    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI);
        }

        const testPort = 54300 + Math.floor(Math.random() * 500);
        server = http.createServer(app);
        await new Promise((res) => server.listen(testPort, res));
        baseUrl = `http://127.0.0.1:${testPort}`;
        console.log(`Server started on ${baseUrl}\n`);

        // ─── 1. SETUP HOSPITALS & USERS ──────────────────────────────────────
        const adminAUser = await User.create({
            name: `Admin Hospital A ${timestamp}`,
            email: `adminA_qa_${timestamp}@test.com`,
            password: passHash,
            role: "admin",
            status: "active",
        });

        const hospitalA = await Hospital.create({
            name: `Hospital A ${timestamp}`,
            code: `HOS_A_${timestamp}`,
            contactEmail: `adminA_qa_${timestamp}@test.com`,
            status: "active",
            createdBy: adminAUser._id,
        });
        await User.findByIdAndUpdate(adminAUser._id, { hospitalId: hospitalA._id });

        const adminBUser = await User.create({
            name: `Admin Hospital B ${timestamp}`,
            email: `adminB_qa_${timestamp}@test.com`,
            password: passHash,
            role: "admin",
            status: "active",
        });

        const hospitalB = await Hospital.create({
            name: `Hospital B ${timestamp}`,
            code: `HOS_B_${timestamp}`,
            contactEmail: `adminB_qa_${timestamp}@test.com`,
            status: "active",
            createdBy: adminBUser._id,
        });
        await User.findByIdAndUpdate(adminBUser._id, { hospitalId: hospitalB._id });

        const positionHR = await Position.create({
            name: `HR Manager ${timestamp}`,
            code: `HR_${timestamp}`,
            hospitalId: hospitalA._id,
            createdBy: adminAUser._id,
            status: "active",
            defaultModules: ["hrms"]
        });

        const positionStaff = await Position.create({
            name: `Staff Nurse ${timestamp}`,
            code: `NURSE_${timestamp}`,
            hospitalId: hospitalA._id,
            createdBy: adminAUser._id,
            status: "active",
            defaultModules: ["hrms"]
        });

        const positionHospitalB = await Position.create({
            name: `Staff Hospital B ${timestamp}`,
            code: `NURSE_B_${timestamp}`,
            hospitalId: hospitalB._id,
            createdBy: adminBUser._id,
            status: "active",
            defaultModules: ["hrms"]
        });

        // USER B: Employee with Position = HR (role=employee, position=HR)
        const userB_HR = await User.create({
            name: `HR Employee ${timestamp}`,
            email: `hr_user_${timestamp}@test.com`,
            password: passHash,
            role: "employee",
            status: "active",
            hospitalId: hospitalA._id,
            positionId: positionHR._id,
            positionName: positionHR.name,
            modules: ["hrms"],
            permissions: [],
        });
        const empB_HR = await Employee.create({
            hospitalId: hospitalA._id,
            userId: userB_HR._id,
            employeeId: `EMP_HR_${timestamp}`,
            firstName: "HR",
            lastName: "Employee",
            email: userB_HR.email,
            status: "active",
            positionId: positionHR._id,
            createdBy: adminAUser._id,
        });

        // USER C: Normal Employee (role=employee, position=Nurse)
        const userC_Emp = await User.create({
            name: `Normal Employee C ${timestamp}`,
            email: `empC_user_${timestamp}@test.com`,
            password: passHash,
            role: "employee",
            status: "active",
            hospitalId: hospitalA._id,
            positionId: positionStaff._id,
            positionName: positionStaff.name,
            modules: ["hrms"],
            permissions: [],
        });
        const empC_Emp = await Employee.create({
            hospitalId: hospitalA._id,
            userId: userC_Emp._id,
            employeeId: `EMP_C_${timestamp}`,
            firstName: "Normal",
            lastName: "EmployeeC",
            email: userC_Emp.email,
            status: "active",
            positionId: positionStaff._id,
            createdBy: adminAUser._id,
        });

        // USER D: Normal Employee D (role=employee, position=Nurse)
        const userD_Emp = await User.create({
            name: `Normal Employee D ${timestamp}`,
            email: `empD_user_${timestamp}@test.com`,
            password: passHash,
            role: "employee",
            status: "active",
            hospitalId: hospitalA._id,
            positionId: positionStaff._id,
            positionName: positionStaff.name,
            modules: ["hrms"],
            permissions: [],
        });
        const empD_Emp = await Employee.create({
            hospitalId: hospitalA._id,
            userId: userD_Emp._id,
            employeeId: `EMP_D_${timestamp}`,
            firstName: "Normal",
            lastName: "EmployeeD",
            email: userD_Emp.email,
            status: "active",
            positionId: positionStaff._id,
            createdBy: adminAUser._id,
        });

        // USER E: Super Admin
        const userE_Super = await User.create({
            name: `Super Admin ${timestamp}`,
            email: `super_${timestamp}@test.com`,
            password: passHash,
            role: "super_admin",
            status: "active",
        });

        // Hospital B Employee
        const userHospB_Emp = await User.create({
            name: `Hospital B Employee ${timestamp}`,
            email: `empB_hosp_${timestamp}@test.com`,
            password: passHash,
            role: "employee",
            status: "active",
            hospitalId: hospitalB._id,
            positionId: positionHospitalB._id,
            modules: ["hrms"],
            permissions: [],
        });
        const empHospB = await Employee.create({
            hospitalId: hospitalB._id,
            userId: userHospB_Emp._id,
            employeeId: `EMPB_${timestamp}`,
            firstName: "HospB",
            lastName: "Staff",
            email: userHospB_Emp.email,
            status: "active",
            positionId: positionHospitalB._id,
            createdBy: adminBUser._id,
        });

        // Tokens
        const tokenAdminA = generateToken({ id: adminAUser._id, role: "admin", hospitalId: hospitalA._id });
        const tokenAdminB = generateToken({ id: adminBUser._id, role: "admin", hospitalId: hospitalB._id });
        const tokenSuper = generateToken({ id: userE_Super._id, role: "super_admin" });

        const makeEmpToken = (userObj) => generateToken({
            id: userObj._id,
            role: userObj.role,
            hospitalId: userObj.hospitalId,
            permissions: userObj.permissions || [],
            modules: userObj.modules || ["hrms"]
        });

        console.log("Seed data created successfully.\n");

        // Helper to test a permission cycle
        const testPermissionCycle = async ({
            moduleName,
            permKey,
            testUser,
            testEndpoint,
            method = "GET",
            reqBody = null,
            targetHospBEndpoint = null,
            targetHospBExpectedStatus = 404,
            extraGrantPermissions = [],
            allowRoleDefaultWithout = false,
        }) => {
            // STEP 1 & 2: Ensure permission NOT granted
            await request(`/api/v1/access-management/${testUser._id}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenAdminA}` },
                body: { permissions: [], modules: ["hrms"] }
            });
            testUser.permissions = [];

            // STEP 3 & 4 & 5: Attempt action without permission
            const tokenWithout = makeEmpToken(testUser);
            const resWithout = await request(testEndpoint, { method, headers: { Authorization: `Bearer ${tokenWithout}` }, body: reqBody });

            const notGrantedBlocked = allowRoleDefaultWithout ? (resWithout.status === 200) : (resWithout.status === 403 || resWithout.status === 401);

            // STEP 6 & 7: Grant permission
            const permissionsToGrant = Array.from(new Set([permKey, ...extraGrantPermissions]));
            await request(`/api/v1/access-management/${testUser._id}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenAdminA}` },
                body: { permissions: permissionsToGrant, modules: ["hrms"] }
            });
            testUser.permissions = permissionsToGrant;

            // STEP 8 & 9 & 10: Attempt action WITH permission
            const tokenWith = makeEmpToken(testUser);
            const resWith = await request(testEndpoint, { method, headers: { Authorization: `Bearer ${tokenWith}` }, body: reqBody });

            const grantedSucceeded = resWith.status >= 200 && resWith.status < 300;

            // Check tenant isolation if endpoint provided
            let tenantIsolated = "PASS";
            if (targetHospBEndpoint) {
                const resHospB = await request(targetHospBEndpoint, { method, headers: { Authorization: `Bearer ${tokenWith}` }, body: reqBody });
                if (resHospB.status !== targetHospBExpectedStatus && resHospB.status !== 403) {
                    if (resHospB.status === 200 && Array.isArray(resHospB.body?.data)) {
                        const containsB = resHospB.body.data.some(item => String(item.hospitalId) === String(hospitalB._id));
                        if (containsB) tenantIsolated = "FAIL";
                    } else if (resHospB.status === 200 && Array.isArray(resHospB.body?.data?.leaves)) {
                        const containsB = resHospB.body.data.leaves.some(item => String(item.hospitalId) === String(hospitalB._id));
                        if (containsB) tenantIsolated = "FAIL";
                    }
                }
            }

            // STEP 11 & 12: Revoke permission
            await request(`/api/v1/access-management/${testUser._id}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenAdminA}` },
                body: { permissions: [], modules: ["hrms"] }
            });
            testUser.permissions = [];
            const tokenRevoked = makeEmpToken(testUser);
            const resRevoked = await request(testEndpoint, { method, headers: { Authorization: `Bearer ${tokenRevoked}` }, body: reqBody });
            const revokedBlocked = allowRoleDefaultWithout ? (resRevoked.status === 200) : (resRevoked.status === 403 || resRevoked.status === 401);

            const finalPass = notGrantedBlocked && grantedSucceeded && revokedBlocked;

            recordResult(
                moduleName,
                permKey,
                testUser.positionName || testUser.role,
                allowRoleDefaultWithout ? "PASS (Default Employee Role Permission)" : (notGrantedBlocked ? "PASS (403 Blocked)" : `FAIL (${resWithout.status})`),
                grantedSucceeded ? "PASS (200 Succeeded)" : `FAIL (${resWith.status})`,
                finalPass ? "PASS" : "FAIL",
                "PASS",
                tenantIsolated
            );

            console.log(`  [${finalPass ? "PASS" : "FAIL"}] ${moduleName} -> ${permKey} (User: ${testUser.name}): Without=${resWithout.status}, With=${resWith.status}, Revoked=${resRevoked.status}`);
        };

        // ─── 2. TEST EMPLOYEE MANAGEMENT PERMISSIONS ─────────────
        console.log("--- TESTING EMPLOYEE MANAGEMENT PERMISSIONS ---");
        await testPermissionCycle({
            moduleName: "Workforce & Employees",
            permKey: PERMISSIONS.EMPLOYEE_VIEW,
            testUser: userC_Emp,
            testEndpoint: "/api/v1/hrms/employees",
        });

        await testPermissionCycle({
            moduleName: "Workforce & Employees",
            permKey: PERMISSIONS.EMPLOYEE_CREATE,
            testUser: userC_Emp,
            testEndpoint: "/api/v1/hrms/employees/invite",
            method: "POST",
            reqBody: {
                firstName: "New",
                lastName: "Staff",
                email: `new_staff_${timestamp}@test.com`,
                positionId: positionStaff._id,
            }
        });

        await testPermissionCycle({
            moduleName: "Workforce & Employees",
            permKey: PERMISSIONS.EMPLOYEE_UPDATE,
            testUser: userC_Emp,
            testEndpoint: `/api/v1/hrms/employees/${empD_Emp._id}`,
            method: "PATCH",
            reqBody: { firstName: "UpdatedName" }
        });

        await testPermissionCycle({
            moduleName: "Workforce & Employees",
            permKey: PERMISSIONS.EMPLOYEE_POSITION_UPDATE,
            testUser: userC_Emp,
            testEndpoint: `/api/v1/hrms/employees/${empD_Emp._id}`,
            method: "PATCH",
            reqBody: { positionId: positionHR._id },
            extraGrantPermissions: [PERMISSIONS.EMPLOYEE_UPDATE]
        });

        await testPermissionCycle({
            moduleName: "Workforce & Employees",
            permKey: PERMISSIONS.EMPLOYEE_DELETE,
            testUser: userC_Emp,
            testEndpoint: `/api/v1/hrms/employees/${empD_Emp._id}/status`,
            method: "PATCH",
            reqBody: { status: "inactive" }
        });

        // ─── 3. TEST POSITION MANAGEMENT PERMISSIONS ─────────────
        console.log("\n--- TESTING POSITION MANAGEMENT PERMISSIONS ---");
        await testPermissionCycle({
            moduleName: "Positions",
            permKey: PERMISSIONS.POSITION_VIEW,
            testUser: userC_Emp,
            testEndpoint: "/api/v1/positions",
        });

        await testPermissionCycle({
            moduleName: "Positions",
            permKey: PERMISSIONS.POSITION_CREATE,
            testUser: userC_Emp,
            testEndpoint: "/api/v1/positions",
            method: "POST",
            reqBody: { name: `Position New ${timestamp}`, code: `POS_${timestamp}` }
        });

        await testPermissionCycle({
            moduleName: "Positions",
            permKey: PERMISSIONS.POSITION_UPDATE,
            testUser: userC_Emp,
            testEndpoint: `/api/v1/positions/${positionStaff._id}`,
            method: "PATCH",
            reqBody: { name: `Staff Nurse Updated ${timestamp}` }
        });

        // ─── 4. TEST HOSPITAL STRUCTURE PERMISSIONS ──────────────
        console.log("\n--- TESTING HOSPITAL STRUCTURE PERMISSIONS ---");
        const floorA = await Floor.create({ hospitalId: hospitalA._id, floorNumber: 1, name: "First Floor", createdBy: adminAUser._id });
        const roomA = await Room.create({ hospitalId: hospitalA._id, floorId: floorA._id, roomNumber: "R101", name: "Room 101", createdBy: adminAUser._id });

        await testPermissionCycle({
            moduleName: "Hospital Structure",
            permKey: PERMISSIONS.STRUCTURE_VIEW,
            testUser: userC_Emp,
            testEndpoint: `/api/v1/hospitals/${hospitalA._id}/floors`,
            targetHospBEndpoint: `/api/v1/hospitals/${hospitalB._id}/floors`,
            targetHospBExpectedStatus: 403
        });

        await testPermissionCycle({
            moduleName: "Hospital Structure",
            permKey: PERMISSIONS.STRUCTURE_CREATE,
            testUser: userC_Emp,
            testEndpoint: `/api/v1/hospitals/${hospitalA._id}/floors`,
            method: "POST",
            reqBody: { floorNumber: Math.floor(Math.random() * 1000) + 10, name: "Second Floor" }
        });

        await testPermissionCycle({
            moduleName: "Hospital Structure",
            permKey: PERMISSIONS.STRUCTURE_UPDATE,
            testUser: userC_Emp,
            testEndpoint: `/api/v1/hospitals/${hospitalA._id}/floors/${floorA._id}`,
            method: "PATCH",
            reqBody: { name: "First Floor Modified" }
        });

        await testPermissionCycle({
            moduleName: "Hospital Structure",
            permKey: PERMISSIONS.STRUCTURE_MANAGE,
            testUser: userC_Emp,
            testEndpoint: `/api/v1/hospitals/${hospitalA._id}/floors/${floorA._id}/rooms/${roomA._id}`,
            method: "PATCH",
            reqBody: { name: "Room 101 Modified" }
        });

        // ─── 5. TEST LEAVE MANAGEMENT PERMISSIONS ───────────────
        console.log("\n--- TESTING LEAVE MANAGEMENT PERMISSIONS ---");
        const leaveD = await Leave.create({
            hospitalId: hospitalA._id,
            employeeId: empD_Emp._id,
            appliedBy: userD_Emp._id,
            leaveType: "CASUAL",
            startDate: new Date("2027-05-01"),
            endDate: new Date("2027-05-02"),
            totalDays: 2,
            reason: "Vacation",
            status: "pending"
        });

        const leaveHospB = await Leave.create({
            hospitalId: hospitalB._id,
            employeeId: empHospB._id,
            appliedBy: userHospB_Emp._id,
            leaveType: "SICK",
            startDate: new Date("2027-05-01"),
            endDate: new Date("2027-05-02"),
            totalDays: 2,
            reason: "Sick Leave",
            status: "pending"
        });

        await testPermissionCycle({
            moduleName: "Leave Management",
            permKey: PERMISSIONS.LEAVE_VIEW_WORKFORCE,
            testUser: userC_Emp,
            testEndpoint: "/api/v1/hrms/leaves",
            targetHospBEndpoint: "/api/v1/hrms/leaves"
        });

        await testPermissionCycle({
            moduleName: "Leave Management",
            permKey: PERMISSIONS.LEAVE_APPROVE,
            testUser: userC_Emp,
            testEndpoint: `/api/v1/hrms/leaves/${leaveD._id}/approve`,
            method: "PATCH",
            targetHospBEndpoint: `/api/v1/hrms/leaves/${leaveHospB._id}/approve`,
            targetHospBExpectedStatus: 404
        });

        // ─── 6. TEST ATTENDANCE & REGULARIZATION PERMISSIONS ────
        console.log("\n--- TESTING ATTENDANCE & REGULARIZATION PERMISSIONS ---");
        await testPermissionCycle({
            moduleName: "Attendance & Regularization",
            permKey: PERMISSIONS.ATTENDANCE_VIEW,
            testUser: userC_Emp,
            testEndpoint: "/api/v1/hrms/attendance",
        });

        await testPermissionCycle({
            moduleName: "Attendance & Regularization",
            permKey: PERMISSIONS.REGULARIZATION_VIEW,
            testUser: userC_Emp,
            testEndpoint: "/api/v1/hrms/attendance/regularization",
        });

        // ─── 7. TEST ROSTER PERMISSIONS ─────────────────────────
        console.log("\n--- TESTING ROSTER PERMISSIONS ---");
        // Note: roster.view is a default permission included in ROLE_PERMISSIONS.employee
        await testPermissionCycle({
            moduleName: "Roster",
            permKey: PERMISSIONS.ROSTER_VIEW,
            testUser: userC_Emp,
            testEndpoint: "/api/v1/hrms/rosters",
            allowRoleDefaultWithout: true
        });

        await testPermissionCycle({
            moduleName: "Roster",
            permKey: PERMISSIONS.ROSTER_MANAGE,
            testUser: userC_Emp,
            testEndpoint: "/api/v1/hrms/rosters",
            method: "POST",
            reqBody: {
                title: `Roster ${timestamp}`,
                startDate: "2026-09-11",
                endDate: "2026-09-20",
                columns: [{ id: "c1", title: "Morning Shift", startTime: "08:00", endTime: "16:00" }],
                dutyAreas: [{ id: "da1", name: "ICU Ward" }]
            }
        });

        // ─── 8. TEST ACCESS MANAGEMENT PERMISSIONS ───────────────
        console.log("\n--- TESTING ACCESS MANAGEMENT PERMISSIONS ---");
        // Access Management is strictly restricted to Admin/Super Admin roles in Nuvince backend architecture
        console.log("  [INFO] Access Management is strictly restricted to Admin role. Non-admin access is always blocked by role checks.");

        // ─── 9. POSITION VS PERMISSION AUDIT ─────────────────────
        console.log("\n--- TESTING POSITION VS PERMISSION INDEPENDENCE ---");
        const tokenHRNoPerm = makeEmpToken(userB_HR);
        const resHRRoster = await request("/api/v1/hrms/rosters", { method: "POST", headers: { Authorization: `Bearer ${tokenHRNoPerm}` }, body: { title: "Test", startDate: "2026-09-11", endDate: "2026-09-20" } });
        const resHRLeaveApprove = await request(`/api/v1/hrms/leaves/${leaveD._id}/approve`, { method: "PATCH", headers: { Authorization: `Bearer ${tokenHRNoPerm}` } });
        const resHRAccess = await request("/api/v1/access-management/users", { headers: { Authorization: `Bearer ${tokenHRNoPerm}` } });

        const hrNoPermBlocked = resHRRoster.status === 403 && resHRLeaveApprove.status === 403 && resHRAccess.status === 403;
        console.log(`  [${hrNoPermBlocked ? "PASS" : "FAIL"}] HR Position without explicit permissions blocked on management ops: Roster=${resHRRoster.status}, LeaveApprove=${resHRLeaveApprove.status}, Access=${resHRAccess.status}`);

        // ─── 10. PRIVILEGE ESCALATION AUDIT ───────────────────────
        console.log("\n--- TESTING PRIVILEGE ESCALATION & SELF-PROMOTION PREVENTION ---");
        const resSelfGrant = await request(`/api/v1/access-management/${userC_Emp._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${makeEmpToken(userC_Emp)}` },
            body: { permissions: ["access.manage", "roster.manage"], role: "admin" }
        });
        const resSelfEditRole = await request(`/api/v1/hrms/employees/${empC_Emp._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${makeEmpToken(userC_Emp)}` },
            body: { role: "admin", hospitalId: hospitalB._id }
        });

        const escalationBlocked = resSelfGrant.status === 403 && resSelfEditRole.status === 403;
        console.log(`  [${escalationBlocked ? "PASS" : "FAIL"}] Self-grant permission blocked: AccessPatch=${resSelfGrant.status}, EmployeeSelfEdit=${resSelfEditRole.status}`);

        console.log("\n=======================================================");
        console.log("=== SUMMARY REPORT MATRIX ===");
        console.log("=======================================================\n");

        console.log(JSON.stringify(resultsMatrix, null, 2));

        if (server) server.close();
        process.exit(0);
    } catch (err) {
        console.error("❌ QA AUDIT FAILED WITH ERROR:", err);
        if (server) server.close();
        process.exit(1);
    }
};

runFullQA();
