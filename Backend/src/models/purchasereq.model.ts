import pool from "../config/db.js";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export const createPurchaseRequest = async (
  prNo: number,
  dateRequested: string,
  requestedBy: string,
  remarks: string | null,
): Promise<number> => {
  // pr_status is intentionally hardcoded to "In Process" here — a purchase
  // request always starts in this state; it can only move to Received, On
  // Hold, or Cancelled afterwards via PATCH /purchase-request/:id.
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO purchase_request (
      pr_no, pr_status, date_requested, requested_by, remarks
    ) VALUES (?, 'In Process', ?, ?, ?)`,
    [prNo, dateRequested, requestedBy, remarks],
  );
  return result.insertId;
};

export const getPurchaseRequests = async (): Promise<RowDataPacket[]> => {
  const [prs] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM purchase_request ORDER BY pr_id ASC`,
  );

  if (prs.length === 0) return [];

  const [items] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM purchase_request_item ORDER BY pr_id ASC, item_id ASC`,
  );

  // Group items by pr_id in a map for O(1) lookup, then attach to each PR
  const itemMap = new Map<number, RowDataPacket[]>();
  for (const item of items) {
    if (!itemMap.has(item.pr_id)) itemMap.set(item.pr_id, []);
    itemMap.get(item.pr_id)!.push(item);
  }

  return prs.map((pr) => ({ ...pr, items: itemMap.get(pr.pr_id) ?? [] }));
};

export const getPurchaseRequestById = async (
  prId: number,
): Promise<RowDataPacket | null> => {
  const [prs] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM purchase_request WHERE pr_id = ?`,
    [prId],
  );

  if (!prs[0]) return null;

  const [items] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM purchase_request_item WHERE pr_id = ? ORDER BY item_id ASC`,
    [prId],
  );

  return { ...prs[0], items };
};

/**
 * Lightweight lookup used to guard write operations (status edits, item
 * add/delete, item received toggling) without pulling the full PR + items
 * payload just to check pr_status.
 */
export const getPurchaseRequestStatusById = async (
  prId: number,
): Promise<string | null> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT pr_status FROM purchase_request WHERE pr_id = ?`,
    [prId],
  );
  return rows[0]?.pr_status ?? null;
};

/**
 * Partially updates a purchase request's header fields. Only the columns
 * present (not undefined) in fields are included in the UPDATE statement —
 * this backs the PATCH /purchase-request/:id endpoint. prNo and
 * date_requested are never part of fields; they are immutable after creation.
 */
export const updatePurchaseRequestFields = async (
  prId: number,
  fields: {
    prStatus?: string;
    requestedBy?: string;
    receivedBy?: string | null;
    dateReceived?: string | null;
    remarks?: string | null;
  },
): Promise<void> => {
  const columns: string[] = [];
  const values: (string | number | null)[] = [];

  if (fields.prStatus !== undefined) {
    columns.push("pr_status = ?");
    values.push(fields.prStatus);
  }
  if (fields.requestedBy !== undefined) {
    columns.push("requested_by = ?");
    values.push(fields.requestedBy);
  }
  if (fields.receivedBy !== undefined) {
    columns.push("received_by = ?");
    values.push(fields.receivedBy);
  }
  if (fields.dateReceived !== undefined) {
    columns.push("date_received = ?");
    values.push(fields.dateReceived);
  }
  if (fields.remarks !== undefined) {
    columns.push("remarks = ?");
    values.push(fields.remarks);
  }

  if (columns.length === 0) return;

  values.push(prId);

  await pool.execute(
    `UPDATE purchase_request SET ${columns.join(", ")} WHERE pr_id = ?`,
    values,
  );
};

export const createPurchaseRequestItem = async (
  prId: number,
  itemDescription: string,
  itemQuantity: number,
  unitPrice: number,
  isReceived: boolean = false,
): Promise<number> => {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO purchase_request_item (pr_id, item_description, item_quantity, unit_price, is_received)
     VALUES (?, ?, ?, ?, ?)`,
    [prId, itemDescription, itemQuantity, unitPrice, isReceived],
  );
  return result.insertId;
};

export const getPurchaseRequestItemById = async (
  itemId: number,
): Promise<RowDataPacket | null> => {
  const [items] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM purchase_request_item WHERE item_id = ?`,
    [itemId],
  );
  return items[0] ?? null;
};

/**
 * Counts how many line items currently belong to a PR. Used to enforce the
 * "a purchase request must always have at least one item" rule when
 * deleting an item.
 */
export const countPurchaseRequestItems = async (
  prId: number,
): Promise<number> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM purchase_request_item WHERE pr_id = ?`,
    [prId],
  );
  return rows[0]?.count ?? 0;
};

export const deletePurchaseRequestItemById = async (
  itemId: number,
): Promise<void> => {
  await pool.execute(`DELETE FROM purchase_request_item WHERE item_id = ?`, [
    itemId,
  ]);
};

/**
 * Marks a single line item as received. This is a one-way operation — once
 * is_received is true, the controller layer blocks any further edits to
 * that item (see purchasereq.controller.ts / editPurchaseRequestItemReceived).
 */
export const updatePurchaseRequestItemAsReceived = async (
  itemId: number,
): Promise<void> => {
  await pool.execute(
    `UPDATE purchase_request_item SET is_received = TRUE WHERE item_id = ?`,
    [itemId],
  );
};

/**
 * Forces every line item under a PR to is_received = true. Called whenever
 * a PR's status is set to "Received" via PATCH /purchase-request/:id, since
 * the PR-level status is the authoritative source of truth at that point.
 */
export const markAllPrItemsAsReceived = async (prId: number): Promise<void> => {
  await pool.execute(
    `UPDATE purchase_request_item SET is_received = TRUE WHERE pr_id = ?`,
    [prId],
  );
};

/**
 * Counts how many line items under a PR are still not received. Used right
 * after a single item is marked received to detect whether that item was
 * the last outstanding one, which triggers auto-completion of the parent PR
 * (see autoCompletePurchaseRequest below).
 */
export const countUnreceivedPurchaseRequestItems = async (
  prId: number,
): Promise<number> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM purchase_request_item WHERE pr_id = ? AND is_received = FALSE`,
    [prId],
  );
  return rows[0]?.count ?? 0;
};

/**
 * Automatically promotes a purchase request to pr_status = "Received" once
 * its last outstanding item has just been marked received individually via
 * PATCH /purchase-request/item/:id.
 *
 * date_received and received_by are only backfilled if they are currently
 * NULL (COALESCE) — if the caller had already set either of these earlier
 * via PATCH /purchase-request/:id (e.g. while the PR was still "In
 * Process"), those existing values are preserved rather than overwritten.
 */
export const autoCompletePurchaseRequest = async (
  prId: number,
  dateReceived: string,
  receivedBy: string,
): Promise<void> => {
  await pool.execute(
    `UPDATE purchase_request SET
      pr_status = 'Received',
      date_received = COALESCE(date_received, ?),
      received_by = COALESCE(received_by, ?)
    WHERE pr_id = ?`,
    [dateReceived, receivedBy, prId],
  );
};
