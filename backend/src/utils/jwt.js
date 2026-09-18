const jwt = require("jsonwebtoken");
const RevokedToken = require("../models/revokedToken.model");

const revokedTokensCache = new Set();

const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
};

const revokeToken = async (token) => {
    if (!token) {
        return true;
    }

    revokedTokensCache.add(token);

    try {
        const decoded = jwt.decode(token);

        await RevokedToken.create({
            tokenHash: token,
            expiresAt: new Date((decoded?.exp || Date.now() / 1000 + 3600) * 1000),
        });
    } catch (error) {
        console.error("Persist Revoked Token Error:", error);
    }

    return true;
};

const isTokenRevoked = async (token) => {
    if (!token) {
        return false;
    }

    if (revokedTokensCache.has(token)) {
        return true;
    }

    try {
        const revoked = await RevokedToken.findOne({ tokenHash: token }).lean();

        if (revoked) {
            revokedTokensCache.add(token);
            return true;
        }
    } catch (error) {
        console.error("Check Revoked Token Error:", error);
    }

    return false;
};

const verifyToken = async (token) => {
    if (!token) {
        const error = new Error("Token required");
        error.name = "TokenRevokedError";
        throw error;
    }

    if (await isTokenRevoked(token)) {
        const error = new Error("Token revoked");
        error.name = "TokenRevokedError";
        throw error;
    }

    return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
    generateToken,
    verifyToken,
    revokeToken,
    isTokenRevoked,
};