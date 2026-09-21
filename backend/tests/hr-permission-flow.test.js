const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
const assert = require("assert");
const crypto = require("crypto");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = require("../index");
const User = require("../src/models/user.model");
const Hospital = require("../src/models/hospital.model");
const Invitation = require("../src/models/invitation.model");
const Floor = require("../src/models/floor.model");
const Room = require("../src/models/room.model");
const { hashPassword } = require("../src/utils/password");
const { generateToken } = require("../src/utils/jwt");

let server;
let baseUrl;

let adminA;
let tokenAdminA;
let hospitalA;

let adminB;
let tokenAdminB;
let hospitalB;

let hrA;
let tokenHrA;

let testFloorA;

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
        email: `adminA_hrflow_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "admin",
        status: "active",
    });

    hospitalA = await Hospital.create({
        name: `Hospital A HRFlow ${testTimestamp}`,
        code: `HA${String(testTimestamp).slice(-6)}`,
        status: "active",
        createdBy: adminA._id,
    });

    adminA.hospitalId = hospitalA._id;
    await adminA.save();
    tokenAdminA = generateToken({ id: adminA._id.toString(), role: "admin", hospitalId: hospitalA._id.toString() });

    // 2. Create Admin B & Hospital B
    adminB = await User.create({
        name: `Admin B ${testTimestamp}`,
        email: `adminB_hrflow_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "admin",
        status: "active",
    });

    hospitalB = await Hospital.create({
        name: `Hospital B HRFlow ${testTimestamp}`,
        code: `HB${String(testTimestamp).slice(-6)}`,
        status: "active",
        createdBy: adminB._id,
    });

    adminB.hospitalId = hospitalB._id;
    await adminB.save();
    tokenAdminB = generateToken({ id: adminB._id.toString(), role: "admin", hospitalId: hospitalB._id.toString() });

    // 3. Create a floor in Hospital A by Admin A
    testFloorA = await Floor.create({
        hospitalId: hospitalA._id,
        name: `Floor 1 ${testTimestamp}`,
        floorNumber: 1,
        status: "active",
        isActive: true,
        createdBy: adminA._id,
    });
};

const cleanupTestEnvironment = async () => {
    try {
        if (hospitalA) {
            await Floor.deleteMany({ hospitalId: hospitalA._id });
            await Room.deleteMany({ hospitalId: hospitalA._id });
            await Invitation.deleteMany({ hospitalId: hospitalA._id });
            await Hospital.deleteOne({ _id: hospitalA._id });
        }
        if (hospitalB) {
            await Floor.deleteMany({ hospitalId: hospitalB._id });
            await Room.deleteMany({ hospitalId: hospitalB._id });
            await Invitation.deleteMany({ hospitalId: hospitalB._id });
            await Hospital.deleteOne({ _id: hospitalB._id });
        }
        await User.deleteMany({
            email: {
                $in: [
                    adminA?.email,
                    adminB?.email,
                    `hrA_${testTimestamp}@example.com`,
                ],
            },
        });
    } catch (e) {
        console.error("Cleanup error:", e.message);
    }

    if (server) {
        await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
};

const apiRequest = async (path, options = {}) => {
    const url = `${baseUrl}${path}`;
    const headers = { "Content-Type": "application/json", ...options.headers };
    const fetchOptions = {
        method: options.method || "GET",
        headers,
    };
    if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, fetchOptions);
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = text;
    }
    return { status: res.status, data };
};

