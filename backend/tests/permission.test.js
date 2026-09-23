const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
const assert = require("assert");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = require("../index");
const User = require("../src/models/user.model");
const Hospital = require("../src/models/hospital.model");
const Floor = require("../src/models/floor.model");
const Room = require("../src/models/room.model");
const { hashPassword } = require("../src/utils/password");
const { generateToken } = require("../src/utils/jwt");

let server;
let baseUrl;

let adminA;
let tokenAdminA;
let hospitalA;

let hrA;
let tokenHrA;

let adminB;
let tokenAdminB;
let hospitalB;

let superAdminUser;
let tokenSuperAdmin;

const testTimestamp = Date.now();

const setupTestEnvironment = async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const passwordHash = await hashPassword("Test@1234");

    // 1. Create Admin A & Hospital A
    adminA = await User.create({
        name: `Admin A ${testTimestamp}`,
        email: `adminA_perm_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "admin",
        status: "active",
    });

    hospitalA = await Hospital.create({
        name: `Hospital A ${testTimestamp}`,
        code: `PA${String(testTimestamp).slice(-6)}`,
        status: "active",
        createdBy: adminA._id,
    });

    await User.findByIdAndUpdate(adminA._id, { hospitalId: hospitalA._id });
    tokenAdminA = generateToken({ id: adminA._id, role: adminA.role, hospitalId: hospitalA._id });

    // 2. Create Employee for Hospital A
    hrA = await User.create({
        name: `Employee A ${testTimestamp}`,
        email: `empA_perm_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "employee",
        status: "active",
        hospitalId: hospitalA._id,
        createdBy: adminA._id,
    });
    tokenHrA = generateToken({ id: hrA._id, role: hrA.role, hospitalId: hospitalA._id });

    // 3. Create Admin B & Hospital B (for isolation tests)
    adminB = await User.create({
        name: `Admin B ${testTimestamp}`,
        email: `adminB_perm_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "admin",
        status: "active",
    });

    hospitalB = await Hospital.create({
        name: `Hospital B ${testTimestamp}`,
        code: `PB${String(testTimestamp).slice(-6)}`,
        status: "active",
        createdBy: adminB._id,
    });

    await User.findByIdAndUpdate(adminB._id, { hospitalId: hospitalB._id });
    tokenAdminB = generateToken({ id: adminB._id, role: adminB.role, hospitalId: hospitalB._id });

    // 4. Create Super Admin
    superAdminUser = await User.create({
        name: `SuperAdmin ${testTimestamp}`,
        email: `super_perm_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "super_admin",
        status: "active",
    });
    tokenSuperAdmin = generateToken({ id: superAdminUser._id, role: superAdminUser.role });
};

const cleanupTestEnvironment = async () => {
    try {
        if (hospitalA) {
            await Room.deleteMany({ hospitalId: hospitalA._id });
            await Floor.deleteMany({ hospitalId: hospitalA._id });
            await Hospital.findByIdAndDelete(hospitalA._id);
        }
        if (hospitalB) {
            await Room.deleteMany({ hospitalId: hospitalB._id });
            await Floor.deleteMany({ hospitalId: hospitalB._id });
            await Hospital.findByIdAndDelete(hospitalB._id);
        }
        if (adminA) await User.findByIdAndDelete(adminA._id);
        if (adminB) await User.findByIdAndDelete(adminB._id);
        if (hrA) await User.findByIdAndDelete(hrA._id);
        if (superAdminUser) await User.findByIdAndDelete(superAdminUser._id);
    } catch (err) {
        console.error("Cleanup error:", err);
    } finally {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        await mongoose.disconnect();
    }
};

