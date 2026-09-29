import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Format 24h time string (e.g. "08:00") to 12h format (e.g. "8 AM" or "8:30 PM")
 */
export function formatTime12h(time24) {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return m === '00' ? `${h} ${ampm}` : `${h}:${m} ${ampm}`;
}

/**
 * Format Date to Month (Year) e.g., SEPTEMBER (2026)
 */
export function formatMonthYear(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const month = d.toLocaleString('en-US', { month: 'long' }).toUpperCase();
  const year = d.getFullYear();
  return `${month} (${year})`;
}

/**
 * Format Date range to DD/MM/YY TO DD/MM/YY e.g., 11/09/26 TO 20/09/26
 */
export function formatDatePeriod(startStr, endStr) {
  const formatShort = (dateInput) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
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
  const datePeriod = formatDatePeriod(activeRoster.startDate, activeRoster.endDate);

  // Extract columns (shifts)
  let columns = [];
  if (activeRoster.templateId && Array.isArray(activeRoster.templateId.columns) && activeRoster.templateId.columns.length > 0) {
    columns = [...activeRoster.templateId.columns].sort((a, b) => (a.order || 0) - (b.order || 0));
  } else if (Array.isArray(activeRoster.columns) && activeRoster.columns.length > 0) {
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
  if (activeRoster.templateId && Array.isArray(activeRoster.templateId.dutyAreas) && activeRoster.templateId.dutyAreas.length > 0) {
    dutyAreas = [...activeRoster.templateId.dutyAreas].sort((a, b) => (a.order || 0) - (b.order || 0));
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

  // Construct Header Row - EXACTLY columns.length columns (NO 4th Duty Area column!)
  const headRow = columns.map((col, idx) => {
    const title = (col.title || `SHIFT ${idx + 1}`).toUpperCase();
    const timeStr = col.startTime && col.endTime
      ? `${formatTime12h(col.startTime)} TO ${formatTime12h(col.endTime)}`
      : '';
    return timeStr ? `${title} ${timeStr}` : title;
  });

  const assignmentsList = activeRoster.assignments || [];

  // Helper to match assignments
  function getCellAssignments(dutyAreaName, col) {
    return assignmentsList.filter((ass) => {
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

  // Construct Body Rows - Every shift cell starts with Duty Area Name, then employees below
  const bodyRows = dutyAreas.map((da) => {
    const daName = (da.name || da.title || 'DUTY AREA').toUpperCase();

    return columns.map((col) => {
      const matches = getCellAssignments(daName, col);

      const lines = [daName];

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

          // Custom shift time
          if (
            ass.startTime &&
            ass.endTime &&
            (ass.startTime !== col.startTime || ass.endTime !== col.endTime)
          ) {
            line += ` (${formatTime12h(ass.startTime)} TO ${formatTime12h(ass.endTime)})`;
          }

          lines.push(line);
        });
      }

      return lines.join('\n');
    });
  });

  // Calculate equal column widths for all shift columns
  const shiftColWidth = printableWidth / columns.length;
  const columnStyles = {};
  columns.forEach((_, idx) => {
    columnStyles[idx] = { cellWidth: shiftColWidth, halign: 'left' };
  });

  // Generate Table via autoTable
  autoTable(doc, {
    head: [headRow],
    body: bodyRows,
    startY: 24,
    margin: { top: 24, left: marginX, right: marginX, bottom: 10 },
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      fontSize: 10,
      lineWidth: 0.3,
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 8.5,
      cellPadding: 3,
      valign: 'top',
      lineWidth: 0.3,
      lineColor: [0, 0, 0],
    },
    columnStyles,
    didDrawPage: (data) => {
      // Draw Header at top of every page
      const currentY = 8;
      doc.setFont('helvetica', 'bold');

      // Month & Year
      if (monthYear) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(monthYear, pageWidth / 2, currentY, { align: 'center' });
      }

      // Date Range Period
      if (datePeriod) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(datePeriod, pageWidth / 2, currentY + 6, { align: 'center' });
      }

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

  // Save PDF file directly in browser
  const titleClean = (activeRoster.title || 'Vardhan_Roster').replace(/[^a-zA-Z0-9_-]/g, '_');
  const startFmt = activeRoster.startDate ? new Date(activeRoster.startDate).toISOString().split('T')[0] : 'period';
  const endFmt = activeRoster.endDate ? new Date(activeRoster.endDate).toISOString().split('T')[0] : 'end';
  const filename = `${titleClean}_${startFmt}_to_${endFmt}.pdf`;

  doc.save(filename);
}
