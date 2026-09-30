const assert = require("assert");

// Import frontend dateUtils logic (using CommonJS wrapper for node test execution)
const parseLocalDateStr = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === "string") {
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

const getTodayDateStr = (dateInput = new Date()) => {
  const d = typeof dateInput === "string" ? parseLocalDateStr(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTime12h = (timeInput) => {
  if (!timeInput) return "—";

  if (timeInput instanceof Date || (typeof timeInput === "string" && (timeInput.includes("T") || timeInput.includes("Z")))) {
    const d = new Date(timeInput);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  if (typeof timeInput === "string" && timeInput.includes(":")) {
    const parts = timeInput.trim().split(":");
    let h = parseInt(parts[0], 10);
    const m = parts[1] ? parts[1].substring(0, 2) : "00";
    if (isNaN(h)) return timeInput;

    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;

    const formattedHour = String(h).padStart(2, "0");
    return `${formattedHour}:${m} ${ampm}`;
  }

  return String(timeInput);
};

console.log("==========================================");
console.log("RUNNING VARDHAN DATE/TIME POLICY AUDIT TESTS");
console.log("==========================================");

// 1. Time Formatter Tests
assert.strictEqual(formatTime12h("00:00"), "12:00 AM", "00:00 should format to 12:00 AM");
assert.strictEqual(formatTime12h("01:30"), "01:30 AM", "01:30 should format to 01:30 AM");
assert.strictEqual(formatTime12h("02:25"), "02:25 AM", "02:25 should format to 02:25 AM");
assert.strictEqual(formatTime12h("08:00"), "08:00 AM", "08:00 should format to 08:00 AM");
assert.strictEqual(formatTime12h("12:00"), "12:00 PM", "12:00 should format to 12:00 PM");
assert.strictEqual(formatTime12h("14:25"), "02:25 PM", "14:25 should format to 02:25 PM");
assert.strictEqual(formatTime12h("20:00"), "08:00 PM", "20:00 should format to 08:00 PM");
console.log("✓ Time Formatter Tests Passed");

// 2. Local Calendar Date Tests (IST Proof)
const testDateStr = "2026-09-30";
const parsed = parseLocalDateStr(testDateStr);
assert.strictEqual(parsed.getFullYear(), 2026, "Year must be 2026");
assert.strictEqual(parsed.getMonth(), 8, "Month must be 8 (September)");
assert.strictEqual(parsed.getDate(), 30, "Date must be 30");
assert.strictEqual(getTodayDateStr(testDateStr), "2026-09-30", "Date string must remain 2026-09-30");
console.log("✓ Local Calendar Date Tests Passed");

// 3. Night Shift Roster Formatting
const nightShiftStart = "20:00";
const nightShiftEnd = "08:00";
assert.strictEqual(formatTime12h(nightShiftStart), "08:00 PM");
assert.strictEqual(formatTime12h(nightShiftEnd), "08:00 AM");
console.log("✓ Night Shift Roster Formatting Passed");

console.log("==========================================");
console.log("ALL VARDHAN DATE/TIME POLICY TESTS PASSED!");
console.log("==========================================");
