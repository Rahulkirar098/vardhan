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
const Roster = require("../src/models/roster.model");
const RosterAssignment = require("../src/models/rosterAssignment.model");
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
                    } catch {
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
    console.log("==================================================================");
    console.log("=== ROSTER DROPDOWN SERVER-SIDE PAGINATION & SEARCH TEST SUITE ===");
    console.log("==================================================================");

    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI);
        }

        server = http.createServer(app);
        await new Promise((resolve) => {
            server.listen(0, () => {
                const port = server.address().port;
                baseUrl = `http://localhost:${port}`;
                console.log(`Test server running at ${baseUrl}`);
                resolve();
            });
        });

        const testRunId = Date.now();

        // 1. Setup Hospital A and Hospital B
        const hospitalA = await Hospital.create({
            name: `Pagination Test Hospital A ${testRunId}`,
            code: `PAG-A-${testRunId}`,
            address: { street: "100 Medical Plaza", city: "City A", state: "ST", zip: "11111" },
            createdBy: new mongoose.Types.ObjectId(),
        });

        const hospitalB = await Hospital.create({
            name: `Pagination Test Hospital B ${testRunId}`,
            code: `PAG-B-${testRunId}`,
            address: { street: "200 Health Way", city: "City B", state: "ST", zip: "22222" },
            createdBy: new mongoose.Types.ObjectId(),
        });

        // 2. Positions in Hospital A
        const posNurseEligible = await Position.create({
            name: "Roster Nurse " + testRunId,
            code: "RN-" + testRunId,
            hospitalId: hospitalA._id,
            rosterEligible: true,
            status: "active",
        });

        const posDoctorIneligible = await Position.create({
            name: "Consultant Physician " + testRunId,
            code: "CP-" + testRunId,
            hospitalId: hospitalA._id,
            rosterEligible: false,
            status: "active",
        });

        // Position in Hospital B
        const posHospitalB = await Position.create({
            name: "Hospital B Nurse " + testRunId,
            code: "HBN-" + testRunId,
            hospitalId: hospitalB._id,
            rosterEligible: true,
            status: "active",
        });

        // 3. Admin User for Hospital A
        const adminUser = await User.create({
            name: "Hospital A Roster Admin",
            email: `roster.admin.${testRunId}@hospitalA.com`,
            password: await hashPassword("Password123!"),
            role: "admin",
            hospitalId: hospitalA._id,
            permissions: [PERMISSIONS.ROSTER_MANAGE, PERMISSIONS.ROSTER_VIEW, PERMISSIONS.EMPLOYEE_VIEW],
            modules: ["core", "hrms"],
        });

        const adminToken = generateToken({ id: adminUser._id.toString() });

        // Helper to create an employee
        const createEmp = async ({
            firstName,
            lastName,
            index,
            hospitalId = hospitalA._id,
            positionId = posNurseEligible._id,
            status = "ACTIVE",
            phone = null,
            gender = "female",
        }) => {
            const user = await User.create({
                name: `${firstName} ${lastName}`,
                email: `emp.${index}.${testRunId}@${hospitalId.toString().slice(-4)}.com`,
                password: await hashPassword("Password123!"),
                role: "employee",
                hospitalId,
                permissions: [PERMISSIONS.ROSTER_VIEW],
                modules: ["core", "hrms"],
            });

            return await Employee.create({
                employeeId: `EMP-${index.toString().padStart(4, "0")}-${testRunId.toString().slice(-4)}`,
                firstName,
                lastName,
                email: user.email,
                phone: phone || `+9198765${index.toString().padStart(5, "0")}`,
                gender,
                positionId,
                employmentStatus: status,
                hospitalId,
                userId: user._id,
                createdBy: adminUser._id,
            });
        };

        // --- TEST 1: Hospital Isolation, Inactive Exclusion, Non-Roster Exclusion ---
        console.log("\n--- TEST 1: Tenant & Eligibility Isolation ---");
        // Create 1 inactive employee in Hospital A
        await createEmp({ firstName: "Inactive", lastName: "Staff", index: 9001, status: "INACTIVE" });
        // Create 1 non-roster eligible employee in Hospital A
        await createEmp({ firstName: "Ineligible", lastName: "Doctor", index: 9002, positionId: posDoctorIneligible._id });
        // Create 1 employee in Hospital B
        await createEmp({ firstName: "HospitalB", lastName: "Nurse", index: 9003, hospitalId: hospitalB._id, positionId: posHospitalB._id });

        const test1Res = await request("/api/v1/hrms/employees?status=ACTIVE&rosterEligible=true&page=1&limit=10", {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert.strictEqual(test1Res.status, 200);
        assert.strictEqual(test1Res.body.data.total, 0, "No eligible employees should exist in Hospital A yet");
        console.log("  ✓ Test 1 Passed: Inactive, non-roster eligible, and Hospital B employees are strictly excluded.");

        // --- TEST 2: 5 Employees (Page 1 of 1, limit 10) ---
        console.log("\n--- TEST 2: 5 Employees ---");
        for (let i = 1; i <= 5; i++) {
            await createEmp({ firstName: `Alpha${String.fromCharCode(64 + i)}`, lastName: "Nurse", index: 100 + i });
        }

        const test2Res = await request("/api/v1/hrms/employees?status=ACTIVE&rosterEligible=true&page=1&limit=10", {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert.strictEqual(test2Res.status, 200);
        assert.strictEqual(test2Res.body.data.total, 5);
        assert.strictEqual(test2Res.body.data.totalPages, 1);
        assert.strictEqual(test2Res.body.data.employees.length, 5);
        assert.strictEqual(test2Res.body.data.hasNextPage, false);
        assert.strictEqual(test2Res.body.data.hasPrevPage, false);
        console.log("  ✓ Test 2 Passed: 5 employees return 1 page with total=5, totalPages=1.");

        // --- TEST 3: 10 Employees (Exactly 1 Full Page) ---
        console.log("\n--- TEST 3: 10 Employees ---");
        for (let i = 6; i <= 10; i++) {
            await createEmp({ firstName: `Alpha${String.fromCharCode(64 + i)}`, lastName: "Nurse", index: 100 + i });
        }

        const test3Res = await request("/api/v1/hrms/employees?status=ACTIVE&rosterEligible=true&page=1&limit=10", {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert.strictEqual(test3Res.status, 200);
        assert.strictEqual(test3Res.body.data.total, 10);
        assert.strictEqual(test3Res.body.data.totalPages, 1);
        assert.strictEqual(test3Res.body.data.employees.length, 10);
        assert.strictEqual(test3Res.body.data.hasNextPage, false);
        assert.strictEqual(test3Res.body.data.hasPrevPage, false);
        console.log("  ✓ Test 3 Passed: Exactly 10 employees return 1 page with total=10, totalPages=1, hasNextPage=false.");

        // --- TEST 4: 21 Employees (3 Pages: 10, 10, 1) & No Duplicates Across Pages ---
        console.log("\n--- TEST 4: 21 Employees (Multi-Page & No Duplicates) ---");
        for (let i = 11; i <= 21; i++) {
            await createEmp({ firstName: `Beta${String.fromCharCode(64 + i - 10)}`, lastName: "Staff", index: 100 + i });
        }

        const p1 = await request("/api/v1/hrms/employees?status=ACTIVE&rosterEligible=true&page=1&limit=10", {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const p2 = await request("/api/v1/hrms/employees?status=ACTIVE&rosterEligible=true&page=2&limit=10", {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const p3 = await request("/api/v1/hrms/employees?status=ACTIVE&rosterEligible=true&page=3&limit=10", {
            headers: { Authorization: `Bearer ${adminToken}` },
        });

        assert.strictEqual(p1.body.data.total, 21);
        assert.strictEqual(p1.body.data.totalPages, 3);
        assert.strictEqual(p1.body.data.employees.length, 10);
        assert.strictEqual(p1.body.data.hasNextPage, true);
        assert.strictEqual(p1.body.data.hasPrevPage, false);

        assert.strictEqual(p2.body.data.employees.length, 10);
        assert.strictEqual(p2.body.data.hasNextPage, true);
        assert.strictEqual(p2.body.data.hasPrevPage, true);

        assert.strictEqual(p3.body.data.employees.length, 1);
        assert.strictEqual(p3.body.data.hasNextPage, false);
        assert.strictEqual(p3.body.data.hasPrevPage, true);

        // Verify NO duplicates across pages
        const allIds = [
            ...p1.body.data.employees.map((e) => e._id),
            ...p2.body.data.employees.map((e) => e._id),
            ...p3.body.data.employees.map((e) => e._id),
        ];
        assert.strictEqual(allIds.length, 21);
        assert.strictEqual(new Set(allIds).size, 21, "No duplicate employees should exist across pages");
        console.log("  ✓ Test 4 Passed: 21 employees cleanly split into 3 pages (10, 10, 1) with 0 duplicates.");

        // --- TEST 5: Search Across Entire Dataset (Finding Page 2 Employee on Page 1 of Search) ---
        console.log("\n--- TEST 5: Global Search Across Dataset ---");
        // An employee on Page 2
        const page2Employee = p2.body.data.employees[0];
        const searchByName = await request(
            `/api/v1/hrms/employees?status=ACTIVE&rosterEligible=true&search=${encodeURIComponent(page2Employee.firstName)}&page=1&limit=10`,
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        assert.strictEqual(searchByName.status, 200);
        assert.ok(searchByName.body.data.total >= 1);
        assert.ok(searchByName.body.data.employees.some((e) => e._id === page2Employee._id));

        // Search by employee ID
        const searchById = await request(
            `/api/v1/hrms/employees?status=ACTIVE&rosterEligible=true&search=${encodeURIComponent(page2Employee.employeeId)}&page=1&limit=10`,
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        assert.strictEqual(searchById.body.data.total, 1);
        assert.strictEqual(searchById.body.data.employees[0]._id, page2Employee._id);

        // Search by phone
        const searchByPhone = await request(
            `/api/v1/hrms/employees?status=ACTIVE&rosterEligible=true&search=${encodeURIComponent(page2Employee.phone.slice(-4))}&page=1&limit=10`,
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        assert.ok(searchByPhone.body.data.total >= 1);
        assert.ok(searchByPhone.body.data.employees.some((e) => e._id === page2Employee._id));

        // Search by position name
        const searchByPos = await request(
            `/api/v1/hrms/employees?status=ACTIVE&rosterEligible=true&search=${encodeURIComponent("Roster Nurse")}&page=1&limit=10`,
            { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        assert.ok(searchByPos.body.data.total >= 1);
        console.log("  ✓ Test 5 Passed: Search by name, employeeId, phone, and position works across all pages.");

        // --- TEST 6: Scale to 50 and > 100 Employees ---
        console.log("\n--- TEST 6: 50 and > 100 Employees Scale Verification ---");
        // We currently have 21. Add 29 more -> 50 total
        for (let i = 22; i <= 50; i++) {
            await createEmp({ firstName: `Gamma${i}`, lastName: "Care", index: 100 + i });
        }
        const res50 = await request("/api/v1/hrms/employees?status=ACTIVE&rosterEligible=true&page=1&limit=10", {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert.strictEqual(res50.body.data.total, 50);
        assert.strictEqual(res50.body.data.totalPages, 5);

        // Add 55 more -> 105 total (> 100)
        for (let i = 51; i <= 105; i++) {
            await createEmp({ firstName: `Delta${i}`, lastName: "Provider", index: 100 + i });
        }
        const res105P1 = await request("/api/v1/hrms/employees?status=ACTIVE&rosterEligible=true&page=1&limit=10", {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const res105P11 = await request("/api/v1/hrms/employees?status=ACTIVE&rosterEligible=true&page=11&limit=10", {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert.strictEqual(res105P1.body.data.total, 105);
        assert.strictEqual(res105P1.body.data.totalPages, 11);
        assert.strictEqual(res105P1.body.data.employees.length, 10);
        assert.strictEqual(res105P11.body.data.employees.length, 5);
        console.log("  ✓ Test 6 Passed: 50 employees (5 pages) and 105 employees (11 pages) handled seamlessly.");

        // --- TEST 7: Assign Employee from Page 2 and Page 11, Then Publish Roster ---
        console.log("\n--- TEST 7: Roster Assignment & Publishing Verification ---");
        const empFromPage2 = page2Employee;
        const empFromPage11 = res105P11.body.data.employees[0];

        // Create Roster Draft in Hospital A
        const rosterRes = await request("/api/v1/rosters", {
            method: "POST",
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
                title: "Pagination Assignment Verification Roster",
                startDate: "2026-11-01",
                endDate: "2026-11-10",
                columns: [{ id: "col-1", title: "Morning", startTime: "08:00", endTime: "16:00", order: 1 }],
                dutyAreas: [{ id: "da-1", name: "ICU", order: 1 }],
            },
        });
        assert.strictEqual(rosterRes.status, 201);
        const rosterId = rosterRes.body.data._id;

        // Assign employee from Page 2
        const assign1 = await request(`/api/v1/rosters/${rosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
                employeeId: empFromPage2._id,
                date: "2026-11-01",
                columnId: "col-1",
                shiftTitle: "Morning",
                dutyArea: "ICU",
                startTime: "08:00",
                endTime: "16:00",
            },
        });
        assert.strictEqual(assign1.status, 201);

        // Assign employee from Page 11 on a different date
        const assign2 = await request(`/api/v1/rosters/${rosterId}/assignments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
                employeeId: empFromPage11._id,
                date: "2026-11-02",
                columnId: "col-1",
                shiftTitle: "Morning",
                dutyArea: "ICU",
                startTime: "08:00",
                endTime: "16:00",
            },
        });
        assert.strictEqual(assign2.status, 201);

        // Publish roster
        const pubRes = await request(`/api/v1/rosters/${rosterId}/publish`, {
            method: "POST",
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert.strictEqual(pubRes.status, 200);
        assert.strictEqual(pubRes.body.data.status, "PUBLISHED");
        console.log("  ✓ Test 7 Passed: Employees from Page 2 and Page 11 assigned and roster successfully published.");

        console.log("\n==================================================================");
        console.log("=== ALL ROSTER DROPDOWN SERVER-SIDE PAGINATION TESTS PASSED 100% ===");
        console.log("==================================================================");
    } catch (err) {
        console.error("Test Suite Failed with error:", err);
        process.exit(1);
    } finally {
        if (server) {
            server.close();
        }
        await mongoose.connection.close();
    }
};

runTests();
