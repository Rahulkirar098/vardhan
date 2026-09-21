const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizePermission } = require("../middleware/permission.middleware");
const { PERMISSIONS } = require("../config/permissions");
const {
    getFloors,
    getFloorById,
    createFloor,
    updateFloor,
    deactivateFloor,
    getRooms,
    getRoomById,
    createRoom,
    updateRoom,
    deactivateRoom,
} = require("../controllers/structure.controller");

const structureRoute = express.Router({ mergeParams: true });

structureRoute.use(authMiddleware);

// Floor Routes
structureRoute.get("/floors", authorizePermission(PERMISSIONS.STRUCTURE_VIEW), getFloors);
structureRoute.post("/floors", authorizePermission(PERMISSIONS.STRUCTURE_CREATE), createFloor);
structureRoute.get(
    "/floors/:floorId",
    authorizePermission(PERMISSIONS.STRUCTURE_VIEW),
    getFloorById
);
structureRoute.patch(
    "/floors/:floorId",
    authorizePermission(PERMISSIONS.STRUCTURE_UPDATE),
    updateFloor
);
structureRoute.delete(
    "/floors/:floorId",
    authorizePermission(PERMISSIONS.STRUCTURE_DELETE),
    deactivateFloor
);

// Room Routes
structureRoute.get(
    "/floors/:floorId/rooms",
    authorizePermission(PERMISSIONS.STRUCTURE_VIEW),
    getRooms
);
structureRoute.post(
    "/floors/:floorId/rooms",
    authorizePermission(PERMISSIONS.STRUCTURE_CREATE),
    createRoom
);
structureRoute.get(
    "/floors/:floorId/rooms/:roomId",
    authorizePermission(PERMISSIONS.STRUCTURE_VIEW),
    getRoomById
);
structureRoute.patch(
    "/floors/:floorId/rooms/:roomId",
    authorizePermission(PERMISSIONS.STRUCTURE_UPDATE),
    updateRoom
);
structureRoute.delete(
    "/floors/:floorId/rooms/:roomId",
    authorizePermission(PERMISSIONS.STRUCTURE_DELETE),
    deactivateRoom
);

module.exports = {
    structureRoute,
    structureRoutes: structureRoute,
};
