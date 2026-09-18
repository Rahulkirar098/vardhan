const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const {
    createDepartment,
    getDepartments,
    getDepartmentById,
    getDepartmentDetails,
    getDepartmentHRs,
    inviteDepartmentHR,
    updateDepartment,
    updateDepartmentStatus,
} = require("../controllers/department.controller");

const departmentRoute = express.Router();

departmentRoute.use(authMiddleware);
departmentRoute.post("/", authorizeRoles("admin"), createDepartment);
departmentRoute.get("/", authorizeRoles("admin"), getDepartments);
departmentRoute.get("/details/:departmentId", authorizeRoles("admin"), getDepartmentDetails);
departmentRoute.get("/:departmentId/hr", authorizeRoles("admin"), getDepartmentHRs);
departmentRoute.post("/:departmentId/hr/invite", authorizeRoles("admin"), inviteDepartmentHR);
departmentRoute.get("/:departmentId", authorizeRoles("admin"), getDepartmentById);
departmentRoute.patch("/:departmentId", authorizeRoles("admin"), updateDepartment);
departmentRoute.patch("/:departmentId/status", authorizeRoles("admin"), updateDepartmentStatus);

module.exports = {
    departmentRoute,
};
