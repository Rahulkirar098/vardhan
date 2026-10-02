const mongoose = require("mongoose");
const RosterTemplate = require("../models/rosterTemplate.model");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const listTemplates = async ({ hospitalId, includeInactive = true }) => {
    const query = { hospitalId };
    if (includeInactive === false || includeInactive === "false") {
        query.isActive = true;
    }

    return RosterTemplate.find(query)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .lean();
};

const getTemplateById = async ({ templateId, hospitalId }) => {
    if (!isValidObjectId(templateId)) return null;

    return RosterTemplate.findOne({ _id: templateId, hospitalId })
        .populate("createdBy", "name email")
        .lean();
};

const createTemplate = async ({ hospitalId, userId, name, description = "", columns = [], dutyAreas = [] }) => {
    if (!name || !String(name).trim()) {
        const err = new Error("Template name is required.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const template = await RosterTemplate.create({
        hospitalId,
        name: String(name).trim(),
        description: description ? String(description).trim() : "",
        columns: Array.isArray(columns) ? columns : [],
        dutyAreas: Array.isArray(dutyAreas) ? dutyAreas : [],
        isActive: true,
        createdBy: userId,
    });

    return template;
};

const updateTemplate = async ({ templateId, hospitalId, userId, name, description, columns, dutyAreas, isActive }) => {
    if (!isValidObjectId(templateId)) {
        const err = new Error("Invalid template ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const template = await RosterTemplate.findOne({ _id: templateId, hospitalId });
    if (!template) {
        const err = new Error("Roster template not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (name !== undefined) {
        if (!name || !String(name).trim()) {
            const err = new Error("Template name cannot be empty.");
            err.code = "VALIDATION_ERROR";
            throw err;
        }
        template.name = String(name).trim();
    }

    if (description !== undefined) {
        template.description = description ? String(description).trim() : "";
    }

    if (Array.isArray(columns)) {
        template.columns = columns;
    }

    if (Array.isArray(dutyAreas)) {
        template.dutyAreas = dutyAreas;
    }

    if (isActive !== undefined) {
        template.isActive = Boolean(isActive);
    }

    template.updatedBy = userId;
    await template.save();

    return template;
};

const duplicateTemplate = async ({ templateId, hospitalId, userId }) => {
    if (!isValidObjectId(templateId)) {
        const err = new Error("Invalid template ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const original = await RosterTemplate.findOne({ _id: templateId, hospitalId }).lean();
    if (!original) {
        const err = new Error("Roster template not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    const duplicated = await RosterTemplate.create({
        hospitalId,
        name: `${original.name} (Copy)`,
        description: original.description,
        columns: original.columns,
        dutyAreas: original.dutyAreas,
        isActive: true,
        createdBy: userId,
    });

    return duplicated;
};

const deactivateTemplate = async ({ templateId, hospitalId, userId }) => {
    if (!isValidObjectId(templateId)) {
        const err = new Error("Invalid template ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const template = await RosterTemplate.findOne({ _id: templateId, hospitalId });
    if (!template) {
        const err = new Error("Roster template not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    template.isActive = false;
    template.updatedBy = userId;
    await template.save();

    return template;
};

const deleteTemplate = async ({ templateId, hospitalId }) => {
    if (!isValidObjectId(templateId)) {
        const err = new Error("Invalid template ID.");
        err.code = "VALIDATION_ERROR";
        throw err;
    }

    const template = await RosterTemplate.findOneAndDelete({ _id: templateId, hospitalId });
    if (!template) {
        const err = new Error("Roster template not found.");
        err.code = "NOT_FOUND";
        throw err;
    }

    return template;
};

module.exports = {
    listTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deactivateTemplate,
    deleteTemplate,
};
