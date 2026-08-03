import pool from "../config/db.js";

/**
 * Shared SELECT shape for all audit trail queries. Joins the acting user's
 * name/employee ID and LEFT JOINs audit_log_detail so snapshot_before and
 * snapshot_after are available for field-level diffing — snapshot columns
 * will be null for interaction types that don't record a snapshot.
 */
const buildAuditLogQuery = (whereClause: string): string => `
  SELECT
    al.audit_log_id,
    al.user_id,
    u.user_name,
    u.user_emp_id,
    al.interaction_date,
    al.interaction_type,
    al.target_table,
    al.target_id,
    al.interaction_detail,
    ald.snapshot_before,
    ald.snapshot_after
  FROM audit_log al
  JOIN user u ON al.user_id = u.user_id
  LEFT JOIN audit_log_detail ald ON al.audit_log_id = ald.audit_log_id
  ${whereClause}
  ORDER BY al.interaction_date DESC
`;

/**
 * Builds an optional " AND ..." clause (plus matching params) that restricts
 * a query to al.interaction_date values within [dateFrom, dateTo], both
 * inclusive. Returns an empty clause/params pair when neither bound is
 * supplied, so callers can always splice the result in without branching.
 *
 * dateTo is treated as inclusive of the ENTIRE day (not just 00:00:00) by
 * comparing against the start of the following day instead of using
 * "<= dateTo" directly - interaction_date is a DATETIME/TIMESTAMP column, so
 * a plain "<= '2024-12-31'" would incorrectly exclude same-day events logged
 * after midnight. This also keeps the comparison sargable (able to use an
 * index on interaction_date) since it avoids wrapping the column itself in a
 * function like DATE(al.interaction_date).
 */
const buildAuditDateRangeClause = (
  dateFrom?: string,
  dateTo?: string,
): { clause: string; params: string[] } => {
  const conditions: string[] = [];
  const params: string[] = [];

  if (dateFrom) {
    conditions.push("al.interaction_date >= ?");
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push("al.interaction_date < DATE_ADD(?, INTERVAL 1 DAY)");
    params.push(dateTo);
  }

  return {
    clause: conditions.length > 0 ? ` AND ${conditions.join(" AND ")}` : "",
    params,
  };
};

/**
 * Retrieves all non-asset ("system") audit log entries — those with a null
 * target_table, e.g. Login, Register, permission changes, file maintenance,
 * end user management, purchase requests, and report downloads. Optionally
 * filtered by one or more interaction_type values.
 */
export const viewSystemAuditLogs = async (types?: string[]): Promise<any[]> => {
  let query = buildAuditLogQuery("WHERE al.target_table IS NULL");
  const params: string[] = [];

  if (types && types.length > 0) {
    const placeholders = types.map(() => "?").join(", ");
    query = buildAuditLogQuery(
      `WHERE al.target_table IS NULL AND al.interaction_type IN (${placeholders})`,
    );
    params.push(...types);
  }

  const [rows] = await pool.query(query, params);
  return rows as any[];
};

/**
 * Retrieves all audit log entries for a given asset target_table
 * (e.g. "computer", "software", "printer", "ups", "network_device").
 *
 * dateFrom/dateTo are optional and, when supplied, restrict the result to
 * entries whose interaction_date falls within that inclusive range (see
 * buildAuditDateRangeClause). Existing callers that only pass targetTable
 * (e.g. audit.controller.ts's per-asset endpoints) are unaffected, since
 * both bounds default to undefined and no date clause is applied.
 */
export const viewAssetAuditLogs = async (
  targetTable: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<any[]> => {
  const { clause, params: dateParams } = buildAuditDateRangeClause(
    dateFrom,
    dateTo,
  );
  const query = buildAuditLogQuery(`WHERE al.target_table = ?${clause}`);
  const [rows] = await pool.query(query, [targetTable, ...dateParams]);
  return rows as any[];
};

/**
 * Retrieves all audit log entries for one specific asset record, identified
 * by the combination of target_table and target_id.
 */
export const viewAssetAuditLogsById = async (
  targetTable: string,
  targetId: number,
): Promise<any[]> => {
  const query = buildAuditLogQuery(
    "WHERE al.target_table = ? AND al.target_id = ?",
  );
  const [rows] = await pool.query(query, [targetTable, targetId]);
  return rows as any[];
};

/**
 * Retrieves all audit log entries for purchase requests (target_table =
 * "purchase_request"). This covers both header-level events (Add/Update
 * Purchase Request) and item-level events (Add/Update/Delete Purchase
 * Request Item) - item-level events are logged against their parent PR's
 * target_id (pr_id) rather than a separate target_table, so a single query
 * here returns the full trail for a purchase request and all of its items.
 *
 * dateFrom/dateTo are optional and, when supplied, restrict the result to
 * entries whose interaction_date falls within that inclusive range (see
 * buildAuditDateRangeClause). The existing no-argument call in
 * audit.controller.ts's getPurchaseRequestAuditLogs is unaffected, since
 * both bounds default to undefined and no date clause is applied.
 */
export const viewPurchaseRequestAuditLogs = async (
  dateFrom?: string,
  dateTo?: string,
): Promise<any[]> => {
  const { clause, params: dateParams } = buildAuditDateRangeClause(
    dateFrom,
    dateTo,
  );
  const query = buildAuditLogQuery(
    `WHERE al.target_table = 'purchase_request'${clause}`,
  );
  const [rows] = await pool.query(query, dateParams);
  return rows as any[];
};

export const createAuditLog = async (
  userId: number,
  interactionType: string,
  interactionDetail: string,
): Promise<number> => {
  const [result]: any = await pool.query(
    `INSERT INTO audit_log (user_id, interaction_type, interaction_detail) VALUES (?, ?, ?)`,
    [userId, interactionType, interactionDetail],
  );
  return result.insertId as number;
};

export const createAuditLogWithSnapshot = async (
  userId: number,
  interactionType: string,
  interactionDetail: string,
  targetTable: string,
  targetId: number,
  snapshotBefore: object,
  snapshotAfter: object,
): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result]: any = await connection.query(
      `INSERT INTO audit_log (user_id, interaction_type, interaction_detail, target_table, target_id)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, interactionType, interactionDetail, targetTable, targetId],
    );

    const auditLogId: number = result.insertId;

    await connection.query(
      `INSERT INTO audit_log_detail (audit_log_id, snapshot_before, snapshot_after)
       VALUES (?, ?, ?)`,
      [
        auditLogId,
        JSON.stringify(snapshotBefore),
        JSON.stringify(snapshotAfter),
      ],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Creates an audit log entry for asset creation events (Add interactions).
 * Records the target_table and target_id, and stores the newly created record
 * as snapshot_after. snapshot_before is stored as an empty object since no
 * prior state exists at the point of creation.
 */
export const createAuditLogWithSnapshotAfterOnly = async (
  userId: number,
  interactionType: string,
  interactionDetail: string,
  targetTable: string,
  targetId: number,
  snapshotAfter: object,
): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result]: any = await connection.query(
      `INSERT INTO audit_log (user_id, interaction_type, interaction_detail, target_table, target_id)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, interactionType, interactionDetail, targetTable, targetId],
    );

    const auditLogId: number = result.insertId;

    await connection.query(
      `INSERT INTO audit_log_detail (audit_log_id, snapshot_before, snapshot_after)
       VALUES (?, ?, ?)`,
      [auditLogId, JSON.stringify({}), JSON.stringify(snapshotAfter)],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