const runTests = async () => {
    console.log("Starting Phase 3 Role & Permission System Verification Test Suite...");
    let passed = 0;
    let failed = 0;

    let testFloor;
    let testRoom;

    const test = async (name, fn) => {
        try {
            await fn();
            console.log(`  ✓ ${name}`);
            passed++;
        } catch (error) {
            console.error(`  ✗ ${name}`);
            console.error(error);
            failed++;
        }
    };

    try {
        await setupTestEnvironment();

        // 1. Admin can create a floor (structure.create)
        await test("TEST 1: Admin can create a floor (structure.create)", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenAdminA}`,
                },
                body: JSON.stringify({
                    name: "Permission Test Floor 1",
                    floorNumber: 1,
                    code: "PTF1",
                }),
            });
            assert.strictEqual(res.status, 201);
            const data = await res.json();
            assert.strictEqual(data.success, true);
            testFloor = data.data;
        });

        // 2. Admin can update a floor (structure.update)
        await test("TEST 2: Admin can update a floor (structure.update)", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${testFloor._id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenAdminA}`,
                },
                body: JSON.stringify({
                    description: "Updated by Admin A",
                }),
            });
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.success, true);
            assert.strictEqual(data.data.description, "Updated by Admin A");
        });

        // 3. Admin can create a room (structure.create)
        await test("TEST 3: Admin can create a room (structure.create)", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${testFloor._id}/rooms`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenAdminA}`,
                },
                body: JSON.stringify({
                    name: "ICU 101",
                    code: "ICU101",
                }),
            });
            assert.strictEqual(res.status, 201);
            const data = await res.json();
            assert.strictEqual(data.success, true);
            testRoom = data.data;
        });

        // 4. Admin can update a room (structure.update)
        await test("TEST 4: Admin can update a room (structure.update)", async () => {
            const res = await fetch(
                `${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${testFloor._id}/rooms/${testRoom._id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${tokenAdminA}`,
                    },
                    body: JSON.stringify({
                        description: "Updated Room Description",
                    }),
                }
            );
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.success, true);
        });

        // 5. HR cannot create a floor (403 Forbidden)
        await test("TEST 5: HR cannot create a floor (returns 403 Forbidden)", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenHrA}`,
                },
                body: JSON.stringify({
                    name: "Unauthorized Floor",
                    floorNumber: 99,
                    code: "UF99",
                }),
            });
            assert.strictEqual(res.status, 403);
            const data = await res.json();
            assert.strictEqual(data.success, false);
            assert.strictEqual(data.message, "You do not have permission to perform this action");
        });

        // 6. HR cannot update a floor (403 Forbidden)
        await test("TEST 6: HR cannot update a floor (returns 403 Forbidden)", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${testFloor._id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenHrA}`,
                },
                body: JSON.stringify({
                    description: "Hacked by HR",
                }),
            });
            assert.strictEqual(res.status, 403);
            const data = await res.json();
            assert.strictEqual(data.success, false);
            assert.strictEqual(data.message, "You do not have permission to perform this action");
        });

        // 7. HR cannot create a room (403 Forbidden)
        await test("TEST 7: HR cannot create a room (returns 403 Forbidden)", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${testFloor._id}/rooms`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenHrA}`,
                },
                body: JSON.stringify({
                    name: "Unauthorized Room",
                    code: "UR99",
                }),
            });
            assert.strictEqual(res.status, 403);
            const data = await res.json();
            assert.strictEqual(data.success, false);
            assert.strictEqual(data.message, "You do not have permission to perform this action");
        });

        // 8. HR cannot update a room (403 Forbidden)
        await test("TEST 8: HR cannot update a room (returns 403 Forbidden)", async () => {
            const res = await fetch(
                `${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${testFloor._id}/rooms/${testRoom._id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${tokenHrA}`,
                    },
                    body: JSON.stringify({
                        description: "Hacked by HR",
                    }),
                }
            );
            assert.strictEqual(res.status, 403);
            const data = await res.json();
            assert.strictEqual(data.success, false);
            assert.strictEqual(data.message, "You do not have permission to perform this action");
        });

        // 9. HR cannot deactivate a floor (403 Forbidden)
        await test("TEST 9: HR cannot deactivate a floor (returns 403 Forbidden)", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${testFloor._id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${tokenHrA}`,
                },
            });
            assert.strictEqual(res.status, 403);
            const data = await res.json();
            assert.strictEqual(data.success, false);
            assert.strictEqual(data.message, "You do not have permission to perform this action");
        });

        // 10. Unauthenticated requests return 401
        await test("TEST 10: Unauthenticated request returns 401", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors`, {
                method: "GET",
            });
            assert.strictEqual(res.status, 401);
            const data = await res.json();
            assert.strictEqual(data.success, false);
        });

        // 11. Admin cannot access another hospital's structure (Isolation check)
        await test("TEST 11: Admin cannot access another hospital's structure (hospital isolation preserved)", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalB._id}/floors`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${tokenAdminA}`,
                },
            });
            assert.strictEqual(res.status, 403);
            const data = await res.json();
            assert.strictEqual(data.success, false);
            assert.strictEqual(data.message, "Access denied to requested hospital");
        });

        // 12. Super Admin can view hospital structure (structure.view)
        await test("TEST 12: Super Admin can view hospital structure across platform", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${tokenSuperAdmin}`,
                },
            });
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.success, true);
            assert(Array.isArray(data.data));
        });

        // 13. HR can view auth profile
        await test("TEST 13: HR can view own auth profile", async () => {
            const res = await fetch(`${baseUrl}/api/auth/me`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${tokenHrA}`,
                },
            });
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.success, true);
            assert.strictEqual(data.data.email, hrA.email);
        });

        // 14. Admin can view employee records (employee.view)
        await test("TEST 14: Admin can view employee records (employee.view)", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hrms/employees`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${tokenAdminA}`,
                },
            });
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data.success, true);
            assert(Array.isArray(data.data.employees));
        });

    } finally {
        await cleanupTestEnvironment();
    }

    console.log(`\nPermission Test results: ${passed} passed, ${failed} failed.\n`);
    if (failed > 0) {
        process.exit(1);
    }
};

runTests().catch((err) => {
    console.error("Fatal test suite error:", err);
    process.exit(1);
});
