import pool from "../config/db.js";

export const getPermissionList = async (): Promise<any[]> => {
  const [rows] = await pool.query(
    `SELECT permission_id, permission_name, permission_desc FROM permission ORDER BY permission_id ASC`,
  );

  return rows as any[];
};

export const getUserPermission = async (userId: number): Promise<number[]> => {
  const [rows] = await pool.query(
    `SELECT permission_id
     FROM user_permission
     WHERE user_id = ?
       AND (
         is_temporary = FALSE
         OR (is_temporary = TRUE AND NOW() BETWEEN valid_from AND valid_to)
       )`,
    [userId],
  );

  return (rows as any[]).map((row) => row.permission_id);
};

export const getPermanentUserPermissions = async (
  userId: number,
): Promise<number[]> => {
  const [rows] = await pool.query(
    `SELECT permission_id FROM user_permission WHERE user_id = ? AND is_temporary = FALSE`,
    [userId],
  );

  return (rows as any[]).map((row) => row.permission_id);
};

// Returns the permission_ids of every temporary permission currently active
// (i.e. is_temporary = TRUE and NOW() falls within valid_from/valid_to) for
// the given user. Used by permission.util.ts to fully strip temporary access
// during a role change or account deactivation, since user_permission's
// primary key is (user_id, permission_id) — a lingering temporary row would
// otherwise block granting the same permission_id permanently.
export const getActiveTemporaryPermissions = async (
  userId: number,
): Promise<number[]> => {
  const [rows] = await pool.query(
    `SELECT permission_id
     FROM user_permission
     WHERE user_id = ?
       AND is_temporary = TRUE`,
    [userId],
  );

  return (rows as any[]).map((row) => row.permission_id);
};

export const getUserPermissionRecord = async (
  userId: number,
  permissionId: number,
): Promise<{
  permission_id: number;
  is_temporary: boolean;
  valid_from: string | null;
  valid_to: string | null;
} | null> => {
  const [rows] = await pool.query(
    `SELECT permission_id, is_temporary, valid_from, valid_to
     FROM user_permission
     WHERE user_id = ? AND permission_id = ?`,
    [userId, permissionId],
  );

  const result = rows as any[];
  if (result.length === 0) return null;

  return {
    permission_id: result[0].permission_id,
    is_temporary: Boolean(result[0].is_temporary),
    valid_from: result[0].valid_from,
    valid_to: result[0].valid_to,
  };
};

// Shape of a single user_permission row, reused by both the single-record
// and bulk lookup helpers below.
export type UserPermissionRecord = {
  permission_id: number;
  is_temporary: boolean;
  valid_from: string | null;
  valid_to: string | null;
};

// Bulk variant of getUserPermissionRecord. Used so grant/revoke can validate
// every requested permission_id with a single round trip instead of N queries.
export const getUserPermissionRecords = async (
  userId: number,
  permissionIds: number[],
): Promise<UserPermissionRecord[]> => {
  if (permissionIds.length === 0) return [];

  const [rows] = await pool.query(
    `SELECT permission_id, is_temporary, valid_from, valid_to
     FROM user_permission
     WHERE user_id = ? AND permission_id IN (?)`,
    [userId, permissionIds],
  );

  return (rows as any[]).map((row) => ({
    permission_id: row.permission_id,
    is_temporary: Boolean(row.is_temporary),
    valid_from: row.valid_from,
    valid_to: row.valid_to,
  }));
};

export const grantUserPermission = async (
  userId: number,
  permissionId: number,
  valid_from: string | null,
  valid_to: string | null,
  is_temporary: boolean = false,
): Promise<void> => {
  await pool.query(
    `INSERT IGNORE INTO user_permission (user_id, permission_id, valid_from, valid_to, is_temporary)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, permissionId, valid_from, valid_to, is_temporary],
  );
};

// Bulk variant of grantUserPermission. Inserts one row per permission_id in a
// single statement, all sharing the same validFrom/validTo window.
export const grantUserPermissions = async (
  userId: number,
  permissionIds: number[],
  valid_from: string,
  valid_to: string,
): Promise<void> => {
  if (permissionIds.length === 0) return;

  const values = permissionIds.map((permissionId) => [
    userId,
    permissionId,
    valid_from,
    valid_to,
    true,
  ]);

  await pool.query(
    `INSERT INTO user_permission (user_id, permission_id, valid_from, valid_to, is_temporary)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        valid_from = VALUES(valid_from),
        valid_to = VALUES(valid_to),
        is_temporary = VALUES(is_temporary)`,
    [values],
  );
};

export const revokeUserPermission = async (
  userId: number,
  permissionId: number,
): Promise<void> => {
  await pool.query(
    `DELETE FROM user_permission WHERE user_id = ? AND permission_id = ?`,
    [userId, permissionId],
  );
};

export const revokeUserPermissions = async (
  userId: number,
  permissionIds: number[],
): Promise<void> => {
  if (permissionIds.length === 0) return;

  await pool.query(
    `DELETE FROM user_permission WHERE user_id = ? AND permission_id IN (?)`,
    [userId, permissionIds],
  );
};

export const revokeAllUserPermissions = async (
  userId: number,
): Promise<void> => {
  await pool.query(`DELETE FROM user_permission WHERE user_id = ?`, [userId]);
};

export const grantPermanentUserPermissions = async (
  userId: number,
  permissionIds: number[],
): Promise<void> => {
  if (permissionIds.length === 0) return;

  const values = permissionIds.map((permissionId) => [
    userId,
    permissionId,
    null,
    null,
    false,
  ]);

  await pool.query(
    `INSERT IGNORE INTO user_permission (user_id, permission_id, valid_from, valid_to, is_temporary)
     VALUES ?`,
    [values],
  );
};
