import pool from "../config/db.js";

const SOFTWARE_SELECT = `
  SELECT
    s.software_id,
    s.software_name,
    s.vendor,
    s.license_type,
    s.purchase_date,
    s.subscription_id,
    s.renewal_date,
    s.expiry_date,
    s.cost,
    s.previous_cost,
    s.software_status,
    s.remarks,
    s.assigned_date,
    eu.eu_id AS assigned_user_id,
    eu.eu_name AS assigned_user_name,
    eu.eu_emp_id AS assigned_user_emp_id
  FROM software s
  LEFT JOIN end_user eu ON s.assigned_user = eu.eu_id
`;

export const createSoftware = async (
  softwareName: string,
  vendor: string,
  licenseType: string,
  purchaseDate: string,
  subscriptionId: string | null,
  renewalDate: string | null,
  expiryDate: string | null,
  cost: number | null,
  previousCost: number | null,
  softwareStatus: string,
  remarks: string | null,
  assignedUser: number | null,
  assignedDate: string | null,
): Promise<number> => {
  const [result]: any = await pool.query(
    `INSERT INTO software (
      software_name, vendor, license_type, purchase_date, subscription_id,
      renewal_date, expiry_date, cost, previous_cost, software_status, remarks,
      assigned_user, assigned_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      softwareName,
      vendor,
      licenseType,
      purchaseDate,
      subscriptionId,
      renewalDate,
      expiryDate,
      cost,
      previousCost,
      softwareStatus,
      remarks,
      assignedUser,
      assignedDate,
    ],
  );

  return result.insertId;
};

export const assignSoftwareUser = async (
  softwareId: number,
  assignedUser: number | null,
  assignedDate: string | null,
): Promise<void> => {
  await pool.query(
    `UPDATE software SET assigned_user = ?, assigned_date = ? WHERE software_id = ?`,
    [assignedUser, assignedDate, softwareId],
  );
};

export const updateSoftware = async (
  softwareId: number,
  softwareName: string,
  vendor: string,
  licenseType: string,
  purchaseDate: string,
  subscriptionId: string | null,
  renewalDate: string | null,
  expiryDate: string | null,
  cost: number | null,
  previousCost: number | null,
  softwareStatus: string,
  remarks: string | null,
  assignedUser: number | null,
  assignedDate: string | null,
): Promise<void> => {
  await pool.query(
    `UPDATE software SET
      software_name = ?, vendor = ?, license_type = ?, purchase_date = ?,
      subscription_id = ?, renewal_date = ?, expiry_date = ?, cost = ?,
      previous_cost = ?, software_status = ?, remarks = ?,
      assigned_user = ?, assigned_date = ?
    WHERE software_id = ?`,
    [
      softwareName,
      vendor,
      licenseType,
      purchaseDate,
      subscriptionId,
      renewalDate,
      expiryDate,
      cost,
      previousCost,
      softwareStatus,
      remarks,
      assignedUser,
      assignedDate,
      softwareId,
    ],
  );
};

export const getSoftware = async (): Promise<any[]> => {
  const [rows] = await pool.query(SOFTWARE_SELECT);
  return rows as any[];
};

export const getSoftwareById = async (
  softwareId: number,
): Promise<any | null> => {
  const [rows]: any = await pool.query(
    SOFTWARE_SELECT + `WHERE s.software_id = ?`,
    [softwareId],
  );
  return rows[0] || null;
};
