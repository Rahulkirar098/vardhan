const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = require("../index");
const User = require("../src/models/user.model");
const Hospital = require("../src/models/hospital.model");
const Employee = require("../src/models/employee.model");
const Position = require("../src/models/position.model");
const { generateToken } = require("../src/utils/jwt");
const { hashPassword } = require("../src/utils/password");
const { PERMISSIONS } = require("../src/config/permissions");

let server;
let baseUrl;

function request(method, path, headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
        };

        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, body: parsed });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on("error", reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log("Starting Access Management Test Suite...");

    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    const timestamp = Date.now();
    const pwd = await hashPassword("password123");

    // Create Hospital A
    const adminUserA = await User.create({
        name: `Admin A ${timestamp}`,
        email: `adminA_${timestamp}@hospital.com`,
        password: pwd,
        role: "admin",
        status: "active",
    });

    const randA = Math.random().toString(36).substring(2, 6).toUpperCase();
    const randB = Math.random().toString(36).substring(2, 6).toUpperCase();

    const hospitalA = await Hospital.create({
        name: `Hospital A ${timestamp}`,
        code: `H${randA}`,
        address: "City A",
        contactNumber: "1234567890",
        email: `hospA_${timestamp}_${randA}@test.com`,
        createdBy: adminUserA._id,
    });

    adminUserA.hospitalId = hospitalA._id;
    await adminUserA.save();

    const positionA = await Position.create({
        name: `Nurse ${timestamp}`,
        hospitalId: hospitalA._id,
        defaultModules: ["hrms"],
        status: "active",
    });

    // Create HR Manager in Hospital A
    const hrUserA = await User.create({
        name: `HR A ${timestamp}`,
        email: `hrA_${timestamp}@hospital.com`,
        password: pwd,
        role: "employee",
        hospitalId: hospitalA._id,
        status: "active",
        permissions: [],
        modules: ["core", "hrms"],
    });

    // Create Employee in Hospital A
    const empUserA = await User.create({
        name: `Employee A ${timestamp}`,
        email: `empA_${timestamp}@hospital.com`,
        password: pwd,
        role: "employee",
        hospitalId: hospitalA._id,
        status: "active",
        permissions: [],
        modules: ["core"],
    });

    const empRecordA = await Employee.create({
        firstName: "Emp",
        lastName: "A",
        email: empUserA.email,
        employeeId: `EMP-${timestamp}`,
        hospitalId: hospitalA._id,
        userId: empUserA._id,
        positionId: positionA._id,
        employmentStatus: "ACTIVE",
        createdBy: adminUserA._id,
    });
    empUserA.employeeId = empRecordA._id;
    await empUserA.save();

    // Create Hospital B
    const adminUserB = await User.create({
        name: `Admin B ${timestamp}`,
        email: `adminB_${timestamp}@hospital.com`,
        password: pwd,
        role: "admin",
        status: "active",
    });

    const hospitalB = await Hospital.create({
        name: `Hospital B ${timestamp}`,
        code: `H${randB}`,
        address: "City B",
        contactNumber: "9876543210",
        email: `hospB_${timestamp}_${randB}@test.com`,
        createdBy: adminUserB._id,
    });
    adminUserB.hospitalId = hospitalB._id;
    await adminUserB.save();

    // Auth Tokens
    const adminTokenA = generateToken({ id: adminUserA._id, role: "admin", hospitalId: hospitalA._id });
    const adminTokenB = generateToken({ id: adminUserB._id, role: "admin", hospitalId: hospitalB._id });
    const hrTokenA = generateToken({ id: hrUserA._id, role: "employee", hospitalId: hospitalA._id });
    const empTokenA = generateToken({ id: empUserA._id, role: "employee", hospitalId: hospitalA._id });

    let passed = 0;
    let failed = 0;

    const assert = (condition, testName) => {
        if (condition) {
            console.log(`  ✓ ${testName}`);
            passed++;
        } else {
            console.error(`  ✗ FAIL: ${testName}`);
            failed++;
        }
    };

    try {
        // Test 1: Admin can list workforce users
        const res1 = await request("GET", "/api/v1/access-management/users", {
            Authorization: `Bearer ${adminTokenA}`,
        });
        assert(res1.status === 200 && Array.isArray(res1.body.data) && res1.body.data.length >= 2, "TEST 1: Admin can list workforce users in hospital");

        // Test 2: Admin can get specific user access
        const res2 = await request("GET", `/api/v1/access-management/${empUserA._id}`, {
            Authorization: `Bearer ${adminTokenA}`,
        });
        assert(res2.status === 200 && res2.body.data.email === empUserA.email, "TEST 2: Admin can retrieve user access settings");

        // Test 3: Admin can update permissions and modules for employee
        const res3 = await request("PATCH", `/api/v1/access-management/${empUserA._id}`, {
            Authorization: `Bearer ${adminTokenA}`,
        }, {
            permissions: [PERMISSIONS.STRUCTURE_VIEW, PERMISSIONS.EMPLOYEE_VIEW],
            modules: ["core", "hrms"],
        });
        assert(res3.status === 200 && res3.body.data.permissions.includes(PERMISSIONS.STRUCTURE_VIEW) && res3.body.data.modules.includes("hrms"), "TEST 3: Admin can update permissions and modules for employee");

        // Test 4: HR cannot manage access (403 Forbidden)
        const res4 = await request("GET", "/api/v1/access-management/users", {
            Authorization: `Bearer ${hrTokenA}`,
        });
        assert(res4.status === 403, "TEST 4: HR cannot list workforce access (returns 403)");

        // Test 5: Employee cannot update access (403 Forbidden)
        const res5 = await request("PATCH", `/api/v1/access-management/${empUserA._id}`, {
            Authorization: `Bearer ${empTokenA}`,
        }, {
            permissions: [PERMISSIONS.HOSPITAL_UPDATE],
        });
        assert(res5.status === 403, "TEST 5: Standard employee cannot update permissions (returns 403)");

        // Test 6: Hospital isolation (Admin B cannot view Hospital A user)
        const res6 = await request("GET", `/api/v1/access-management/${empUserA._id}`, {
            Authorization: `Bearer ${adminTokenB}`,
        });
        assert(res6.status === 403, "TEST 6: Hospital isolation enforced for viewing user access (returns 403)");

        // Test 7: Hospital isolation (Admin B cannot update Hospital A user)
        const res7 = await request("PATCH", `/api/v1/access-management/${empUserA._id}`, {
            Authorization: `Bearer ${adminTokenB}`,
        }, {
            permissions: [PERMISSIONS.EMPLOYEE_CREATE],
        });
        assert(res7.status === 403, "TEST 7: Hospital isolation enforced for updating user access (returns 403)");

        // Test 8: Admin cannot modify own permissions (self-modification blocked)
        const res8 = await request("PATCH", `/api/v1/access-management/${adminUserA._id}`, {
            Authorization: `Bearer ${adminTokenA}`,
        }, {
            permissions: [],
        });
        assert(res8.status === 403, "TEST 8: Admin cannot self-modify access (returns 403)");

        // Test 9: Invalid permission strings rejected with 400 Bad Request
        const res9 = await request("PATCH", `/api/v1/access-management/${hrUserA._id}`, {
            Authorization: `Bearer ${adminTokenA}`,
        }, {
            permissions: ["invalid.fake.permission"],
        });
        assert(res9.status === 400, "TEST 9: Invalid permission strings rejected with 400");

        // Test 10: Invalid module keys rejected with 400 Bad Request
        const res10 = await request("PATCH", `/api/v1/access-management/${hrUserA._id}`, {
            Authorization: `Bearer ${adminTokenA}`,
        }, {
            modules: ["non_existent_module"],
        });
        assert(res10.status === 400, "TEST 10: Invalid module keys rejected with 400");

    } finally {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        console.log(`\nAccess Management Test results: ${passed} passed, ${failed} failed.\n`);
        if (failed > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    }
}

if (require.main === module) {
    runTests().catch((err) => {
        console.error("Test execution failed:", err);
        process.exit(1);
    });
}

module.exports = { runTests };
