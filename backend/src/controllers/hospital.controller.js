const hospitalService = require("../services/hospital.service");
const Hospital = require("../models/hospital.model");
const { isValidObjectId } = require("../utils/validate");

const getMyHospital = async (req, res) => {
    try {
        if (!req.user || (req.user.role !== "admin" && req.user.role !== "employee")) {
            return res.status(403).json({ success: false, message: "Only admins or employees can access their hospital" });
        }

        let hospital;
        if (req.user.role === "admin") {
            hospital = await hospitalService.getMyHospital(req.user.id);
        } else {
            let hospitalId = req.user.hospitalId;
            if (!hospitalId && req.user.employeeId) {
                const Employee = require("../models/employee.model");
                const employee = await Employee.findById(req.user.employeeId).select("hospitalId");
                if (employee) hospitalId = employee.hospitalId;
            }
            if (!hospitalId) {
                const Employee = require("../models/employee.model");
                const employee = await Employee.findOne({ userId: req.user.id }).select("hospitalId");
                if (employee) hospitalId = employee.hospitalId;
            }
            if (!hospitalId) {
                const err = new Error("No hospital is assigned to this employee.");
                err.code = "NOT_FOUND";
                throw err;
            }
            hospital = await Hospital.findById(hospitalId).populate("createdBy", "name email phone role status");
            if (!hospital) {
                const err = new Error("Hospital not found");
                err.code = "NOT_FOUND";
                throw err;
            }
        }
        
        return res.status(200).json({ success: true, message: "Hospital retrieved successfully", data: hospital });
    } catch (error) {
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error("Get My Hospital Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const createHospital = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Only admins can create a hospital" });
        }

        const { name, code } = req.body;
        if (!name || !code || !String(name).trim() || !String(code).trim()) {
            return res.status(400).json({ success: false, message: "Hospital name and code are required" });
        }

        const hospital = await hospitalService.createHospital(req.user, req.body);

        return res.status(201).json({
            success: true,
            message: "Hospital created successfully",
            data: {
                id: hospital._id,
                name: hospital.name,
                code: hospital.code,
                status: hospital.status,
                registrationNumber: hospital.registrationNumber,
                contact: hospital.contact,
                address: hospital.address,
            },
        });
    } catch (error) {
        if (error.code === "LIMIT_REACHED" || error.code === "DUPLICATE_CODE" || (error && error.code === 11000)) {
            return res.status(409).json({ success: false, message: error.message || "You can create only one hospital" });
        }
        console.error("Create Hospital Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getHospitals = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Only admins can access hospital list" });
        }

        const hospitals = await hospitalService.getHospitals(req.user.id);
        return res.status(200).json({ success: true, message: "Hospitals retrieved successfully", data: hospitals });
    } catch (error) {
        console.error("Get Hospitals Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const getHospitalOverview = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Only admins can access hospital overview" });
        }

        const data = await hospitalService.getHospitalOverview(req.user.id);
        return res.status(200).json({ success: true, message: "Hospital overview retrieved successfully", data });
    } catch (error) {
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        console.error("Get Hospital Overview Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const updateHospital = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Only admins can update a hospital" });
        }

        const { hospitalId } = req.params;
        if (!isValidObjectId(hospitalId)) {
            return res.status(400).json({ success: false, message: "Invalid hospital id" });
        }

        const { name, code, status } = req.body;
        
        if (name !== undefined && !String(name).trim()) {
            return res.status(400).json({ success: false, message: "Hospital name is required" });
        }
        
        if (code !== undefined && !String(code).trim()) {
            return res.status(400).json({ success: false, message: "Hospital code is required" });
        }
        
        if (status !== undefined && !["active", "inactive"].includes(status)) {
            return res.status(400).json({ success: false, message: "Status must be active or inactive" });
        }

        const hospital = await hospitalService.updateHospital(req.user.id, hospitalId, req.body);

        return res.status(200).json({ success: true, message: "Hospital updated successfully", data: hospital });
    } catch (error) {
        if (error.code === "NOT_FOUND") {
            return res.status(404).json({ success: false, message: error.message });
        }
        if (error.code === "DUPLICATE_CODE" || (error && error.code === 11000)) {
            return res.status(409).json({ success: false, message: "Hospital code already exists" });
        }
        console.error("Update Hospital Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = {
    createHospital,
    getHospitals,
    getMyHospital,
    getHospitalOverview,
    updateHospital,
};
