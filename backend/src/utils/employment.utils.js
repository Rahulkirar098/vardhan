const { getHospitalTodayDateStr } = require('./timezone.utils');

/**
 * Authoritative system rule for checking if an employee is employed on a given date in hospital timezone.
 *
 * @param {Object} employee - Employee object or document (containing dateOfJoining, lastWorkingDay, employmentStatus)
 * @param {Date|string|number} dateInput - Target date (Date, YYYY-MM-DD string, or timestamp)
 * @param {string} [timezone="Asia/Kolkata"] - IANA hospital timezone
 * @returns {boolean}
 */
const isEmployeeEmployedOnDate = (employee, dateInput, timezone = 'Asia/Kolkata') => {
  if (!employee) return false;

  if (employee.employmentStatus && String(employee.employmentStatus).toUpperCase() === 'INACTIVE') {
    return false;
  }

  let targetDateStr;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    targetDateStr = dateInput.trim();
  } else {
    targetDateStr = getHospitalTodayDateStr(dateInput, timezone);
  }

  // Check Date of Joining
  if (employee.dateOfJoining) {
    const dojStr = getHospitalTodayDateStr(employee.dateOfJoining, timezone);
    if (targetDateStr < dojStr) {
      return false;
    }
  }

  // Check Last Working Day (inclusive)
  if (employee.lastWorkingDay) {
    const lwdStr = getHospitalTodayDateStr(employee.lastWorkingDay, timezone);
    if (targetDateStr > lwdStr) {
      return false;
    }
  }

  return true;
};

module.exports = {
  isEmployeeEmployedOnDate,
};
