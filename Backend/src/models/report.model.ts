import pool from "../config/db.js";

// ─── Computer ─────────────────────────────────────────────────────────────────

export const getComputerReport = async (
  dateFrom?: string,
  dateTo?: string,
): Promise<any[]> => {
  const conditions: string[] = [];
  const params: string[] = [];

  if (dateFrom) {
    conditions.push("c.received_date >= ?");
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push("c.received_date <= ?");
    params.push(dateTo);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows]: any = await pool.query(
    `SELECT
      c.computer_name,
      c.asset_tag,
      c.serial_no,
      c.brand,
      c.model,
      c.device_type,
      c.operating_system,
      c.computer_status,
      c.asset_condition,
      c.received_date,
      c.warranty_expiry,
      c.vendor,
      c.processor,
      c.ram_size,
      c.storage_type,
      c.storage_capacity,
      c.ip_address,
      c.mac_address,
      c.network_connectivity,
      c.has_vpn_access,
      c.anydesk_ip,
      c.cost,
      c.assigned_date,
      c.to_return_by,
      c.remarks,
      eu.eu_name   AS assigned_user_name,
      eu.eu_emp_id AS assigned_user_emp_id,
      GROUP_CONCAT(p.peripheral_name ORDER BY p.peripheral_name SEPARATOR ', ') AS peripherals
    FROM computer c
    LEFT JOIN end_user eu ON c.assigned_user = eu.eu_id
    LEFT JOIN computer_peripheral cp ON c.computer_id = cp.computer_id
    LEFT JOIN peripheral p ON cp.peripheral_id = p.peripheral_id
    ${where}
    GROUP BY
      c.computer_id, c.computer_name, c.asset_tag, c.serial_no, c.brand,
      c.model, c.device_type, c.operating_system, c.computer_status, c.asset_condition,
      c.received_date, c.warranty_expiry, c.vendor, c.processor, c.ram_size,
      c.storage_type, c.storage_capacity, c.ip_address, c.mac_address,
      c.network_connectivity, c.has_vpn_access, c.anydesk_ip, c.cost,
      c.assigned_date, c.to_return_by, c.remarks,
      eu.eu_name, eu.eu_emp_id
    ORDER BY c.computer_id ASC`,
    params,
  );

  return rows as any[];
};

// ─── Software ─────────────────────────────────────────────────────────────────

export const getSoftwareReport = async (
  dateFrom?: string,
  dateTo?: string,
): Promise<any[]> => {
  const conditions: string[] = [];
  const params: string[] = [];

  if (dateFrom) {
    conditions.push("s.purchase_date >= ?");
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push("s.purchase_date <= ?");
    params.push(dateTo);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows]: any = await pool.query(
    `SELECT
      s.software_name,
      s.vendor,
      s.license_type,
      s.subscription_id,
      s.purchase_date,
      s.renewal_date,
      s.expiry_date,
      s.cost,
      s.previous_cost,
      s.software_status,
      s.remarks,
      s.assigned_date,
      eu.eu_name   AS assigned_user_name,
      eu.eu_emp_id AS assigned_user_emp_id
    FROM software s
    LEFT JOIN end_user eu ON s.assigned_user = eu.eu_id
    ${where}
    ORDER BY s.software_id ASC`,
    params,
  );

  return rows as any[];
};

// ─── UPS ──────────────────────────────────────────────────────────────────────

export const getUpsReport = async (
  dateFrom?: string,
  dateTo?: string,
): Promise<any[]> => {
  const conditions: string[] = [];
  const params: string[] = [];

  if (dateFrom) {
    conditions.push("u.received_date >= ?");
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push("u.received_date <= ?");
    params.push(dateTo);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows]: any = await pool.query(
    `SELECT
      u.asset_tag,
      u.serial_no,
      u.brand,
      u.model,
      u.vendor,
      u.capacity_va,
      u.battery_replace_date,
      u.asset_status,
      u.asset_condition,
      u.received_date,
      u.warranty_expiry,
      u.date_deployed,
      u.cost,
      u.remarks,
      c.computer_name AS assigned_to,
      d.department_name,
      eu.eu_location  AS asset_location
    FROM ups u
    LEFT JOIN computer c   ON u.computer_assigned_to = c.computer_id
    LEFT JOIN end_user eu  ON c.assigned_user = eu.eu_id
    LEFT JOIN department d ON eu.eu_department = d.department_id
    ${where}
    ORDER BY u.ups_id ASC`,
    params,
  );

  return rows as any[];
};

// ─── Printer ──────────────────────────────────────────────────────────────────

