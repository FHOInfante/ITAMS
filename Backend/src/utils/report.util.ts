import ExcelJS from "exceljs";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ColumnDef = {
  header: string;
  key: string;
  width?: number;
};

export type ColumnSelectionResult = {
  columns: ColumnDef[];
  invalidKeys: string[];
};

export type DateValidationResult = {
  error?: string;
};

export type AssetType = "computer" | "software";

export type AssetTypeValidationResult = {
  types: AssetType[];
  invalidValues: string[];
};

/**
 * The eight audit-trail categories exposed by GET /report/audit. Each value
 * (other than "purchase_request") is identical to the target_table value
 * stored in audit_log, so the controller can pass it straight through to
 * viewAssetAuditLogs without a second lookup. "purchase_request" is handled
 * separately via viewPurchaseRequestAuditLogs, matching the same split
 * already used by audit.controller.ts.
 */
export type AuditReportType =
  | "computer"
  | "software"
  | "printer"
  | "network_device"
  | "ups"
  | "purchase_request"
  | "user"
  | "end_user";

export type AuditTypeValidationResult = {
  types: AuditReportType[];
  invalidValues: string[];
};

// ─── Theme constants ──────────────────────────────────────────────────────────

const TITLE_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F4E79" },
};

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF2E75B6" },
};

const ROW_ALT_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFDCE6F1" },
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFB8CCE4" } },
  left: { style: "thin", color: { argb: "FFB8CCE4" } },
  bottom: { style: "thin", color: { argb: "FFB8CCE4" } },
  right: { style: "thin", color: { argb: "FFB8CCE4" } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Adds a merged title row spanning all columns, styled with the dark header fill.
 */
export const addTitleRow = (
  sheet: ExcelJS.Worksheet,
  title: string,
  colCount: number,
): void => {
  const titleRow = sheet.addRow([title]);
  sheet.mergeCells(titleRow.number, 1, titleRow.number, colCount);

  const cell = titleRow.getCell(1);
  cell.font = {
    name: "Calibri",
    size: 14,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  cell.fill = TITLE_FILL;
  cell.alignment = { vertical: "middle", horizontal: "center" };
  titleRow.height = 28;
};

/**
 * Adds a subtitle row showing the applied date filter range (if any).
 */
export const addSubtitleRow = (
  sheet: ExcelJS.Worksheet,
  colCount: number,
  dateFrom?: string,
  dateTo?: string,
): void => {
  let label = "Date Filter: None";

  if (dateFrom && dateTo) {
    label = `Date Filter: ${dateFrom} to ${dateTo}`;
  } else if (dateFrom) {
    label = `Date Filter: From ${dateFrom}`;
  } else if (dateTo) {
    label = `Date Filter: Up to ${dateTo}`;
  }

  const subRow = sheet.addRow([label]);
  sheet.mergeCells(subRow.number, 1, subRow.number, colCount);

  const cell = subRow.getCell(1);
  cell.font = {
    name: "Calibri",
    size: 10,
    italic: true,
    color: { argb: "FF1F4E79" },
  };
  cell.alignment = { vertical: "middle", horizontal: "center" };
  subRow.height = 18;
};

/**
 * Configures column definitions on a worksheet and appends a styled header row.
 * Returns the header row number so callers can freeze panes relative to it.
 */
export const addHeaderRow = (
  sheet: ExcelJS.Worksheet,
  columns: ColumnDef[],
): number => {
  sheet.columns = columns.map((c) => ({
    key: c.key,
    width: c.width ?? 20,
  }));

  const headerRow = sheet.addRow(columns.map((c) => c.header));

  headerRow.eachCell((cell) => {
    cell.font = {
      name: "Calibri",
      size: 10,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = HEADER_FILL;
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.border = THIN_BORDER;
  });

  headerRow.height = 22;
  return headerRow.number;
};

/**
 * Appends data rows to a worksheet with alternating row colours and borders.
 * Each row object must contain keys that match the column definitions supplied
 * to addHeaderRow.
 */
export const addDataRows = (
  sheet: ExcelJS.Worksheet,
  rows: Record<string, any>[],
): void => {
  rows.forEach((data, idx) => {
    const row = sheet.addRow(data);
    const isAlt = idx % 2 !== 0;

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { name: "Calibri", size: 10 };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = THIN_BORDER;

      if (isAlt) {
        cell.fill = ROW_ALT_FILL;
      }
    });

    row.height = 18;
  });
};

/**
 * Freezes rows above and including the header so it stays visible while scrolling.
 */
export const freezeHeader = (
  sheet: ExcelJS.Worksheet,
  headerRowNumber: number,
): void => {
  sheet.views = [
    {
      state: "frozen",
      ySplit: headerRowNumber,
      topLeftCell: `A${headerRowNumber + 1}`,
      activeCell: `A${headerRowNumber + 1}`,
    },
  ];
};

/**
 * Creates a blank, ITAMS-branded Excel workbook with no sheets yet. Exposed
 * separately from buildReportWorkbook so multi-sheet reports (e.g. the
 * audit report, which adds one sheet per requested audit type) can create
 * the workbook once and call addReportSheet in a loop.
 */
export const createWorkbook = (): ExcelJS.Workbook => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ITAMS";
  workbook.created = new Date();
  workbook.modified = new Date();
  return workbook;
};

