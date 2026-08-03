import pool from "../config/db.js";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export const createUps = async (
  computerAssignedTo: number | null,
  assetTag: string | null,
  serialNo: string,
  brand: string,
  vendor: string,
  model: string,
  capacityVa: number,
  batteryReplaceDate: string | null,
  assetStatus: string,
  assetCondition: string,
  receivedDate: string,
  warrantyExpiry: string | null,
  dateDeployed: string | null,
  cost: number | null,
  remarks: string | null,
): Promise<number> => {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO ups (
      computer_assigned_to, asset_tag, serial_no, brand, vendor, model,
      capacity_va, battery_replace_date, asset_status, asset_condition,
      received_date, warranty_expiry, date_deployed, cost, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      computerAssignedTo,
      assetTag,
      serialNo,
      brand,
      vendor,
      model,
      capacityVa,
      batteryReplaceDate,
      assetStatus,
      assetCondition,
      receivedDate,
      warrantyExpiry,
      dateDeployed,
      cost,
      remarks,
    ],
  );
  return result.insertId;
};

export const updateUps = async (
  upsId: number,
  computerAssignedTo: number | null,
  assetTag: string | null,
  serialNo: string,
  brand: string,
  vendor: string,
  model: string,
  capacityVa: number,
  batteryReplaceDate: string | null,
  assetStatus: string,
  assetCondition: string,
  receivedDate: string,
  warrantyExpiry: string | null,
  dateDeployed: string | null,
  cost: number | null,
  remarks: string | null,
): Promise<void> => {
  await pool.execute(
    `UPDATE ups SET
      computer_assigned_to = ?, asset_tag = ?, serial_no = ?, brand = ?,
      vendor = ?, model = ?, capacity_va = ?, battery_replace_date = ?,
      asset_status = ?, asset_condition = ?, received_date = ?,
      warranty_expiry = ?, date_deployed = ?, cost = ?, remarks = ?
    WHERE ups_id = ?`,
    [
      computerAssignedTo,
      assetTag,
      serialNo,
      brand,
      vendor,
      model,
      capacityVa,
      batteryReplaceDate,
      assetStatus,
      assetCondition,
      receivedDate,
      warrantyExpiry,
      dateDeployed,
      cost,
      remarks,
      upsId,
    ],
  );
};

export const getUps = async (): Promise<RowDataPacket[]> => {
  // assigned_to, department_name, and asset_location are derived from the
  // computer -> end_user -> department join chain; all NULLable if UPS is unassigned
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT
      u.ups_id,
      u.computer_assigned_to,
      c.computer_name        AS assigned_to,
      d.department_name,
      eu.eu_location         AS asset_location,
      u.asset_tag,
      u.serial_no,
      u.brand,
      u.vendor,
      u.model,
      u.capacity_va,
      u.battery_replace_date,
      u.asset_status,
      u.asset_condition,
      u.received_date,
      u.warranty_expiry,
      u.date_deployed,
      u.cost,
      u.remarks
    FROM ups u
    LEFT JOIN computer c   ON u.computer_assigned_to = c.computer_id
    LEFT JOIN end_user eu  ON c.assigned_user = eu.eu_id
    LEFT JOIN department d ON eu.eu_department = d.department_id
    ORDER BY u.ups_id ASC`,
  );
  return rows;
};

export const getUpsById = async (
  upsId: number,
): Promise<RowDataPacket | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT
      u.ups_id,
      u.computer_assigned_to,
      c.computer_name        AS assigned_to,
      d.department_name,
      eu.eu_location         AS asset_location,
      u.asset_tag,
      u.serial_no,
      u.brand,
      u.vendor,
      u.model,
      u.capacity_va,
      u.battery_replace_date,
      u.asset_status,
      u.asset_condition,
      u.received_date,
      u.warranty_expiry,
      u.date_deployed,
      u.cost,
      u.remarks
    FROM ups u
    LEFT JOIN computer c   ON u.computer_assigned_to = c.computer_id
    LEFT JOIN end_user eu  ON c.assigned_user = eu.eu_id
    LEFT JOIN department d ON eu.eu_department = d.department_id
    WHERE u.ups_id = ?`,
    [upsId],
  );
  return (rows as any[])[0] || null;
};
