const Hospital = require("../models/hospital.model");
const User = require("../models/user.model");
const Invitation = require("../models/invitation.model");
const Employee = require("../models/employee.model");
const Leave = require("../models/leave.model");
const Attendance = require("../models/attendance.model");
const RosterAssignment = require("../models/rosterAssignment.model");
const AttendanceRegularization = require("../models/attendanceRegularization.model");

const getMyHospital = async (userId) => {
    const hospital = await Hospital.findOne({ createdBy: userId })
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 });

    if (!hospital) {
        const err = new Error("Hospital not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    return hospital;
};

const createHospital = async (user, hospitalData) => {
    const { name, code, registrationNumber, contact, address, logo, status } = hospitalData;

    const normalizedName = String(name).trim();
    const normalizedCode = String(code).trim().toUpperCase();

    const existingHospitalByAdmin = await Hospital.findOne({
        createdBy: user.id,
    });

    if (existingHospitalByAdmin) {
        const err = new Error("You can create only one hospital");
        err.code = "LIMIT_REACHED";
        throw err;
    }

    const existingHospital = await Hospital.findOne({ code: normalizedCode });

    if (existingHospital) {
        const err = new Error("Hospital code already exists");
        err.code = "DUPLICATE_CODE";
        throw err;
    }

    const hospital = await Hospital.create({
        name: normalizedName,
        code: normalizedCode,
        registrationNumber: registrationNumber ? String(registrationNumber).trim() : null,
        contact: contact || {},
        address: address || {},
        logo: logo || null,
        status: status || "active",
        createdBy: user.id,
    });

    await User.findByIdAndUpdate(
        user.id,
        { hospitalId: hospital._id },
        { new: true }
    );

    return hospital;
};

const getHospitals = async (userId) => {
    return await Hospital.find({ createdBy: userId })
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 });
};

const getHospitalOverview = async (userId) => {
    let hospital = await Hospital.findOne({ createdBy: userId });
    if (!hospital) {
        hospital = await Hospital.findOne({ adminId: userId });
    }
    if (!hospital) {
        const user = await User.findById(userId);
        if (user && user.hospitalId) {
            hospital = await Hospital.findById(user.hospitalId);
        }
    }

    if (!hospital) {
        const err = new Error("Hospital not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [
        totalEmployees,
        activeEmployees,
        pendingLeaves,
        todayAttendance,
        todayRosterAssigned,
        pendingRegularizations,
        hrCount,
        pendingInvitationCount
    ] = await Promise.all([
        Employee.countDocuments({ hospitalId: hospital._id }),
        Employee.countDocuments({ hospitalId: hospital._id, employmentStatus: "ACTIVE" }),
        Leave.countDocuments({ hospitalId: hospital._id, status: { $in: ["PENDING", "pending"] } }),
        Attendance.countDocuments({ hospitalId: hospital._id, date: { $gte: startOfDay, $lte: endOfDay } }),
        RosterAssignment.countDocuments({ hospitalId: hospital._id, date: { $gte: startOfDay, $lte: endOfDay } }),
        AttendanceRegularization.countDocuments({ hospitalId: hospital._id, status: "PENDING" }),
        User.countDocuments({ hospitalId: hospital._id, role: "employee" }),
        Invitation.countDocuments({ hospitalId: hospital._id, status: "pending" }),
    ]);

    return {
        hospital,
        stats: {
            totalEmployees,
            activeEmployees,
            pendingLeaves,
            todayAttendance,
            todayRosterAssigned,
            pendingRegularizations,
            hrCount,
            pendingInvitationCount,
        },
    };
};

const updateHospital = async (userId, hospitalId, updatesData) => {
    const hospital = await Hospital.findOne({
        _id: hospitalId,
        createdBy: userId,
    });

    if (!hospital) {
        const err = new Error("Hospital not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    const { name, code, registrationNumber, contact, address, logo, status } = updatesData;
    const updates = {};

    if (name !== undefined) {
        updates.name = String(name).trim();
    }

    if (code !== undefined) {
        const normalizedCode = String(code).trim().toUpperCase();
        const existingHospital = await Hospital.findOne({
            code: normalizedCode,
            _id: { $ne: hospital._id },
        });

        if (existingHospital) {
            const err = new Error("Hospital code already exists");
            err.code = "DUPLICATE_CODE";
            throw err;
        }

        updates.code = normalizedCode;
    }

    if (registrationNumber !== undefined) {
        updates.registrationNumber = registrationNumber ? String(registrationNumber).trim() : null;
    }

    if (contact !== undefined) {
        const contactUpdates = {};
        if (contact.phone !== undefined) contactUpdates.phone = String(contact.phone).trim();
        if (contact.email !== undefined) contactUpdates.email = String(contact.email).trim();
        if (contact.website !== undefined) contactUpdates.website = contact.website ? String(contact.website).trim() : null;

        if (Object.keys(contactUpdates).length > 0) {
            updates.contact = { ...hospital.contact.toObject(), ...contactUpdates };
        }
    }

    if (address !== undefined) {
        const addressUpdates = {};
        if (address.addressLine1 !== undefined) addressUpdates.addressLine1 = String(address.addressLine1).trim();
        if (address.addressLine2 !== undefined) addressUpdates.addressLine2 = address.addressLine2 ? String(address.addressLine2).trim() : null;
        if (address.city !== undefined) addressUpdates.city = String(address.city).trim();
        if (address.state !== undefined) addressUpdates.state = String(address.state).trim();
        if (address.country !== undefined) addressUpdates.country = String(address.country).trim() || "India";
        if (address.pincode !== undefined) addressUpdates.pincode = String(address.pincode).trim();

        if (Object.keys(addressUpdates).length > 0) {
            updates.address = { ...hospital.address.toObject(), ...addressUpdates };
        }
    }

    if (logo !== undefined) {
        updates.logo = logo || null;
    }

    if (status !== undefined) {
        updates.status = status;
    }

    Object.assign(hospital, updates);
    await hospital.save();

    return hospital;
};

module.exports = {
    getMyHospital,
    createHospital,
    getHospitals,
    getHospitalOverview,
    updateHospital,
};
