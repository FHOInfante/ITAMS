import pool from "../config/db.js";

export const createProgram = async (programName: string): Promise<number> => {
  const [result]: any = await pool.query(
    `INSERT INTO program (program_name) VALUES (?)`,
    [programName],
  );
  return result.insertId;
};

export const updateProgram = async (
  programId: number,
  programName: string,
): Promise<void> => {
  await pool.query(`UPDATE program SET program_name = ? WHERE program_id = ?`, [
    programName,
    programId,
  ]);
};

export const getPrograms = async (): Promise<any[]> => {
  const [rows] = await pool.query(
    `SELECT program_id, program_name FROM program ORDER BY program_name ASC`,
  );
  return rows as any[];
};

export const getProgramById = async (
  programId: number,
): Promise<any | null> => {
  const [rows]: any = await pool.query(
    `SELECT program_id, program_name FROM program WHERE program_id = ?`,
    [programId],
  );
  return rows[0] || null;
};

export const getProgramByName = async (
  programName: string,
): Promise<any | null> => {
  const [rows]: any = await pool.query(
    `SELECT program_id, program_name FROM program WHERE program_name = ?`,
    [programName],
  );
  return rows[0] || null;
};
