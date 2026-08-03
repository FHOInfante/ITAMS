import pool from "../config/db.js";

export const createUser = async (
  name: string,
  email: string | null,
  empId: number,
  role: string,
): Promise<number> => {
  const [result]: any = await pool.query(
    `INSERT INTO user (user_name, user_email, user_emp_id, user_role) VALUES (?, ?, ?, ?)`,
    [name, email, empId, role],
  );

  return result.insertId;
};

export const findUserByEmpId = async (empId: number): Promise<any | null> => {
  const [rows]: any = await pool.query(
    `SELECT user_id FROM user WHERE user_emp_id = ?`,
    [empId],
  );

  return rows[0] || null;
};

export const findUserByEmail = async (email: string): Promise<any | null> => {
  const [rows]: any = await pool.query(
    `SELECT user_id FROM user WHERE LOWER(user_email) = LOWER(?)`,
    [email],
  );

  return rows[0] || null;
};

export const findUserById = async (userId: number): Promise<any | null> => {
  const [rows]: any = await pool.query(
    `SELECT
      u.user_id,
      u.user_name,
      u.user_email,
      u.user_emp_id,
      u.user_role,
      u.user_status,
      uc.user_username,
      GROUP_CONCAT(
        up.permission_id, '||',
        up.is_temporary, '||',
        IFNULL(up.valid_from, 'NULL'), '||',
        IFNULL(up.valid_to, 'NULL')
        ORDER BY up.permission_id ASC
        SEPARATOR '~~'
      ) AS permissions
    FROM user u
    LEFT JOIN user_credential uc
      ON u.user_id = uc.user_id
    LEFT JOIN user_permission up
      ON u.user_id = up.user_id
      AND (
        up.is_temporary = FALSE
        OR (up.is_temporary = TRUE AND NOW() BETWEEN up.valid_from AND up.valid_to)
      )
    WHERE u.user_id = ?
    GROUP BY
      u.user_id,
      u.user_name,
      u.user_email,
      u.user_emp_id,
      u.user_role,
      u.user_status,
      uc.user_username`,
    [userId],
  );

  return rows[0] || null;
};

export const getUserDetails = async (): Promise<any[]> => {
  const [rows] = await pool.query(
    `SELECT
      u.user_id,
      u.user_name,
      u.user_email,
      u.user_emp_id,
      u.user_role,
      u.user_status,
      uc.user_username,
      GROUP_CONCAT(
        up.permission_id, '||',
        up.is_temporary, '||',
        IFNULL(up.valid_from, 'NULL'), '||',
        IFNULL(up.valid_to, 'NULL')
        ORDER BY up.permission_id ASC
        SEPARATOR '~~'
      ) AS permissions
    FROM user u
    LEFT JOIN user_credential uc
      ON u.user_id = uc.user_id
    LEFT JOIN user_permission up
      ON u.user_id = up.user_id
      AND (
        up.is_temporary = FALSE
        OR (up.is_temporary = TRUE AND NOW() BETWEEN up.valid_from AND up.valid_to)
      )
    GROUP BY
      u.user_id,
      u.user_name,
      u.user_email,
      u.user_emp_id,
      u.user_role,
      u.user_status,
      uc.user_username`,
  );

  return rows as any[];
};

// Fields that PATCH /user/:id is allowed to touch. user_name and
// user_username are intentionally NOT part of this shape — user_username is
// immutable by design (see credential.model.ts), and user_name is no longer
// editable through the API surface as of this refactor.
//
// Each property is optional and independently nullable/omittable so the
// caller can send any subset of the three fields; only the keys that are
// actually present (!== undefined) are written to the SET clause. This
// mirrors the "partial update" pattern the old updateUserDetails used, just
// generalized to all three editable columns instead of just name/email.
export const updateUser = async (
  userId: number,
  fields: {
    user_email?: string | null;
    user_role?: string;
    user_status?: "Active" | "Inactive";
  },
): Promise<void> => {
  const columns: string[] = [];
  const values: any[] = [];

  if (fields.user_email !== undefined) {
    columns.push("user_email = ?");
    values.push(fields.user_email);
  }

  if (fields.user_role !== undefined) {
    columns.push("user_role = ?");
    values.push(fields.user_role);
  }

  if (fields.user_status !== undefined) {
    columns.push("user_status = ?");
    values.push(fields.user_status);
  }

  if (columns.length === 0) {
    return;
  }

  values.push(userId);

  await pool.query(
    `UPDATE user SET ${columns.join(", ")} WHERE user_id = ?`,
    values,
  );
};

export const updateUserPassword = async (
  userId: number,
  passwordHash: string,
  isDefault: boolean,
) => {
  await pool.query(
    `UPDATE user_credential SET password_hash = ?, is_password_default = ? WHERE user_id = ?`,
    [passwordHash, isDefault, userId],
  );
};
