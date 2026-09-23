const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
const assert = require("assert");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = require("../index");
const User = require("../src/models/user.model");
const Hospital = require("../src/models/hospital.model");
const { hashPassword } = require("../src/utils/password");
const { generateToken } = require("../src/utils/jwt");

let server;
let baseUrl;

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

    const passwordHash = await hashPassword("InitialPass@123");

    // Admin user
    adminUser = await User.create({
        name: `Platform Admin ${testTimestamp}`,
        email: `platform_admin_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "admin",
        status: "active",
    });
    tokenAdmin = generateToken({ id: adminUser._id.toString(), role: "admin" });

    // Employee user
    hrUser = await User.create({
        name: `Platform Employee ${testTimestamp}`,
        email: `platform_emp_${testTimestamp}@example.com`,
        password: passwordHash,
        role: "employee",
        status: "active",
        permissions: ["structure.view"],
    });
    tokenHr = generateToken({ id: hrUser._id.toString(), role: "employee" });
};

const cleanupTestEnvironment = async () => {
    try {
        await User.deleteMany({
            email: {
                $in: [adminUser?.email, hrUser?.email],
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
    console.log("Starting Core Platform Test Suite (Auth, Profile, Password, Modules)...");
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

    try {
        await setupTestEnvironment();

        // 1. Profile Retrieval (Me)
        await test("TEST 1: GET /api/auth/me returns authenticated profile", async () => {
            const res = await apiRequest("/api/auth/me", {
                headers: { Authorization: `Bearer ${tokenAdmin}` },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            assert.strictEqual(res.data.data.email, adminUser.email);
            assert.strictEqual(res.data.data.role, "admin");
        });

        // 2. Profile Update (Name and Phone)
        await test("TEST 2: PATCH /api/auth/profile updates user profile", async () => {
            const res = await apiRequest("/api/auth/profile", {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenAdmin}` },
                body: {
                    name: `Updated Admin Name ${testTimestamp}`,
                    phone: "+91 9876543210",
                },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            assert.strictEqual(res.data.data.name, `Updated Admin Name ${testTimestamp}`);
            assert.strictEqual(res.data.data.phone, "+91 9876543210");
        });

        // 3. Profile Update Validation (Empty Name)
        await test("TEST 3: PATCH /api/auth/profile rejects empty name with 400", async () => {
            const res = await apiRequest("/api/auth/profile", {
                method: "PATCH",
                headers: { Authorization: `Bearer ${tokenAdmin}` },
                body: {
                    name: "   ",
                },
            });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.data.success, false);
        });

        // 4. Password Change - Incorrect Current Password
        await test("TEST 4: POST /api/auth/change-password fails if current password is wrong", async () => {
            const res = await apiRequest("/api/auth/change-password", {
                method: "POST",
                headers: { Authorization: `Bearer ${tokenAdmin}` },
                body: {
                    currentPassword: "WrongPassword@123",
                    newPassword: "BrandNewPassword@456",
                },
            });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.data.success, false);
            assert(res.data.message.includes("does not match"));
        });

        // 5. Password Change - Short New Password (< 6 chars)
        await test("TEST 5: POST /api/auth/change-password rejects new password < 6 chars", async () => {
            const res = await apiRequest("/api/auth/change-password", {
                method: "POST",
                headers: { Authorization: `Bearer ${tokenAdmin}` },
                body: {
                    currentPassword: "InitialPass@123",
                    newPassword: "123",
                },
            });
            assert.strictEqual(res.status, 400);
            assert.strictEqual(res.data.success, false);
            assert(res.data.message.includes("at least 6 characters"));
        });

        // 6. Password Change - Successful
        await test("TEST 6: POST /api/auth/change-password successfully updates password", async () => {
            const res = await apiRequest("/api/auth/change-password", {
                method: "POST",
                headers: { Authorization: `Bearer ${tokenAdmin}` },
                body: {
                    currentPassword: "InitialPass@123",
                    newPassword: "BrandNewPassword@456",
                },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            assert(res.data.message.includes("successfully"));
        });

        // 7. Login with New Password
        await test("TEST 7: User can log in with new password", async () => {
            const res = await apiRequest("/api/auth/login", {
                method: "POST",
                body: {
                    email: adminUser.email,
                    password: "BrandNewPassword@456",
                },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            assert(res.data.data.token, "Must receive auth token");
        });

        // 8. Module Foundation - GET /api/v1/modules
        await test("TEST 8: GET /api/v1/modules returns catalog with core, hospital_structure, and hrms enabled", async () => {
            const res = await apiRequest("/api/v1/modules", {
                headers: { Authorization: `Bearer ${tokenAdmin}` },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            const { modules, totalCount, activeModulesCount } = res.data.data;
            assert.strictEqual(totalCount, 4);
            assert.strictEqual(activeModulesCount, 3); // core + hospital_structure + hrms (all enabled for Phase 1)

            const coreMod = modules.find((m) => m.key === "core");
            assert(coreMod, "Core module must exist");
            assert.strictEqual(coreMod.isEnabled, true);
            assert.strictEqual(coreMod.isAccessible, true);

            const hrmsMod = modules.find((m) => m.key === "hrms");
            assert(hrmsMod, "HRMS module must exist in foundation");
            assert.strictEqual(hrmsMod.isEnabled, true); // Phase 1: hrms is now enabled
        });

        // 9. Module Foundation - Permission-aware accessibility for HR
        await test("TEST 9: Module accessibility reflects HR permissions (structure.view)", async () => {
            const res = await apiRequest("/api/v1/modules", {
                headers: { Authorization: `Bearer ${tokenHr}` },
            });
            assert.strictEqual(res.status, 200);
            const { modules } = res.data.data;
            const structMod = modules.find((m) => m.key === "hospital_structure");
            assert.strictEqual(structMod.isAccessible, true, "HR with structure.view should have structure accessible");
        });

        // 10. Module Foundation - GET /api/v1/modules/:moduleKey
        await test("TEST 10: GET /api/v1/modules/:moduleKey returns single module metadata", async () => {
            const res = await apiRequest("/api/v1/modules/core", {
                headers: { Authorization: `Bearer ${tokenAdmin}` },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.success, true);
            assert.strictEqual(res.data.data.key, "core");
            assert.strictEqual(res.data.data.isCore, true);
        });

        // 11. Module Foundation - Non-existent module returns 404
        await test("TEST 11: GET /api/v1/modules/non_existent returns 404", async () => {
            const res = await apiRequest("/api/v1/modules/non_existent", {
                headers: { Authorization: `Bearer ${tokenAdmin}` },
            });
            assert.strictEqual(res.status, 404);
            assert.strictEqual(res.data.success, false);
        });

        // 12. Unauthenticated request to /api/v1/modules returns 401
        await test("TEST 12: Unauthenticated GET /api/v1/modules returns 401", async () => {
            const res = await apiRequest("/api/v1/modules");
            assert.strictEqual(res.status, 401);
        });
    } finally {
        await cleanupTestEnvironment();
    }

    console.log(`\nCore Platform Test results: ${passed} passed, ${failed} failed.\n`);
    if (failed > 0) {
        process.exit(1);
    }
};

runTests().catch((err) => {
    console.error("Test fatal error:", err);
    process.exit(1);
});
