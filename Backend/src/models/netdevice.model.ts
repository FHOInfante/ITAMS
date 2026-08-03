import pool from "../config/db.js";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export const createNetworkDevice = async (
  deviceName: string | null,
  assetTag: string | null,
  assetLocation: string | null,
  serialNo: string,
  brand: string,
  vendor: string,
  model: string,
  deviceType: string,
  ipAddress: string | null,
  macAddress: string | null,
  portCount: number | null,
  firmwareVersion: string | null,
  assetStatus: string,
  assetCondition: string,
  receivedDate: string,
  warrantyExpiry: string | null,
  dateDeployed: string | null,
  cost: number | null,
  remarks: string | null,
): Promise<number> => {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO network_device (
      network_device_name, asset_tag, asset_location,
      serial_no, brand, vendor, model, device_type,
      ip_address, mac_address, port_count, firmware_version,
      asset_status, asset_condition,
      received_date, warranty_expiry, date_deployed, cost, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      deviceName,
      assetTag,
      assetLocation,
      serialNo,
      brand,
      vendor,
      model,
      deviceType,
      ipAddress,
      macAddress,
      portCount,
      firmwareVersion,
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

export const updateNetworkDevice = async (
  networkDeviceId: number,
  deviceName: string | null,
  assetTag: string | null,
  assetLocation: string | null,
  serialNo: string,
  brand: string,
  vendor: string,
  model: string,
  deviceType: string,
  ipAddress: string | null,
  macAddress: string | null,
  portCount: number | null,
  firmwareVersion: string | null,
  assetStatus: string,
  assetCondition: string,
  receivedDate: string,
  warrantyExpiry: string | null,
  dateDeployed: string | null,
  cost: number | null,
  remarks: string | null,
): Promise<void> => {
  await pool.execute(
    `UPDATE network_device SET
      network_device_name = ?, asset_tag = ?, asset_location = ?,
      serial_no = ?, brand = ?, vendor = ?, model = ?, device_type = ?,
      ip_address = ?, mac_address = ?, port_count = ?,
      firmware_version = ?, asset_status = ?, asset_condition = ?,
      received_date = ?, warranty_expiry = ?, date_deployed = ?,
      cost = ?, remarks = ?
    WHERE network_device_id = ?`,
    [
      deviceName,
      assetTag,
      assetLocation,
      serialNo,
      brand,
      vendor,
      model,
      deviceType,
      ipAddress,
      macAddress,
      portCount,
      firmwareVersion,
      assetStatus,
      assetCondition,
      receivedDate,
      warrantyExpiry,
      dateDeployed,
      cost,
      remarks,
      networkDeviceId,
    ],
  );
};

export const getNetworkDevices = async (): Promise<RowDataPacket[]> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM network_device ORDER BY network_device_id ASC`,
  );
  return rows;
};

export const getNetworkDeviceById = async (
  networkDeviceId: number,
): Promise<RowDataPacket | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM network_device WHERE network_device_id = ?`,
    [networkDeviceId],
  );
  return (rows as any[])[0] || null;
};
