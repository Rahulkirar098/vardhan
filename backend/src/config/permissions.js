const PERMISSIONS = Object.freeze({
    // Hospital
    HOSPITAL_VIEW: "hospital.view",
    HOSPITAL_UPDATE: "hospital.update",

    // Hospital Structure (Floors & Rooms)
    STRUCTURE_VIEW: "structure.view",
    STRUCTURE_CREATE: "structure.create",
    STRUCTURE_UPDATE: "structure.update",
    STRUCTURE_DELETE: "structure.delete",
    STRUCTURE_MANAGE: "structure.manage",
    // Employee Management (HRMS)
    EMPLOYEE_VIEW: "employee.view",
    EMPLOYEE_CREATE: "employee.create",
    EMPLOYEE_UPDATE: "employee.update",
    EMPLOYEE_POSITION_UPDATE: "employee.position.update",
    EMPLOYEE_DELETE: "employee.delete",       // used for deactivate/activate action
    EMPLOYEE_DEACTIVATE: "employee.delete",   // alias — same permission value

    // Access Management
    ACCESS_VIEW: "access.view",
    ACCESS_MANAGE: "access.manage",

    // Future Phase Placeholders (Roster & Shifts)
    ROSTER_VIEW: "roster.view",
    ROSTER_MANAGE: "roster.manage",

    // Leave Management (HRMS)
    LEAVE_APPLY: "leave.apply",
    LEAVE_VIEW_OWN: "leave.view_own",
    LEAVE_CANCEL_OWN: "leave.cancel_own",
    LEAVE_VIEW: "leave.view",
    LEAVE_APPROVE: "leave.approve",
    LEAVE_MANAGE: "leave.manage",

    // Attendance (HRMS)
    ATTENDANCE_VIEW_OWN: "attendance.view_own",
    ATTENDANCE_VIEW: "attendance.view",
    ATTENDANCE_MANAGE: "attendance.manage",

    // Position Management
    POSITION_VIEW: "position.view",
    POSITION_CREATE: "position.create",
    POSITION_UPDATE: "position.update",
});

module.exports = {
    PERMISSIONS,
};
