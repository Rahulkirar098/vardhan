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

        let hospitalId = user.hospitalId;
        let employeeId = user.employeeId;

        if (!hospitalId && (user.role === "hr" || user.role === "employee")) {
            const Employee = require("../models/employee.model");
            const employee = employeeId
                ? await Employee.findById(employeeId).select("hospitalId").lean()
                : await Employee.findOne({ userId: user._id }).select("hospitalId").lean();
            if (employee) {
                hospitalId = employee.hospitalId;
                if (!employeeId) employeeId = employee._id;
            }
        }

        req.user = {
            id: user._id,
            role: user.role,
            hospitalId: hospitalId,
            employeeId: employeeId,
            permissions: user.permissions || [],
            modules: user.modules || ["core"],
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
