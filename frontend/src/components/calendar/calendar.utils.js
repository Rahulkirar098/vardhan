/**
 * Unified Calendar Utility Functions
 */

export const WEEKDAYS = [
  { full: 'Sunday', short: 'Sun', letter: 'S' },
  { full: 'Monday', short: 'Mon', letter: 'M' },
  { full: 'Tuesday', short: 'Tue', letter: 'T' },
  { full: 'Wednesday', short: 'Wed', letter: 'W' },
  { full: 'Thursday', short: 'Thu', letter: 'T' },
  { full: 'Friday', short: 'Fri', letter: 'F' },
  { full: 'Saturday', short: 'Sat', letter: 'S' },
];

export const toDateString = (d) => {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayString = () => toDateString(new Date());

export const formatMonthYear = (date) => {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

export const formatDayFull = (date) => {
  return date.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export const formatWeekRange = (date) => {
  const start = new Date(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day); // Sunday

  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Saturday

  const startMonth = start.toLocaleString('en-US', { month: 'short' });
  const endMonth = end.toLocaleString('en-US', { month: 'short' });
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear !== endYear) {
    return `${startMonth} ${start.getDate()}, ${startYear} – ${endMonth} ${end.getDate()}, ${endYear}`;
  }
  if (startMonth !== endMonth) {
    return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${startYear}`;
  }
  return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${startYear}`;
};

export const getMonthGrid = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days = [];

  // Previous month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const d = new Date(year, month - 1, dayNum);
    days.push({
      date: d,
      dateStr: toDateString(d),
      dayNum,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    days.push({
      date: d,
      dateStr: toDateString(d),
      dayNum: i,
      isCurrentMonth: true,
    });
  }

  // Next month padding to fill out 35 or 42 grid slots
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    days.push({
      date: d,
      dateStr: toDateString(d),
      dayNum: i,
      isCurrentMonth: false,
    });
  }

  return days;
};

export const getWeekDays = (date) => {
  const current = new Date(date);
  const dayIndex = current.getDay();
  const sunday = new Date(current);
  sunday.setDate(current.getDate() - dayIndex);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    days.push({
      date: d,
      dateStr: toDateString(d),
      dayNum: d.getDate(),
      dayNameShort: WEEKDAYS[i].short,
      dayNameFull: WEEKDAYS[i].full,
    });
  }
  return days;
};
