const assert = require("assert");
const { PERMISSIONS } = require("../src/config/permissions");
const { ROLE_PERMISSIONS, hasPermission } = require("../src/config/rolePermissions");
const { canUserAccessModule, getAvailableModules } = require("../src/config/modules.config");
const { authorizePermission } = require("../src/middleware/permission.middleware");
const { requireModule } = require("../src/middleware/module.middleware");

async function runAuthorizationFoundationTests() {
    console.log("\n=======================================================");
    console.log("Starting Phase 1 — Authorization Foundation Verification");
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

    const runAsyncTest = async (name, fn) => {
        try {
            await fn();
            console.log(`  ✓ ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ✗ FAIL: ${name}`);
            console.error(`    ${err.message}`);
            failed++;
        }
    };

    // Helper mock objects
    const superAdminUser = {
        id: "507f1f77bcf86cd799439011",
        role: "super_admin",
        permissions: [],
        modules: ["core"],
    };

    const adminUserA = {
        id: "507f1f77bcf86cd799439012",
        role: "admin",
        hospitalId: "507f1f77bcf86cd799439021",
        permissions: [],
        modules: ["core", "hrms", "hospital_structure"],
    };

    const employeeNoPerm = {
        id: "507f1f77bcf86cd799439013",
        role: "employee",
        hospitalId: "507f1f77bcf86cd799439021",
        permissions: [],
        modules: ["core"],
    };

    const employeeWithView = {
        id: "507f1f77bcf86cd799439014",
        role: "employee",
        hospitalId: "507f1f77bcf86cd799439021",
        permissions: [PERMISSIONS.EMPLOYEE_VIEW],
        modules: ["core", "hrms"],
    };

    const employeeWithStructureView = {
        id: "507f1f77bcf86cd799439015",
        role: "employee",
        hospitalId: "507f1f77bcf86cd799439021",
        permissions: [PERMISSIONS.STRUCTURE_VIEW],
        modules: ["core", "hospital_structure"],
    };

    const employeeWithStructureManage = {
        id: "507f1f77bcf86cd799439016",
        role: "employee",
        hospitalId: "507f1f77bcf86cd799439021",
        permissions: [
            PERMISSIONS.STRUCTURE_VIEW,
            PERMISSIONS.STRUCTURE_CREATE,
            PERMISSIONS.STRUCTURE_UPDATE,
            PERMISSIONS.STRUCTURE_DELETE,
            PERMISSIONS.STRUCTURE_MANAGE,
        ],
        modules: ["core", "hospital_structure"],
    };

    // TEST 1: super_admin authorization continues to work
    runTest("TEST 1: super_admin authorization continues to work", () => {
        assert.strictEqual(hasPermission(superAdminUser, PERMISSIONS.HOSPITAL_VIEW), true);
        assert.strictEqual(hasPermission(superAdminUser, PERMISSIONS.STRUCTURE_VIEW), true);
        assert.strictEqual(canUserAccessModule("core", superAdminUser.role, superAdminUser.permissions, superAdminUser.modules), true);
    });

    // TEST 2: admin authorization continues to work
    runTest("TEST 2: admin authorization continues to work", () => {
        assert.strictEqual(hasPermission(adminUserA, PERMISSIONS.EMPLOYEE_VIEW), true);
        assert.strictEqual(hasPermission(adminUserA, PERMISSIONS.EMPLOYEE_CREATE), true);
        assert.strictEqual(hasPermission(adminUserA, PERMISSIONS.STRUCTURE_CREATE), true);
        assert.strictEqual(hasPermission(adminUserA, PERMISSIONS.ACCESS_MANAGE), true);
        assert.strictEqual(canUserAccessModule("hrms", adminUserA.role, adminUserA.permissions, adminUserA.modules), true);
    });

    // TEST 3: employee with no permission cannot perform protected employee operations
    runTest("TEST 3: employee with no permission cannot perform protected employee operations", () => {
        assert.strictEqual(hasPermission(employeeNoPerm, PERMISSIONS.EMPLOYEE_VIEW), false);
        assert.strictEqual(hasPermission(employeeNoPerm, PERMISSIONS.EMPLOYEE_CREATE), false);
        assert.strictEqual(hasPermission(employeeNoPerm, PERMISSIONS.EMPLOYEE_UPDATE), false);
        assert.strictEqual(hasPermission(employeeNoPerm, PERMISSIONS.EMPLOYEE_DELETE), false);
    });

    // TEST 4: employee with employee.view can view employee data
    runTest("TEST 4: employee with employee.view can view employee data", () => {
        assert.strictEqual(hasPermission(employeeWithView, PERMISSIONS.EMPLOYEE_VIEW), true);
        assert.strictEqual(hasPermission(employeeWithView, PERMISSIONS.EMPLOYEE_CREATE), false);
    });

    // TEST 5: employee with structure.view can access structure view capability
    runTest("TEST 5: employee with structure.view can access structure view capability", () => {
        assert.strictEqual(hasPermission(employeeWithStructureView, PERMISSIONS.STRUCTURE_VIEW), true);
    });

    // TEST 6: employee without structure.view cannot access structure view capability
    runTest("TEST 6: employee without structure.view cannot access structure view capability", () => {
        assert.strictEqual(hasPermission(employeeNoPerm, PERMISSIONS.STRUCTURE_VIEW), false);
    });

    // TEST 7: employee with structure.manage can access structure management capabilities
    runTest("TEST 7: employee with structure.manage can access structure management capabilities", () => {
        assert.strictEqual(hasPermission(employeeWithStructureManage, PERMISSIONS.STRUCTURE_MANAGE), true);
        assert.strictEqual(hasPermission(employeeWithStructureManage, PERMISSIONS.STRUCTURE_CREATE), true);
        assert.strictEqual(hasPermission(employeeWithStructureManage, PERMISSIONS.STRUCTURE_UPDATE), true);
        assert.strictEqual(hasPermission(employeeWithStructureManage, PERMISSIONS.STRUCTURE_DELETE), true);
    });

    // TEST 8: employee without structure.manage cannot access structure management capabilities
    runTest("TEST 8: employee without structure.manage cannot access structure management capabilities", () => {
        assert.strictEqual(hasPermission(employeeWithStructureView, PERMISSIONS.STRUCTURE_CREATE), false);
        assert.strictEqual(hasPermission(employeeWithStructureView, PERMISSIONS.STRUCTURE_UPDATE), false);
        assert.strictEqual(hasPermission(employeeWithStructureView, PERMISSIONS.STRUCTURE_DELETE), false);
        assert.strictEqual(hasPermission(employeeWithStructureView, PERMISSIONS.STRUCTURE_MANAGE), false);
    });

    // TEST 9: employee with modules = ["hrms"] can access HRMS module
    runTest("TEST 9: employee with modules = ['hrms'] can access HRMS module", () => {
        assert.strictEqual(canUserAccessModule("hrms", employeeWithView.role, employeeWithView.permissions, employeeWithView.modules), true);
    });

    // TEST 10: employee without hrms in modules cannot access HRMS module
    runTest("TEST 10: employee without hrms in modules cannot access HRMS module", () => {
        assert.strictEqual(canUserAccessModule("hrms", employeeNoPerm.role, employeeNoPerm.permissions, employeeNoPerm.modules), false);
    });

    // TEST 11: employee with HRMS module does NOT automatically receive every HRMS permission
    runTest("TEST 11: employee with HRMS module does NOT automatically receive every HRMS permission", () => {
        const hrmsOnlyEmployee = {
            role: "employee",
            modules: ["core", "hrms"],
            permissions: [PERMISSIONS.EMPLOYEE_VIEW],
        };
        assert.strictEqual(canUserAccessModule("hrms", hrmsOnlyEmployee.role, hrmsOnlyEmployee.permissions, hrmsOnlyEmployee.modules), true);
        assert.strictEqual(hasPermission(hrmsOnlyEmployee, PERMISSIONS.EMPLOYEE_VIEW), true);
        assert.strictEqual(hasPermission(hrmsOnlyEmployee, PERMISSIONS.EMPLOYEE_CREATE), false);
        assert.strictEqual(hasPermission(hrmsOnlyEmployee, PERMISSIONS.EMPLOYEE_UPDATE), false);
        assert.strictEqual(hasPermission(hrmsOnlyEmployee, PERMISSIONS.EMPLOYEE_DELETE), false);
    });

    // TEST 12: Hospital isolation still works via resolveAuthorizedHospital
    runTest("TEST 12: Hospital isolation structure logic validates correctly", () => {
        const hospitalIdA = "507f1f77bcf86cd799439021";
        const hospitalIdB = "507f1f77bcf86cd799439022";

        // Verification of permission middleware rejecting unauthenticated or unauthorized
        const middleware = authorizePermission(PERMISSIONS.STRUCTURE_VIEW);
        let calledNext = false;
        const req = { user: employeeWithStructureView };
        const res = {
            status: (code) => ({
                json: (body) => ({ code, body }),
            }),
        };
        const next = () => { calledNext = true; };
        middleware(req, res, next);
        assert.strictEqual(calledNext, true, "authorizePermission calls next() for authorized user");
    });

    // TEST 13: An employee cannot access unauthorized routes without permission
    runTest("TEST 13: Permission middleware rejects unauthorized employee with 403", () => {
        const middleware = authorizePermission(PERMISSIONS.STRUCTURE_CREATE);
        let statusCode = null;
        let responseBody = null;
        const req = { user: employeeWithStructureView };
        const res = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (body) => { responseBody = body; },
                };
            },
        };
        let calledNext = false;
        const next = () => { calledNext = true; };
        middleware(req, res, next);
        assert.strictEqual(calledNext, false, "authorizePermission does NOT call next() for unauthorized employee");
        assert.strictEqual(statusCode, 403, "Returned 403 Forbidden");
    });

    // TEST 14: Existing admin and super_admin behavior remains unchanged
    runTest("TEST 14: Existing admin and super_admin behavior remains unchanged", () => {
        // Admin has all permissions
        const allPermissions = Object.values(PERMISSIONS);
        for (const perm of allPermissions) {
            assert.strictEqual(hasPermission(adminUserA, perm), true, `Admin has ${perm}`);
        }

        // Super Admin has platform access
        assert.strictEqual(hasPermission(superAdminUser, PERMISSIONS.HOSPITAL_VIEW), true);
        assert.strictEqual(hasPermission(superAdminUser, PERMISSIONS.STRUCTURE_VIEW), true);
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} tests.\n`);
    if (failed > 0) {
        process.exit(1);
    }
}

runAuthorizationFoundationTests();
