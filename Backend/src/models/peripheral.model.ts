import pool from "../config/db.js";

export const createPeripheral = async (
  peripheralName: string,
): Promise<number> => {
  const [result]: any = await pool.query(
    `INSERT INTO peripheral (peripheral_name) VALUES (?)`,
    [peripheralName],
  );
  return result.insertId;
};

export const updatePeripheral = async (
  peripheralId: number,
  peripheralName: string,
): Promise<void> => {
  await pool.query(
    `UPDATE peripheral SET peripheral_name = ? WHERE peripheral_id = ?`,
    [peripheralName, peripheralId],
  );
};

export const getPeripherals = async (): Promise<any[]> => {
  const [rows] = await pool.query(
    `SELECT peripheral_id, peripheral_name FROM peripheral ORDER BY peripheral_name ASC`,
  );
  return rows as any[];
};

export const getPeripheralById = async (
  peripheralId: number,
): Promise<any | null> => {
  const [rows]: any = await pool.query(
    `SELECT peripheral_id, peripheral_name FROM peripheral WHERE peripheral_id = ?`,
    [peripheralId],
  );
  return rows[0] || null;
};

export const getPeripheralByName = async (
  peripheralName: string,
): Promise<any | null> => {
  const [rows]: any = await pool.query(
    `SELECT peripheral_id, peripheral_name FROM peripheral WHERE peripheral_name = ?`,
    [peripheralName],
  );
  return rows[0] || null;
};
