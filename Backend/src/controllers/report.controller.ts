import { Request, Response } from "express";
import {
  buildReportWorkbook,
  createWorkbook,
  addReportSheet,
  formatDate,
  formatDateTime,
  validateDateParams,
  parseColumnsParam,
  parseListParam,
  resolveSelectedColumns,
  resolveAssetTypes,
  resolveAuditTypes,
  AUDIT_COLUMNS,
  AUDIT_TYPE_LABELS,
  ColumnDef,
  AssetType,
  AuditReportType,
} from "../utils/report.util.js";
import {
  getComputerReport,
  getSoftwareReport,
  getUpsReport,
  getPrinterReport,
  getNetworkDeviceReport,
  getEndUserReport,
  resolveDepartmentFilter,
} from "../models/report.model.js";
import {
  viewAssetAuditLogs,
  viewPurchaseRequestAuditLogs,
} from "../models/auditlog.model.js";
import { buildBizBoxRowsForLogs } from "../utils/audit.util.js";

// ─── Shared response helper ───────────────────────────────────────────────────

const sendWorkbook = async (
  res: Response,
  filename: string,
  workbook: Awaited<ReturnType<typeof buildReportWorkbook>>,
): Promise<void> => {
  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", buffer.byteLength);
  res.send(Buffer.from(buffer));
};

/**
 * Validates the raw "columns" query parameter against a report's full column
 * set. Returns the resolved ColumnDef list on success, or sends a 400 response
 * and returns null on failure (unknown keys, or every key being invalid).
 */
const resolveReportColumns = (
  res: Response,
  allowedColumns: ColumnDef[],
  rawColumns: string | undefined,
): ColumnDef[] | null => {
  const requestedKeys = parseColumnsParam(rawColumns);
  const { columns, invalidKeys } = resolveSelectedColumns(
    allowedColumns,
    requestedKeys,
  );

  if (invalidKeys.length > 0) {
    res.status(400).json({
      message: `Invalid column key(s): ${invalidKeys.join(", ")}`,
      invalidKeys,
    });
    return null;
  }

  if (columns.length === 0) {
    res.status(400).json({ message: "No valid columns were specified." });
    return null;
  }

  return columns;
};

// ─── Computer report ──────────────────────────────────────────────────────────

const COMPUTER_COLUMNS: ColumnDef[] = [
  { header: "Computer Name", key: "computer_name", width: 20 },
  { header: "Asset Tag", key: "asset_tag", width: 18 },
  { header: "Serial No.", key: "serial_no", width: 22 },
  { header: "Brand", key: "brand", width: 16 },
  { header: "Model", key: "model", width: 20 },
  { header: "Device Type", key: "device_type", width: 16 },
  { header: "Operating System", key: "operating_system", width: 22 },
  { header: "Status", key: "computer_status", width: 14 },
  { header: "Condition", key: "asset_condition", width: 14 },
  { header: "Received Date", key: "received_date", width: 16 },
  { header: "Warranty Expiry", key: "warranty_expiry", width: 16 },
  { header: "Vendor", key: "vendor", width: 24 },
  { header: "Processor", key: "processor", width: 24 },
  { header: "RAM", key: "ram_size", width: 12 },
  { header: "Storage Type", key: "storage_type", width: 14 },
  { header: "Storage Capacity", key: "storage_capacity", width: 16 },
  { header: "IP Address", key: "ip_address", width: 18 },
  { header: "MAC Address", key: "mac_address", width: 20 },
  { header: "Network Connectivity", key: "network_connectivity", width: 22 },
  { header: "VPN Access", key: "has_vpn_access", width: 13 },
  { header: "AnyDesk IP", key: "anydesk_ip", width: 18 },
  { header: "Cost", key: "cost", width: 14 },
  { header: "Assigned User", key: "assigned_user_name", width: 24 },
  { header: "Assigned Emp. ID", key: "assigned_user_emp_id", width: 18 },
  { header: "Assigned Date", key: "assigned_date", width: 16 },
  { header: "Return By", key: "to_return_by", width: 16 },
  { header: "Peripherals", key: "peripherals", width: 30 },
  { header: "Remarks", key: "remarks", width: 30 },
];

