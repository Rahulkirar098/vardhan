/**
 * Centralized Timezone and Date-Time Utility for Vardhan Hospital SaaS
 */

/**
 * Validates whether a given string is a supported IANA timezone identifier.
 * @param {string} tz - IANA timezone identifier (e.g. "Asia/Kolkata", "Asia/Dubai")
 * @returns {boolean}
 */
const isValidTimezone = (tz) => {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Gets the YYYY-MM-DD date string for a given instant in a hospital timezone.
 * @param {Date|number|string} instant - JavaScript Date object or timestamp
 * @param {string} timezone - IANA timezone identifier
 * @returns {string} Date string formatted as YYYY-MM-DD
 */
const getHospitalTodayDateStr = (instant = new Date(), timezone = 'Asia/Kolkata') => {
  const tz = isValidTimezone(timezone) ? timezone : 'Asia/Kolkata';
  const dateObj = instant instanceof Date ? instant : new Date(instant);
  if (isNaN(dateObj.getTime())) return new Date().toISOString().split('T')[0];

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(dateObj);
};

/**
 * Gets the lower-case day of week ("monday"..."sunday") for a date in a hospital timezone.
 * @param {string|Date} input - YYYY-MM-DD string or Date object
 * @param {string} timezone - IANA timezone identifier
 * @returns {string} "monday", "tuesday", etc.
 */
const getHospitalDayOfWeek = (input, timezone = 'Asia/Kolkata') => {
  const tz = isValidTimezone(timezone) ? timezone : 'Asia/Kolkata';

  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map(Number);
    const midDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' });
    return formatter.format(midDate).toLowerCase();
  }

  const dateObj = input instanceof Date ? input : new Date(input);
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long' });
  return formatter.format(dateObj).toLowerCase();
};

/**
 * Parses local hospital date string ("YYYY-MM-DD") and time string ("HH:mm" or "HH:mm AM/PM")
 * in the hospital's timezone into an exact JavaScript Date object (UTC instant).
 * @param {string|Date} timeInput - Local time string or Date
 * @param {string} baseDateStr - Base date string YYYY-MM-DD
 * @param {string} timezone - IANA timezone identifier
 * @returns {Date|null}
 */
const parseHospitalTimeToDate = (timeInput, baseDateStr, timezone = 'Asia/Kolkata') => {
  if (!timeInput) return null;
  if (timeInput instanceof Date && !isNaN(timeInput.getTime())) return timeInput;

  const tz = isValidTimezone(timezone) ? timezone : 'Asia/Kolkata';

  if (typeof timeInput === 'string') {
    const trimmed = timeInput.trim();
    if (!trimmed) return null;

    if (trimmed.includes('T') || trimmed.includes('Z')) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d;
    }

    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)$/i);
    if (match12) {
      hours = parseInt(match12[1], 10);
      minutes = parseInt(match12[2], 10);
      seconds = match12[3] ? parseInt(match12[3], 10) : 0;
      const meridiem = match12[4].toUpperCase();

      if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
        const error = new Error('Invalid time format.');
        error.code = 'VALIDATION_ERROR';
        throw error;
      }
      if (meridiem === 'PM' && hours !== 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
    } else {
      const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (match24) {
        hours = parseInt(match24[1], 10);
        minutes = parseInt(match24[2], 10);
        seconds = match24[3] ? parseInt(match24[3], 10) : 0;
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
          const error = new Error('Invalid time format.');
          error.code = 'VALIDATION_ERROR';
          throw error;
        }
      } else {
        return null;
      }
    }

    const [year, month, day] = baseDateStr.split('-').map(Number);
    const utcMillis = Date.UTC(year, month - 1, day, hours, minutes, seconds);
    const refDate = new Date(utcMillis);

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(refDate);
    const p = {};
    for (const part of parts) {
      if (part.type !== 'literal') p[part.type] = Number(part.value);
    }
    if (p.hour === 24) p.hour = 0;

    const targetLocalMillis = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second || 0);
    const offset = targetLocalMillis - utcMillis;
    const desiredLocalMillis = Date.UTC(year, month - 1, day, hours, minutes, seconds);

    return new Date(desiredLocalMillis - offset);
  }

  return null;
};

module.exports = {
  isValidTimezone,
  getHospitalTodayDateStr,
  getHospitalDayOfWeek,
  parseHospitalTimeToDate,
};
