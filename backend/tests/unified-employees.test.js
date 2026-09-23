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
const Invitation = require("../src/models/invitation.model");
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
    console.log("=== VARDHAN END-TO-END EMPLOYEE LIFECYCLE & AUTH TESTS ===");
    console.log("=======================================================\n");

    const testTimestamp = Date.now();
    const passwordHash = await hashPassword("TestPass@123");

    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI);
        }

        const testPort = 52200 + Math.floor(Math.random() * 500);
        server = http.createServer(app);
        await new Promise((resolve) => server.listen(testPort, resolve));
        baseUrl = `http://localhost:${testPort}`;
        console.log(`Server started on ${baseUrl}\n`);

        // ─── SETUP SEED DATA ────────────────────────────────────────────────
        const adminAId = new mongoose.Types.ObjectId();
        const adminBId = new mongoose.Types.ObjectId();

        // Hospital A
        const hospitalA = await Hospital.create({
            name: `Apex Hospital A ${testTimestamp}`,
            code: `HOSA_${testTimestamp}`,
            contactEmail: `adminA_${testTimestamp}@hospital.com`,
            contactPhone: "9876543210",
            createdBy: adminAId,
        });

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

        // Hospital B (for isolation testing)
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

        // Positions in Hospital A
        const posNurseA = await Position.create({
            name: `Staff Nurse A ${testTimestamp}`,
            code: `NURSEA_${testTimestamp}`,
            hospitalId: hospitalA._id,
            status: "active",
            defaultModules: ["core", "hrms"],
            createdBy: adminA._id,
        });

        const posDoctorA = await Position.create({
            name: `Chief Doctor A ${testTimestamp}`,
            code: `DOCA_${testTimestamp}`,
            hospitalId: hospitalA._id,
            status: "active",
            defaultModules: ["core", "hrms"],
            createdBy: adminA._id,
        });

        const posHRA = await Position.create({
            name: `HR Manager A ${testTimestamp}`,
            code: `HRA_${testTimestamp}`,
            hospitalId: hospitalA._id,
            status: "active",
            defaultModules: ["core", "hrms"],
            createdBy: adminA._id,
        });

        const posInactiveA = await Position.create({
            name: `Deprecated Position A ${testTimestamp}`,
            code: `DEPA_${testTimestamp}`,
            hospitalId: hospitalA._id,
            status: "inactive",
            defaultModules: ["core"],
            createdBy: adminA._id,
        });

        // Position in Hospital B
        const posHMB = await Position.create({
            name: `HR Manager B ${testTimestamp}`,
            code: `HRB_${testTimestamp}`,
            hospitalId: hospitalB._id,
            status: "active",
            defaultModules: ["core", "hrms"],
            createdBy: adminB._id,
        });

        // HR User in Hospital A with base permissions (view, update, create)
        const hrUserA = await User.create({
            name: `Shalu Jain HR ${testTimestamp}`,
            email: `shalu_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.EMPLOYEE_VIEW, PERMISSIONS.EMPLOYEE_UPDATE, PERMISSIONS.EMPLOYEE_CREATE],
        });

        const hrEmployeeA = await Employee.create({
            employeeId: `EMP_HR_${testTimestamp}`,
            firstName: "Shalu",
            lastName: "Jain",
            email: `shalu_${testTimestamp}@hospital.com`,
            positionId: posHRA._id,
            hospitalId: hospitalA._id,
            employmentStatus: "ACTIVE",
            userId: hrUserA._id,
            createdBy: adminA._id,
        });
        hrUserA.employeeId = hrEmployeeA._id;
        await hrUserA.save();

        const hrAToken = generateToken({ id: hrUserA._id.toString(), role: "employee", hospitalId: hospitalA._id });

        // Normal Employee in Hospital A
        const nurseUserA = await User.create({
            name: `Nurse Nancy ${testTimestamp}`,
            email: `nancy_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [],
        });

        const nurseEmployeeA = await Employee.create({
            employeeId: `EMP_NUR_${testTimestamp}`,
            firstName: "Nancy",
            lastName: "Nurse",
            email: `nancy_${testTimestamp}@hospital.com`,
            positionId: posNurseA._id,
            hospitalId: hospitalA._id,
            employmentStatus: "ACTIVE",
            userId: nurseUserA._id,
            createdBy: adminA._id,
        });
        nurseUserA.employeeId = nurseEmployeeA._id;
        await nurseUserA.save();

        const nurseAToken = generateToken({ id: nurseUserA._id.toString(), role: "employee", hospitalId: hospitalA._id });

        // Hospital B Employee
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

        console.log("Setup complete. Running test categories...\n");

        // ====================================================================
        // A. ADMIN SCENARIOS (1 - 11)
        // ====================================================================
        console.log("--- A. ADMIN SCENARIOS ---");

        // 1. Admin can view own hospital employees
        const a1 = await request("/api/v1/hrms/employees", {
            headers: { Authorization: `Bearer ${adminAToken}` },
        });
        assert.strictEqual(a1.status, 200, "Admin can view employees");
        const a1Emps = a1.body.data.employees;
        assert(a1Emps.some(e => e._id.toString() === hrEmployeeA._id.toString()), "Admin sees HR");
        assert(a1Emps.some(e => e._id.toString() === nurseEmployeeA._id.toString()), "Admin sees Nurse");
        console.log("  ✓ 1. Admin can view own hospital employees");

        // 2. Admin can invite Employee
        const a2 = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                firstName: "AdminInvited",
                lastName: "Emp",
                email: `admin_inv_emp_${testTimestamp}@hospital.com`,
                positionId: posNurseA._id.toString(),
                role: "employee",
            },
        });
        assert.strictEqual(a2.status, 201, "Admin can invite Employee");
        console.log("  ✓ 2. Admin can invite Employee");

        // 3. Admin can invite staff with HR Manager position
        const a3 = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                firstName: "AdminInvited",
                lastName: "HR",
                email: `admin_inv_hr_${testTimestamp}@hospital.com`,
                positionId: posHRA._id.toString(),
            },
        });
        assert.strictEqual(a3.status, 201, "Admin can invite staff with HR Manager position");
        console.log("  ✓ 3. Admin can invite staff with HR Manager position");

        // 4. Admin can edit employee basic data
        const a4 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                firstName: "Nancy Updated",
                phone: "+91 9123456780",
            },
        });
        assert.strictEqual(a4.status, 200, "Admin can edit employee basic data");
        assert.strictEqual(a4.body.data.firstName, "Nancy Updated");
        console.log("  ✓ 4. Admin can edit employee basic data");

        // 5. Admin can change Position
        const a5 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                positionId: posDoctorA._id.toString(),
            },
        });
        assert.strictEqual(a5.status, 200, "Admin can change Position");
        assert.strictEqual(a5.body.data.positionId.toString(), posDoctorA._id.toString());
        console.log("  ✓ 5. Admin can change Position");

        // 6. Admin cannot manipulate hospitalId through request body
        const a6 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                hospitalId: hospitalB._id.toString(),
            },
        });
        assert.strictEqual(a6.status, 200);
        const empA6 = await Employee.findById(nurseEmployeeA._id).lean();
        assert.strictEqual(empA6.hospitalId.toString(), hospitalA._id.toString(), "hospitalId must remain unchanged");
        console.log("  ✓ 6. Admin cannot manipulate hospitalId through request body");

        // 7. Admin cannot assign a Position belonging to another hospital
        const a7 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                positionId: posHMB._id.toString(), // Hospital B position
            },
        });
        assert.strictEqual(a7.status, 400, "Cannot assign Position from another hospital");
        console.log("  ✓ 7. Admin cannot assign a Position belonging to another hospital");

        // 8. Admin can deactivate Employee
        const a8 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { status: "INACTIVE" },
        });
        assert.strictEqual(a8.status, 200, "Admin can deactivate Employee");
        assert.strictEqual(a8.body.data.employmentStatus, "INACTIVE");
        const userA8 = await User.findById(nurseUserA._id).lean();
        assert.strictEqual(userA8.status, "inactive", "Linked User status must be inactive");
        console.log("  ✓ 8. Admin can deactivate Employee");

        // 9. Deactivated Employee cannot log in
        const a9 = await request("/api/auth/login", {
            method: "POST",
            body: {
                email: `nancy_${testTimestamp}@hospital.com`,
                password: "TestPass@123",
            },
        });
        assert.strictEqual(a9.status, 403, "Deactivated employee cannot log in (403 Forbidden)");
        console.log("  ✓ 9. Deactivated Employee cannot log in");

        // 10. Admin can reactivate Employee
        const a10 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { status: "ACTIVE" },
        });
        assert.strictEqual(a10.status, 200, "Admin can reactivate Employee");
        assert.strictEqual(a10.body.data.employmentStatus, "ACTIVE");
        const userA10 = await User.findById(nurseUserA._id).lean();
        assert.strictEqual(userA10.status, "active", "Linked User status must be active");
        console.log("  ✓ 10. Admin can reactivate Employee");

        // 11. Reactivated Employee uses the same Employee/User records & can log in
        const a11 = await request("/api/auth/login", {
            method: "POST",
            body: {
                email: `nancy_${testTimestamp}@hospital.com`,
                password: "TestPass@123",
            },
        });
        assert.strictEqual(a11.status, 200, "Reactivated employee can log in again");
        assert.strictEqual(a11.body.data.user.id.toString(), nurseUserA._id.toString(), "Same User ID preserved");
        assert.strictEqual(a11.body.data.user.employeeId.toString(), nurseEmployeeA._id.toString(), "Same Employee ID preserved");
        console.log("  ✓ 11. Reactivated Employee uses the same Employee/User records\n");

        // ====================================================================
        // B. HR SCENARIOS (12 - 19)
        // ====================================================================
        console.log("--- B. HR SCENARIOS ---");

        // 12. HR can view all employees in own hospital if employee.view is granted
        const b12 = await request("/api/v1/hrms/employees", {
            headers: { Authorization: `Bearer ${hrAToken}` },
        });
        assert.strictEqual(b12.status, 200);
        const b12Emps = b12.body.data.employees;
        assert(b12Emps.some(e => e._id.toString() === nurseEmployeeA._id.toString()), "HR sees Nurse");
        assert(b12Emps.some(e => e._id.toString() === hrEmployeeA._id.toString()), "HR sees HR");
        console.log("  ✓ 12. HR can view all employees in own hospital");

        // 13. HR can invite Employee if employee.create is granted
        const b13 = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrAToken}` },
            body: {
                firstName: "HRInvited",
                lastName: "Emp",
                email: `hr_inv_emp_${testTimestamp}@hospital.com`,
                positionId: posNurseA._id.toString(),
                role: "employee",
            },
        });
        assert.strictEqual(b13.status, 201, "HR with permission can invite");
        console.log("  ✓ 13. HR can invite Employee if required permission is granted");

        // 14. HR can edit basic employee fields if employee.update is granted
        const b14 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrAToken}` },
            body: {
                firstName: "Nancy HR Edit",
                phone: "+91 9999988888",
            },
        });
        assert.strictEqual(b14.status, 200, "HR can edit basic fields");
        assert.strictEqual(b14.body.data.firstName, "Nancy HR Edit");
        console.log("  ✓ 14. HR can edit basic employee fields if employee.update is granted");

        // 15. HR cannot change Position by default
        const b15 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrAToken}` },
            body: {
                positionId: posNurseA._id.toString(),
            },
        });
        assert.strictEqual(b15.status, 403, "HR cannot change position without employee.position.update");
        console.log("  ✓ 15. HR cannot change Position by default (403 Forbidden)");

        // 16. HR with explicit employee.position.update can change Position
        const hrWithPosUser = await User.create({
            name: `HR With Pos Perm ${testTimestamp}`,
            email: `hrposperm_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.EMPLOYEE_VIEW, PERMISSIONS.EMPLOYEE_UPDATE, PERMISSIONS.EMPLOYEE_POSITION_UPDATE],
        });
        const hrWithPosEmp = await Employee.create({
            employeeId: `EMP_HRPOS_${testTimestamp}`,
            firstName: "HR",
            lastName: "WithPos",
            email: `hrposperm_${testTimestamp}@hospital.com`,
            positionId: posHRA._id,
            hospitalId: hospitalA._id,
            employmentStatus: "ACTIVE",
            userId: hrWithPosUser._id,
            createdBy: adminA._id,
        });
        hrWithPosUser.employeeId = hrWithPosEmp._id;
        await hrWithPosUser.save();
        const hrWithPosToken = generateToken({ id: hrWithPosUser._id.toString(), role: "employee", hospitalId: hospitalA._id });

        const b16 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrWithPosToken}` },
            body: {
                positionId: posNurseA._id.toString(),
            },
        });
        assert.strictEqual(b16.status, 200, "HR with explicit position permission can update position");
        console.log("  ✓ 16. HR with explicit employee.position.update can change Position");

        // 17. HR cannot change role through Employee Edit
        await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrAToken}` },
            body: {
                role: "admin",
            },
        });
        const nurseRoleCheck = await User.findById(nurseUserA._id).lean();
        assert.strictEqual(nurseRoleCheck.role, "employee", "User role must remain unchanged");
        console.log("  ✓ 17. HR cannot change role through Employee Edit");

        // 18. HR cannot manipulate hospitalId
        await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrAToken}` },
            body: {
                hospitalId: hospitalB._id.toString(),
            },
        });
        const nurseHospCheck = await Employee.findById(nurseEmployeeA._id).lean();
        assert.strictEqual(nurseHospCheck.hospitalId.toString(), hospitalA._id.toString());
        console.log("  ✓ 18. HR cannot manipulate hospitalId");

        // 19. HR cannot access another hospital's employee
        const b19 = await request(`/api/v1/hrms/employees/${employeeB._id}`, {
            headers: { Authorization: `Bearer ${hrAToken}` },
        });
        assert.strictEqual(b19.status, 404, "HR cannot access another hospital's employee (404)");
        console.log("  ✓ 19. HR cannot access another hospital's employee\n");

        // ====================================================================
        // C. INVITATION SCENARIOS (20 - 26)
        // ====================================================================
        console.log("--- C. INVITATION SCENARIOS ---");

        // 20. createdBy is automatically set from authenticated User
        const c20 = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                firstName: "Creator",
                lastName: "Check",
                email: `c20_${testTimestamp}@hospital.com`,
                positionId: posNurseA._id.toString(),
                role: "employee",
            },
        });
        assert.strictEqual(c20.status, 201);
        const invC20 = await Invitation.findById(c20.body.data.id).lean();
        assert.strictEqual(invC20.createdBy.toString(), adminA._id.toString());
        console.log("  ✓ 20. createdBy is automatically set from authenticated User");

        // 21. Frontend cannot override createdBy
        const c21 = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrAToken}` },
            body: {
                firstName: "Override",
                lastName: "Attempt",
                email: `c21_${testTimestamp}@hospital.com`,
                positionId: posNurseA._id.toString(),
                role: "employee",
                createdBy: adminA._id.toString(),
            },
        });
        assert.strictEqual(c21.status, 201);
        const invC21 = await Invitation.findById(c21.body.data.id).lean();
        assert.strictEqual(invC21.createdBy.toString(), hrUserA._id.toString(), "Must use auth user ID");
        console.log("  ✓ 21. Frontend cannot override createdBy");

        // 22. Admin-created invitation stores Admin user as creator
        assert.strictEqual(invC20.createdBy.toString(), adminA._id.toString());
        console.log("  ✓ 22. Admin-created invitation stores Admin user as creator");

        // 23. HR-created invitation stores HR user as creator
        assert.strictEqual(invC21.createdBy.toString(), hrUserA._id.toString());
        console.log("  ✓ 23. HR-created invitation stores HR user as creator");

        // 24. Invitation acceptance creates exactly one Employee and one User
        const { invitation: c24Inv, rawToken: c24Token } = await require("../src/services/employee.service").inviteEmployee({
            hospital: hospitalA,
            invitedBy: adminA._id,
            firstName: "Single",
            lastName: "Accept",
            email: `c24_${testTimestamp}@hospital.com`,
            positionId: posNurseA._id,
            role: "employee",
        });

        const empC24 = await require("../src/services/employee.service").acceptInvitation(c24Token, "Password123!");
        assert(empC24 && empC24._id, "Employee created");
        const userC24 = await User.findById(empC24.userId).lean();
        assert(userC24 && userC24._id, "User created");
        const empCountC24 = await Employee.countDocuments({ email: `c24_${testTimestamp}@hospital.com` });
        const userCountC24 = await User.countDocuments({ email: `c24_${testTimestamp}@hospital.com` });
        assert.strictEqual(empCountC24, 1, "Exactly one Employee record");
        assert.strictEqual(userCountC24, 1, "Exactly one User record");
        console.log("  ✓ 24. Invitation acceptance creates exactly one Employee and one User");

        // 25. Repeated acceptance cannot create duplicates
        try {
            await require("../src/services/employee.service").acceptInvitation(c24Token, "Password123!");
        } catch (e) {
            // Either throws INVALID_INVITATION or returns existing safely
        }
        const empCountAfterRepeat = await Employee.countDocuments({ email: `c24_${testTimestamp}@hospital.com` });
        assert.strictEqual(empCountAfterRepeat, 1, "No duplicate created on repeated acceptance");
        console.log("  ✓ 25. Repeated acceptance cannot create duplicates");

        // 26. Employee and User relationships are correct
        assert.strictEqual(empC24.userId.toString(), userC24._id.toString(), "Employee.userId -> User._id");
        assert.strictEqual(userC24.employeeId.toString(), empC24._id.toString(), "User.employeeId -> Employee._id");
        assert.strictEqual(empC24.hospitalId.toString(), hospitalA._id.toString());
        assert.strictEqual(userC24.hospitalId.toString(), hospitalA._id.toString());
        console.log("  ✓ 26. Employee and User relationships are correct\n");

        // ====================================================================
        // D. POSITION SCENARIOS (27 - 31)
        // ====================================================================
        console.log("--- D. POSITION SCENARIOS ---");

        // 27. New employee can select active Position
        const d27 = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                firstName: "Active",
                lastName: "Pos",
                email: `d27_${testTimestamp}@hospital.com`,
                positionId: posDoctorA._id.toString(),
                role: "employee",
            },
        });
        assert.strictEqual(d27.status, 201, "Active position accepted");
        console.log("  ✓ 27. New employee can select active Position");

        // 28. New employee cannot select inactive Position
        const d28 = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                firstName: "Inactive",
                lastName: "Pos",
                email: `d28_${testTimestamp}@hospital.com`,
                positionId: posInactiveA._id.toString(),
                role: "employee",
            },
        });
        assert.strictEqual(d28.status, 400, "Inactive position rejected");
        console.log("  ✓ 28. New employee cannot select inactive Position");

        // 29. Position must belong to same hospital
        const d29 = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                firstName: "Cross",
                lastName: "Pos",
                email: `d29_${testTimestamp}@hospital.com`,
                positionId: posHMB._id.toString(),
                role: "employee",
            },
        });
        assert.strictEqual(d29.status, 400, "Cross-hospital position rejected");
        console.log("  ✓ 29. Position must belong to same hospital");

        // 30. Deactivating a Position does not automatically alter existing employees
        const posToDeactivate = await Position.create({
            name: `Temp Pos ${testTimestamp}`,
            code: `TEMP_${testTimestamp}`,
            hospitalId: hospitalA._id,
            status: "active",
            createdBy: adminA._id,
        });
        const empWithTempPos = await Employee.create({
            employeeId: `EMP_TEMP_${testTimestamp}`,
            firstName: "Temp",
            lastName: "Emp",
            email: `temp_${testTimestamp}@hospital.com`,
            positionId: posToDeactivate._id,
            hospitalId: hospitalA._id,
            employmentStatus: "ACTIVE",
            createdBy: adminA._id,
        });

        posToDeactivate.status = "inactive";
        await posToDeactivate.save();

        const empAfterPosDeactivate = await Employee.findById(empWithTempPos._id).lean();
        assert.strictEqual(empAfterPosDeactivate.positionId.toString(), posToDeactivate._id.toString());
        console.log("  ✓ 30. Deactivating a Position does not automatically alter existing employees");

        // 31. Existing employee remains linked to an inactive Position until changed
        const d31 = await request(`/api/v1/hrms/employees/${empWithTempPos._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                firstName: "Temp Emp Updated Name",
                positionId: posToDeactivate._id.toString(), // Same position, now inactive
            },
        });
        assert.strictEqual(d31.status, 200, "Inactive current position can remain assigned");
        console.log("  ✓ 31. Existing employee remains linked to an inactive Position until changed\n");

        // ====================================================================
        // E. LIFECYCLE SCENARIOS (32 - 38)
        // ====================================================================
        console.log("--- E. LIFECYCLE SCENARIOS ---");

        // 32. Active Employee appears in Active list
        const e32 = await request("/api/v1/hrms/employees?status=ACTIVE", {
            headers: { Authorization: `Bearer ${adminAToken}` },
        });
        assert.strictEqual(e32.status, 200);
        assert(e32.body.data.employees.some(e => e._id.toString() === nurseEmployeeA._id.toString()));
        console.log("  ✓ 32. Active Employee appears in Active list");

        // 33. Deactivated Employee appears in Inactive list
        await request(`/api/v1/hrms/employees/${empWithTempPos._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { status: "INACTIVE" },
        });
        const e33 = await request("/api/v1/hrms/employees?status=INACTIVE", {
            headers: { Authorization: `Bearer ${adminAToken}` },
        });
        assert.strictEqual(e33.status, 200);
        assert(e33.body.data.employees.some(e => e._id.toString() === empWithTempPos._id.toString()));
        console.log("  ✓ 33. Deactivated Employee appears in Inactive list");

        // 34. Deactivated Employee cannot log in
        await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { status: "INACTIVE" },
        });
        const e34 = await request("/api/auth/login", {
            method: "POST",
            body: {
                email: `nancy_${testTimestamp}@hospital.com`,
                password: "TestPass@123",
            },
        });
        assert.strictEqual(e34.status, 403, "Deactivated employee cannot log in");
        console.log("  ✓ 34. Deactivated Employee cannot log in");

        // 35. Reactivated Employee becomes active
        const e35 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { status: "ACTIVE" },
        });
        assert.strictEqual(e35.status, 200);
        assert.strictEqual(e35.body.data.employmentStatus, "ACTIVE");
        console.log("  ✓ 35. Reactivated Employee becomes active");

        // 36. Reactivated Employee keeps same Employee ID
        assert.strictEqual(e35.body.data.employeeId, nurseEmployeeA.employeeId);
        console.log("  ✓ 36. Reactivated Employee keeps same Employee ID");

        // 37. Reactivated Employee keeps same User ID
        const nurseUserReactivated = await User.findById(nurseUserA._id).lean();
        assert.strictEqual(nurseUserReactivated._id.toString(), nurseUserA._id.toString());
        console.log("  ✓ 37. Reactivated Employee keeps same User ID");

        // 38. Reactivated Employee can log in again
        const e38 = await request("/api/auth/login", {
            method: "POST",
            body: {
                email: `nancy_${testTimestamp}@hospital.com`,
                password: "TestPass@123",
            },
        });
        assert.strictEqual(e38.status, 200, "Reactivated employee can log in again");
        console.log("  ✓ 38. Reactivated Employee can log in again\n");

        // ====================================================================
        // F. SECURITY SCENARIOS (39 - 46)
        // ====================================================================
        console.log("--- F. SECURITY SCENARIOS ---");

        // 39. User from Hospital A cannot read Hospital B Employee
        const f39 = await request(`/api/v1/hrms/employees/${employeeB._id}`, {
            headers: { Authorization: `Bearer ${adminAToken}` },
        });
        assert.strictEqual(f39.status, 404, "Hospital A Admin cannot read Hospital B Employee");
        console.log("  ✓ 39. User from Hospital A cannot read Hospital B Employee (404)");

        // 40. User from Hospital A cannot update Hospital B Employee
        const f40 = await request(`/api/v1/hrms/employees/${employeeB._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { firstName: "Hacked" },
        });
        assert.strictEqual(f40.status, 404, "Hospital A Admin cannot update Hospital B Employee");
        console.log("  ✓ 40. User from Hospital A cannot update Hospital B Employee (404)");

        // 41. User from Hospital A cannot deactivate Hospital B Employee
        const f41 = await request(`/api/v1/hrms/employees/${employeeB._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { status: "INACTIVE" },
        });
        assert.strictEqual(f41.status, 404, "Hospital A Admin cannot deactivate Hospital B Employee");
        console.log("  ✓ 41. User from Hospital A cannot deactivate Hospital B Employee (404)");

        // 42. User cannot change employee hospitalId
        await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { hospitalId: hospitalB._id.toString() },
        });
        const empCheck42 = await Employee.findById(nurseEmployeeA._id).lean();
        assert.strictEqual(empCheck42.hospitalId.toString(), hospitalA._id.toString());
        console.log("  ✓ 42. User cannot change employee hospitalId");

        // 43. User cannot change employee userId
        await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { userId: adminA._id.toString() },
        });
        const empCheck43 = await Employee.findById(nurseEmployeeA._id).lean();
        assert.strictEqual(empCheck43.userId.toString(), nurseUserA._id.toString());
        console.log("  ✓ 43. User cannot change employee userId");

        // 44. User cannot change role through Employee Edit
        await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { role: "super_admin" },
        });
        const userCheck44 = await User.findById(nurseUserA._id).lean();
        assert.strictEqual(userCheck44.role, "employee");
        console.log("  ✓ 44. User cannot change role through Employee Edit");

        // 45. User cannot change permissions/modules through Employee Edit
        await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { permissions: ["all"], modules: ["super"] },
        });
        const userCheck45 = await User.findById(nurseUserA._id).lean();
        assert.deepStrictEqual(userCheck45.permissions, []);
        console.log("  ✓ 45. User cannot change permissions/modules through Employee Edit");

        // 46. User cannot spoof createdBy
        const f46 = await request("/api/v1/hrms/employees/invite", {
            method: "POST",
            headers: { Authorization: `Bearer ${hrAToken}` },
            body: {
                firstName: "Spoof",
                lastName: "Creator",
                email: `f46_${testTimestamp}@hospital.com`,
                positionId: posNurseA._id.toString(),
                role: "employee",
                createdBy: adminA._id.toString(),
            },
        });
        assert.strictEqual(f46.status, 201);
        const inv46 = await Invitation.findById(f46.body.data.id).lean();
        assert.strictEqual(inv46.createdBy.toString(), hrUserA._id.toString());
        console.log("  ✓ 46. User cannot spoof createdBy\n");

        // ====================================================================
        // G. EMPLOYEE STATUS MANAGEMENT & SELF-PROTECTION RULES (47 - 58)
        // ====================================================================
        console.log("--- G. EMPLOYEE STATUS MANAGEMENT & SELF-PROTECTION RULES ---");

        // Create an authorized HR Manager user with employee.delete permission
        const hrManagerUser = await User.create({
            name: `HR Manager Delete ${testTimestamp}`,
            email: `hrmanager_del_${testTimestamp}@hospital.com`,
            password: passwordHash,
            role: "employee",
            hospitalId: hospitalA._id,
            status: "active",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.EMPLOYEE_VIEW, PERMISSIONS.EMPLOYEE_UPDATE, PERMISSIONS.EMPLOYEE_DELETE],
        });
        const hrManagerEmp = await Employee.create({
            employeeId: `EMP_HRM_DEL_${testTimestamp}`,
            firstName: "HRM",
            lastName: "DeleteAuth",
            email: `hrmanager_del_${testTimestamp}@hospital.com`,
            positionId: posHRA._id,
            hospitalId: hospitalA._id,
            employmentStatus: "ACTIVE",
            userId: hrManagerUser._id,
            createdBy: adminA._id,
        });
        hrManagerUser.employeeId = hrManagerEmp._id;
        await hrManagerUser.save();
        const hrManagerToken = generateToken({ id: hrManagerUser._id.toString(), role: "employee", hospitalId: hospitalA._id, employeeId: hrManagerEmp._id.toString() });

        // Admin A employee record for self-check
        const adminAEmp = await Employee.create({
            employeeId: `EMP_ADMINA_${testTimestamp}`,
            firstName: "Admin",
            lastName: "A-Record",
            email: `adminA_${testTimestamp}@hospital.com`,
            positionId: posHRA._id,
            hospitalId: hospitalA._id,
            employmentStatus: "ACTIVE",
            userId: adminA._id,
            createdBy: adminA._id,
        });
        adminA.employeeId = adminAEmp._id;
        await adminA.save();

        // 47. TEST 1: Admin deactivates another employee -> PASS
        const g47 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { status: "INACTIVE" },
        });
        assert.strictEqual(g47.status, 200, "Admin can deactivate another employee");
        assert.strictEqual(g47.body.data.employmentStatus, "INACTIVE");
        console.log("  ✓ 47. [TEST 1] Admin deactivates another employee (PASS)");

        // 48. TEST 2: Admin reactivates another employee -> PASS
        const g48 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { status: "ACTIVE" },
        });
        assert.strictEqual(g48.status, 200, "Admin can reactivate another employee");
        assert.strictEqual(g48.body.data.employmentStatus, "ACTIVE");
        console.log("  ✓ 48. [TEST 2] Admin reactivates another employee (PASS)");

        // 49. TEST 3: Admin attempts to deactivate self -> REJECT
        const g49a = await request(`/api/v1/hrms/employees/${adminAEmp._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { status: "INACTIVE" },
        });
        assert.strictEqual(g49a.status, 403, "Admin cannot deactivate own linked employee record");
        const g49b = await request(`/api/v1/hrms/employees/${adminA._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { status: "INACTIVE" },
        });
        assert.strictEqual(g49b.status, 403, "Admin cannot deactivate own user ID directly");
        console.log("  ✓ 49. [TEST 3] Admin attempts to deactivate self (REJECT - 403)");

        // 50. TEST 4: Admin attempts to reactivate/change self -> REJECT
        const g50 = await request(`/api/v1/hrms/employees/${adminAEmp._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: { status: "ACTIVE" },
        });
        assert.strictEqual(g50.status, 403, "Admin cannot change own status");
        console.log("  ✓ 50. [TEST 4] Admin attempts to reactivate/change self (REJECT - 403)");

        // 51. TEST 5: Authorized HR Manager deactivates another employee -> PASS
        const g51 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrManagerToken}` },
            body: { status: "INACTIVE" },
        });
        assert.strictEqual(g51.status, 200, "Authorized HR Manager can deactivate another employee");
        assert.strictEqual(g51.body.data.employmentStatus, "INACTIVE");
        console.log("  ✓ 51. [TEST 5] Authorized HR Manager deactivates another employee (PASS)");

        // 52. TEST 6: Authorized HR Manager reactivates another employee -> PASS
        const g52 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrManagerToken}` },
            body: { status: "ACTIVE" },
        });
        assert.strictEqual(g52.status, 200, "Authorized HR Manager can reactivate another employee");
        assert.strictEqual(g52.body.data.employmentStatus, "ACTIVE");
        console.log("  ✓ 52. [TEST 6] Authorized HR Manager reactivates another employee (PASS)");

        // 53. TEST 7: HR Manager attempts to deactivate self -> REJECT
        const g53 = await request(`/api/v1/hrms/employees/${hrManagerEmp._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrManagerToken}` },
            body: { status: "INACTIVE" },
        });
        assert.strictEqual(g53.status, 403, "HR Manager cannot deactivate self");
        console.log("  ✓ 53. [TEST 7] HR Manager attempts to deactivate self (REJECT - 403)");

        // 54. TEST 8: HR Manager attempts to reactivate/change self -> REJECT
        const g54 = await request(`/api/v1/hrms/employees/${hrManagerEmp._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrManagerToken}` },
            body: { status: "ACTIVE" },
        });
        assert.strictEqual(g54.status, 403, "HR Manager cannot change own status");
        console.log("  ✓ 54. [TEST 8] HR Manager attempts to reactivate/change self (REJECT - 403)");

        // 55. TEST 9: Normal employee attempts to deactivate another employee -> REJECT
        const g55 = await request(`/api/v1/hrms/employees/${hrManagerEmp._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${nurseAToken}` },
            body: { status: "INACTIVE" },
        });
        assert.strictEqual(g55.status, 403, "Normal employee cannot deactivate other employee");
        console.log("  ✓ 55. [TEST 9] Normal employee attempts to deactivate another employee (REJECT - 403)");

        // 56. TEST 10: Normal employee attempts to change their own status -> REJECT
        const g56 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${nurseAToken}` },
            body: { status: "INACTIVE" },
        });
        assert.strictEqual(g56.status, 403, "Normal employee cannot change own status");
        console.log("  ✓ 56. [TEST 10] Normal employee attempts to change their own status (REJECT - 403)");

        // 57. TEST 11: Direct API request cannot bypass the self-status restriction -> REJECT
        const g57 = await request(`/api/v1/hrms/employees/${hrManagerUser._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrManagerToken}` },
            body: { status: "INACTIVE" },
        });
        assert.strictEqual(g57.status, 403, "Direct user ID status API call is rejected");
        console.log("  ✓ 57. [TEST 11] Direct API request cannot bypass the self-status restriction (REJECT - 403)");

        // 58. TEST 12: Cross-hospital employee status manipulation -> REJECT
        const g58 = await request(`/api/v1/hrms/employees/${employeeB._id}/status`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrManagerToken}` },
            body: { status: "INACTIVE" },
        });
        assert.strictEqual(g58.status, 404, "Cross-hospital employee status change rejected");
        console.log("  ✓ 58. [TEST 12] Cross-hospital employee status manipulation (REJECT - 404)\n");

        // ====================================================================
        // H. EMPLOYEE SELF-EDIT RESTRICTION & AUTHORIZATION RULES (59 - 67)
        // ====================================================================
        console.log("--- H. EMPLOYEE SELF-EDIT RESTRICTION & AUTHORIZATION RULES ---");

        // 59. [EDIT TEST 1] Admin edits another employee -> PASS
        const h59 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                firstName: "Nancy Admin Edited",
                phone: "+91 9876500000",
            },
        });
        assert.strictEqual(h59.status, 200, "Admin can edit another employee");
        assert.strictEqual(h59.body.data.firstName, "Nancy Admin Edited");
        console.log("  ✓ 59. [EDIT TEST 1] Admin edits another employee (PASS)");

        // 60. [EDIT TEST 2] Admin attempts to edit own employee record -> REJECT
        const h60 = await request(`/api/v1/hrms/employees/${adminAEmp._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${adminAToken}` },
            body: {
                firstName: "Admin Self Edit",
            },
        });
        assert.strictEqual(h60.status, 403, "Admin cannot edit own employee record (403)");
        console.log("  ✓ 60. [EDIT TEST 2] Admin attempts to edit own employee record (REJECT - 403)");

        // 61. [EDIT TEST 3] HR Manager with employee.update edits another employee -> PASS
        const h61 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrManagerToken}` },
            body: {
                firstName: "Nancy HR Edited",
            },
        });
        assert.strictEqual(h61.status, 200, "HR Manager with employee.update can edit another employee");
        assert.strictEqual(h61.body.data.firstName, "Nancy HR Edited");
        console.log("  ✓ 61. [EDIT TEST 3] HR Manager with employee.update edits another employee (PASS)");

        // 62. [EDIT TEST 4] HR Manager attempts to edit own employee record -> REJECT
        const h62 = await request(`/api/v1/hrms/employees/${hrManagerEmp._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrManagerToken}` },
            body: {
                firstName: "HRM Self Edit",
            },
        });
        assert.strictEqual(h62.status, 403, "HR Manager cannot edit own employee record (403)");
        console.log("  ✓ 62. [EDIT TEST 4] HR Manager attempts to edit own employee record (REJECT - 403)");

        // 63. [EDIT TEST 5] Normal employee attempts to edit another employee -> REJECT
        const h63 = await request(`/api/v1/hrms/employees/${hrManagerEmp._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${nurseAToken}` },
            body: {
                firstName: "Nurse Hack",
            },
        });
        assert.strictEqual(h63.status, 403, "Normal employee cannot edit other employee (403)");
        console.log("  ✓ 63. [EDIT TEST 5] Normal employee attempts to edit another employee (REJECT - 403)");

        // 64. [EDIT TEST 6] Normal employee attempts to edit own employee record -> REJECT
        const h64 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${nurseAToken}` },
            body: {
                firstName: "Nancy Self Edit",
            },
        });
        assert.strictEqual(h64.status, 403, "Normal employee cannot edit own record (403)");
        console.log("  ✓ 64. [EDIT TEST 6] Normal employee attempts to edit own employee record (REJECT - 403)");

        // 65. [EDIT TEST 7] Direct API self-edit attempt -> REJECT
        const h65 = await request(`/api/v1/hrms/employees/${hrManagerUser._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrManagerToken}` },
            body: {
                firstName: "Direct User ID Edit",
            },
        });
        assert.strictEqual(h65.status, 403, "Direct user ID employee edit attempt rejected (403)");
        console.log("  ✓ 65. [EDIT TEST 7] Direct API self-edit attempt (REJECT - 403)");

        // 66. [EDIT TEST 8] Cross-hospital employee edit attempt -> REJECT
        const h66 = await request(`/api/v1/hrms/employees/${employeeB._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrManagerToken}` },
            body: {
                firstName: "Cross Hosp Edit",
            },
        });
        assert.strictEqual(h66.status, 404, "Cross-hospital employee edit rejected (404)");
        console.log("  ✓ 66. [EDIT TEST 8] Cross-hospital employee edit attempt (REJECT - 404)");

        // 67. [EDIT TEST 9] Existing employee update permissions remain enforced
        const h67 = await request(`/api/v1/hrms/employees/${nurseEmployeeA._id}`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${hrManagerToken}` },
            body: {
                positionId: posDoctorA._id.toString(),
            },
        });
        assert.strictEqual(h67.status, 403, "HR without employee.position.update cannot update position");
        console.log("  ✓ 67. [EDIT TEST 9] Existing employee update permissions remain enforced (PASS)");

        console.log("\n=======================================================");
        console.log("=== ALL 67 LIFECYCLE, AUTH, STATUS & EDIT RULES TESTS PASSED 100% ===");
        console.log("=======================================================\n");
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