export const downloadComputerReport = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
): Promise<void> => {
  const { date_from, date_to, columns } = req.query as Record<
    string,
    string | undefined
  >;

  const { error } = validateDateParams(date_from, date_to);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const selectedColumns = resolveReportColumns(res, COMPUTER_COLUMNS, columns);
  if (!selectedColumns) return;

  try {
    const rows = await getComputerReport(date_from, date_to);

    const data = rows.map((r: any) => ({
      ...r,
      received_date: formatDate(r.received_date),
      warranty_expiry: formatDate(r.warranty_expiry),
      assigned_date: formatDate(r.assigned_date),
      to_return_by: formatDate(r.to_return_by),
      has_vpn_access: r.has_vpn_access ? "Yes" : "No",
      peripherals: r.peripherals ?? "",
      asset_tag: r.asset_tag ?? "",
      anydesk_ip: r.anydesk_ip ?? "",
      remarks: r.remarks ?? "",
      assigned_user_name: r.assigned_user_name ?? "",
      assigned_user_emp_id: r.assigned_user_emp_id ?? "",
    }));

    const workbook = buildReportWorkbook(
      "Computers",
      "IT Asset Management System — Computer Report",
      selectedColumns,
      data,
      date_from,
      date_to,
    );

    await sendWorkbook(res, "computer_report.xlsx", workbook);
  } catch (error) {
    console.error("Computer report error:", error);
    res.status(500).json({ message: "Failed to generate computer report" });
  }
};

// ─── Software report ──────────────────────────────────────────────────────────

const SOFTWARE_COLUMNS: ColumnDef[] = [
  { header: "Software Name", key: "software_name", width: 28 },
  { header: "Vendor", key: "vendor", width: 24 },
  { header: "License Type", key: "license_type", width: 20 },
  { header: "Subscription ID", key: "subscription_id", width: 26 },
  { header: "Purchase Date", key: "purchase_date", width: 16 },
  { header: "Renewal Date", key: "renewal_date", width: 16 },
  { header: "Expiry Date", key: "expiry_date", width: 16 },
  { header: "Cost", key: "cost", width: 14 },
  { header: "Previous Cost", key: "previous_cost", width: 16 },
  { header: "Status", key: "software_status", width: 16 },
  { header: "Assigned User", key: "assigned_user_name", width: 24 },
  { header: "Assigned Emp. ID", key: "assigned_user_emp_id", width: 18 },
  { header: "Assigned Date", key: "assigned_date", width: 16 },
  { header: "Remarks", key: "remarks", width: 30 },
];

export const downloadSoftwareReport = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
): Promise<void> => {
  const { date_from, date_to, columns } = req.query as Record<
    string,
    string | undefined
  >;

  const { error } = validateDateParams(date_from, date_to);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const selectedColumns = resolveReportColumns(res, SOFTWARE_COLUMNS, columns);
  if (!selectedColumns) return;

  try {
    const rows = await getSoftwareReport(date_from, date_to);

    const data = rows.map((r: any) => ({
      ...r,
      purchase_date: formatDate(r.purchase_date),
      renewal_date: formatDate(r.renewal_date),
      expiry_date: formatDate(r.expiry_date),
      assigned_date: formatDate(r.assigned_date),
      previous_cost: r.previous_cost ?? "",
      remarks: r.remarks ?? "",
      assigned_user_name: r.assigned_user_name ?? "",
      assigned_user_emp_id: r.assigned_user_emp_id ?? "",
    }));

    const workbook = buildReportWorkbook(
      "Software",
      "IT Asset Management System — Software Report",
      selectedColumns,
      data,
      date_from,
      date_to,
    );

    await sendWorkbook(res, "software_report.xlsx", workbook);
  } catch (error) {
    console.error("Software report error:", error);
    res.status(500).json({ message: "Failed to generate software report" });
  }
};

