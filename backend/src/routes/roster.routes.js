const express = require("express");
const router = express.Router();
const rosterController = require("../controllers/roster.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { requireModule } = require("../middleware/module.middleware");
const { authorizePermission, authorizeAnyPermission } = require("../middleware/permission.middleware");
const { PERMISSIONS } = require("../config/permissions");

// All Roster routes require authentication and HRMS module access
router.use(authMiddleware);
router.use(requireModule("hrms"));

// ─── TEMPLATES ───────────────────────────────────────────────────────────────

router.get(
    "/templates",
    authorizeAnyPermission(PERMISSIONS.ROSTER_VIEW, PERMISSIONS.ROSTER_MANAGE),
    rosterController.listTemplates
);

router.get(
    "/templates/:id",
    authorizeAnyPermission(PERMISSIONS.ROSTER_VIEW, PERMISSIONS.ROSTER_MANAGE),
    rosterController.getTemplateById
);

router.post(
    "/templates",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterController.createTemplate
);

router.put(
    "/templates/:id",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterController.updateTemplate
);

router.delete(
    "/templates/:id",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterController.deleteTemplate
);

// ─── MY ROSTER (Employee View) ───────────────────────────────────────────────

router.get(
    "/my-roster",
    rosterController.getMyRoster
);

// ─── ROSTERS ─────────────────────────────────────────────────────────────────

router.get(
    "/",
    authorizeAnyPermission(PERMISSIONS.ROSTER_VIEW, PERMISSIONS.ROSTER_MANAGE),
    rosterController.listRosters
);

router.post(
    "/",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterController.createRoster
);

router.get(
    "/:id",
    authorizeAnyPermission(PERMISSIONS.ROSTER_VIEW, PERMISSIONS.ROSTER_MANAGE),
    rosterController.getRosterById
);

router.get(
    "/:id/export/pdf",
    authorizeAnyPermission(PERMISSIONS.ROSTER_VIEW, PERMISSIONS.ROSTER_MANAGE),
    rosterController.exportRosterPDF
);

router.put(
    "/:id",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterController.updateRosterDraft
);

router.delete(
    "/:id",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterController.deleteRosterDraft
);

router.post(
    "/:id/publish",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterController.publishRoster
);

router.patch(
    "/:id/publish",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterController.publishRoster
);

// ─── REVIEW SHARING & FEEDBACK ───────────────────────────────────────────────

router.post(
    "/:id/share",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterController.shareRosterForReview
);

router.post(
    "/:id/comments",
    authorizeAnyPermission(PERMISSIONS.ROSTER_VIEW, PERMISSIONS.ROSTER_MANAGE),
    rosterController.addReviewComment
);

router.patch(
    "/:id/comments/:commentId/resolve",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterController.resolveReviewComment
);

// ─── ASSIGNMENTS ─────────────────────────────────────────────────────────────

router.post(
    "/:id/assignments",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterController.addAssignment
);

router.put(
    "/:id/assignments/:assignmentId",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterController.updateAssignment
);

router.delete(
    "/:id/assignments/:assignmentId",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterController.deleteAssignment
);

module.exports = router;
