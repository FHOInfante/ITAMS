import pool from "../config/db.js";

export const createCredential = async (
  userId: number,
  username: string,
  passwordHash: string,
  isDefault: boolean,
): Promise<void> => {
  await pool.query(
    `INSERT INTO user_credential (user_id, user_username, password_hash, is_password_default) VALUES (?, ?, ?, ?)`,
    [userId, username, passwordHash, isDefault],
  );
};

export const findCredentialByUsername = async (
  username: string,
): Promise<any | null> => {
  const [rows]: any = await pool.query(
    `SELECT 
        u.user_id,
        u.user_name,
        u.user_role,
        u.user_status,
        uc.password_hash,
        uc.is_password_default
     FROM user u
     JOIN user_credential uc ON u.user_id = uc.user_id
     WHERE LOWER(uc.user_username) = LOWER(?)`,
    [username],
  );

  return rows[0] || null;
};
