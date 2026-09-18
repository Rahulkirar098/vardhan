const Hospital = require("../models/hospital.model");
const User = require("../models/user.model");
const Department = require("../models/department.model");
const HrInvitation = require("../models/hrInvitation.model");
const { isValidObjectId } = require("../utils/validate");

const getMyHospital = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can access their hospital",
            });
        }

        const hospital = await Hospital.findOne({ createdBy: req.user.id })
            .populate("createdBy", "name email role")
            .sort({ createdAt: -1 });

        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: "Hospital not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Hospital retrieved successfully",
            data: hospital,
        });
    } catch (error) {
        console.error("Get My Hospital Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const createHospital = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can create a hospital",
            });
        }

        const {
            name,
            code,
            registrationNumber,
            contact,
            address,
            logo,
            status,
        } = req.body;

        if (!name || !code) {
            return res.status(400).json({
                success: false,
                message: "Hospital name and code are required",
            });
        }

        const normalizedName = String(name).trim();
        const normalizedCode = String(code).trim().toUpperCase();

        if (!normalizedName || !normalizedCode) {
            return res.status(400).json({
                success: false,
                message: "Hospital name and code are required",
            });
        }

        const existingHospitalByAdmin = await Hospital.findOne({
            createdBy: req.user.id,
        });

        if (existingHospitalByAdmin) {
            return res.status(409).json({
                success: false,
                message: "You can create only one hospital",
            });
        }

        const existingHospital = await Hospital.findOne({ code: normalizedCode });

        if (existingHospital) {
            return res.status(409).json({
                success: false,
                message: "Hospital code already exists",
            });
        }

        const hospital = await Hospital.create({
            name: normalizedName,
            code: normalizedCode,
            registrationNumber: registrationNumber
                ? String(registrationNumber).trim()
                : null,
            contact: contact || {},
            address: address || {},
            logo: logo || null,
            status: status || "active",
            createdBy: req.user.id,
        });

        await User.findByIdAndUpdate(
            req.user.id,
            { hospitalId: hospital._id },
            { new: true }
        );

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
        if (error && error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "You can create only one hospital",
            });
        }

        console.error("Create Hospital Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const getHospitals = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can access hospital list",
            });
        }

        const hospitals = await Hospital.find({ createdBy: req.user.id })
            .populate("createdBy", "name email role")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Hospitals retrieved successfully",
            data: hospitals,
        });
    } catch (error) {
        console.error("Get Hospitals Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const getHospitalOverview = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can access hospital overview",
            });
        }

        const hospital = await Hospital.findOne({ createdBy: req.user.id });

        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: "Hospital not found",
            });
        }

        const [departmentCount, hrCount, pendingInvitationCount] = await Promise.all([
            Department.countDocuments({ hospitalId: hospital._id }),
            User.countDocuments({ hospitalId: hospital._id, role: "hr" }),
            HrInvitation.countDocuments({ hospitalId: hospital._id, status: "pending" }),
        ]);

        const departments = await Department.find({ hospitalId: hospital._id })
            .sort({ createdAt: -1 })
            .lean();

        const departmentSummaries = await Promise.all(
            departments.map(async (department) => {
                const hrTotal = await User.countDocuments({
                    hospitalId: hospital._id,
                    departmentId: department._id,
                    role: "hr",
                });

                return {
                    ...department,
                    hrCount: hrTotal,
                };
            })
        );

        return res.status(200).json({
            success: true,
            message: "Hospital overview retrieved successfully",
            data: {
                hospital,
                stats: {
                    departmentCount,
                    hrCount,
                    pendingInvitationCount,
                },
                departments: departmentSummaries,
            },
        });
    } catch (error) {
        console.error("Get Hospital Overview Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const updateHospital = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can update a hospital",
            });
        }

        const { hospitalId } = req.params;

        if (!isValidObjectId(hospitalId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid hospital id",
            });
        }

        const hospital = await Hospital.findOne({
            _id: hospitalId,
            createdBy: req.user.id,
        });

        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: "Hospital not found",
            });
        }

        const { name, code, registrationNumber, contact, address, logo, status } = req.body;
        const updates = {};

        if (name !== undefined) {
            const normalizedName = String(name).trim();

            if (!normalizedName) {
                return res.status(400).json({
                    success: false,
                    message: "Hospital name is required",
                });
            }

            updates.name = normalizedName;
        }

        if (code !== undefined) {
            const normalizedCode = String(code).trim().toUpperCase();

            if (!normalizedCode) {
                return res.status(400).json({
                    success: false,
                    message: "Hospital code is required",
                });
            }

            const existingHospital = await Hospital.findOne({
                code: normalizedCode,
                _id: { $ne: hospital._id },
            });

            if (existingHospital) {
                return res.status(409).json({
                    success: false,
                    message: "Hospital code already exists",
                });
            }

            updates.code = normalizedCode;
        }

        if (registrationNumber !== undefined) {
            updates.registrationNumber = registrationNumber
                ? String(registrationNumber).trim()
                : null;
        }

        if (contact !== undefined) {
            const contactUpdates = {};

            if (contact.phone !== undefined) {
                contactUpdates.phone = String(contact.phone).trim();
            }

            if (contact.email !== undefined) {
                contactUpdates.email = String(contact.email).trim();
            }

            if (contact.website !== undefined) {
                contactUpdates.website = contact.website
                    ? String(contact.website).trim()
                    : null;
            }

            if (Object.keys(contactUpdates).length > 0) {
                updates.contact = { ...hospital.contact.toObject(), ...contactUpdates };
            }
        }

        if (address !== undefined) {
            const addressUpdates = {};

            if (address.addressLine1 !== undefined) {
                addressUpdates.addressLine1 = String(address.addressLine1).trim();
            }

            if (address.addressLine2 !== undefined) {
                addressUpdates.addressLine2 = address.addressLine2
                    ? String(address.addressLine2).trim()
                    : null;
            }

            if (address.city !== undefined) {
                addressUpdates.city = String(address.city).trim();
            }

            if (address.state !== undefined) {
                addressUpdates.state = String(address.state).trim();
            }

            if (address.country !== undefined) {
                addressUpdates.country = String(address.country).trim() || "India";
            }

            if (address.pincode !== undefined) {
                addressUpdates.pincode = String(address.pincode).trim();
            }

            if (Object.keys(addressUpdates).length > 0) {
                updates.address = { ...hospital.address.toObject(), ...addressUpdates };
            }
        }

        if (logo !== undefined) {
            updates.logo = logo || null;
        }

        if (status !== undefined) {
            if (!["active", "inactive"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Status must be active or inactive",
                });
            }

            updates.status = status;
        }

        Object.assign(hospital, updates);
        await hospital.save();

        return res.status(200).json({
            success: true,
            message: "Hospital updated successfully",
            data: hospital,
        });
    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Hospital code already exists",
            });
        }

        console.error("Update Hospital Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

module.exports = {
    createHospital,
    getHospitals,
    getMyHospital,
    getHospitalOverview,
    updateHospital,
};
