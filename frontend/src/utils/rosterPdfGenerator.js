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
 * Generate and download PDF in browser matching Hospital Reference Layout
 * Pages are split strictly by CHANGE IN ROSTER ASSIGNMENT PATTERN.
 * Consecutive dates with identical shift, duty area, employee, times, and notes assignments
 * are grouped onto the SAME page displaying their effective date range (e.g. 01/10/26 TO 10/10/26).
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

  // Compute Fingerprint of Roster Assignment Pattern for a specific date
  function getDateFingerprint(dStr) {
    const dayAssigns = assignmentsList.filter((ass) => getTodayDateStr(ass.date) === dStr);
    const items = dayAssigns.map((ass) => {
      const area = (ass.dutyArea || '').trim().toLowerCase();
      const shift = (ass.columnId || ass.shiftTitle || '').trim().toLowerCase();
      let emp = '';
      if (ass.employeeId) {
        emp = typeof ass.employeeId === 'object'
          ? (ass.employeeId._id || ass.employeeId.id || `${ass.employeeId.firstName}_${ass.employeeId.lastName}`)
          : String(ass.employeeId);
      } else {
        emp = (ass.fullName || '').trim().toLowerCase();
      }
      const start = ass.startTime || '';
      const end = ass.endTime || '';
      const notes = ass.notes || '';
      return `${area}::${shift}::${emp}::${start}::${end}::${notes}`;
    });
    items.sort();
    return items.join('||');
  }

  // Group consecutive dates with identical assignment pattern fingerprints
  const chunks = [];
  datesList.forEach((dStr) => {
    const fp = getDateFingerprint(dStr);
    if (chunks.length === 0) {
      chunks.push({ startDate: dStr, endDate: dStr, fingerprint: fp });
    } else {
      const lastChunk = chunks[chunks.length - 1];
      if (lastChunk.fingerprint === fp) {
        lastChunk.endDate = dStr;
      } else {
        chunks.push({ startDate: dStr, endDate: dStr, fingerprint: fp });
      }
    }
  });

  // Helper to match assignments for a SPECIFIC DATE, duty area, and shift column
  function getCellAssignmentsForDate(dStr, dutyAreaName, col) {
    return assignmentsList.filter((ass) => {
      const assDate = getTodayDateStr(ass.date);
      if (assDate !== dStr) return false;

      const matchArea =
        ass.dutyArea &&
        ass.dutyArea.trim().toLowerCase() === dutyAreaName.trim().toLowerCase();

      const matchCol =
        (ass.columnId && ass.columnId === col.id) ||
        (ass.shiftTitle &&
          ass.shiftTitle.trim().toLowerCase() === (col.title || '').trim().toLowerCase());

      return matchArea && matchCol;
    });
  }

  const shiftColWidth = printableWidth / columns.length;
  const columnStyles = {};
  columns.forEach((_, idx) => {
    columnStyles[idx] = { cellWidth: shiftColWidth };
  });

  // Render one PDF page per consecutive pattern chunk
  chunks.forEach((chunk, chunkIdx) => {
    if (chunkIdx > 0) {
      doc.addPage();
    }

    const chunkPeriodStr = formatDatePeriod(chunk.startDate, chunk.endDate);

    // Prepare cell matrix for this chunk (using sample date from chunk)
    const sampleDate = chunk.startDate;
    const cellMatrix = dutyAreas.map((da) => {
      const daName = (da.name || da.title || 'DUTY AREA').toUpperCase();

      return columns.map((col) => {
        const matches = getCellAssignmentsForDate(sampleDate, daName, col);
        const empLines = [];

        if (matches.length > 0) {
          matches.forEach((ass) => {
            let empName = 'UNASSIGNED';
            let phone = '';

            if (ass.employeeId) {
              if (typeof ass.employeeId === 'object') {
                const first = ass.employeeId.firstName || '';
                const last = ass.employeeId.lastName || '';
                empName = `${first} ${last}`.trim() || ass.employeeId.name || 'EMPLOYEE';
                phone = ass.employeeId.phone || ass.employeeId.mobile || '';
              } else {
                empName = ass.employeeId;
              }
            } else if (ass.fullName) {
              empName = ass.fullName;
            }

            let line = empName.toUpperCase();
            if (phone) {
              line += ` ${phone}`;
            }

            if (
              ass.startTime &&
              ass.endTime &&
              (ass.startTime !== col.startTime || ass.endTime !== col.endTime)
            ) {
              line += ` (${formatTime12h(ass.startTime)} TO ${formatTime12h(ass.endTime)})`;
            }

            if (ass.notes) {
              line += ` [${ass.notes}]`;
            }

            empLines.push(line);
          });
        } else {
          empLines.push('NO STAFF ASSIGNED');
        }

        return {
          dutyAreaName: daName,
          empLines,
        };
      });
    });

    const bodyRows = cellMatrix.map((rowObj) => {
      return rowObj.map((cellObj) => {
        return [cellObj.dutyAreaName, ...cellObj.empLines].join('\n');
      });
    });

    const startY = 32;

    autoTable(doc, {
      head: [headRow],
      body: bodyRows,
      startY,
      margin: { top: 32, left: marginX, right: marginX, bottom: 12 },
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
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
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
            const isNoStaff = empLine === 'NO STAFF ASSIGNED';
            doc.setFont('helvetica', isNoStaff ? 'italic' : 'normal');
            doc.setFontSize(isNoStaff ? 7.0 : 7.5);
            doc.setTextColor(isNoStaff ? 148 : 0, isNoStaff ? 163 : 0, isNoStaff ? 184 : 0);

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
        doc.text(`${overallDatePeriod} | ${rosterTitle}`, pageWidth / 2, 14, { align: 'center' });

        // Effective Date Range Banner for this Page Chunk (e.g. PATTERN PERIOD: 01/10/26 TO 10/10/26)
        doc.setFontSize(10);
        doc.setTextColor(2, 132, 199);
        doc.text(`EFFECTIVE DATES: ${chunkPeriodStr}`, pageWidth / 2, 22, { align: 'center' });

        // Footer - Page Numbers
        const totalPages = doc.internal.getNumberOfPages();
        const pageCurrent = data.pageNumber;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Page ${pageCurrent} of ${totalPages}`,
          pageWidth - marginX,
          pageHeight - 5,
          { align: 'right' }
        );
      },
    });
  });

  // Save PDF file directly in browser
  const titleClean = (activeRoster.title || 'Vardhan_Roster').replace(/[^a-zA-Z0-9_-]/g, '_');
  const startFmt = activeRoster.startDate ? getTodayDateStr(activeRoster.startDate) : 'period';
  const endFmt = activeRoster.endDate ? getTodayDateStr(activeRoster.endDate) : 'end';
  const filename = `${titleClean}_${startFmt}_to_${endFmt}.pdf`;

  doc.save(filename);
}
