const CoreProgress = require("../models/coreProgress.model");
const { isValidObjectId } = require("../utils/validate");

const VALID_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "DONE", "BLOCKED"];

const getCoreProgress = async (req, res) => {
    try {
        const features = await CoreProgress.find({ isActive: true })
            .populate("updatedBy", "name email role")
            .sort({ sortOrder: 1, createdAt: 1 });

        // Group dynamically by moduleKey
        const moduleMap = new Map();
        let overallCompleted = 0;
        let overallInProgress = 0;
        let overallNotStarted = 0;
        let overallBlocked = 0;

        features.forEach((feature) => {
            const key = feature.moduleKey;
            if (!moduleMap.has(key)) {
                moduleMap.set(key, {
                    moduleKey: key,
                    moduleName: feature.moduleName,
                    features: [],
                    completed: 0,
                    inProgress: 0,
                    notStarted: 0,
                    blocked: 0,
                });
            }

            const mod = moduleMap.get(key);
            mod.features.push(feature);

            switch (feature.status) {
                case "DONE":
                    mod.completed++;
                    overallCompleted++;
                    break;
                case "IN_PROGRESS":
                    mod.inProgress++;
                    overallInProgress++;
                    break;
                case "BLOCKED":
                    mod.blocked++;
                    overallBlocked++;
                    break;
                case "NOT_STARTED":
                default:
                    mod.notStarted++;
                    overallNotStarted++;
                    break;
            }
        });

        const modules = Array.from(moduleMap.values()).map((mod) => {
            const total = mod.features.length;
            const completionPercentage = total > 0 ? Math.round((mod.completed / total) * 100) : 0;
            return {
                moduleKey: mod.moduleKey,
                moduleName: mod.moduleName,
                completionPercentage,
                completed: mod.completed,
                inProgress: mod.inProgress,
                notStarted: mod.notStarted,
                blocked: mod.blocked,
                totalFeatures: total,
                features: mod.features,
            };
        });

        const totalFeatures = features.length;
        const overallPercentage =
            totalFeatures > 0 ? Math.round((overallCompleted / totalFeatures) * 100) : 0;

        const summary = {
            totalFeatures,
            completed: overallCompleted,
            inProgress: overallInProgress,
            notStarted: overallNotStarted,
            blocked: overallBlocked,
            completionPercentage: overallPercentage,
        };

        return res.status(200).json({
            success: true,
            message: "Core progress retrieved successfully",
            data: {
                modules,
                summary,
            },
        });
    } catch (error) {
        console.error("Get Core Progress Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const getCoreProgressFeatureById = async (req, res) => {
    try {
        const { featureId } = req.params;

        if (!isValidObjectId(featureId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid feature ID format",
            });
        }

        const feature = await CoreProgress.findOne({ _id: featureId, isActive: true }).populate(
            "updatedBy",
            "name email role"
        );

        if (!feature) {
            return res.status(404).json({
                success: false,
                message: "Core Progress item not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: feature,
        });
    } catch (error) {
        console.error("Get Core Progress Feature Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const updateCoreProgressFeature = async (req, res) => {
    try {
        // Only admin and super_admin are authorized to update Core Progress
        if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to update Core Progress",
            });
        }

        const { featureId } = req.params;

        if (!isValidObjectId(featureId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid feature ID format",
            });
        }

        const { status, notes } = req.body;

        if (status !== undefined && !VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed values are: ${VALID_STATUSES.join(", ")}`,
            });
        }

        const feature = await CoreProgress.findOne({ _id: featureId, isActive: true });

        if (!feature) {
            return res.status(404).json({
                success: false,
                message: "Core Progress item not found",
            });
        }

        if (status !== undefined) {
            feature.status = status;
        }

        if (notes !== undefined) {
            feature.notes = String(notes).trim();
        }

        feature.updatedBy = req.user.id;
        await feature.save();

        const populatedFeature = await CoreProgress.findById(feature._id).populate(
            "updatedBy",
            "name email role"
        );

        return res.status(200).json({
            success: true,
            message: "Core progress feature updated successfully",
            data: populatedFeature,
        });
    } catch (error) {
        console.error("Update Core Progress Feature Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = {
    VALID_STATUSES,
    getCoreProgress,
    getCoreProgressFeatureById,
    updateCoreProgressFeature,
};
