import type ExcelJS from 'exceljs';
// exceljs is ~1 MB — import it lazily (only when an export actually runs) so it
// never lands in the initial page bundles.

// One branded, professional .xlsx template for every stock report/export.
// Layout per sheet: a Tech4Green title row, a meta line (subtitle + generated
// timestamp), a styled dark header row, zebra-striped data, auto-filter and a
// frozen header. Numeric columns stay numeric (right reconciliation in Excel).

export interface XlsxColumn {
  header: string;
  key: string;
  width?: number;
  /** Excel number format, e.g. '#,##0' or 'yyyy-mm-dd hh:mm'. */
  numFmt?: string;
}

export interface XlsxSheet {
  name: string;
  columns: XlsxColumn[];
  rows: Record<string, unknown>[];
}

const HEADER_FILL = 'FF1F2937'; // gray-800
const TITLE_COLOR = 'FF059669'; // emerald-600
const META_COLOR = 'FF6B7280';  // gray-500
const STRIPE_FILL = 'FFF3F4F6'; // gray-100
const BORDER = 'FFE5E7EB';      // gray-200

export async function exportToXlsx(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  sheets: XlsxSheet[];
}): Promise<void> {
  const { default: ExcelJSModule } = await import('exceljs');
  const wb = new ExcelJSModule.Workbook();
  wb.creator = 'Tech4Green Management';
  wb.created = new Date();

  const HEADER_ROW = 4;

  for (const sheet of opts.sheets) {
    const ws = wb.addWorksheet(sheet.name);
    const colCount = Math.max(sheet.columns.length, 1);

    // Title
    ws.mergeCells(1, 1, 1, colCount);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = `Tech4Green  ·  ${opts.title}`;
    titleCell.font = { bold: true, size: 14, color: { argb: TITLE_COLOR } };
    ws.getRow(1).height = 22;

    // Meta (subtitle + generated timestamp)
    ws.mergeCells(2, 1, 2, colCount);
    const metaCell = ws.getCell(2, 1);
    metaCell.value = [opts.subtitle, `Generated ${new Date().toLocaleString()}`].filter(Boolean).join('     ·     ');
    metaCell.font = { size: 9, italic: true, color: { argb: META_COLOR } };

    // Header row
    const headerRow = ws.getRow(HEADER_ROW);
    sheet.columns.forEach((c, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = c.header;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.alignment = { vertical: 'middle' };
      cell.border = { bottom: { style: 'thin', color: { argb: HEADER_FILL } } };
    });
    headerRow.height = 18;

    // Data
    sheet.rows.forEach((r, ri) => {
      const row = ws.getRow(HEADER_ROW + 1 + ri);
      sheet.columns.forEach((c, i) => {
        const cell = row.getCell(i + 1);
        const v = r[c.key];
        cell.value = (v === undefined || v === null) ? '' : (v as ExcelJS.CellValue);
        if (c.numFmt) cell.numFmt = c.numFmt;
        cell.alignment = { vertical: 'middle' };
        cell.border = { bottom: { style: 'hair', color: { argb: BORDER } } };
        if (ri % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE_FILL } };
        }
      });
    });

    // Column widths
    sheet.columns.forEach((c, i) => {
      ws.getColumn(i + 1).width = c.width ?? Math.min(48, Math.max(12, c.header.length + 2));
    });

    // Auto-filter + frozen header
    ws.autoFilter = {
      from: { row: HEADER_ROW, column: 1 },
      to: { row: HEADER_ROW, column: colCount },
    };
    ws.views = [{ state: 'frozen', ySplit: HEADER_ROW }];
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.filename.endsWith('.xlsx') ? opts.filename : `${opts.filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
