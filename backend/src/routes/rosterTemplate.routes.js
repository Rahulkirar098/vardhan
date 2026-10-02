const express = require("express");
const router = express.Router();
const rosterTemplateController = require("../controllers/rosterTemplate.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { requireModule } = require("../middleware/module.middleware");
const { authorizePermission, authorizeAnyPermission } = require("../middleware/permission.middleware");
const { PERMISSIONS } = require("../config/permissions");

router.use(authMiddleware);
router.use(requireModule("hrms"));

router.get(
    "/",
    authorizeAnyPermission(PERMISSIONS.ROSTER_VIEW, PERMISSIONS.ROSTER_MANAGE),
    rosterTemplateController.listTemplates
);

router.post(
    "/",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterTemplateController.createTemplate
);

router.get(
    "/:id",
    authorizeAnyPermission(PERMISSIONS.ROSTER_VIEW, PERMISSIONS.ROSTER_MANAGE),
    rosterTemplateController.getTemplateById
);

router.put(
    "/:id",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterTemplateController.updateTemplate
);

router.post(
    "/:id/duplicate",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterTemplateController.duplicateTemplate
);

router.patch(
    "/:id/deactivate",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterTemplateController.deactivateTemplate
);

router.delete(
    "/:id",
    authorizePermission(PERMISSIONS.ROSTER_MANAGE),
    rosterTemplateController.deleteTemplate
);

module.exports = router;
