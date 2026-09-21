const crypto = require("crypto");
const Hospital = require("../models/hospital.model");
const User = require("../models/user.model");
const Invitation = require("../models/invitation.model");
const { hashTokenValue } = require("./invitation.service");
const { hashPassword } = require("../utils/password");
const { sendEmail } = require("../utils/mail");

const VALID_HR_PERMISSIONS = [
    "structure.view",
    "structure.create",
    "structure.update",
    "structure.delete",
];

const getAdminHospital = async (adminId) => {
    return Hospital.findOne({ createdBy: adminId });
};

const createHR = async ({
    name,
    email,
    phone,
    password,
    adminId,
}) => {
    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    const hospital = await getAdminHospital(adminId);
    if (!hospital) {
        const err = new Error("Please create your hospital first");
        err.code = "NO_HOSPITAL";
        throw err;
    }

    const existingUser = await User.findOne({
        email: normalizedEmail,
        hospitalId: hospital._id,
        role: "hr",
    });

    if (existingUser) {
        const err = new Error("An HR account with this email already exists for this hospital");
        err.code = "DUPLICATE_HR";
        throw err;
    }

    const existingUserByEmail = await User.findOne({ email: normalizedEmail });
    if (existingUserByEmail) {
        const err = new Error("Email already registered");
        err.code = "DUPLICATE_EMAIL";
        throw err;
    }

    const hashedPasswordValue = await hashPassword(password);

    const hrUser = await User.create({
        name: normalizedName,
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        password: hashedPasswordValue,
        role: "hr",
        status: "active",
        createdBy: adminId,
        hospitalId: hospital._id,
    });

    return hrUser;
};

