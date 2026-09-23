/**
 * Vardhan Leave Management Constants
 */

const LEAVE_TYPES = Object.freeze({
    CASUAL: "CASUAL",
    SICK: "SICK",
    ANNUAL: "ANNUAL",
    EMERGENCY: "EMERGENCY",
    UNPAID: "UNPAID",
});

const LEAVE_TYPE_LABELS = Object.freeze({
    [LEAVE_TYPES.CASUAL]: "Casual Leave",
    [LEAVE_TYPES.SICK]: "Sick Leave",
    [LEAVE_TYPES.ANNUAL]: "Annual Leave",
    [LEAVE_TYPES.EMERGENCY]: "Emergency Leave",
    [LEAVE_TYPES.UNPAID]: "Unpaid Leave",
});

const LEAVE_STATUSES = Object.freeze({
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    CANCELLED: "cancelled",
});

const VALID_LEAVE_TYPES = Object.values(LEAVE_TYPES);
const VALID_LEAVE_STATUSES = Object.values(LEAVE_STATUSES);

module.exports = {
    LEAVE_TYPES,
    LEAVE_TYPE_LABELS,
    LEAVE_STATUSES,
    VALID_LEAVE_TYPES,
    VALID_LEAVE_STATUSES,
};