export const getPrinterReport = async (
  dateFrom?: string,
  dateTo?: string,
): Promise<any[]> => {
  const conditions: string[] = [];
  const params: string[] = [];

  if (dateFrom) {
    conditions.push("p.received_date >= ?");
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push("p.received_date <= ?");
    params.push(dateTo);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows]: any = await pool.query(
    `SELECT
      p.printer_name,
      d.department_name,
      p.asset_tag,
      p.asset_location,
      p.serial_no,
      p.brand,
      p.model,
      p.vendor,
      p.printer_type,
      p.connectivity,
      p.ip_address,
      p.mac_address,
      p.is_color,
      p.asset_status,
      p.asset_condition,
      p.received_date,
      p.warranty_expiry,
      p.date_deployed,
      p.cost,
      p.remarks
    FROM printer p
    LEFT JOIN department d ON p.department = d.department_id
    ${where}
    ORDER BY p.printer_id ASC`,
    params,
  );

  return rows as any[];
};

// ─── Network Device ───────────────────────────────────────────────────────────

export const getNetworkDeviceReport = async (
  dateFrom?: string,
  dateTo?: string,
): Promise<any[]> => {
  const conditions: string[] = [];
  const params: string[] = [];

  if (dateFrom) {
    conditions.push("nd.received_date >= ?");
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push("nd.received_date <= ?");
    params.push(dateTo);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows]: any = await pool.query(
    `SELECT
      nd.network_device_name,
      nd.asset_tag,
      nd.asset_location,
      nd.serial_no,
      nd.brand,
      nd.model,
      nd.device_type,
      nd.vendor,
      nd.ip_address,
      nd.mac_address,
      nd.port_count,
      nd.firmware_version,
      nd.asset_status,
      nd.asset_condition,
      nd.received_date,
      nd.warranty_expiry,
      nd.date_deployed,
      nd.cost,
      nd.remarks
    FROM network_device nd
    ${where}
    ORDER BY nd.network_device_id ASC`,
    params,
  );

  return rows as any[];
};

// ─── End User ─────────────────────────────────────────────────────────────────

/**
 * Resolves caller-supplied department values (case-insensitive names, or
 * numeric department IDs) against the department table. Returns the matched
 * department_id list plus any values that could not be resolved, so the
 * caller can reject the request with a 400 listing the offending value(s).
 *
 * An empty input array resolves to an empty departmentIds list with no
 * invalidValues, which the caller should treat as "no department filter"
 * rather than an error.
 */
export const resolveDepartmentFilter = async (
  values: string[],
): Promise<{ departmentIds: number[]; invalidValues: string[] }> => {
  const invalidValues: string[] = [];
  const departmentIds = new Set<number>();

  for (const value of values) {
    const isNumeric = /^\d+$/.test(value);

    const [rows]: any = isNumeric
      ? await pool.query(
          "SELECT department_id FROM department WHERE department_id = ?",
          [Number(value)],
        )
      : await pool.query(
          "SELECT department_id FROM department WHERE LOWER(department_name) = LOWER(?)",
          [value],
        );

    if (rows.length > 0) {
      departmentIds.add(rows[0].department_id);
    } else {
      invalidValues.push(value);
    }
  }

  return { departmentIds: Array.from(departmentIds), invalidValues };
};

export const getEndUserReport = async (
  departmentIds: number[],
): Promise<any[]> => {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (departmentIds.length > 0) {
    conditions.push(
      `eu.eu_department IN (${departmentIds.map(() => "?").join(", ")})`,
    );
    params.push(...departmentIds);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows]: any = await pool.query(
    `SELECT
      eu.eu_name,
      eu.eu_emp_id,
      eu.eu_division,
      d.department_name,
      eu.eu_location,
      eu.eu_email,
      eu.eu_contact_no,
      eu.eu_status,
      COUNT(DISTINCT c.computer_id) AS computer_count,
      GROUP_CONCAT(
        DISTINCT CONCAT(c.computer_name, ' (', c.asset_tag, ')')
        ORDER BY c.computer_name SEPARATOR ', '
      ) AS assigned_computers,
      COUNT(DISTINCT s.software_id) AS software_count,
      GROUP_CONCAT(
        DISTINCT s.software_name
        ORDER BY s.software_name SEPARATOR ', '
      ) AS assigned_software
    FROM end_user eu
    LEFT JOIN department d ON eu.eu_department = d.department_id
    LEFT JOIN computer c   ON c.assigned_user = eu.eu_id
    LEFT JOIN software s   ON s.assigned_user = eu.eu_id
    ${where}
    GROUP BY
      eu.eu_id, eu.eu_name, eu.eu_emp_id, eu.eu_division, d.department_name,
      eu.eu_location, eu.eu_email, eu.eu_contact_no, eu.eu_status
    ORDER BY eu.eu_id ASC`,
    params,
  );

  return rows as any[];
};
