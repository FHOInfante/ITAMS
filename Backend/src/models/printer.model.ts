import pool from "../config/db.js";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export const createPrinter = async (
  printerName: string | null,
  department: number,
  assetTag: string | null,
  assetLocation: string | null,
  serialNo: string,
  brand: string,
  vendor: string,
  model: string,
  printerType: string,
  connectivity: string,
  ipAddress: string | null,
  macAddress: string | null,
  isColor: boolean,
  assetStatus: string,
  assetCondition: string,
  receivedDate: string,
  warrantyExpiry: string | null,
  dateDeployed: string | null,
  cost: number | null,
  remarks: string | null,
): Promise<number> => {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO printer (
      printer_name, department, asset_tag, asset_location,
      serial_no, brand, vendor, model, printer_type, connectivity,
      ip_address, mac_address, is_color, asset_status, asset_condition,
      received_date, warranty_expiry, date_deployed, cost, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      printerName,
      department,
      assetTag,
      assetLocation,
      serialNo,
      brand,
      vendor,
      model,
      printerType,
      connectivity,
      ipAddress,
      macAddress,
      isColor,
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

export const updatePrinter = async (
  printerId: number,
  printerName: string | null,
  department: number,
  assetTag: string | null,
  assetLocation: string | null,
  serialNo: string,
  brand: string,
  vendor: string,
  model: string,
  printerType: string,
  connectivity: string,
  ipAddress: string | null,
  macAddress: string | null,
  isColor: boolean,
  assetStatus: string,
  assetCondition: string,
  receivedDate: string,
  warrantyExpiry: string | null,
  dateDeployed: string | null,
  cost: number | null,
  remarks: string | null,
): Promise<void> => {
  await pool.execute(
    `UPDATE printer SET
      printer_name = ?, department = ?, asset_tag = ?, asset_location = ?,
      serial_no = ?, brand = ?, vendor = ?, model = ?, printer_type = ?, connectivity = ?,
      ip_address = ?, mac_address = ?, is_color = ?, asset_status = ?, asset_condition = ?,
      received_date = ?, warranty_expiry = ?, date_deployed = ?,
      cost = ?, remarks = ?
    WHERE printer_id = ?`,
    [
      printerName,
      department,
      assetTag,
      assetLocation,
      serialNo,
      brand,
      vendor,
      model,
      printerType,
      connectivity,
      ipAddress,
      macAddress,
      isColor,
      assetStatus,
      assetCondition,
      receivedDate,
      warrantyExpiry,
      dateDeployed,
      cost,
      remarks,
      printerId,
    ],
  );
};

export const patchPrinterNetwork = async (
  printerId: number,
  connectivity: string,
  ipAddress: string | null,
): Promise<void> => {
  await pool.execute(
    `UPDATE printer SET connectivity = ?, ip_address = ? WHERE printer_id = ?`,
    [connectivity, ipAddress, printerId],
  );
};

export const getPrinters = async (): Promise<RowDataPacket[]> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT p.printer_id, p.printer_name, p.department, d.department_name,
            p.asset_tag, p.asset_location, p.serial_no, p.brand, p.vendor,
            p.model, p.printer_type, p.connectivity, p.ip_address, p.mac_address,
            p.is_color, p.asset_status, p.asset_condition, p.received_date,
            p.warranty_expiry, p.date_deployed, p.cost, p.remarks
     FROM printer p
     LEFT JOIN department d ON p.department = d.department_id
     ORDER BY p.printer_id ASC`,
  );
  return rows;
};

export const getPrinterById = async (
  printerId: number,
): Promise<RowDataPacket | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT p.printer_id, p.printer_name, p.department, d.department_name,
            p.asset_tag, p.asset_location, p.serial_no, p.brand, p.vendor,
            p.model, p.printer_type, p.connectivity, p.ip_address, p.mac_address,
            p.is_color, p.asset_status, p.asset_condition, p.received_date,
            p.warranty_expiry, p.date_deployed, p.cost, p.remarks
     FROM printer p
     LEFT JOIN department d ON p.department = d.department_id
     WHERE p.printer_id = ?`,
    [printerId],
  );
  return (rows as any[])[0] || null;
};
