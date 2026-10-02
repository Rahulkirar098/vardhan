import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, formatTime12h, getTodayDateStr, parseLocalDateStr } from './dateUtils';

export { formatTime12h };

/**
 * Format Date to Month (Year) e.g., OCTOBER (2026)
 */
export function formatMonthYear(dateStr) {
  if (!dateStr) return '';
  const d = parseLocalDateStr(dateStr) || new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const month = d.toLocaleString('en-US', { month: 'long' }).toUpperCase();
  const year = d.getFullYear();
  return `${month} (${year})`;
}

/**
 * Format Date range to DD/MM/YY TO DD/MM/YY e.g., 01/10/26 TO 15/10/26
 */
export function formatDatePeriod(startStr, endStr) {
  const formatShort = (dateInput) => {
    if (!dateInput) return '';
    const d = parseLocalDateStr(dateInput) || new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };
  const start = formatShort(startStr);
  const end = formatShort(endStr);
  if (start && end) return `${start} TO ${end}`;
  return start || end || '';
}

/**
 * Format date range for sub-periods (e.g., 01–05 Oct, 01/10–05/10)
 */
function formatSubPeriod(startStr, endStr) {
  const s = parseLocalDateStr(startStr) || new Date(startStr);
  const e = parseLocalDateStr(endStr) || new Date(endStr);
  if (!s || isNaN(s.getTime())) return '';
  if (!e || isNaN(e.getTime())) return '';

  const startDay = String(s.getDate()).padStart(2, '0');
  const endDay = String(e.getDate()).padStart(2, '0');
  const startMonth = s.toLocaleString('en-US', { month: 'short' });
  const endMonth = e.toLocaleString('en-US', { month: 'short' });

  if (startStr === endStr) {
    return `${startDay} ${startMonth}`;
  }
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${startDay}–${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
}

/**
 * Build concise date ranges string for employee assignments in a cell
 */
function buildDateRangesString(sortedDates, allRosterDates) {
  if (!sortedDates || sortedDates.length === 0) return '';
  // If assigned for all dates of the roster, no date range suffix is needed
  if (allRosterDates && sortedDates.length === allRosterDates.length) {
    return '';
  }

  const blocks = [];
  let blockStart = sortedDates[0];
  let prevDate = parseLocalDateStr(sortedDates[0]);

  for (let i = 1; i < sortedDates.length; i++) {
    const currStr = sortedDates[i];
    const currDate = parseLocalDateStr(currStr);
    const diffDays = Math.round((currDate - prevDate) / 86400000);

    if (diffDays === 1) {
      prevDate = currDate;
    } else {
      blocks.push({ start: blockStart, end: getTodayDateStr(prevDate) });
      blockStart = currStr;
      prevDate = currDate;
    }
  }
  blocks.push({ start: blockStart, end: getTodayDateStr(prevDate) });

  const formattedBlocks = blocks.map((b) => formatSubPeriod(b.start, b.end));
  return `(${formattedBlocks.join(', ')})`;
}

/**
 * Generate and download SINGLE-PAGE PDF in browser matching Hospital Reference Layout
 * The downloaded PDF is ALWAYS EXACTLY ONE PAGE for the selected roster summary.
 * Daily assignments for the same employee in a Shift + Duty Area cell are deduplicated.
 */
export function generateFrontendRosterPDF(activeRoster) {
  if (!activeRoster) return;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~210 mm
  const marginX = 10;
  const printableWidth = pageWidth - marginX * 2; // ~277 mm

  const monthYear = formatMonthYear(activeRoster.startDate);
  const overallDatePeriod = formatDatePeriod(activeRoster.startDate, activeRoster.endDate);
  const rosterTitle = (activeRoster.title || 'HOSPITAL DUTY ROSTER').toUpperCase();

  // Extract columns (shifts)
  let columns = [];
  if (Array.isArray(activeRoster.columns) && activeRoster.columns.length > 0) {
    columns = [...activeRoster.columns].sort((a, b) => (a.order || 0) - (b.order || 0));
  } else {
    columns = [
      { id: 'col-1', title: 'MORNING', startTime: '08:00', endTime: '14:00' },
      { id: 'col-2', title: 'AFTERNOON', startTime: '14:00', endTime: '20:00' },
      { id: 'col-3', title: 'NIGHT', startTime: '20:00', endTime: '08:00' },
    ];
  }

  // Extract duty areas
  let dutyAreas = [];
  if (Array.isArray(activeRoster.dutyAreas) && activeRoster.dutyAreas.length > 0) {
    dutyAreas = [...activeRoster.dutyAreas].sort((a, b) => (a.order || 0) - (b.order || 0));
  } else {
    const areaMap = new Map();
    (activeRoster.assignments || []).forEach((ass) => {
      if (ass.dutyArea && !areaMap.has(ass.dutyArea)) {
        areaMap.set(ass.dutyArea, { id: ass.dutyArea, name: ass.dutyArea });
      }
    });
    dutyAreas = Array.from(areaMap.values());
    if (dutyAreas.length === 0) {
      dutyAreas = [
        { id: 'da-1', name: 'GENERAL WARD' },
        { id: 'da-2', name: 'NICU 2ND FLOOR' },
        { id: 'da-3', name: 'ICU 3RD FLOOR' },
        { id: 'da-4', name: 'OT' },
      ];
    }
  }

  // Construct Header Row for shift columns
  const headRow = columns.map((col, idx) => {
    const title = (col.title || `SHIFT ${idx + 1}`).toUpperCase();
    const timeStr = col.startTime && col.endTime
      ? `${formatTime12h(col.startTime)} TO ${formatTime12h(col.endTime)}`
      : '';
    return timeStr ? `${title} (${timeStr})` : title;
  });

  const assignmentsList = activeRoster.assignments || [];

  // Parse roster date range into array of date ISO strings
  const datesList = [];
  if (activeRoster.startDate && activeRoster.endDate) {
    const start = parseLocalDateStr(activeRoster.startDate);
    const end = parseLocalDateStr(activeRoster.endDate);
    if (start && end) {
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12, 0, 0);
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12, 0, 0);
      while (cur <= endDay) {
        datesList.push(getTodayDateStr(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  if (datesList.length === 0 && activeRoster.startDate) {
    datesList.push(getTodayDateStr(activeRoster.startDate));
  }

  // Build Cell Matrix grouped by Duty Area + Shift Column across entire roster period
  const cellMatrix = dutyAreas.map((da) => {
    const daName = (da.name || da.title || 'DUTY AREA').toUpperCase();

    return columns.map((col) => {
      // Find all assignments for this duty area & column across the entire roster
      const matchingAssignments = assignmentsList.filter((ass) => {
        const matchArea =
          ass.dutyArea &&
          ass.dutyArea.trim().toLowerCase() === daName.trim().toLowerCase();

        const matchCol =
          (ass.columnId && ass.columnId === col.id) ||
          (ass.shiftTitle &&
            ass.shiftTitle.trim().toLowerCase() === (col.title || '').trim().toLowerCase());

        return matchArea && matchCol;
      });

      const empLines = [];

      if (matchingAssignments.length > 0) {
        // Group by unique employee
        const empMap = new Map();

        matchingAssignments.forEach((ass) => {
          let empKey = '';
          let empName = 'UNASSIGNED';
          let phone = '';

          if (ass.employeeId) {
            if (typeof ass.employeeId === 'object') {
              empKey = ass.employeeId._id || ass.employeeId.id || `${ass.employeeId.firstName}_${ass.employeeId.lastName}`;
              const first = ass.employeeId.firstName || '';
              const last = ass.employeeId.lastName || '';
              empName = `${first} ${last}`.trim() || ass.employeeId.name || 'EMPLOYEE';
              phone = ass.employeeId.phone || ass.employeeId.mobile || '';
            } else {
              empKey = String(ass.employeeId);
              empName = String(ass.employeeId);
            }
          } else if (ass.fullName) {
            empKey = ass.fullName.trim().toLowerCase();
            empName = ass.fullName;
          } else {
            empKey = 'unassigned';
          }

          if (!empMap.has(empKey)) {
            empMap.set(empKey, {
              empName,
              phone,
              assignments: [],
            });
          }
          empMap.get(empKey).assignments.push(ass);
        });

        // Deduplicate employee entries and append date ranges if assigned only for a sub-period
        empMap.forEach((empObj) => {
          const rawDates = empObj.assignments
            .map((a) => getTodayDateStr(a.date))
            .filter(Boolean);

          const uniqueDates = Array.from(new Set(rawDates)).sort();
          const dateSuffix = buildDateRangesString(uniqueDates, datesList);

          let line = empObj.empName.toUpperCase();
          if (empObj.phone) {
            line += ` ${empObj.phone}`;
          }
          if (dateSuffix) {
            line += ` ${dateSuffix}`;
          }

          // Custom shift time override or notes
          const firstAss = empObj.assignments[0];
          if (
            firstAss &&
            firstAss.startTime &&
            firstAss.endTime &&
            (firstAss.startTime !== col.startTime || firstAss.endTime !== col.endTime)
          ) {
            line += ` (${formatTime12h(firstAss.startTime)} TO ${formatTime12h(firstAss.endTime)})`;
          }
          if (firstAss && firstAss.notes) {
            line += ` [${firstAss.notes}]`;
          }

          empLines.push(line);
        });
      }

      return {
        dutyAreaName: daName,
        empLines,
      };
    });
  });

  const shiftColWidth = printableWidth / columns.length;
  const columnStyles = {};
  columns.forEach((_, idx) => {
    columnStyles[idx] = { cellWidth: shiftColWidth };
  });

  const bodyRows = cellMatrix.map((rowObj) => {
    return rowObj.map((cellObj) => {
      return [cellObj.dutyAreaName, ...cellObj.empLines].join('\n');
    });
  });

  const startY = 24;

  autoTable(doc, {
    head: [headRow],
    body: bodyRows,
    startY,
    margin: { top: 24, left: marginX, right: marginX, bottom: 10 },
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [17, 24, 39],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 9,
      lineWidth: 0.3,
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 8,
      cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
      valign: 'top',
      lineWidth: 0.3,
      lineColor: [0, 0, 0],
    },
    columnStyles,
    willDrawCell: (data) => {
      if (data.section === 'body') {
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body') {
        const rowIdx = data.row.index;
        const colIdx = data.column.index;
        const cellObj = cellMatrix[rowIdx][colIdx];
        const cell = data.cell;

        const paddingLeft = cell.padding('left');
        const paddingRight = cell.padding('right');
        const paddingTop = cell.padding('top');
        const contentWidth = cell.width - paddingLeft - paddingRight;
        const centerX = cell.x + cell.width / 2;
        let currentY = cell.y + paddingTop + 2.5;

        // 1. Duty Area Header (BOLD, centered, uppercase, black)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);

        const daLines = doc.splitTextToSize(cellObj.dutyAreaName, contentWidth);
        daLines.forEach((line) => {
          doc.text(line, centerX, currentY, { align: 'center' });
          currentY += 3.6;
        });

        if (cellObj.empLines.length > 0) {
          currentY += 1.0;
        }

        // 2. Employee Lines (NORMAL / REGULAR weight)
        cellObj.empLines.forEach((empLine) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(0, 0, 0);

          const empWrapped = doc.splitTextToSize(empLine, contentWidth);
          empWrapped.forEach((line) => {
            doc.text(line, centerX, currentY, { align: 'center' });
            currentY += 3.4;
          });
        });
      }
    },
    didDrawPage: (data) => {
      // Draw Main Header Banner at top of page
      doc.setFont('helvetica', 'bold');

      // Month & Year (e.g. OCTOBER 2026)
      if (monthYear) {
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(monthYear, pageWidth / 2, 8, { align: 'center' });
      }

      // Period Range & Roster Title (e.g. 01/10/26 TO 15/10/26 | OCTOBER NURSING ROSTER)
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(`${overallDatePeriod} | ${rosterTitle}`, pageWidth / 2, 15, { align: 'center' });

      // Footer - Page Numbers (Always Page 1 of 1)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Page 1 of 1`,
        pageWidth - marginX,
        pageHeight - 5,
        { align: 'right' }
      );
    },
  });

  // Save PDF file directly in browser
  const titleClean = (activeRoster.title || 'Vardhan_Roster').replace(/[^a-zA-Z0-9_-]/g, '_');
  const startFmt = activeRoster.startDate ? getTodayDateStr(activeRoster.startDate) : 'period';
  const endFmt = activeRoster.endDate ? getTodayDateStr(activeRoster.endDate) : 'end';
  const filename = `${titleClean}_${startFmt}_to_${endFmt}.pdf`;

  doc.save(filename);
}