// ─── UPS report ───────────────────────────────────────────────────────────────

const UPS_COLUMNS: ColumnDef[] = [
  { header: "Asset Tag", key: "asset_tag", width: 18 },
  { header: "Serial No.", key: "serial_no", width: 22 },
  { header: "Brand", key: "brand", width: 16 },
  { header: "Model", key: "model", width: 18 },
  { header: "Vendor", key: "vendor", width: 24 },
  { header: "Capacity (VA)", key: "capacity_va", width: 14 },
  { header: "Battery Replace Date", key: "battery_replace_date", width: 22 },
  { header: "Status", key: "asset_status", width: 14 },
  { header: "Condition", key: "asset_condition", width: 14 },
  { header: "Received Date", key: "received_date", width: 16 },
  { header: "Warranty Expiry", key: "warranty_expiry", width: 16 },
  { header: "Date Deployed", key: "date_deployed", width: 16 },
  { header: "Cost", key: "cost", width: 14 },
  { header: "Assigned Computer", key: "assigned_to", width: 24 },
  { header: "Department", key: "department_name", width: 22 },
  { header: "Asset Location", key: "asset_location", width: 16 },
  { header: "Remarks", key: "remarks", width: 30 },
];

export const downloadUpsReport = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
): Promise<void> => {
  const { date_from, date_to, columns } = req.query as Record<
    string,
    string | undefined
  >;

  const { error } = validateDateParams(date_from, date_to);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const selectedColumns = resolveReportColumns(res, UPS_COLUMNS, columns);
  if (!selectedColumns) return;

  try {
    const rows = await getUpsReport(date_from, date_to);

    const data = rows.map((r: any) => ({
      ...r,
      received_date: formatDate(r.received_date),
      warranty_expiry: formatDate(r.warranty_expiry),
      date_deployed: formatDate(r.date_deployed),
      battery_replace_date: formatDate(r.battery_replace_date),
      asset_tag: r.asset_tag ?? "",
      cost: r.cost ?? "",
      assigned_to: r.assigned_to ?? "",
      department_name: r.department_name ?? "",
      asset_location: r.asset_location ?? "",
      remarks: r.remarks ?? "",
    }));

    const workbook = buildReportWorkbook(
      "UPS",
      "IT Asset Management System — UPS Report",
      selectedColumns,
      data,
      date_from,
      date_to,
    );

    await sendWorkbook(res, "ups_report.xlsx", workbook);
  } catch (error) {
    console.error("UPS report error:", error);
    res.status(500).json({ message: "Failed to generate UPS report" });
  }
};

// ─── Printer report ───────────────────────────────────────────────────────────

const PRINTER_COLUMNS: ColumnDef[] = [
  { header: "Printer Name", key: "printer_name", width: 22 },
  { header: "Department", key: "department_name", width: 22 },
  { header: "Asset Tag", key: "asset_tag", width: 18 },
  { header: "Asset Location", key: "asset_location", width: 16 },
  { header: "Serial No.", key: "serial_no", width: 22 },
  { header: "Brand", key: "brand", width: 16 },
  { header: "Model", key: "model", width: 18 },
  { header: "Vendor", key: "vendor", width: 24 },
  { header: "Printer Type", key: "printer_type", width: 16 },
  { header: "Connectivity", key: "connectivity", width: 18 },
  { header: "IP Address", key: "ip_address", width: 18 },
  { header: "MAC Address", key: "mac_address", width: 20 },
  { header: "Color", key: "is_color", width: 10 },
  { header: "Status", key: "asset_status", width: 14 },
  { header: "Condition", key: "asset_condition", width: 14 },
  { header: "Received Date", key: "received_date", width: 16 },
  { header: "Warranty Expiry", key: "warranty_expiry", width: 16 },
  { header: "Date Deployed", key: "date_deployed", width: 16 },
  { header: "Cost", key: "cost", width: 14 },
  { header: "Remarks", key: "remarks", width: 30 },
];