const runTests = async () => {
    console.log("Starting HR Invitation & Permission Flow Test Suite...");
    let passed = 0;
    let failed = 0;

    const test = async (name, fn) => {
        try {
            await fn();
            console.log(`  ✓ ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ✗ ${name}`);
            console.error("    Error:", err.message);
            failed++;
        }
    };

    let rawInvitationToken;
    let invitationId;

    try {
        await setupTestEnvironment();

        // 1. Admin creates invitation (mocking token directly or creating record)
        await test("TEST 1: Admin can create HR invitation and list invitations", async () => {
            rawInvitationToken = crypto.randomBytes(32).toString("hex");
            const tokenHash = crypto.createHash("sha256").update(rawInvitationToken).digest("hex");
            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

            const inv = await Invitation.create({
                type: "HR",
                firstName: "HR User",
                lastName: `${testTimestamp}`,
                email: `hrA_${testTimestamp}@example.com`,
                phone: "9876543210",
                hospitalId: hospitalA._id,
                invitedBy: adminA._id,
                tokenHash,
                expiresAt,
                status: "pending",
                role: "hr",
                modules: ["core"],
            });
            invitationId = inv._id.toString();

            // Admin lists invitations
            const res = await apiRequest("/api/v1/hr/invitations", {
                headers: { Authorization: `Bearer ${tokenAdminA}` },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            const found = res.data.data.find((i) => i._id === invitationId);
            assert(found, "Created invitation must be in listed invitations");
            assert.strictEqual(found.status, "pending");
        });

        // 2. HR accepts invitation
        await test("TEST 2: HR accepts invitation via token and account is created with permissions: []", async () => {
            const res = await apiRequest(`/api/v1/hr/invite/${rawInvitationToken}/accept`, {
                method: "POST",
                body: { password: "Password123!" },
            });
            assert.strictEqual(res.status, 201);
            assert.strictEqual(res.data.success, true);
            assert.strictEqual(res.data.data.role, "hr");

            // Fetch created user
            hrA = await User.findOne({ email: `hrA_${testTimestamp}@example.com` });
            assert(hrA, "HR user must exist in database");
            assert.deepStrictEqual(hrA.permissions, [], "New HR permissions must default to empty array");

            tokenHrA = generateToken({
                id: hrA._id.toString(),
                role: "hr",
                hospitalId: hospitalA._id.toString(),
            });
        });

        // 3. /auth/me returns permissions
        await test("TEST 3: /auth/me returns user permissions array", async () => {
            const res = await apiRequest("/api/auth/me", {
                headers: { Authorization: `Bearer ${tokenHrA}` },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            assert(Array.isArray(res.data.data.permissions), "Permissions must be an array");
            assert.strictEqual(res.data.data.permissions.length, 0);
        });

        // 4. HR cannot view floors before permission granted
        await test("TEST 4: HR cannot view floors before permissions granted (403 Forbidden)", async () => {
            const res = await apiRequest(`/api/v1/hospitals/${hospitalA._id}/floors`, {
                headers: { Authorization: `Bearer ${tokenHrA}` },
            });
            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.data.success, false);
            assert(res.data.message.includes("permission"), "Message must mention permission");
        });

        // 5. Admin views HR permissions
        await test("TEST 5: Admin can view HR permissions (GET /api/v1/hr/:hrId/permissions)", async () => {
            const res = await apiRequest(`/api/v1/hr/${hrA._id}/permissions`, {
                headers: { Authorization: `Bearer ${tokenAdminA}` },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            assert.deepStrictEqual(res.data.data.permissions, []);
        });

        // 6. Admin grants structure.view
        await test("TEST 6: Admin grants structure.view to HR", async () => {
            const res = await apiRequest(`/api/v1/hr/${hrA._id}/permissions`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenAdminA}` },
                body: { permissions: ["structure.view"] },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            assert.deepStrictEqual(res.data.data.permissions, ["structure.view"]);
        });

        // 7. HR can now view floors
        await test("TEST 7: HR can view floors after receiving structure.view (200 OK)", async () => {
            const res = await apiRequest(`/api/v1/hospitals/${hospitalA._id}/floors`, {
                headers: { Authorization: `Bearer ${tokenHrA}` },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            assert(Array.isArray(res.data.data));
            assert(res.data.data.length >= 1);
        });

        // 8. HR cannot create a floor without structure.create
        let createdFloorIdByHr;
        await test("TEST 8: HR cannot create floor without structure.create (403 Forbidden)", async () => {
            const res = await apiRequest(`/api/v1/hospitals/${hospitalA._id}/floors`, {
                method: "POST",
                headers: { Authorization: `Bearer ${tokenHrA}` },
                body: { name: "HR New Floor", floorNumber: 2 },
            });
            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.data.success, false);
        });

        // 9. Admin grants structure.create & structure.update
        await test("TEST 9: Admin grants structure.create and structure.update to HR", async () => {
            const res = await apiRequest(`/api/v1/hr/${hrA._id}/permissions`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenAdminA}` },
                body: {
                    permissions: ["structure.view", "structure.create", "structure.update"],
                },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            assert.deepStrictEqual(res.data.data.permissions, [
                "structure.view",
                "structure.create",
                "structure.update",
            ]);
        });

        // 10. HR can now create floor and update floor
        await test("TEST 10: HR can create floor and update floor after receiving permissions", async () => {
            // Create floor
            const createRes = await apiRequest(`/api/v1/hospitals/${hospitalA._id}/floors`, {
                method: "POST",
                headers: { Authorization: `Bearer ${tokenHrA}` },
                body: { name: `HR Floor ${testTimestamp}`, floorNumber: 10 },
            });
            assert.strictEqual(createRes.status, 201);
            assert.strictEqual(createRes.data.success, true);
            createdFloorIdByHr = createRes.data.data._id;

            // Update floor
            const updateRes = await apiRequest(
                `/api/v1/hospitals/${hospitalA._id}/floors/${createdFloorIdByHr}`,
                {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${tokenHrA}` },
                    body: { description: "Updated by authorized HR" },
                }
            );
            assert.strictEqual(updateRes.status, 200);
            assert.strictEqual(updateRes.data.success, true);
        });

        // 11. HR cannot deactivate floor without structure.delete
        await test("TEST 11: HR cannot deactivate floor without structure.delete (403 Forbidden)", async () => {
            const res = await apiRequest(
                `/api/v1/hospitals/${hospitalA._id}/floors/${createdFloorIdByHr}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${tokenHrA}` },
                }
            );
            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.data.success, false);
        });

        // 12. Admin grants structure.delete -> HR can deactivate floor
        await test("TEST 12: Admin grants structure.delete -> HR can deactivate floor", async () => {
            await apiRequest(`/api/v1/hr/${hrA._id}/permissions`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenAdminA}` },
                body: {
                    permissions: [
                        "structure.view",
                        "structure.create",
                        "structure.update",
                        "structure.delete",
                    ],
                },
            });

            const res = await apiRequest(
                `/api/v1/hospitals/${hospitalA._id}/floors/${createdFloorIdByHr}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${tokenHrA}` },
                }
            );
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
        });

        // 13. Hospital Scoping: HR cannot access Hospital B structure
        await test("TEST 13: HR A cannot access Hospital B's structure (hospital isolation preserved)", async () => {
            const res = await apiRequest(`/api/v1/hospitals/${hospitalB._id}/floors`, {
                headers: { Authorization: `Bearer ${tokenHrA}` },
            });
            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.data.success, false);
        });

        // 14. Admin B cannot modify HR A's permissions
        await test("TEST 14: Admin B cannot modify HR A permissions (cross-hospital security enforced)", async () => {
            const res = await apiRequest(`/api/v1/hr/${hrA._id}/permissions`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenAdminB}` },
                body: { permissions: ["structure.view"] },
            });
            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.data.success, false);
        });

        // 15. HR cannot modify their own permissions
        await test("TEST 15: HR cannot modify permissions (self-modification blocked with 403)", async () => {
            const res = await apiRequest(`/api/v1/hr/${hrA._id}/permissions`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenHrA}` },
                body: { permissions: ["structure.view"] },
            });
            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.data.success, false);
        });

        // 16. Validation: Invalid permission rejected
        await test("TEST 16: Unknown permission strings rejected with 400 Bad Request", async () => {
            const res = await apiRequest(`/api/v1/hr/${hrA._id}/permissions`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenAdminA}` },
                body: { permissions: ["structure.view", "superadmin.all", "invalid.hack"] },
            });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.data.success, false);
            assert(res.data.message.includes("Invalid permissions"));
        });
    } finally {
        await cleanupTestEnvironment();
    }

    console.log(`\nHR Permission Flow Test results: ${passed} passed, ${failed} failed.\n`);
    if (failed > 0) {
        process.exit(1);
    }
};

runTests().catch((err) => {
    console.error("Test runner encountered fatal error:", err);
    process.exit(1);
});
