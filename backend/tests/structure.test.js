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
let tokenA;
let hospitalA;

let adminB;
let tokenB;
let hospitalB;

let empViewOnly;
let tokenEmpViewOnly;

let empManage;
let tokenEmpManage;

let empNoPerm;
let tokenEmpNoPerm;

const testTimestamp = Date.now();

const setupTestEnvironment = async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
    }

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Create Admin A
    const passwordHash = await hashPassword("Test@1234");
    adminA = await User.create({
        name: `Admin A ${testTimestamp}`,
        email: `adminA_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "admin",
        status: "active",
    });

    hospitalA = await Hospital.create({
        name: `Hospital A ${testTimestamp}`,
        code: `HA${String(testTimestamp).slice(-6)}`,
        status: "active",
        createdBy: adminA._id,
    });

    await User.findByIdAndUpdate(adminA._id, { hospitalId: hospitalA._id });
    tokenA = generateToken({ id: adminA._id, role: adminA.role, hospitalId: hospitalA._id });

    // Create Admin B (for cross-hospital tests)
    adminB = await User.create({
        name: `Admin B ${testTimestamp}`,
        email: `adminB_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "admin",
        status: "active",
    });

    hospitalB = await Hospital.create({
        name: `Hospital B ${testTimestamp}`,
        code: `HB${String(testTimestamp).slice(-6)}`,
        status: "active",
        createdBy: adminB._id,
    });

    await User.findByIdAndUpdate(adminB._id, { hospitalId: hospitalB._id });
    tokenB = generateToken({ id: adminB._id, role: adminB.role, hospitalId: hospitalB._id });

    // Create Employee with structure.view only
    empViewOnly = await User.create({
        name: `Emp ViewOnly ${testTimestamp}`,
        email: `emp_view_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "employee",
        hospitalId: hospitalA._id,
        status: "active",
        permissions: ["structure.view"],
        modules: ["core", "hospital_structure"],
    });
    tokenEmpViewOnly = generateToken({ id: empViewOnly._id, role: "employee", hospitalId: hospitalA._id });

    // Create Employee with structure.manage
    empManage = await User.create({
        name: `Emp Manage ${testTimestamp}`,
        email: `emp_manage_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "employee",
        hospitalId: hospitalA._id,
        status: "active",
        permissions: ["structure.manage"],
        modules: ["core", "hospital_structure"],
    });
    tokenEmpManage = generateToken({ id: empManage._id, role: "employee", hospitalId: hospitalA._id });

    // Create Employee with no permissions
    empNoPerm = await User.create({
        name: `Emp NoPerm ${testTimestamp}`,
        email: `emp_noperm_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "employee",
        hospitalId: hospitalA._id,
        status: "active",
        permissions: [],
        modules: ["core"],
    });
    tokenEmpNoPerm = generateToken({ id: empNoPerm._id, role: "employee", hospitalId: hospitalA._id });
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
        if (adminA) {
            await User.findByIdAndDelete(adminA._id);
        }
        if (adminB) {
            await User.findByIdAndDelete(adminB._id);
        }
        if (empViewOnly) {
            await User.findByIdAndDelete(empViewOnly._id);
        }
        if (empManage) {
            await User.findByIdAndDelete(empManage._id);
        }
        if (empNoPerm) {
            await User.findByIdAndDelete(empNoPerm._id);
        }
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
    console.log("Starting Phase 2 Hospital Structure Verification Test Suite...");
    let passed = 0;
    let failed = 0;

    let createdFloor1;
    let createdFloor2;
    let createdRoom1;
    let createdRoom2;

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

        // TEST 1: Admin can create Floor
        await test("TEST 1: Admin can create Floor", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenA}`,
                },
                body: JSON.stringify({
                    name: "2nd Floor",
                    floorNumber: 2,
                    code: "F2",
                    description: "Second Floor Inpatient",
                }),
            });

            assert.strictEqual(res.status, 201);
            const body = await res.json();
            assert.strictEqual(body.success, true);
            assert.strictEqual(body.data.name, "2nd Floor");
            assert.strictEqual(body.data.floorNumber, 2);
            assert.strictEqual(body.data.code, "F2");
            assert.strictEqual(body.data.hospitalId.toString(), hospitalA._id.toString());
            createdFloor1 = body.data;
        });

        // TEST 2: Admin can list Floors
        await test("TEST 2: Admin can list Floors", async () => {
            // Also create a second floor
            const resCreate = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenA}`,
                },
                body: JSON.stringify({
                    name: "Ground Floor",
                    floorNumber: 0,
                    code: "GF",
                }),
            });
            assert.strictEqual(resCreate.status, 201);
            const createBody = await resCreate.json();
            createdFloor2 = createBody.data;

            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors`, {
                headers: {
                    Authorization: `Bearer ${tokenA}`,
                },
            });

            assert.strictEqual(res.status, 200);
            const body = await res.json();
            assert.strictEqual(body.success, true);
            assert.strictEqual(Array.isArray(body.data), true);
            assert.strictEqual(body.data.length, 2);
            // Verify roomCount is included
            assert.strictEqual(typeof body.data[0].roomCount, "number");
        });

        // TEST 3: Admin can update Floor
        await test("TEST 3: Admin can update Floor", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${createdFloor1._id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenA}`,
                },
                body: JSON.stringify({
                    name: "Second Floor Renamed",
                    description: "Updated description",
                }),
            });

            assert.strictEqual(res.status, 200);
            const body = await res.json();
            assert.strictEqual(body.success, true);
            assert.strictEqual(body.data.name, "Second Floor Renamed");
            assert.strictEqual(body.data.description, "Updated description");
        });

        // TEST 4: Admin can create Room
        await test("TEST 4: Admin can create Room", async () => {
            const res = await fetch(
                `${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${createdFloor1._id}/rooms`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${tokenA}`,
                    },
                    body: JSON.stringify({
                        name: "NICU",
                        code: "NICU-01",
                        description: "Neonatal Intensive Care Unit",
                    }),
                }
            );

            assert.strictEqual(res.status, 201);
            const body = await res.json();
            assert.strictEqual(body.success, true);
            assert.strictEqual(body.data.name, "NICU");
            assert.strictEqual(body.data.code, "NICU-01");
            assert.strictEqual(body.data.floorId.toString(), createdFloor1._id.toString());
            assert.strictEqual(body.data.hospitalId.toString(), hospitalA._id.toString());
            createdRoom1 = body.data;
        });

        // TEST 5: Admin can list Rooms for a Floor
        await test("TEST 5: Admin can list Rooms for a Floor", async () => {
            // Create a second room (ICU)
            const resCreate = await fetch(
                `${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${createdFloor1._id}/rooms`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${tokenA}`,
                    },
                    body: JSON.stringify({
                        name: "ICU",
                        code: "ICU-01",
                    }),
                }
            );
            assert.strictEqual(resCreate.status, 201);
            const createBody = await resCreate.json();
            createdRoom2 = createBody.data;

            const res = await fetch(
                `${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${createdFloor1._id}/rooms`,
                {
                    headers: {
                        Authorization: `Bearer ${tokenA}`,
                    },
                }
            );

            assert.strictEqual(res.status, 200);
            const body = await res.json();
            assert.strictEqual(body.success, true);
            assert.strictEqual(body.data.length, 2);
            assert.ok(body.data.some((r) => r.name === "NICU"));
            assert.ok(body.data.some((r) => r.name === "ICU"));
        });

        // TEST 6: Admin can update Room
        await test("TEST 6: Admin can update Room", async () => {
            const res = await fetch(
                `${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${createdFloor1._id}/rooms/${createdRoom1._id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${tokenA}`,
                    },
                    body: JSON.stringify({
                        name: "NICU Ward",
                        description: "Updated NICU Ward",
                    }),
                }
            );

            assert.strictEqual(res.status, 200);
            const body = await res.json();
            assert.strictEqual(body.success, true);
            assert.strictEqual(body.data.name, "NICU Ward");
            assert.strictEqual(body.data.description, "Updated NICU Ward");
        });

        // TEST 7: Admin can deactivate Room
        await test("TEST 7: Admin can deactivate Room", async () => {
            const res = await fetch(
                `${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${createdFloor1._id}/rooms/${createdRoom2._id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${tokenA}`,
                    },
                }
            );

            assert.strictEqual(res.status, 200);
            const body = await res.json();
            assert.strictEqual(body.success, true);
            assert.strictEqual(body.data.isActive, false);
            assert.strictEqual(body.data.status, "inactive");

            // Verify it is no longer returned in active rooms list
            const resList = await fetch(
                `${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${createdFloor1._id}/rooms`,
                {
                    headers: {
                        Authorization: `Bearer ${tokenA}`,
                    },
                }
            );
            const listBody = await resList.json();
            assert.strictEqual(listBody.data.length, 1);
            assert.strictEqual(listBody.data[0]._id.toString(), createdRoom1._id.toString());
        });

        // TEST 8: Floor with active Rooms cannot be deactivated (409 Conflict)
        await test("TEST 8: Floor with active Rooms cannot be deactivated (409 Conflict)", async () => {
            // createdFloor1 still has active room createdRoom1 (NICU Ward)
            const res = await fetch(
                `${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${createdFloor1._id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${tokenA}`,
                    },
                }
            );

            assert.strictEqual(res.status, 409);
            const body = await res.json();
            assert.strictEqual(body.success, false);
            assert.ok(body.message.includes("active rooms"));

            // Now deactivate remaining room
            await fetch(
                `${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${createdFloor1._id}/rooms/${createdRoom1._id}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${tokenA}` },
                }
            );

            // Now floor deactivation should succeed
            const resAfter = await fetch(
                `${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${createdFloor1._id}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${tokenA}` },
                }
            );
            assert.strictEqual(resAfter.status, 200);
            const afterBody = await resAfter.json();
            assert.strictEqual(afterBody.data.isActive, false);
        });

        // TEST 9: Cross-hospital Floor access fails
        await test("TEST 9: Cross-hospital Floor access fails", async () => {
            // Admin A attempts to access Hospital B's floors
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalB._id}/floors`, {
                headers: {
                    Authorization: `Bearer ${tokenA}`,
                },
            });

            assert.strictEqual(res.status, 403);
            const body = await res.json();
            assert.strictEqual(body.success, false);
        });

        // TEST 10: Cross-hospital Room access fails
        await test("TEST 10: Cross-hospital Room access fails", async () => {
            // Create a floor in Hospital B with Admin B
            const floorBRes = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalB._id}/floors`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenB}`,
                },
                body: JSON.stringify({
                    name: "Hospital B Floor 1",
                    floorNumber: 1,
                }),
            });
            const floorB = (await floorBRes.json()).data;

            // Admin A attempts to access Floor B's rooms using Hospital A parameter
            const res1 = await fetch(
                `${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${floorB._id}/rooms`,
                {
                    headers: {
                        Authorization: `Bearer ${tokenA}`,
                    },
                }
            );
            // Should fail with 404 because Floor B does not belong to Hospital A
            assert.strictEqual(res1.status, 404);

            // Admin A attempts to access Floor B using Hospital B parameter
            const res2 = await fetch(
                `${baseUrl}/api/v1/hospitals/${hospitalB._id}/floors/${floorB._id}/rooms`,
                {
                    headers: {
                        Authorization: `Bearer ${tokenA}`,
                    },
                }
            );
            // Should fail with 403 Forbidden
            assert.strictEqual(res2.status, 403);
        });

        // TEST 11: Unauthenticated request fails (401)
        await test("TEST 11: Unauthenticated request fails (401)", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors`);
            assert.strictEqual(res.status, 401);
            const body = await res.json();
            assert.strictEqual(body.success, false);
        });

        // TEST 12: Invalid Mongo ObjectId is handled cleanly (400)
        await test("TEST 12: Invalid Mongo ObjectId is handled cleanly (400)", async () => {
            const res1 = await fetch(`${baseUrl}/api/v1/hospitals/not-a-valid-id/floors`, {
                headers: { Authorization: `Bearer ${tokenA}` },
            });
            assert.strictEqual(res1.status, 400);

            const res2 = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/invalid-floor-id`, {
                headers: { Authorization: `Bearer ${tokenA}` },
            });
            assert.strictEqual(res2.status, 400);
        });

        // TEST 13: Duplicate Floor/Room returns 409
        await test("TEST 13: Duplicate Floor/Room returns 409", async () => {
            // createdFloor2 is "Ground Floor" with floorNumber: 0
            // Attempt to create another floor with name "Ground Floor" in Hospital A
            const dupNameRes = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenA}`,
                },
                body: JSON.stringify({
                    name: "Ground Floor",
                    floorNumber: 99,
                }),
            });
            assert.strictEqual(dupNameRes.status, 409);

            // Attempt to create another floor with floorNumber 0 in Hospital A
            const dupNumRes = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenA}`,
                },
                body: JSON.stringify({
                    name: "Alternate Name",
                    floorNumber: 0,
                }),
            });
            assert.strictEqual(dupNumRes.status, 409);

            // Create a room on createdFloor2
            const r1 = await fetch(
                `${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${createdFloor2._id}/rooms`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${tokenA}`,
                    },
                    body: JSON.stringify({ name: "Emergency" }),
                }
            );
            assert.strictEqual(r1.status, 201);

            // Attempt duplicate room on same floor
            const dupRoomRes = await fetch(
                `${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${createdFloor2._id}/rooms`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${tokenA}`,
                    },
                    body: JSON.stringify({ name: "Emergency" }),
                }
            );
            assert.strictEqual(dupRoomRes.status, 409);
        });

        // TEST 14: Existing login still works
        await test("TEST 14: Existing login still works", async () => {
            const res = await fetch(`${baseUrl}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: adminA.email,
                    password: "Test@1234",
                }),
            });

            assert.strictEqual(res.status, 200);
            const body = await res.json();
            assert.strictEqual(body.success, true);
            assert.ok(body.data.token);
            assert.strictEqual(body.data.user.email, adminA.email);
        });

        // TEST 15: Existing dashboard still works
        await test("TEST 15: Existing dashboard overview still works", async () => {
            const res = await fetch(`${baseUrl}/api/hospitals/overview`, {
                headers: { Authorization: `Bearer ${tokenA}` },
            });

            assert.strictEqual(res.status, 200);
            const body = await res.json();
            assert.strictEqual(body.success, true);
            assert.ok(body.data.hospital);
        });

        // TEST 16: Existing Hospital functionality still works
        await test("TEST 16: Existing Hospital functionality still works", async () => {
            const res = await fetch(`${baseUrl}/api/hospitals/me`, {
                headers: { Authorization: `Bearer ${tokenA}` },
            });

            assert.strictEqual(res.status, 200);
            const body = await res.json();
            assert.strictEqual(body.success, true);
            assert.strictEqual(body.data._id.toString(), hospitalA._id.toString());
        });

        // TEST 17: Employee with structure.view can view structure
        await test("TEST 17: Employee with structure.view can list floors and rooms in own hospital", async () => {
            const resFloors = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors`, {
                headers: { Authorization: `Bearer ${tokenEmpViewOnly}` },
            });
            assert.strictEqual(resFloors.status, 200);
            const floorData = await resFloors.json();
            assert.strictEqual(floorData.success, true);
            assert.ok(Array.isArray(floorData.data));

            const resRooms = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${createdFloor2._id}/rooms`, {
                headers: { Authorization: `Bearer ${tokenEmpViewOnly}` },
            });
            assert.strictEqual(resRooms.status, 200);
            const roomData = await resRooms.json();
            assert.strictEqual(roomData.success, true);
        });

        // TEST 18: Employee without structure.view cannot view structure (403 Forbidden)
        await test("TEST 18: Employee without structure.view cannot view structure (403 Forbidden)", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors`, {
                headers: { Authorization: `Bearer ${tokenEmpNoPerm}` },
            });
            assert.strictEqual(res.status, 403);
            const body = await res.json();
            assert.strictEqual(body.success, false);
        });

        // TEST 19: Employee with structure.manage can create/update floors and rooms
        await test("TEST 19: Employee with structure.manage can create floors and rooms", async () => {
            const resCreateFloor = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenEmpManage}`,
                },
                body: JSON.stringify({
                    name: "3rd Floor Managed",
                    floorNumber: 3,
                    code: "F3M",
                }),
            });
            assert.strictEqual(resCreateFloor.status, 201);
            const floorBody = await resCreateFloor.json();
            assert.strictEqual(floorBody.success, true);

            const resCreateRoom = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors/${floorBody.data._id}/rooms`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenEmpManage}`,
                },
                body: JSON.stringify({
                    name: "Room 301 Managed",
                    code: "R301M",
                }),
            });
            assert.strictEqual(resCreateRoom.status, 201);
            const roomBody = await resCreateRoom.json();
            assert.strictEqual(roomBody.success, true);
        });

        // TEST 20: Employee without structure.manage cannot create floors (403 Forbidden)
        await test("TEST 20: Employee without structure.manage cannot create floors (403 Forbidden)", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalA._id}/floors`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenEmpViewOnly}`,
                },
                body: JSON.stringify({
                    name: "Unauthorized Floor",
                    floorNumber: 99,
                }),
            });
            assert.strictEqual(res.status, 403);
            const body = await res.json();
            assert.strictEqual(body.success, false);
        });

        // TEST 21: Employee from Hospital A cannot access Hospital B structure
        await test("TEST 21: Employee from Hospital A cannot access Hospital B structure (403 Forbidden)", async () => {
            const res = await fetch(`${baseUrl}/api/v1/hospitals/${hospitalB._id}/floors`, {
                headers: { Authorization: `Bearer ${tokenEmpManage}` },
            });
            assert.strictEqual(res.status, 403);
            const body = await res.json();
            assert.strictEqual(body.success, false);
        });
    } finally {
        await cleanupTestEnvironment();
    }

    console.log(`\nTest results: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        process.exit(1);
    }
};

runTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