export const downloadPrinterReport = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
): Promise<void> => {
  const { date_from, date_to, columns } = req.query as Record<
    string,
    string | undefined
  >;

  const { error } = validateDateParams(date_from, date_to);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const selectedColumns = resolveReportColumns(res, PRINTER_COLUMNS, columns);
  if (!selectedColumns) return;

  try {
    const rows = await getPrinterReport(date_from, date_to);

    const data = rows.map((r: any) => ({
      ...r,
      received_date: formatDate(r.received_date),
      warranty_expiry: formatDate(r.warranty_expiry),
      date_deployed: formatDate(r.date_deployed),
      is_color: r.is_color ? "Yes" : "No",
      printer_name: r.printer_name ?? "",
      asset_tag: r.asset_tag ?? "",
      ip_address: r.ip_address ?? "",
      mac_address: r.mac_address ?? "",
      cost: r.cost ?? "",
      remarks: r.remarks ?? "",
    }));

    const workbook = buildReportWorkbook(
      "Printers",
      "IT Asset Management System — Printer Report",
      selectedColumns,
      data,
      date_from,
      date_to,
    );

    await sendWorkbook(res, "printer_report.xlsx", workbook);
  } catch (error) {
    console.error("Printer report error:", error);
    res.status(500).json({ message: "Failed to generate printer report" });
  }
};

// ─── Network Device report ────────────────────────────────────────────────────

const NETDEVICE_COLUMNS: ColumnDef[] = [
  { header: "Device Name", key: "network_device_name", width: 22 },
  { header: "Asset Tag", key: "asset_tag", width: 18 },
  { header: "Asset Location", key: "asset_location", width: 16 },
  { header: "Serial No.", key: "serial_no", width: 22 },
  { header: "Brand", key: "brand", width: 16 },
  { header: "Model", key: "model", width: 18 },
  { header: "Device Type", key: "device_type", width: 18 },
  { header: "Vendor", key: "vendor", width: 24 },
  { header: "IP Address", key: "ip_address", width: 18 },
  { header: "MAC Address", key: "mac_address", width: 20 },
  { header: "Port Count", key: "port_count", width: 13 },
  { header: "Firmware", key: "firmware_version", width: 18 },
  { header: "Status", key: "asset_status", width: 14 },
  { header: "Condition", key: "asset_condition", width: 14 },
  { header: "Received Date", key: "received_date", width: 16 },
  { header: "Warranty Expiry", key: "warranty_expiry", width: 16 },
  { header: "Date Deployed", key: "date_deployed", width: 16 },
  { header: "Cost", key: "cost", width: 14 },
  { header: "Remarks", key: "remarks", width: 30 },
];

export const downloadNetworkDeviceReport = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
): Promise<void> => {
  const { date_from, date_to, columns } = req.query as Record<
    string,
    string | undefined
  >;

  const { error } = validateDateParams(date_from, date_to);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const selectedColumns = resolveReportColumns(res, NETDEVICE_COLUMNS, columns);
  if (!selectedColumns) return;

  try {
    const rows = await getNetworkDeviceReport(date_from, date_to);

    const data = rows.map((r: any) => ({
      ...r,
      received_date: formatDate(r.received_date),
      warranty_expiry: formatDate(r.warranty_expiry),
      date_deployed: formatDate(r.date_deployed),
      network_device_name: r.network_device_name ?? "",
      asset_tag: r.asset_tag ?? "",
      asset_location: r.asset_location ?? "",
      ip_address: r.ip_address ?? "",
      mac_address: r.mac_address ?? "",
      port_count: r.port_count ?? "",
      firmware_version: r.firmware_version ?? "",
      cost: r.cost ?? "",
      remarks: r.remarks ?? "",
    }));

    const workbook = buildReportWorkbook(
      "Network Devices",
      "IT Asset Management System — Network Device Report",
      selectedColumns,
      data,
      date_from,
      date_to,
    );

    await sendWorkbook(res, "network_device_report.xlsx", workbook);
  } catch (error) {
    console.error("Network device report error:", error);
    res
      .status(500)
      .json({ message: "Failed to generate network device report" });
  }
};

