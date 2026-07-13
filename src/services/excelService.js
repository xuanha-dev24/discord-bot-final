const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { formatDuration, formatTime } = require('../utils/helpers');
const logger = require('../utils/logger');

const REPORTS_DIR = path.join(process.cwd(), 'data', 'reports');

/**
 * Generate an Excel attendance report from a meeting session.
 * @param {Object} session – The meeting session object.
 * @param {number} endTime  – Timestamp when the session ended.
 * @returns {Promise<string>} Absolute path to the generated .xlsx file.
 */
async function generateMeetingReport(session, endTime) {
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Meeting Report');

    // Title
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `Meeting Report – ${session.channelName}`;
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };

    // Info
    sheet.addRow([]);
    sheet.addRow(['Start Time', formatTime(new Date(session.startTime))]);
    sheet.addRow(['End Time', formatTime(new Date(endTime))]);
    sheet.addRow(['Total Duration', formatDuration(endTime - session.startTime)]);
    sheet.addRow(['Started By', session.startedBy]);
    sheet.addRow([]);

    // Header
    const headerRow = sheet.addRow(['#', 'Username', 'Display Name', 'Time in Channel', 'Total Time (ms)']);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };
    });

    // Columns width
    sheet.columns = [
        { width: 6 },
        { width: 30 },
        { width: 30 },
        { width: 20 },
        { width: 15 },
    ];

    // Data
    let idx = 0;
    session.memberData.forEach((data) => {
        idx++;
        const row = sheet.addRow([
            idx,
            data.username,
            data.displayName,
            formatDuration(data.totalTime),
            data.totalTime,
        ]);
        row.eachCell(cell => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
        });
    });

    const fileName = `meeting_${session.channelName}_${endTime}.xlsx`
        .replace(/[^a-zA-Z0-9_\-.() ]/g, '');
    const filePath = path.join(REPORTS_DIR, fileName);

    await workbook.xlsx.writeFile(filePath);
    logger.info(`Excel report created: ${fileName}`);
    return filePath;
}

module.exports = { generateMeetingReport };
