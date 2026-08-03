import pool from "../config/db.js";

export const createDepartment = async (
  departmentName: string,
): Promise<number> => {
  const [result]: any = await pool.query(
    `INSERT INTO department (department_name) VALUES (?)`,
    [departmentName],
  );
  return result.insertId;
};

export const updateDepartment = async (
  departmentId: number,
  departmentName: string,
): Promise<void> => {
  await pool.query(
    `UPDATE department SET department_name = ? WHERE department_id = ?`,
    [departmentName, departmentId],
  );
};

export const getDepartments = async (): Promise<any[]> => {
  const [rows] = await pool.query(
    `SELECT department_id, department_name FROM department ORDER BY department_name ASC`,
  );
  return rows as any[];
};

export const getDepartmentById = async (
  departmentId: number,
): Promise<any | null> => {
  const [rows]: any = await pool.query(
    `SELECT department_id, department_name FROM department WHERE department_id = ?`,
    [departmentId],
  );
  return rows[0] || null;
};

export const getDepartmentByName = async (
  departmentName: string,
): Promise<any | null> => {
  // LOWER() on both sides ensures case-insensitive match regardless of DB collation
  const [rows]: any = await pool.query(
    `SELECT department_id, department_name FROM department WHERE LOWER(department_name) = LOWER(?)`,
    [departmentName],
  );
  return rows[0] || null;
};
