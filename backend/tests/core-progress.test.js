const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
const assert = require("assert");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = require("../index");
const User = require("../src/models/user.model");
const Hospital = require("../src/models/hospital.model");
const CoreProgress = require("../src/models/coreProgress.model");
const { seedCoreProgress } = require("../src/config/coreProgress.seed");
const { hashPassword } = require("../src/utils/password");
const { generateToken } = require("../src/utils/jwt");

let server;
let baseUrl;

let superAdminUser;
let tokenSuperAdmin;

let adminUser;
let tokenAdmin;

let hrUser;
let tokenHr;

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

    // Super Admin user
    superAdminUser = await User.create({
        name: `Super Admin Core ${testTimestamp}`,
        email: `super_cp_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "super_admin",
        status: "active",
    });
    tokenSuperAdmin = generateToken({ id: superAdminUser._id.toString(), role: "super_admin" });

    // Admin user
    adminUser = await User.create({
        name: `Admin Core ${testTimestamp}`,
        email: `admin_cp_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "admin",
        status: "active",
    });
    tokenAdmin = generateToken({ id: adminUser._id.toString(), role: "admin" });

    // HR user
    hrUser = await User.create({
        name: `HR Core ${testTimestamp}`,
        email: `hr_cp_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "hr",
        status: "active",
    });
    tokenHr = generateToken({ id: hrUser._id.toString(), role: "hr" });
};

const cleanupTestEnvironment = async () => {
    try {
        await User.deleteMany({
            email: {
                $in: [superAdminUser?.email, adminUser?.email, hrUser?.email],
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
    console.log("Starting Core Progress Test Suite...");
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

    let sampleFeatureId;

    try {
        await setupTestEnvironment();

        // 1. Seed Core Progress
        await test("TEST 1: seedCoreProgress populates 7 modules and 57 features", async () => {
            await seedCoreProgress();
            const count = await CoreProgress.countDocuments({ isActive: true });
            assert.strictEqual(count, 57, `Expected 57 features, found ${count}`);
        });

        // 2. Idempotency test
        await test("TEST 2: Calling seedCoreProgress again does not duplicate records", async () => {
            await seedCoreProgress();
            const count = await CoreProgress.countDocuments({ isActive: true });
            assert.strictEqual(count, 57, `Count after second seed must still be 57, found ${count}`);
        });

        // 3. GET /api/v1/core-progress (Super Admin)
        await test("TEST 3: Super Admin can access GET /api/v1/core-progress with summary", async () => {
            const res = await apiRequest("/api/v1/core-progress", {
                headers: { Authorization: `Bearer ${tokenSuperAdmin}` },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            assert(Array.isArray(res.data.data.modules), "modules must be an array");
            assert.strictEqual(res.data.data.modules.length, 7, "must have 7 core modules");
            assert(res.data.data.summary, "summary must be present");
            assert.strictEqual(res.data.data.summary.totalFeatures, 57);
            assert(typeof res.data.data.summary.completionPercentage === "number");

            // Pick a sample feature for subsequent tests
            sampleFeatureId = res.data.data.modules[0].features[0]._id;
            assert(sampleFeatureId, "Sample feature must have an ID");
        });

        // 4. Admin role is rejected (403)
        await test("TEST 4: Admin cannot access Core Progress (403 Forbidden)", async () => {
            const res = await apiRequest("/api/v1/core-progress", {
                headers: { Authorization: `Bearer ${tokenAdmin}` },
            });
            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.data.success, false);
            assert(res.data.message.includes("Super Admin"));
        });

        // 5. HR role is rejected (403)
        await test("TEST 5: HR cannot access Core Progress (403 Forbidden)", async () => {
            const res = await apiRequest("/api/v1/core-progress", {
                headers: { Authorization: `Bearer ${tokenHr}` },
            });
            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.data.success, false);
            assert(res.data.message.includes("Super Admin"));
        });

        // 6. GET /api/v1/core-progress/:featureId (Super Admin)
        await test("TEST 6: Super Admin can GET /api/v1/core-progress/:featureId", async () => {
            const res = await apiRequest(`/api/v1/core-progress/${sampleFeatureId}`, {
                headers: { Authorization: `Bearer ${tokenSuperAdmin}` },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            assert.strictEqual(res.data.data._id, sampleFeatureId);
            assert(res.data.data.moduleKey);
            assert(res.data.data.featureKey);
        });

        // 7. PATCH /api/v1/core-progress/:featureId updates status and notes (Super Admin)
        await test("TEST 7: Super Admin can update feature status and notes", async () => {
            const res = await apiRequest(`/api/v1/core-progress/${sampleFeatureId}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenSuperAdmin}` },
                body: {
                    status: "BLOCKED",
                    notes: "Temporarily blocked pending verification",
                },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            assert.strictEqual(res.data.data.status, "BLOCKED");
            assert.strictEqual(res.data.data.notes, "Temporarily blocked pending verification");
        });

        // 8. Persistence check: subsequent GET reflects changes
        await test("TEST 8: Updated status and notes persist in MongoDB", async () => {
            const res = await apiRequest(`/api/v1/core-progress/${sampleFeatureId}`, {
                headers: { Authorization: `Bearer ${tokenSuperAdmin}` },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.data.status, "BLOCKED");
            assert.strictEqual(res.data.data.notes, "Temporarily blocked pending verification");
            assert.strictEqual(res.data.data.updatedBy?._id, superAdminUser._id.toString());
        });

        // 9. Re-seeding preserves user-modified status and notes
        await test("TEST 9: seedCoreProgress preserves user modifications (idempotent)", async () => {
            await seedCoreProgress();
            const feature = await CoreProgress.findById(sampleFeatureId);
            assert.strictEqual(feature.status, "BLOCKED", "Modified status must be preserved");
            assert.strictEqual(feature.notes, "Temporarily blocked pending verification", "Notes must be preserved");
        });

        // 10. Revert sample feature to DONE
        await test("TEST 10: Super Admin can update status back to DONE", async () => {
            const res = await apiRequest(`/api/v1/core-progress/${sampleFeatureId}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenSuperAdmin}` },
                body: {
                    status: "DONE",
                    notes: "Verified and functional",
                },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.data.status, "DONE");
        });

        // 11. Admin PATCH is rejected (403)
        await test("TEST 11: Admin user cannot update Core Progress (403 Forbidden)", async () => {
            const res = await apiRequest(`/api/v1/core-progress/${sampleFeatureId}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenAdmin}` },
                body: { status: "DONE" },
            });
            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.data.success, false);
            assert(res.data.message.includes("Super Admin"));
        });

        // 12. HR PATCH is rejected (403)
        await test("TEST 12: HR user cannot update Core Progress (403 Forbidden)", async () => {
            const res = await apiRequest(`/api/v1/core-progress/${sampleFeatureId}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenHr}` },
                body: { status: "DONE" },
            });
            assert.strictEqual(res.status, 403);
            assert.strictEqual(res.data.success, false);
            assert(res.data.message.includes("Super Admin"));
        });

        // 13. Unauthenticated request returns 401
        await test("TEST 13: Unauthenticated request returns 401 Unauthorized", async () => {
            const res = await apiRequest("/api/v1/core-progress");
            assert.strictEqual(res.status, 401);
            assert.strictEqual(res.data.success, false);
        });

        // 14. Invalid status returns 400
        await test("TEST 14: Invalid status value returns 400 Bad Request", async () => {
            const res = await apiRequest(`/api/v1/core-progress/${sampleFeatureId}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenSuperAdmin}` },
                body: { status: "SUPER_DONE" },
            });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.data.success, false);
            assert(res.data.message.includes("Invalid status"));
        });

        // 15. Invalid ObjectId returns 400
        await test("TEST 15: Invalid ObjectId format returns 400 Bad Request", async () => {
            const res = await apiRequest("/api/v1/core-progress/invalid-id-123", {
                headers: { Authorization: `Bearer ${tokenSuperAdmin}` },
            });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.data.success, false);
        });

        // 16. Non-existent feature returns 404
        await test("TEST 16: Non-existent feature ID returns 404 Not Found", async () => {
            const dummyId = new mongoose.Types.ObjectId().toString();
            const res = await apiRequest(`/api/v1/core-progress/${dummyId}`, {
                headers: { Authorization: `Bearer ${tokenSuperAdmin}` },
            });
            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.data.success, false);
        });
    } finally {
        await cleanupTestEnvironment();
    }

    console.log(`\nCore Progress Test results: ${passed} passed, ${failed} failed.\n`);
    if (failed > 0) {
        process.exit(1);
    }
};

runTests().catch((err) => {
    console.error("Test runner fatal error:", err);
    process.exit(1);
});