// ─── End User report ──────────────────────────────────────────────────────────

const END_USER_BASE_COLUMNS: ColumnDef[] = [
  { header: "Name", key: "eu_name", width: 24 },
  { header: "Employee ID", key: "eu_emp_id", width: 16 },
  { header: "Division", key: "eu_division", width: 18 },
  { header: "Department", key: "department_name", width: 26 },
  { header: "Location", key: "eu_location", width: 14 },
  { header: "Email", key: "eu_email", width: 26 },
  { header: "Contact No.", key: "eu_contact_no", width: 18 },
  { header: "Status", key: "eu_status", width: 14 },
];

const END_USER_COMPUTER_COLUMNS: ColumnDef[] = [
  { header: "Assigned Computers (Count)", key: "computer_count", width: 16 },
  { header: "Assigned Computers", key: "assigned_computers", width: 36 },
];

const END_USER_SOFTWARE_COLUMNS: ColumnDef[] = [
  { header: "Assigned Software (Count)", key: "software_count", width: 16 },
  { header: "Assigned Software", key: "assigned_software", width: 36 },
];

/**
 * Builds the end-user report's column set from the resolved asset type
 * toggles. Base end-user columns are always included; the computer and/or
 * software column groups are appended only when their type is present in
 * assetTypes.
 */
const buildEndUserColumns = (assetTypes: AssetType[]): ColumnDef[] => {
  const columns = [...END_USER_BASE_COLUMNS];

  if (assetTypes.includes("computer")) {
    columns.push(...END_USER_COMPUTER_COLUMNS);
  }
  if (assetTypes.includes("software")) {
    columns.push(...END_USER_SOFTWARE_COLUMNS);
  }

  return columns;
};

export const downloadEndUserReport = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
): Promise<void> => {
  const { department, asset } = req.query as Record<string, string | undefined>;

  const requestedDepartments = parseListParam(department);
  const requestedAssetValues = parseListParam(asset);

  const { types: assetTypes, invalidValues: invalidAssetValues } =
    resolveAssetTypes(requestedAssetValues);

  if (invalidAssetValues.length > 0) {
    res.status(400).json({
      message: `Invalid asset type(s): ${invalidAssetValues.join(", ")}. Allowed values are Computer and Software.`,
      invalidValues: invalidAssetValues,
    });
    return;
  }

  const { departmentIds, invalidValues: invalidDepartmentValues } =
    await resolveDepartmentFilter(requestedDepartments ?? []);

  if (invalidDepartmentValues.length > 0) {
    res.status(400).json({
      message: `Invalid department(s): ${invalidDepartmentValues.join(", ")}`,
      invalidValues: invalidDepartmentValues,
    });
    return;
  }

  const selectedColumns = buildEndUserColumns(assetTypes);

  try {
    const rows = await getEndUserReport(departmentIds);

    const data = rows.map((r: any) => ({
      ...r,
      eu_division: r.eu_division ?? "",
      eu_location: r.eu_location ?? "",
      eu_email: r.eu_email ?? "",
      eu_contact_no: r.eu_contact_no ?? "",
      department_name: r.department_name ?? "",
      assigned_computers: r.assigned_computers ?? "",
      assigned_software: r.assigned_software ?? "",
    }));

    const workbook = buildReportWorkbook(
      "End Users",
      "IT Asset Management System — End User Report",
      selectedColumns,
      data,
    );

    await sendWorkbook(res, "end_user_report.xlsx", workbook);
  } catch (error) {
    console.error("End user report error:", error);
    res.status(500).json({ message: "Failed to generate end user report" });
  }
};

