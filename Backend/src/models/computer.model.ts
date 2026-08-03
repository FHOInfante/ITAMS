import pool from "../config/db.js";

const COMPUTER_SELECT = `
  SELECT
    c.computer_id,
    c.computer_name,
    c.asset_tag,
    c.serial_no,
    c.model,
    c.brand,
    c.device_type,
    c.operating_system,
    c.computer_status,
    c.asset_condition,
    c.received_date,
    c.warranty_expiry,
    c.assigned_date,
    c.to_return_by,
    c.vendor,
    c.processor,
    c.ram_size,
    c.storage_type,
    c.storage_capacity,
    c.ip_address,
    c.mac_address,
    c.network_connectivity,
    c.has_vpn_access,
    c.anydesk_ip,
    c.remarks,
    c.cost,
    eu.eu_id AS assigned_user_id,
    eu.eu_name AS assigned_user_name,
    eu.eu_emp_id AS assigned_user_emp_id,
    GROUP_CONCAT(DISTINCT p.peripheral_name ORDER BY p.peripheral_name SEPARATOR '||') AS peripherals,
    GROUP_CONCAT(DISTINCT pr.program_name ORDER BY pr.program_name SEPARATOR '||') AS programs
  FROM computer c
  LEFT JOIN end_user eu ON c.assigned_user = eu.eu_id
  LEFT JOIN computer_peripheral cp ON c.computer_id = cp.computer_id
  LEFT JOIN peripheral p ON cp.peripheral_id = p.peripheral_id
  LEFT JOIN computer_program cpr ON c.computer_id = cpr.computer_id
  LEFT JOIN program pr ON cpr.program_id = pr.program_id
`;

export const resolvePeripheralIds = async (
  peripherals: Array<{ peripheral_id?: number; peripheral_name?: string }>,
): Promise<number[]> => {
  if (!peripherals || peripherals.length === 0) return [];

  const byId = peripherals
    .filter((p) => p.peripheral_id !== undefined)
    .map((p) => p.peripheral_id as number);

  const byName = peripherals
    .filter(
      (p) => p.peripheral_name !== undefined && p.peripheral_id === undefined,
    )
    .map((p) => p.peripheral_name as string);

  const resolvedIds: number[] = [];
  const notFound: string[] = [];

  if (byId.length > 0) {
    const placeholders = byId.map(() => "?").join(", ");
    const [rows]: any = await pool.query(
      `SELECT peripheral_id FROM peripheral WHERE peripheral_id IN (${placeholders})`,
      byId,
    );
    const foundIds = new Set(rows.map((r: any) => r.peripheral_id));
    for (const id of byId) {
      if (foundIds.has(id)) {
        resolvedIds.push(id);
      } else {
        notFound.push(`ID:${id}`);
      }
    }
  }

  if (byName.length > 0) {
    const placeholders = byName.map(() => "?").join(", ");
    const [rows]: any = await pool.query(
      `SELECT peripheral_id, peripheral_name FROM peripheral WHERE peripheral_name IN (${placeholders})`,
      byName,
    );
    const nameMap = new Map(
      rows.map((r: any) => [r.peripheral_name, r.peripheral_id]),
    );
    for (const name of byName) {
      if (nameMap.has(name)) {
        resolvedIds.push(nameMap.get(name) as number);
      } else {
        notFound.push(`name:"${name}"`);
      }
    }
  }

  if (notFound.length > 0) {
    const err = new Error(
      `Peripherals not found: ${notFound.join(", ")}`,
    ) as any;
    err.statusCode = 404;
    throw err;
  }

  return resolvedIds;
};

export const resolveProgramIds = async (
  programs: Array<{ program_id?: number; program_name?: string }>,
): Promise<number[]> => {
  if (!programs || programs.length === 0) return [];

  const byId = programs
    .filter((p) => p.program_id !== undefined)
    .map((p) => p.program_id as number);

  const byName = programs
    .filter((p) => p.program_name !== undefined && p.program_id === undefined)
    .map((p) => p.program_name as string);

  const resolvedIds: number[] = [];
  const notFound: string[] = [];

  if (byId.length > 0) {
    const placeholders = byId.map(() => "?").join(", ");
    const [rows]: any = await pool.query(
      `SELECT program_id FROM program WHERE program_id IN (${placeholders})`,
      byId,
    );
    const foundIds = new Set(rows.map((r: any) => r.program_id));
    for (const id of byId) {
      if (foundIds.has(id)) {
        resolvedIds.push(id);
      } else {
        notFound.push(`ID:${id}`);
      }
    }
  }

  if (byName.length > 0) {
    const placeholders = byName.map(() => "?").join(", ");
    const [rows]: any = await pool.query(
      `SELECT program_id, program_name FROM program WHERE program_name IN (${placeholders})`,
      byName,
    );
    const nameMap = new Map(
      rows.map((r: any) => [r.program_name, r.program_id]),
    );
    for (const name of byName) {
      if (nameMap.has(name)) {
        resolvedIds.push(nameMap.get(name) as number);
      } else {
        notFound.push(`name:"${name}"`);
      }
    }
  }

  if (notFound.length > 0) {
    const err = new Error(`Programs not found: ${notFound.join(", ")}`) as any;
    err.statusCode = 404;
    throw err;
  }

  return resolvedIds;
};

