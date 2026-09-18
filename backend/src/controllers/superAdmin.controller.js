const Hospital = require("../models/hospital.model");
const User = require("../models/user.model");
const { isValidObjectId } = require("../utils/validate");

const getAllHospitalsForSuperAdmin = async (req, res) => {
    try {
        const hospitals = await Hospital.find({})
            .populate("createdBy", "name email phone role status")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Hospitals retrieved successfully",
            data: hospitals.map((hospital) => ({
                id: hospital._id,
                name: hospital.name,
                code: hospital.code,
                registrationNumber: hospital.registrationNumber,
                status: hospital.status,
                createdBy: hospital.createdBy
                    ? {
                        id: hospital.createdBy._id,
                        name: hospital.createdBy.name,
                        email: hospital.createdBy.email,
                        phone: hospital.createdBy.phone,
                        role: hospital.createdBy.role,
                        status: hospital.createdBy.status,
                    }
                    : null,
                contact: hospital.contact,
                address: hospital.address,
                createdAt: hospital.createdAt,
                updatedAt: hospital.updatedAt,
            })),
        });
    } catch (error) {
        console.error("Get All Hospitals For Super Admin Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const getHospitalByIdForSuperAdmin = async (req, res) => {
    try {
        const { hospitalId } = req.params;

        if (!isValidObjectId(hospitalId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid hospital id",
            });
        }

        const hospital = await Hospital.findById(hospitalId).populate(
            "createdBy",
            "name email phone role status"
        );

        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: "Hospital not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Hospital retrieved successfully",
            data: {
                id: hospital._id,
                name: hospital.name,
                code: hospital.code,
                registrationNumber: hospital.registrationNumber,
                status: hospital.status,
                contact: hospital.contact,
                address: hospital.address,
                createdBy: hospital.createdBy
                    ? {
                        id: hospital.createdBy._id,
                        name: hospital.createdBy.name,
                        email: hospital.createdBy.email,
                        phone: hospital.createdBy.phone,
                        role: hospital.createdBy.role,
                        status: hospital.createdBy.status,
                    }
                    : null,
                createdAt: hospital.createdAt,
                updatedAt: hospital.updatedAt,
            },
        });
    } catch (error) {
        console.error("Get Hospital By Id For Super Admin Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = {
    getAllHospitalsForSuperAdmin,
    getHospitalByIdForSuperAdmin,
};
