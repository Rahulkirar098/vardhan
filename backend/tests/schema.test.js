const assert = require("assert");
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const Invitation = require("../src/models/invitation.model");
const Position = require("../src/models/position.model");
const Employee = require("../src/models/employee.model");
const { PERMISSIONS } = require("../src/config/permissions");
const { ROLE_PERMISSIONS, hasPermission } = require("../src/config/rolePermissions");
const { canUserAccessModule } = require("../src/config/modules.config");

async function runSchemaVerificationTests() {
    console.log("\n=======================================================");
    console.log("Starting Phase 3 — Schema Cleanup & Model Verification");
    console.log("=======================================================\n");

    let passed = 0;
    let failed = 0;

    const runTest = (name, fn) => {
        try {
            fn();
            console.log(`  ✓ ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ✗ FAIL: ${name}`);
            console.error(`    ${err.message}`);
            failed++;
        }
    };

    // TEST 1: User schema accepts super_admin
    runTest("TEST 1: User schema accepts super_admin", () => {
        const u = new User({
            name: "Super Admin",
            email: "super@platform.com",
            password: "hashedpassword123",
            role: "super_admin",
        });
        const err = u.validateSync();
        assert(!err?.errors?.role, "super_admin is a valid User role");
    });

    // TEST 2: User schema accepts admin
    runTest("TEST 2: User schema accepts admin", () => {
        const u = new User({
            name: "Hospital Admin",
            email: "admin@hospital.com",
            password: "hashedpassword123",
            role: "admin",
        });
        const err = u.validateSync();
        assert(!err?.errors?.role, "admin is a valid User role");
    });

    // TEST 3: User schema accepts employee
    runTest("TEST 3: User schema accepts employee", () => {
        const u = new User({
            name: "Staff Nurse",
            email: "nurse@hospital.com",
            password: "hashedpassword123",
            role: "employee",
        });
        const err = u.validateSync();
        assert(!err?.errors?.role, "employee is a valid User role");
    });

    // TEST 4: User schema rejects hr
    runTest("TEST 4: User schema rejects hr (ValidationError)", () => {
        const u = new User({
            name: "Legacy HR",
            email: "hr@hospital.com",
            password: "hashedpassword123",
            role: "hr",
        });
        const err = u.validateSync();
        assert(err && err.errors && err.errors.role, "hr is rejected by User role enum");
        assert(err.errors.role.name === "ValidatorError");
    });

    // TEST 5: Invitation schema accepts role = employee
    runTest("TEST 5: Invitation schema accepts role = employee", () => {
        const inv = new Invitation({
            hospitalId: new mongoose.Types.ObjectId(),
            email: "invite@hospital.com",
            firstName: "John",
            tokenHash: "hash123",
            expiresAt: new Date(Date.now() + 86400000),
            invitedBy: new mongoose.Types.ObjectId(),
            positionId: new mongoose.Types.ObjectId(),
            role: "employee",
        });
        const err = inv.validateSync();
        assert(!err?.errors?.role, "employee is valid in Invitation role enum");
    });

    // TEST 6: Invitation schema rejects role = hr
    runTest("TEST 6: Invitation schema rejects role = hr", () => {
        const inv = new Invitation({
            hospitalId: new mongoose.Types.ObjectId(),
            email: "invite@hospital.com",
            firstName: "John",
            tokenHash: "hash123",
            expiresAt: new Date(Date.now() + 86400000),
            invitedBy: new mongoose.Types.ObjectId(),
            positionId: new mongoose.Types.ObjectId(),
            role: "hr",
        });
        const err = inv.validateSync();
        assert(err && err.errors && err.errors.role, "hr is rejected in Invitation role enum");
    });

    // TEST 7: No duplicate role definitions exist
    runTest("TEST 7: User role enum contains exactly 3 unique canonical roles", () => {
        const roleEnumValues = User.schema.path("role").enumValues;
        assert.deepStrictEqual(roleEnumValues.sort(), ["admin", "employee", "super_admin"]);
        assert.strictEqual(new Set(roleEnumValues).size, 3);
    });

    // TEST 8: HR Manager can exist as a Position
    runTest("TEST 8: HR Manager can exist as a Position", () => {
        const pos = new Position({
            hospitalId: new mongoose.Types.ObjectId(),
            name: "HR Manager",
            defaultModules: ["hrms"],
            status: "active",
        });
        const err = pos.validateSync();
        assert(!err, "HR Manager position is valid");
        assert.strictEqual(pos.name, "HR Manager");
    });

    // TEST 9: HR Manager does NOT require role = hr
    runTest("TEST 9: HR Manager designation pairs with role = employee", () => {
        const hrUser = {
            id: new mongoose.Types.ObjectId().toString(),
            role: "employee",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.EMPLOYEE_VIEW, PERMISSIONS.EMPLOYEE_CREATE],
        };
        assert.strictEqual(hrUser.role, "employee");
        assert.strictEqual(hasPermission(hrUser, PERMISSIONS.EMPLOYEE_VIEW), true);
    });

    // TEST 10: Employee + HR Manager + HRMS module works with explicit permissions
    runTest("TEST 10: Employee + HRMS module works with explicit permissions", () => {
        const hrEmployee = {
            id: new mongoose.Types.ObjectId().toString(),
            role: "employee",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.EMPLOYEE_VIEW, PERMISSIONS.EMPLOYEE_CREATE, PERMISSIONS.EMPLOYEE_UPDATE],
        };
        assert.strictEqual(canUserAccessModule("hrms", hrEmployee.role, hrEmployee.permissions, hrEmployee.modules), true);
        assert.strictEqual(hasPermission(hrEmployee, PERMISSIONS.EMPLOYEE_VIEW), true);
        assert.strictEqual(hasPermission(hrEmployee, PERMISSIONS.EMPLOYEE_CREATE), true);
        assert.strictEqual(hasPermission(hrEmployee, PERMISSIONS.EMPLOYEE_DELETE), false);
    });

    // TEST 11: Existing admin authorization tests pass
    runTest("TEST 11: Admin has access to all permissions and modules", () => {
        const adminUser = {
            id: new mongoose.Types.ObjectId().toString(),
            role: "admin",
            permissions: [],
            modules: ["core", "hrms"],
        };
        assert.strictEqual(hasPermission(adminUser, PERMISSIONS.EMPLOYEE_VIEW), true);
        assert.strictEqual(hasPermission(adminUser, PERMISSIONS.STRUCTURE_VIEW), true);
        assert.strictEqual(canUserAccessModule("hrms", adminUser.role, adminUser.permissions, adminUser.modules), true);
    });

    // TEST 12: Existing employee authorization tests pass
    runTest("TEST 12: Employee without explicit permissions cannot perform sensitive actions", () => {
        const nurseUser = {
            id: new mongoose.Types.ObjectId().toString(),
            role: "employee",
            permissions: [],
            modules: ["core"],
        };
        assert.strictEqual(hasPermission(nurseUser, PERMISSIONS.EMPLOYEE_VIEW), false);
        assert.strictEqual(hasPermission(nurseUser, PERMISSIONS.EMPLOYEE_CREATE), false);
        assert.strictEqual(canUserAccessModule("hrms", nurseUser.role, nurseUser.permissions, nurseUser.modules), false);
    });

    // TEST 13: Existing super_admin authorization tests pass
    runTest("TEST 13: Super admin retains platform access permissions", () => {
        const superAdminUser = {
            id: new mongoose.Types.ObjectId().toString(),
            role: "super_admin",
            permissions: [],
            modules: ["core"],
        };
        assert.strictEqual(hasPermission(superAdminUser, PERMISSIONS.HOSPITAL_VIEW), true);
        assert.strictEqual(hasPermission(superAdminUser, PERMISSIONS.STRUCTURE_VIEW), true);
    });

    // TEST 14: Invitation model schema no longer has legacy type field
    runTest("TEST 14: Invitation model schema no longer defines type discriminator", () => {
        const hasTypePath = Invitation.schema.path("type") !== undefined;
        assert.strictEqual(hasTypePath, false, "Invitation schema does NOT define type path");
    });

    // TEST 15: No active authorization requires User.role = hr
    runTest("TEST 15: ROLE_PERMISSIONS has no hr role key", () => {
        assert.strictEqual(ROLE_PERMISSIONS.hr, undefined, "ROLE_PERMISSIONS.hr is undefined");
        assert.deepStrictEqual(Object.keys(ROLE_PERMISSIONS).sort(), ["admin", "employee", "super_admin"]);
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} tests.\n`);
    if (failed > 0) {
        process.exit(1);
    }
}

runSchemaVerificationTests();
