import pool from "../config/db.js";

export const createVendor = async (vendorName: string): Promise<number> => {
  const [result]: any = await pool.query(
    `INSERT INTO vendor (vendor_name) VALUES (?)`,
    [vendorName],
  );
  return result.insertId;
};

export const updateVendor = async (
  vendorId: number,
  vendorName: string,
): Promise<void> => {
  await pool.query(`UPDATE vendor SET vendor_name = ? WHERE vendor_id = ?`, [
    vendorName,
    vendorId,
  ]);
};

export const getVendors = async (): Promise<any[]> => {
  const [rows] = await pool.query(
    `SELECT vendor_id, vendor_name FROM vendor ORDER BY vendor_name ASC`,
  );
  return rows as any[];
};

export const getVendorById = async (vendorId: number): Promise<any | null> => {
  const [rows]: any = await pool.query(
    `SELECT vendor_id, vendor_name FROM vendor WHERE vendor_id = ?`,
    [vendorId],
  );
  return rows[0] || null;
};

export const getVendorByName = async (
  vendorName: string,
): Promise<any | null> => {
  // LOWER() on both sides ensures case-insensitive match regardless of DB collation
  const [rows]: any = await pool.query(
    `SELECT vendor_id, vendor_name FROM vendor WHERE LOWER(vendor_name) = LOWER(?)`,
    [vendorName],
  );
  return rows[0] || null;
};