const linkPeripherals = async (
  computerId: number,
  peripheralIds: number[],
  connection?: any,
): Promise<void> => {
  if (peripheralIds.length === 0) return;
  const db = connection ?? pool;
  const values = peripheralIds.map((pid) => [computerId, pid]);
  await db.query(
    `INSERT IGNORE INTO computer_peripheral (computer_id, peripheral_id) VALUES ?`,
    [values],
  );
};

const replacePeripherals = async (
  computerId: number,
  peripheralIds: number[],
  connection?: any,
): Promise<void> => {
  const db = connection ?? pool;
  await db.query(`DELETE FROM computer_peripheral WHERE computer_id = ?`, [
    computerId,
  ]);
  if (peripheralIds.length > 0) {
    await linkPeripherals(computerId, peripheralIds, db);
  }
};

const linkPrograms = async (
  computerId: number,
  programIds: number[],
  connection?: any,
): Promise<void> => {
  if (programIds.length === 0) return;
  const db = connection ?? pool;
  const values = programIds.map((pid) => [computerId, pid]);
  await db.query(
    `INSERT IGNORE INTO computer_program (computer_id, program_id) VALUES ?`,
    [values],
  );
};

const replacePrograms = async (
  computerId: number,
  programIds: number[],
  connection?: any,
): Promise<void> => {
  const db = connection ?? pool;
  await db.query(`DELETE FROM computer_program WHERE computer_id = ?`, [
    computerId,
  ]);
  if (programIds.length > 0) {
    await linkPrograms(computerId, programIds, db);
  }
};

