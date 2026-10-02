const rosterTemplateService = require("../services/rosterTemplate.service");
const Hospital = require("../models/hospital.model");

const getHospitalIdFromContext = async (user) => {
    if (user.hospitalId) return user.hospitalId;
    const userId = user.id || user._id;
    let hospital = await Hospital.findOne({ createdBy: userId }).select("_id").lean();
    if (!hospital) {
        hospital = await Hospital.findOne({ adminId: userId }).select("_id").lean();
    }
    return hospital ? hospital._id : null;
};

const listTemplates = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const includeInactive = req.query.includeInactive === "true";
        const templates = await rosterTemplateService.listTemplates({ hospitalId, includeInactive });

        return res.status(200).json({
            success: true,
            message: "Roster templates retrieved successfully",
            data: templates,
        });
    } catch (error) {
        console.error("List Templates Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getTemplateById = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const template = await rosterTemplateService.getTemplateById({
            templateId: req.params.id,
            hospitalId,
        });

        if (!template) {
            return res.status(404).json({ success: false, message: "Roster template not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Roster template retrieved successfully",
            data: template,
        });
    } catch (error) {
        console.error("Get Template Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const createTemplate = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const { name, description, columns, dutyAreas } = req.body;
        const template = await rosterTemplateService.createTemplate({
            hospitalId,
            userId: req.user.id || req.user._id,
            name,
            description,
            columns,
            dutyAreas,
        });

        return res.status(201).json({
            success: true,
            message: "Roster template created successfully",
            data: template,
        });
    } catch (error) {
        if (error.code === "VALIDATION_ERROR") {
            return res.status(400).json({ success: false, message: error.message });
        }
        console.error("Create Template Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const updateTemplate = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const { name, description, columns, dutyAreas } = req.body;
        const template = await rosterTemplateService.updateTemplate({
            templateId: req.params.id,
            hospitalId,
            userId: req.user.id || req.user._id,
            name,
            description,
            columns,
            dutyAreas,
        });

        return res.status(200).json({
            success: true,
            message: "Roster template updated successfully",
            data: template,
        });
    } catch (error) {
        if (error.code === "VALIDATION_ERROR") {
            return res.status(400).json({ success: false, message: error.message });
        }
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error("Update Template Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const duplicateTemplate = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const template = await rosterTemplateService.duplicateTemplate({
            templateId: req.params.id,
            hospitalId,
            userId: req.user.id || req.user._id,
        });

        return res.status(201).json({
            success: true,
            message: "Roster template duplicated successfully",
            data: template,
        });
    } catch (error) {
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error("Duplicate Template Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const deactivateTemplate = async (req, res) => {
    try {
        const hospitalId = await getHospitalIdFromContext(req.user);
        if (!hospitalId) {
            return res.status(404).json({ success: false, message: "Hospital not found" });
        }

        const template = await rosterTemplateService.deactivateTemplate({
            templateId: req.params.id,
            hospitalId,
            userId: req.user.id || req.user._id,
        });

        return res.status(200).json({
            success: true,
            message: "Roster template deactivated successfully",
            data: template,
        });
    } catch (error) {
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error("Deactivate Template Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = {
    listTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deactivateTemplate,
};
