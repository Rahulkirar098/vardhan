/**
 * Centralized Date & Time Utilities for Vardhan HRMS
 */

/**
 * Safely parse YYYY-MM-DD or ISO string into a local Date object.
 * If YYYY-MM-DD, parses as local midnight (not UTC midnight).
 */
export const parseLocalDateStr = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;

  if (typeof dateStr === 'string') {
    const trimmed = dateStr.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(year, month, day);
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

/**
 * Get local date string YYYY-MM-DD for a given date (defaults to today)
 * Never converts via UTC to avoid date shifting in positive/negative timezones.
 */
export const getTodayDateStr = (dateInput = new Date()) => {
  const d = typeof dateInput === 'string' ? parseLocalDateStr(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format a date string (YYYY-MM-DD or ISO) into local date format (e.g., "30 Sep 2026")
 */
export const formatDate = (dateInput, options = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!dateInput) return '—';
  try {
    const d = parseLocalDateStr(dateInput);
    if (!d || isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('en-US', options);
  } catch {
    return String(dateInput);
  }
};

/**
 * Format date to full day display (e.g., "Wednesday, September 30, 2026")
 */
export const formatDayFull = (dateInput) => {
  return formatDate(dateInput, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

/**
 * Centralized 12-hour AM/PM Time Formatter
 * Handles:
 * - 24-hour time strings ("08:00" -> "08:00 AM", "14:25" -> "02:25 PM", "20:00" -> "08:00 PM", "00:00" -> "12:00 AM")
 * - ISO UTC timestamps ("2026-09-29T20:25:00.000Z" -> "02:25 AM")
 * - Date objects
 */
export const formatTime12h = (timeInput) => {
  if (!timeInput) return '—';

  // Case 1: Date object or ISO timestamp string with T/Z
  if (timeInput instanceof Date || (typeof timeInput === 'string' && (timeInput.includes('T') || timeInput.includes('Z')))) {
    const d = new Date(timeInput);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Case 2: Time-only 24h string "HH:mm" or "HH:mm:ss"
  if (typeof timeInput === 'string' && timeInput.includes(':')) {
    const parts = timeInput.trim().split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] ? parts[1].substring(0, 2) : '00';
    if (isNaN(h)) return timeInput;

    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;

    const formattedHour = String(h).padStart(2, '0');
    return `${formattedHour}:${m} ${ampm}`;
  }

  return String(timeInput);
};

/**
 * Format ISO string to Date & 12h Time string (e.g. "30 Sep 2026, 02:25 AM")
 */
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const dateFormatted = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeFormatted = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateFormatted}, ${timeFormatted}`;
  } catch {
    return String(dateStr);
  }
};

/**
 * Calculate duration in hours and minutes from minutes
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return '—';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
};