export const createComputer = async (
  computerName: string,
  assetTag: string | null,
  serialNo: string,
  model: string,
  brand: string,
  deviceType: string,
  operatingSystem: string,
  computerStatus: "Active" | "Repair" | "Spare" | "Defective",
  assetCondition: "New" | "Used" | null,
  receivedDate: string,
  warrantyExpiry: string | null,
  vendor: string,
  assignedUser: number | null,
  assignedDate: string | null,
  toReturnBy: string | null,
  processor: string,
  ramSize: string,
  storageType: string,
  storageCapacity: string,
  ipAddress: string,
  macAddress: string | null,
  networkConnectivity: "WIFI" | "LAN" | "WIFI & LAN",
  hasVpnAccess: boolean,
  anyDeskIp: string | null,
  remarks: string | null,
  cost: number | null,
  peripheralIds: number[] = [],
  programIds: number[] = [],
): Promise<number> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result]: any = await conn.query(
      `INSERT INTO computer (
        computer_name, asset_tag, serial_no, model, brand, device_type,
        operating_system, computer_status, asset_condition, received_date,
        warranty_expiry, vendor, assigned_user, assigned_date, to_return_by,
        processor, ram_size, storage_type, storage_capacity, ip_address,
        mac_address, network_connectivity, has_vpn_access, anydesk_ip, remarks, cost
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        computerName,
        assetTag,
        serialNo,
        model,
        brand,
        deviceType,
        operatingSystem,
        computerStatus,
        assetCondition,
        receivedDate,
        warrantyExpiry,
        vendor,
        assignedUser,
        assignedDate,
        toReturnBy,
        processor,
        ramSize,
        storageType,
        storageCapacity,
        ipAddress,
        macAddress,
        networkConnectivity,
        hasVpnAccess,
        anyDeskIp,
        remarks,
        cost,
      ],
    );

    const computerId: number = result.insertId;

    await linkPeripherals(computerId, peripheralIds, conn);
    await linkPrograms(computerId, programIds, conn);

    await conn.commit();
    return computerId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const assignComputerUser = async (
  computerId: number,
  assignedUser: number | null,
  assignedDate: string | null,
): Promise<void> => {
  await pool.query(
    `UPDATE computer SET assigned_user = ?, assigned_date = ? WHERE computer_id = ?`,
    [assignedUser, assignedDate, computerId],
  );
};

export const updateComputer = async (
  computerId: number,
  computerName: string,
  assetTag: string | null,
  serialNo: string,
  model: string,
  brand: string,
  deviceType: string,
  operatingSystem: string,
  computerStatus: "Active" | "Repair" | "Spare" | "Defective",
  assetCondition: "New" | "Used" | null,
  receivedDate: string,
  warrantyExpiry: string | null,
  vendor: string,
  assignedUser: number | null,
  assignedDate: string | null,
  toReturnBy: string | null,
  processor: string,
  ramSize: string,
  storageType: string,
  storageCapacity: string,
  ipAddress: string,
  macAddress: string | null,
  networkConnectivity: "WIFI" | "LAN" | "WIFI & LAN",
  hasVpnAccess: boolean,
  anyDeskIp: string | null,
  remarks: string | null,
  cost: number | null,
  peripheralIds: number[] = [],
  programIds: number[] = [],
): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE computer SET
        computer_name = ?, asset_tag = ?, serial_no = ?, model = ?, brand = ?,
        device_type = ?, operating_system = ?, computer_status = ?, asset_condition = ?,
        received_date = ?, warranty_expiry = ?, vendor = ?,
        assigned_user = ?, assigned_date = ?, to_return_by = ?,
        processor = ?, ram_size = ?, storage_type = ?,
        storage_capacity = ?, ip_address = ?, mac_address = ?,
        network_connectivity = ?, has_vpn_access = ?, anydesk_ip = ?,
        remarks = ?, cost = ?
      WHERE computer_id = ?`,
      [
        computerName,
        assetTag,
        serialNo,
        model,
        brand,
        deviceType,
        operatingSystem,
        computerStatus,
        assetCondition,
        receivedDate,
        warrantyExpiry,
        vendor,
        assignedUser,
        assignedDate,
        toReturnBy,
        processor,
        ramSize,
        storageType,
        storageCapacity,
        ipAddress,
        macAddress,
        networkConnectivity,
        hasVpnAccess,
        anyDeskIp,
        remarks,
        cost,
        computerId,
      ],
    );

    await replacePeripherals(computerId, peripheralIds, conn);
    await replacePrograms(computerId, programIds, conn);

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

export const updateComputerNetwork = async (
  computerId: number,
  ipAddress: string,
  networkConnectivity: "WIFI" | "LAN" | "WIFI & LAN",
  hasVpnAccess: boolean,
): Promise<void> => {
  await pool.query(
    `UPDATE computer SET ip_address = ?, network_connectivity = ?, has_vpn_access = ? WHERE computer_id = ?`,
    [ipAddress, networkConnectivity, hasVpnAccess, computerId],
  );
};

export const getComputers = async (): Promise<any[]> => {
  const [rows] = await pool.query(
    COMPUTER_SELECT +
      `GROUP BY
      c.computer_id, c.computer_name, c.asset_tag, c.serial_no, c.model,
      c.brand, c.device_type, c.operating_system, c.computer_status, c.asset_condition,
      c.received_date, c.warranty_expiry, c.vendor, c.assigned_date, c.to_return_by,
      c.processor, c.ram_size, c.storage_type, c.storage_capacity, c.ip_address,
      c.mac_address, c.network_connectivity, c.has_vpn_access, c.anydesk_ip,
      c.remarks, c.cost, eu.eu_id, eu.eu_name, eu.eu_emp_id`,
  );

  return rows as any[];
};

export const getComputerById = async (
  computerId: number,
): Promise<any | null> => {
  const [rows]: any = await pool.query(
    COMPUTER_SELECT +
      `WHERE c.computer_id = ?
    GROUP BY
      c.computer_id, c.computer_name, c.asset_tag, c.serial_no, c.model,
      c.brand, c.device_type, c.operating_system, c.computer_status, c.asset_condition,
      c.received_date, c.warranty_expiry, c.vendor, c.assigned_date, c.to_return_by,
      c.processor, c.ram_size, c.storage_type, c.storage_capacity, c.ip_address,
      c.mac_address, c.network_connectivity, c.has_vpn_access, c.anydesk_ip,
      c.remarks, c.cost, eu.eu_id, eu.eu_name, eu.eu_emp_id`,
    [computerId],
  );

  return rows[0] || null;
};
