import pool from "../config/db.js";

const END_USER_SELECT = `
  SELECT
    eu.eu_id,
    eu.eu_name,
    eu.eu_emp_id,
    eu.eu_division,
    eu.eu_department,
    d.department_name,
    eu.eu_location,
    eu.eu_email,
    eu.eu_contact_no,
    eu.eu_status
  FROM end_user eu
  LEFT JOIN department d ON eu.eu_department = d.department_id
`;

export const findEndUserByEmpId = async (
  euEmpId: number,
): Promise<any | null> => {
  const [rows]: any = await pool.query(
    `SELECT * FROM end_user WHERE eu_emp_id = ?`,
    [euEmpId],
  );
  return rows[0] || null;
};

export const createEndUser = async (
  euName: string,
  euEmpId: number,
  euDivision: string,
  euDepartment: number,
  euLocation: string,
  euEmail: string | null,
  euContactNo: string | null,
): Promise<number> => {
  const [result]: any = await pool.query(
    `INSERT INTO end_user (eu_name, eu_emp_id, eu_division, eu_department, eu_location, eu_email, eu_contact_no)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      euName,
      euEmpId,
      euDivision,
      euDepartment,
      euLocation,
      euEmail,
      euContactNo,
    ],
  );
  return result.insertId;
};

export const updateEndUser = async (
  euId: number,
  euName: string,
  euEmpId: number,
  euDivision: string,
  euDepartment: number,
  euLocation: string,
  euEmail: string | null,
  euContactNo: string | null,
  euStatus: string,
): Promise<void> => {
  await pool.query(
    `UPDATE end_user SET
      eu_name = ?, eu_emp_id = ?, eu_division = ?, eu_department = ?,
      eu_location = ?, eu_email = ?, eu_contact_no = ?, eu_status = ?
     WHERE eu_id = ?`,
    [
      euName,
      euEmpId,
      euDivision,
      euDepartment,
      euLocation,
      euEmail,
      euContactNo,
      euStatus,
      euId,
    ],
  );
};

export const updateEndUserStatus = async (
  euId: number,
  status: "Active" | "Resigned",
): Promise<void> => {
  await pool.query(`UPDATE end_user SET eu_status = ? WHERE eu_id = ?`, [
    status,
    euId,
  ]);
};

export const getEndUsers = async (): Promise<any[]> => {
  const [rows]: any = await pool.query(END_USER_SELECT);

  // Fetch assigned computers and software for all users in two queries
  // then map them per end user — avoids N+1 queries
  const [computers]: any = await pool.query(
    `SELECT assigned_user AS eu_id, computer_id, computer_name FROM computer WHERE assigned_user IS NOT NULL`,
  );
  const [software]: any = await pool.query(
    `SELECT assigned_user AS eu_id, software_id, software_name FROM software WHERE assigned_user IS NOT NULL`,
  );

  const computerMap: Record<number, any[]> = {};
  for (const c of computers) {
    if (!computerMap[c.eu_id]) computerMap[c.eu_id] = [];
    computerMap[c.eu_id].push({
      computer_id: c.computer_id,
      computer_name: c.computer_name,
    });
  }

  const softwareMap: Record<number, any[]> = {};
  for (const s of software) {
    if (!softwareMap[s.eu_id]) softwareMap[s.eu_id] = [];
    softwareMap[s.eu_id].push({
      software_id: s.software_id,
      software_name: s.software_name,
    });
  }

  return (rows as any[]).map((eu: any) => ({
    ...eu,
    assignedComputers: computerMap[eu.eu_id] ?? [],
    assignedSoftware: softwareMap[eu.eu_id] ?? [],
  }));
};

export const getEndUserById = async (euId: number): Promise<any | null> => {
  const [rows]: any = await pool.query(END_USER_SELECT + `WHERE eu.eu_id = ?`, [
    euId,
  ]);

  if (!rows[0]) return null;

  const eu = rows[0];

  const [computers]: any = await pool.query(
    `SELECT computer_id, computer_name FROM computer WHERE assigned_user = ?`,
    [euId],
  );
  const [software]: any = await pool.query(
    `SELECT software_id, software_name FROM software WHERE assigned_user = ?`,
    [euId],
  );

  return {
    ...eu,
    assignedComputers: computers.map((c: any) => ({
      computer_id: c.computer_id,
      computer_name: c.computer_name,
    })),
    assignedSoftware: software.map((s: any) => ({
      software_id: s.software_id,
      software_name: s.software_name,
    })),
  };
};