const inviteHR = async ({
    name,
    email,
    phone,
    modules,
    permissions,
    adminId,
    adminName,
}) => {
    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    const hospital = await getAdminHospital(adminId);
    if (!hospital) {
        const err = new Error("Please create a hospital first");
        err.code = "NO_HOSPITAL";
        throw err;
    }

    const activeHR = await User.findOne({
        email: normalizedEmail,
        hospitalId: hospital._id,
        role: "hr",
        status: "active",
    });

    if (activeHR) {
        const err = new Error("An HR account with this email already exists for this hospital");
        err.code = "DUPLICATE_HR";
        throw err;
    }

    const existingInvitation = await Invitation.findOne({
        hospitalId: hospital._id,
        email: normalizedEmail,
        type: "HR",
        status: "pending",
    });

    if (existingInvitation) {
        const err = new Error("An HR invitation is already pending for this email");
        err.code = "DUPLICATE_INVITATION";
        throw err;
    }

    let validModules = ["core"];
    if (modules !== undefined) {
        validModules = [...new Set(["core", ...modules])];
    }

    let validPermissions = [];
    if (permissions !== undefined) {
        validPermissions = [...new Set(permissions)];
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashTokenValue(rawToken);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const nameParts = normalizedName.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

    const invitation = await Invitation.create({
        type: "HR",
        firstName,
        lastName,
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        hospitalId: hospital._id,
        invitedBy: adminId,
        tokenHash,
        expiresAt,
        status: "pending",
        role: "hr",
        modules: validModules,
        permissions: validPermissions,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const invitationUrl = `${frontendUrl}/hr/invite/${rawToken}`;

    try {
        await sendEmail({
            to: normalizedEmail,
            subject: `You're invited to join ${hospital.name}`,
            text: `Hello ${normalizedName},\n\nYou have been invited by ${adminName || "your admin"} to join ${hospital.name}.\n\nRole: HR\n\nClick here to accept the invitation and create your account: ${invitationUrl}\n\nThis invitation expires in 48 hours.`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                    <h2>You're invited to join ${hospital.name}</h2>
                    <p>Hello ${normalizedName},</p>
                    <p>You have been invited by ${adminName || "your admin"} to join <strong>${hospital.name}</strong>.</p>
                    <p><strong>Role:</strong> HR</p>
                    <p>Click the button below to accept the invitation and create your account.</p>
                    <p>
                        <a href="${invitationUrl}" style="display: inline-block; background: #111827; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">Accept Invitation</a>
                    </p>
                    <p>Invitation expires in 48 hours.</p>
                    <p>If you did not expect this invitation, you can ignore this email.</p>
                    <p>Regards,<br />Krince.in</p>
                </div>
            `,
        });
    } catch (emailError) {
        await Invitation.findByIdAndDelete(invitation._id);
        const err = new Error(emailError.message);
        err.code = "EMAIL_FAILED";
        throw err;
    }

    return invitation;
};

const getInvitationByToken = async (token) => {
    const tokenHash = hashTokenValue(token);
    const invitation = await Invitation.findOne({
        tokenHash,
        status: "pending",
        type: "HR",
    }).populate("hospitalId", "name");

    if (!invitation) {
        return null;
    }

    if (new Date(invitation.expiresAt) < new Date()) {
        invitation.status = "expired";
        await invitation.save();
        return null;
    }

    return invitation;
};

const acceptInvitation = async (token, password) => {
    const tokenHash = hashTokenValue(token);
    const invitation = await Invitation.findOne({
        tokenHash,
        status: "pending",
        type: "HR"
    }).populate("hospitalId", "name");

    if (!invitation) {
        const err = new Error("Invitation is invalid or has expired.");
        err.code = "INVALID_INVITATION";
        throw err;
    }

    if (new Date(invitation.expiresAt) < new Date()) {
        invitation.status = "expired";
        await invitation.save();
        const err = new Error("Invitation is invalid or has expired.");
        err.code = "EXPIRED_INVITATION";
        throw err;
    }

    const existingUser = await User.findOne({ email: invitation.email });
    if (existingUser) {
        const err = new Error("An account with this email already exists");
        err.code = "DUPLICATE_EMAIL";
        throw err;
    }

    const hashedPassword = await hashPassword(password);
    const assignedModules = Array.isArray(invitation.modules) && invitation.modules.length > 0
        ? [...new Set(["core", ...invitation.modules])]
        : ["core"];

    const hrUser = await User.create({
        name: `${invitation.firstName} ${invitation.lastName || ""}`.trim(),
        email: invitation.email,
        phone: invitation.phone,
        password: hashedPassword,
        role: "hr",
        hospitalId: invitation.hospitalId,
        createdBy: invitation.invitedBy,
        status: "active",
        modules: assignedModules,
        permissions: invitation.permissions || [],
    });

    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    await invitation.save();

    return hrUser;
};

const resendInvitation = async (invitationId, adminId, adminName) => {
    const hospital = await getAdminHospital(adminId);
    if (!hospital) {
        const err = new Error("Please create a hospital first");
        err.code = "NO_HOSPITAL";
        throw err;
    }

    const invitation = await Invitation.findOne({
        _id: invitationId,
        hospitalId: hospital._id,
        invitedBy: adminId,
        type: "HR"
    });

    if (!invitation) {
        const err = new Error("Invitation not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    if (invitation.status === "accepted" || invitation.status === "cancelled") {
        const err = new Error("This invitation cannot be resent");
        err.code = "INVALID_STATUS";
        throw err;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashTokenValue(rawToken);
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const invitationUrl = `${frontendUrl}/hr/invite/${rawToken}`;

    const fullName = `${invitation.firstName} ${invitation.lastName || ""}`.trim();

    try {
        await sendEmail({
            to: invitation.email,
            subject: `You're invited to join ${hospital.name} as HR`,
            text: `Hello ${fullName},\n\nYou have been invited by ${adminName || "your admin"} to join ${hospital.name} as an HR.\n\nClick here to accept the invitation: ${invitationUrl}\n\nThis invitation expires in 48 hours.`,
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                    <h2>You're invited to join ${hospital.name} as HR</h2>
                    <p>Hello ${fullName},</p>
                    <p>You have been invited by ${adminName || "your admin"} to join <strong>${hospital.name}</strong> as an HR.</p>
                    <p><a href="${invitationUrl}" style="display: inline-block; background: #111827; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">Accept Invitation</a></p>
                    <p>This invitation expires in 48 hours.</p>
                </div>
            `,
        });

        invitation.tokenHash = tokenHash;
        invitation.expiresAt = expiresAt;
        invitation.status = "pending";
        invitation.acceptedAt = null;
        await invitation.save();
    } catch (emailError) {
        const err = new Error(emailError.message);
        err.code = "EMAIL_FAILED";
        throw err;
    }

    return true;
};

const cancelInvitation = async (invitationId, adminId) => {
    const hospital = await getAdminHospital(adminId);
    if (!hospital) {
        const err = new Error("Please create a hospital first");
        err.code = "NO_HOSPITAL";
        throw err;
    }

    const invitation = await Invitation.findOne({
        _id: invitationId,
        hospitalId: hospital._id,
        invitedBy: adminId,
        type: "HR"
    });

    if (!invitation) {
        const err = new Error("Invitation not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    invitation.status = "cancelled";
    await invitation.save();

    return true;
};

const updateHRPermissions = async (hrId, permissions, adminId) => {
    const hrUser = await User.findById(hrId);

    if (!hrUser || hrUser.role !== "hr") {
        const err = new Error("HR profile not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    const hospital = await getAdminHospital(adminId);
    if (!hospital || !hrUser.hospitalId || hrUser.hospitalId.toString() !== hospital._id.toString()) {
        const err = new Error("You can only modify permissions for HR in your hospital");
        err.code = "FORBIDDEN";
        throw err;
    }

    const uniquePermissions = [...new Set(permissions)];
    hrUser.permissions = uniquePermissions;
    await hrUser.save();

    return hrUser;
};

const updateHRModules = async (hrId, modules, adminId) => {
    const hrUser = await User.findById(hrId);

    if (!hrUser || hrUser.role !== "hr") {
        const err = new Error("HR profile not found");
        err.code = "NOT_FOUND";
        throw err;
    }

    const hospital = await getAdminHospital(adminId);
    if (!hospital || !hrUser.hospitalId || hrUser.hospitalId.toString() !== hospital._id.toString()) {
        const err = new Error("You can only modify modules for HR in your hospital");
        err.code = "FORBIDDEN";
        throw err;
    }

    const uniqueModules = [...new Set(["core", ...modules])];
    hrUser.modules = uniqueModules;
    await hrUser.save();

    return hrUser;
};

module.exports = {
    VALID_HR_PERMISSIONS,
    getAdminHospital,
    createHR,
    inviteHR,
    getInvitationByToken,
    acceptInvitation,
    resendInvitation,
    cancelInvitation,
    updateHRPermissions,
    updateHRModules
};
