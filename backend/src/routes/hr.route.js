const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizePermission } = require("../middleware/permission.middleware");
const { PERMISSIONS } = require("../config/permissions");
const {
    createHR,
    getMyHR,
    getHRById,
    getHRHospital,
    createInvitation,
    getInvitationByToken,
    acceptInvitation,
    resendInvitation,
    cancelInvitation,
    getInvitations,
    getHRPermissions,
    updateHRPermissions,
} = require("../controllers/hr.controller");

const hrRoute = express.Router();

hrRoute.post("/invite", authMiddleware, authorizePermission(PERMISSIONS.HR_INVITE), createInvitation);
hrRoute.get("/invite/:token", getInvitationByToken);
hrRoute.post("/invite/:token/accept", acceptInvitation);
hrRoute.post("/invite/:invitationId/resend", authMiddleware, authorizePermission(PERMISSIONS.HR_INVITATION_MANAGE), resendInvitation);
hrRoute.patch("/invite/:invitationId/cancel", authMiddleware, authorizePermission(PERMISSIONS.HR_INVITATION_MANAGE), cancelInvitation);
hrRoute.get("/invitations", authMiddleware, authorizePermission(PERMISSIONS.HR_INVITATION_MANAGE), getInvitations);

hrRoute.use(authMiddleware);
hrRoute.get("/me", authorizePermission(PERMISSIONS.HR_VIEW), getMyHR);
hrRoute.get("/hospital", authorizePermission(PERMISSIONS.HOSPITAL_VIEW), getHRHospital);
hrRoute.get("/", authorizePermission(PERMISSIONS.HR_VIEW), getMyHR);
hrRoute.get("/:hrId/permissions", authorizePermission(PERMISSIONS.HR_UPDATE), getHRPermissions);
hrRoute.patch("/:hrId/permissions", authorizePermission(PERMISSIONS.HR_UPDATE), updateHRPermissions);
hrRoute.get("/:id", authorizePermission(PERMISSIONS.HR_VIEW), getHRById);
hrRoute.post("/", authorizePermission(PERMISSIONS.HR_INVITE), createHR);

module.exports = {
    hrRoute,
};