/**
 * Adds one fully styled report sheet (title row, date-filter subtitle,
 * header row, data rows, frozen header) to an existing workbook. This is
 * the shared building block behind both buildReportWorkbook (single-sheet
 * reports) and any multi-sheet report that calls it once per sheet.
 */
export const addReportSheet = (
  workbook: ExcelJS.Workbook,
  sheetName: string,
  reportTitle: string,
  columns: ColumnDef[],
  rows: Record<string, any>[],
  dateFrom?: string,
  dateTo?: string,
): void => {
  const sheet = workbook.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
  });

  addTitleRow(sheet, reportTitle, columns.length);
  addSubtitleRow(sheet, columns.length, dateFrom, dateTo);

  const headerRow = addHeaderRow(sheet, columns);
  addDataRows(sheet, rows);
  freezeHeader(sheet, headerRow);
};

/**
 * Builds a complete styled Excel workbook for a single asset type.
 * Returns the finished Workbook so the caller can pipe it to the response.
 */
export const buildReportWorkbook = (
  sheetName: string,
  reportTitle: string,
  columns: ColumnDef[],
  rows: Record<string, any>[],
  dateFrom?: string,
  dateTo?: string,
): ExcelJS.Workbook => {
  const workbook = createWorkbook();
  addReportSheet(
    workbook,
    sheetName,
    reportTitle,
    columns,
    rows,
    dateFrom,
    dateTo,
  );
  return workbook;
};

/**
 * Validates an ISO date string (YYYY-MM-DD). Returns true if valid.
 */
export const isValidDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));

/**
 * Formats a Date or date-like value to a readable YYYY-MM-DD string.
 * Returns an empty string when the value is null or undefined.
 */
export const formatDate = (value: Date | string | null | undefined): string => {
  if (value === null || value === undefined) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toISOString().split("T")[0];
};

/**
 * Formats a Date or date-like value to a readable "YYYY-MM-DD HH:mm:ss"
 * string. Unlike formatDate, this preserves time-of-day precision, which
 * matters for the audit report's Date column since interaction_date is a
 * DATETIME/TIMESTAMP and multiple audit rows can share the same calendar
 * day. Returns an empty string when the value is null or undefined.
 */
export const formatDateTime = (
  value: Date | string | null | undefined,
): string => {
  if (value === null || value === undefined) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);

  const pad = (n: number): string => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
};

/**
 * Validates the optional dateFrom/dateTo query parameters shared by every
 * report endpoint. Returns an empty object when both are valid (or absent),
 * or an error message describing the first invalid parameter found.
 */
export const validateDateParams = (
  dateFrom?: string,
  dateTo?: string,
): DateValidationResult => {
  if (dateFrom !== undefined && !isValidDate(dateFrom)) {
    return { error: "Invalid dateFrom format. Use YYYY-MM-DD." };
  }
  if (dateTo !== undefined && !isValidDate(dateTo)) {
    return { error: "Invalid dateTo format. Use YYYY-MM-DD." };
  }
  return {};
};

/**
 * Parses a raw "columns" query string (e.g. "computer_id,brand,model") into an
 * ordered list of trimmed, non-empty keys. Returns null when the raw value is
 * undefined, signalling that the caller did not supply the parameter at all.
 */
export const parseColumnsParam = (raw?: string): string[] | null => {
  if (raw === undefined) return null;

  return raw
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
};

/**
 * Resolves the caller-supplied column keys against the full set of allowed
 * columns for a given report. The order of the returned columns follows the
 * order the keys were supplied in, not the default report order.
 *
 * When requestedKeys is null (parameter omitted), all allowed columns are
 * returned in their default order. invalidKeys is only ever populated when
 * requestedKeys is non-null, since there is nothing to validate otherwise.
 */
export const resolveSelectedColumns = (
  allowedColumns: ColumnDef[],
  requestedKeys: string[] | null,
): ColumnSelectionResult => {
  if (requestedKeys === null) {
    return { columns: allowedColumns, invalidKeys: [] };
  }

  const columnsByKey = new Map(allowedColumns.map((col) => [col.key, col]));
  const invalidKeys: string[] = [];
  const columns: ColumnDef[] = [];

  for (const key of requestedKeys) {
    const match = columnsByKey.get(key);
    if (match) {
      columns.push(match);
    } else {
      invalidKeys.push(key);
    }
  }

  return { columns, invalidKeys };
};

/**
 * Generic comma-separated list parser, identical in behaviour to
 * parseColumnsParam. Exposed under a neutral name so callers parsing
 * non-column parameters (e.g. "asset", "department") don't read oddly.
 * Returns null when the raw value is undefined (parameter omitted).
 */