// ─── Audit report ─────────────────────────────────────────────────────────────

const AUDIT_ALLOWED_TYPES_LABEL =
  "Computer, Software, Printer, Network Device, UPS, Purchase Request, User, End User";

/**
 * Parses the "type" query parameter into a comma-separated list of raw
 * values, tolerating both the documented usage (a single comma-separated
 * string, e.g. type=Computer,Software) and a repeated-query-param usage
 * (type=Computer&type=Software, which Express parses as a string array) so
 * either form works without the caller needing to know which one to use.
 * Returns null when the parameter was omitted entirely.
 */
const parseAuditTypeParam = (rawType: unknown): string[] | null => {
  if (rawType === undefined) return null;
  const joined = Array.isArray(rawType) ? rawType.join(",") : String(rawType);
  return parseListParam(joined);
};

/**
 * Downloads the audit trail report: an Excel (.xlsx) workbook with one
 * sheet per requested audit type, each formatted exactly like the BizBox
 * audit trail (Name of Affected Asset/Entity, Date, Transaction/Action,
 * Field, Old Value, New Value, User Name (Actor)) - i.e. one row per
 * individually changed field, produced the same way the dedicated audit
 * trail endpoints (audit.controller.ts) already build their JSON responses,
 * so the report matches what those endpoints serve field-for-field.
 *
 * Requires at least one "type" value (see AUDIT_ALLOWED_TYPES_LABEL) - there
 * is no "all types" default, since a workbook combining all eight sheets on
 * every call would be an expensive default for a query that usually only
 * needs one or two categories.
 *
 * date_from/date_to are optional and, when supplied, filter every requested
 * type's sheet by interaction_date (see auditlog.model.ts's
 * buildAuditDateRangeClause) - the same inclusive-range semantics used by
 * every other report endpoint's date filter.
 */
export const downloadAuditReport = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
): Promise<void> => {
  const { date_from, date_to } = req.query as Record<
    string,
    string | undefined
  >;

  const { error } = validateDateParams(date_from, date_to);
  if (error) {
    res.status(400).json({ message: error });
    return;
  }

  const requestedTypes = parseAuditTypeParam(req.query.type);
  if (requestedTypes === null || requestedTypes.length === 0) {
    res.status(400).json({
      message: `The 'type' query parameter is required. Allowed values are: ${AUDIT_ALLOWED_TYPES_LABEL}.`,
    });
    return;
  }

  const { types, invalidValues } = resolveAuditTypes(requestedTypes);
  if (invalidValues.length > 0) {
    res.status(400).json({
      message: `Invalid audit type(s): ${invalidValues.join(", ")}. Allowed values are: ${AUDIT_ALLOWED_TYPES_LABEL}.`,
      invalidValues,
    });
    return;
  }

  try {
    const workbook = createWorkbook();

    for (const auditType of types as AuditReportType[]) {
      const logs =
        auditType === "purchase_request"
          ? await viewPurchaseRequestAuditLogs(date_from, date_to)
          : await viewAssetAuditLogs(auditType, date_from, date_to);

      const bizBoxRows = buildBizBoxRowsForLogs(logs);

      const data = bizBoxRows.map((r) => ({
        entity_name: r.entity_name ?? "-",
        interaction_date: formatDateTime(r.interaction_date),
        interaction_type: r.interaction_type,
        field: r.field ?? "-",
        old_value: r.old_value ?? "-",
        new_value: r.new_value ?? "-",
        user_name: r.user_name,
      }));

      const label = AUDIT_TYPE_LABELS[auditType];

      addReportSheet(
        workbook,
        label,
        `IT Asset Management System — ${label} Audit Trail`,
        AUDIT_COLUMNS,
        data,
        date_from,
        date_to,
      );
    }

    await sendWorkbook(res, "audit_report.xlsx", workbook);
  } catch (error) {
    console.error("Audit report error:", error);
    res.status(500).json({ message: "Failed to generate audit report" });
  }
};
