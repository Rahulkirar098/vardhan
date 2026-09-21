const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
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
structureRoute.get("/floors", authorizeRoles("admin", "super_admin"), getFloors);
structureRoute.post("/floors", authorizeRoles("admin", "super_admin"), createFloor);
structureRoute.get(
    "/floors/:floorId",
    authorizeRoles("admin", "super_admin"),
    getFloorById
);
structureRoute.patch(
    "/floors/:floorId",
    authorizeRoles("admin", "super_admin"),
    updateFloor
);
structureRoute.delete(
    "/floors/:floorId",
    authorizeRoles("admin", "super_admin"),
    deactivateFloor
);

// Room Routes
structureRoute.get(
    "/floors/:floorId/rooms",
    authorizeRoles("admin", "super_admin"),
    getRooms
);
structureRoute.post(
    "/floors/:floorId/rooms",
    authorizeRoles("admin", "super_admin"),
    createRoom
);
structureRoute.get(
    "/floors/:floorId/rooms/:roomId",
    authorizeRoles("admin", "super_admin"),
    getRoomById
);
structureRoute.patch(
    "/floors/:floorId/rooms/:roomId",
    authorizeRoles("admin", "super_admin"),
    updateRoom
);
structureRoute.delete(
    "/floors/:floorId/rooms/:roomId",
    authorizeRoles("admin", "super_admin"),
    deactivateRoom
);

module.exports = {
    structureRoute,
    structureRoutes: structureRoute,
};
