const User = require("../models/user.model");
const { verifyToken, isTokenRevoked } = require("../utils/jwt");

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authorization header is required",
            });
        }

        const [bearer, token] = authHeader.split(" ");

        if (bearer !== "Bearer" || !token) {
            return res.status(401).json({
                success: false,
                message: "Invalid token format",
            });
        }

        if (await isTokenRevoked(token)) {
            return res.status(401).json({
                success: false,
                message: "Token has been revoked",
            });
        }

        let decoded;

        try {
            decoded = await verifyToken(token);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token",
            });
        }

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        if (user.status === "inactive") {
            return res.status(403).json({
                success: false,
                message: "Account is inactive",
            });
        }

        req.user = {
            id: user._id,
            role: user.role,
            hospitalId: user.hospitalId,
            permissions: user.permissions || [],
        };

        return next();
    } catch (error) {
        console.error("Auth Middleware Error:", error);

        return res.status(500).json({
            success: false,
            message: "Authentication failed",
        });
    }
};

module.exports = {
    authMiddleware,
};