export const parseListParam = parseColumnsParam;

/**
 * Resolves the caller-supplied "asset" query values (case-insensitive) into
 * the canonical AssetType set ("computer" / "software"), used to toggle
 * optional column groups on the end-user report on or off.
 *
 * When requestedValues is null (parameter omitted entirely), both asset
 * types are enabled by default so the report shows the full picture. When
 * requestedValues is an empty array (parameter supplied but blank), no
 * asset columns are toggled on. Unrecognized values are collected into
 * invalidValues so the caller can reject the request with a 400. Duplicate
 * values (e.g. "Computer,computer") are silently deduplicated.
 */
export const resolveAssetTypes = (
  requestedValues: string[] | null,
): AssetTypeValidationResult => {
  if (requestedValues === null) {
    return { types: ["computer", "software"], invalidValues: [] };
  }

  const invalidValues: string[] = [];
  const seen = new Set<AssetType>();
  const types: AssetType[] = [];

  for (const raw of requestedValues) {
    const normalized = raw.toLowerCase();
    if (normalized === "computer" || normalized === "software") {
      if (!seen.has(normalized)) {
        seen.add(normalized);
        types.push(normalized);
      }
    } else {
      invalidValues.push(raw);
    }
  }

  return { types, invalidValues };
};

// ─── Audit report ─────────────────────────────────────────────────────────────

/**
 * Fixed column set for the audit report, mirroring the BizBox audit trail
 * layout exactly: Name of Affected Asset/Entity, Date, Transaction/Action,
 * Field, Old Value, New Value, User Name (Actor). Unlike the asset reports,
 * this column set is not customizable via a "columns" query parameter -
 * every audit sheet always shows the full BizBox-style shape, since that
 * consistency is the point of matching BizBox's own display.
 *
 * Keys match the BizBoxAuditRow shape produced by audit.util.ts's
 * buildBizBoxRowsForLogs (see report.controller.ts's downloadAuditReport),
 * with interaction_date pre-formatted via formatDateTime before rows reach
 * addDataRows.
 */
export const AUDIT_COLUMNS: ColumnDef[] = [
  { header: "Name of Affected Asset/Entity", key: "entity_name", width: 32 },
  { header: "Date", key: "interaction_date", width: 20 },
  { header: "Transaction/Action", key: "interaction_type", width: 26 },
  { header: "Field", key: "field", width: 22 },
  { header: "Old Value", key: "old_value", width: 28 },
  { header: "New Value", key: "new_value", width: 28 },
  { header: "User Name (Actor)", key: "user_name", width: 22 },
];

/**
 * Display label for each AuditReportType, used both as the worksheet's tab
 * name and as part of its title row ("IT Asset Management System — <label>
 * Audit Trail"). Deliberately mirrors the exact casing of the accepted
 * "type" query values so sheet tabs read naturally.
 */
export const AUDIT_TYPE_LABELS: Record<AuditReportType, string> = {
  computer: "Computer",
  software: "Software",
  printer: "Printer",
  network_device: "Network Device",
  ups: "UPS",
  purchase_request: "Purchase Request",
  user: "User",
  end_user: "End User",
};

/**
 * Case-insensitive lookup from the accepted "type" query values (normalized:
 * trimmed, lowercased, internal whitespace collapsed to a single space) to
 * their canonical AuditReportType. Kept private - callers only ever need
 * resolveAuditTypes.
 */
const AUDIT_TYPE_LOOKUP: Record<string, AuditReportType> = {
  computer: "computer",
  software: "software",
  printer: "printer",
  "network device": "network_device",
  ups: "ups",
  "purchase request": "purchase_request",
  user: "user",
  "end user": "end_user",
};

/**
 * Resolves the caller-supplied "type" query values (case-insensitive; see
 * AUDIT_TYPE_LOOKUP) into the canonical AuditReportType set. Unlike
 * resolveAssetTypes, this has no "omitted defaults to all types" behaviour -
 * GET /report/audit requires at least one type, so the controller is
 * responsible for rejecting an omitted/empty parameter with a 400 BEFORE
 * calling this function; requestedValues here is always a non-empty array.
 *
 * Unrecognized values are collected into invalidValues so the caller can
 * reject the request with a 400 listing them. Duplicate values (e.g.
 * "Computer,computer") are silently deduplicated, and the resolved order
 * follows the order values were supplied in, matching resolveAssetTypes.
 */
export const resolveAuditTypes = (
  requestedValues: string[],
): AuditTypeValidationResult => {
  const invalidValues: string[] = [];
  const seen = new Set<AuditReportType>();
  const types: AuditReportType[] = [];

  for (const raw of requestedValues) {
    const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
    const match = AUDIT_TYPE_LOOKUP[normalized];

    if (match) {
      if (!seen.has(match)) {
        seen.add(match);
        types.push(match);
      }
    } else {
      invalidValues.push(raw);
    }
  }

  return { types, invalidValues };
};
