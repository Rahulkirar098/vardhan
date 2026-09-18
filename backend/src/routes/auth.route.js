const express = require("express");

const {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    forgotPassword,
    resetPassword,
} = require("../controllers/auth.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

const authUserRoute = express.Router();

authUserRoute.post("/register", registerUser);
authUserRoute.post("/login", loginUser);
authUserRoute.post("/logout", logoutUser);
authUserRoute.post("/forgot-password", forgotPassword);
authUserRoute.post("/reset-password", resetPassword);
authUserRoute.get("/me", authMiddleware, getCurrentUser);

module.exports = {
    authUserRoute,
};