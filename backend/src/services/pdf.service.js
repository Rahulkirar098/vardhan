const PDFDocument = require("pdfkit");

/**
 * Format 24h time string (e.g. "08:00") to 12h format (e.g. "8 AM" or "8:30 PM")
 */
function formatTime12h(time24) {
    if (!time24) return "";
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    if (isNaN(h)) return time24;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return m === "00" ? `${h} ${ampm}` : `${h}:${m} ${ampm}`;
}

/**
 * Format Date to Month (Year) e.g., SEPTEMBER (2026)
 */
function formatMonthYear(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const month = d.toLocaleString("en-US", { month: "long" }).toUpperCase();
    const year = d.getFullYear();
    return `${month} (${year})`;
}

/**
 * Format Date range to DD/MM/YY TO DD/MM/YY e.g., 11/09/26 TO 20/09/26
 */
function formatDatePeriod(startStr, endStr) {
    const formatShort = (dateInput) => {
        if (!dateInput) return "";
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return "";
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = String(d.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    };
    const start = formatShort(startStr);
    const end = formatShort(endStr);
    if (start && end) return `${start} TO ${end}`;
    return start || end || "";
}

/**
 * Generate a PDF document stream for a given Roster object
 * Matches hospital operational workforce roster reference layout
 */
function generateRosterPDF({ roster, hospital }) {
    const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 30,
        bufferPages: true,
    });

    const pageWidth = doc.page.width; // 841.89 pt
    const pageHeight = doc.page.height; // 595.28 pt
    const margin = 30;
    const printableWidth = pageWidth - margin * 2; // ~781.89 pt
    const bottomLimit = pageHeight - margin - 20;

    // Header metadata
    const hospitalName = (hospital?.name || "VARDHAN HOSPITAL").toUpperCase();
    const rosterTitle = (roster.title || "WORKFORCE DUTY ROSTER").toUpperCase();
    const monthYear = formatMonthYear(roster.startDate);
    const datePeriod = formatDatePeriod(roster.startDate, roster.endDate);

    // Extract columns (shifts)
    let columns = [];
    if (roster.templateId && Array.isArray(roster.templateId.columns) && roster.templateId.columns.length > 0) {
        columns = [...roster.templateId.columns].sort((a, b) => (a.order || 0) - (b.order || 0));
    } else if (Array.isArray(roster.columns) && roster.columns.length > 0) {
        columns = [...roster.columns].sort((a, b) => (a.order || 0) - (b.order || 0));
    } else {
        // Fallback standard 3 shifts
        columns = [
            { id: "col-1", title: "MORNING", startTime: "08:00", endTime: "14:00" },
            { id: "col-2", title: "AFTERNOON", startTime: "14:00", endTime: "20:00" },
            { id: "col-3", title: "NIGHT", startTime: "20:00", endTime: "08:00" },
        ];
    }

    // Extract duty areas
    let dutyAreas = [];
    if (roster.templateId && Array.isArray(roster.templateId.dutyAreas) && roster.templateId.dutyAreas.length > 0) {
        dutyAreas = [...roster.templateId.dutyAreas].sort((a, b) => (a.order || 0) - (b.order || 0));
    } else {
        // Extract unique duty areas from assignments
        const areaMap = new Map();
        (roster.assignments || []).forEach((ass) => {
            if (ass.dutyArea && !areaMap.has(ass.dutyArea)) {
                areaMap.set(ass.dutyArea, { id: ass.dutyArea, name: ass.dutyArea });
            }
        });
        dutyAreas = Array.from(areaMap.values());
        if (dutyAreas.length === 0) {
            dutyAreas = [
                { id: "da-1", name: "GENERAL WARD" },
                { id: "da-2", name: "NICU" },
                { id: "da-3", name: "ICU" },
                { id: "da-4", name: "OT" },
            ];
        }
    }

    // Calculate Column Widths
    const dutyAreaColWidth = 180;
    const remainingWidth = printableWidth - dutyAreaColWidth;
    const shiftColWidth = remainingWidth / columns.length;

    // Helper to draw document title block
    let currentY = margin;

    function drawHeader() {
        doc.font("Helvetica-Bold").fontSize(14).fillColor("#0F172A").text(hospitalName, margin, currentY, {
            width: printableWidth,
            align: "center",
        });
        currentY += 18;

        if (rosterTitle) {
            doc.font("Helvetica-Bold").fontSize(11).fillColor("#334155").text(rosterTitle, margin, currentY, {
                width: printableWidth,
                align: "center",
            });
            currentY += 15;
        }

        if (monthYear) {
            doc.font("Helvetica-Bold").fontSize(13).fillColor("#1E293B").text(monthYear, margin, currentY, {
                width: printableWidth,
                align: "center",
            });
            currentY += 16;
        }

        if (datePeriod) {
            doc.font("Helvetica-Bold").fontSize(11).fillColor("#475569").text(datePeriod, margin, currentY, {
                width: printableWidth,
                align: "center",
            });
            currentY += 18;
        }

        currentY += 5;
    }

    // Helper to draw table header row
    function drawTableHeader() {
        const headerHeight = 35;

        // Draw header background
        doc.rect(margin, currentY, printableWidth, headerHeight).fillAndStroke("#F1F5F9", "#000000");

        // Duty area header box
        doc.rect(margin, currentY, dutyAreaColWidth, headerHeight).stroke("#000000");
        doc.font("Helvetica-Bold")
            .fontSize(10)
            .fillColor("#0F172A")
            .text("DUTY AREA / SECTION", margin + 8, currentY + 12, {
                width: dutyAreaColWidth - 16,
                align: "left",
            });

        // Shift column headers
        columns.forEach((col, index) => {
            const colX = margin + dutyAreaColWidth + index * shiftColWidth;
            doc.rect(colX, currentY, shiftColWidth, headerHeight).stroke("#000000");

            const colTitle = (col.title || `SHIFT ${index + 1}`).toUpperCase();
            const colTimeStr =
                col.startTime && col.endTime
                    ? `${formatTime12h(col.startTime)} TO ${formatTime12h(col.endTime)}`
                    : "";

            doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#0F172A");
            doc.text(colTitle, colX + 4, currentY + 6, {
                width: shiftColWidth - 8,
                align: "center",
            });

            if (colTimeStr) {
                doc.font("Helvetica").fontSize(8.5).fillColor("#334155");
                doc.text(colTimeStr, colX + 4, currentY + 19, {
                    width: shiftColWidth - 8,
                    align: "center",
                });
            }
        });

        currentY += headerHeight;
    }

    // Prepare table row contents
    const assignmentsList = roster.assignments || [];

    // Helper to get formatted employees for a cell
    function getCellAssignments(dutyAreaName, col) {
        return assignmentsList.filter((ass) => {
            const matchArea =
                ass.dutyArea &&
                ass.dutyArea.trim().toLowerCase() === dutyAreaName.trim().toLowerCase();

            const matchCol =
                (ass.columnId && ass.columnId === col.id) ||
                (ass.shiftTitle &&
                    ass.shiftTitle.trim().toLowerCase() === (col.title || "").trim().toLowerCase());

            return matchArea && matchCol;
        });
    }

    // Start drawing
    drawHeader();
    drawTableHeader();

    // Render Each Duty Area Row
    dutyAreas.forEach((da) => {
        const daName = (da.name || da.title || "DUTY AREA").toUpperCase();

        // Calculate text lines & required height for each cell
        const cellContents = columns.map((col) => {
            const matches = getCellAssignments(daName, col);
            if (matches.length === 0) return ["-"];

            // Format each employee assignment string
            return matches.map((ass) => {
                let empName = "UNASSIGNED";
                let phone = "";
                if (ass.employeeId) {
                    const first = ass.employeeId.firstName || "";
                    const last = ass.employeeId.lastName || "";
                    empName = `${first} ${last}`.trim() || ass.employeeId.name || "EMPLOYEE";
                    phone = ass.employeeId.phone || ass.employeeId.mobile || "";
                }

                let line = empName.toUpperCase();
                if (phone) {
                    line += ` ${phone}`;
                }

                // Check for custom timing
                if (
                    ass.startTime &&
                    ass.endTime &&
                    (ass.startTime !== col.startTime || ass.endTime !== col.endTime)
                ) {
                    line += ` (${formatTime12h(ass.startTime)} - ${formatTime12h(ass.endTime)})`;
                }

                return line;
            });
        });

        // Determine row height based on content
        // Estimate line height ~12pt + padding
        let maxLines = 1;
        cellContents.forEach((lines) => {
            if (lines.length > maxLines) maxLines = lines.length;
        });

        // Check if duty area text wraps
        const daLineCount = Math.ceil(daName.length / 28);
        if (daLineCount > maxLines) maxLines = daLineCount;

        const rowHeight = Math.max(30, maxLines * 14 + 12);

        // Check page overflow
        if (currentY + rowHeight > bottomLimit) {
            doc.addPage();
            currentY = margin;
            drawHeader();
            drawTableHeader();
        }

        // Draw Row Border boxes
        // Duty Area Box
        doc.rect(margin, currentY, dutyAreaColWidth, rowHeight).stroke("#000000");
        doc.font("Helvetica-Bold")
            .fontSize(9)
            .fillColor("#1E293B")
            .text(daName, margin + 6, currentY + 8, {
                width: dutyAreaColWidth - 12,
                align: "left",
            });

        // Shift Cells
        columns.forEach((col, idx) => {
            const colX = margin + dutyAreaColWidth + idx * shiftColWidth;
            doc.rect(colX, currentY, shiftColWidth, rowHeight).stroke("#000000");

            const lines = cellContents[idx];
            let cellY = currentY + 8;

            lines.forEach((lineStr) => {
                doc.font("Helvetica")
                    .fontSize(8.5)
                    .fillColor(lineStr === "-" ? "#94A3B8" : "#0F172A")
                    .text(lineStr, colX + 6, cellY, {
                        width: shiftColWidth - 12,
                        align: "left",
                    });
                cellY += 13;
            });
        });

        currentY += rowHeight;
    });

    // Page Numbers in Footer
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font("Helvetica")
            .fontSize(8)
            .fillColor("#64748B")
            .text(
                `Page ${i + 1} of ${range.count}  •  Vardhan Hospital Workforce Management System`,
                margin,
                pageHeight - margin + 5,
                {
                    width: printableWidth,
                    align: "right",
                }
            );
    }

    // Finalize PDF
    doc.end();

    // Generate filename
    const startFmt = roster.startDate ? new Date(roster.startDate).toISOString().split("T")[0] : "period";
    const endFmt = roster.endDate ? new Date(roster.endDate).toISOString().split("T")[0] : "end";
    const titleClean = (roster.title || "Vardhan_Duty_Roster").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${titleClean}_${startFmt}_to_${endFmt}.pdf`;

    return {
        stream: doc,
        filename,
    };
}

module.exports = {
    generateRosterPDF,
    formatTime12h,
    formatMonthYear,
    formatDatePeriod,
};
