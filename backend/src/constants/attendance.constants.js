/**
 * Attendance Constants
 */

const ATTENDANCE_STATUSES = Object.freeze({
    PRESENT: "PRESENT",
    ABSENT: "ABSENT",
    HALF_DAY: "HALF_DAY",
});

const VALID_ATTENDANCE_STATUSES = Object.freeze(Object.values(ATTENDANCE_STATUSES));

module.exports = {
    ATTENDANCE_STATUSES,
    VALID_ATTENDANCE_STATUSES,
};
