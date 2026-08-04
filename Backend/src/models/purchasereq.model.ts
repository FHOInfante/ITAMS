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
 * add, item status transitions) without pulling the full PR + items payload
 * just to check pr_status.
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
  itemStatus: string = "In Process",
): Promise<number> => {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO purchase_request_item (pr_id, item_description, item_quantity, unit_price, item_status)
     VALUES (?, ?, ?, ?, ?)`,
    [prId, itemDescription, itemQuantity, unitPrice, itemStatus],
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
 * Updates a single line item's status. This is a one-way operation — once
 * item_status moves away from "In Process" (to either "Received" or
 * "Voided"), the controller layer blocks any further edits to that item
 * (see purchasereq.controller.ts / editPurchaseRequestItemStatus).
 */
export const updatePurchaseRequestItemStatus = async (
  itemId: number,
  itemStatus: string,
): Promise<void> => {
  await pool.execute(
    `UPDATE purchase_request_item SET item_status = ? WHERE item_id = ?`,
    [itemStatus, itemId],
  );
};

/**
 * Forces every line item under a PR to item_status = 'Received'. Called
 * whenever a PR's status is set to "Received" via
 * PATCH /purchase-request/:id, since the PR-level status is the
 * authoritative source of truth at that point.
 */
export const markAllPrItemsAsReceived = async (prId: number): Promise<void> => {
  await pool.execute(
    `UPDATE purchase_request_item SET item_status = 'Received' WHERE pr_id = ?`,
    [prId],
  );
};

/**
 * Forces every line item under a PR to item_status = 'Voided'. Called
 * whenever a PR's status is set to "Cancelled" via
 * PATCH /purchase-request/:id. The controller only allows this transition
 * to go through when none of the PR's items are currently "Received" (see
 * hasReceivedItems in purchasereq.util.ts), so this only ever moves items
 * that were "In Process" (or already "Voided") into "Voided".
 */
export const markAllPrItemsAsVoided = async (prId: number): Promise<void> => {
  await pool.execute(
    `UPDATE purchase_request_item SET item_status = 'Voided' WHERE pr_id = ?`,
    [prId],
  );
};

/**
 * Counts how many line items under a PR are still "In Process" (i.e. have
 * not yet been settled into either "Received" or "Voided"). Used right
 * after a single item is transitioned to detect whether that item was the
 * last outstanding one, which triggers auto-completion or auto-cancellation
 * of the parent PR (see autoCompletePurchaseRequest / autoCancelPurchaseRequest
 * below).
 */
export const countUnprocessedPurchaseRequestItems = async (
  prId: number,
): Promise<number> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM purchase_request_item WHERE pr_id = ? AND item_status = 'In Process'`,
    [prId],
  );
  return rows[0]?.count ?? 0;
};

/**
 * Counts how many line items under a PR currently have item_status =
 * 'Received'. Used once every item on a PR has been settled
 * (countUnprocessedPurchaseRequestItems returns 0) to decide whether the
 * parent PR should be auto-completed as "Received" (one or more items were
 * received) or auto-cancelled as "Cancelled" (every item ended up voided).
 */
export const countReceivedPurchaseRequestItems = async (
  prId: number,
): Promise<number> => {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS count FROM purchase_request_item WHERE pr_id = ? AND item_status = 'Received'`,
    [prId],
  );
  return rows[0]?.count ?? 0;
};

/**
 * Automatically promotes a purchase request to pr_status = "Received" once
 * its last outstanding item has just been settled (as either "Received" or
 * "Voided") via PATCH /purchase-request/item/:id, provided at least one of
 * its items ended up "Received".
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

/**
 * Automatically cancels a purchase request once its last outstanding item
 * has just been voided via PATCH /purchase-request/item/:id, and every one
 * of its items has ended up "Voided" (none were ever received). Unlike
 * autoCompletePurchaseRequest, date_received / received_by are intentionally
 * left untouched — a cancelled PR was never fulfilled.
 */
export const autoCancelPurchaseRequest = async (prId: number): Promise<void> => {
  await pool.execute(
    `UPDATE purchase_request SET pr_status = 'Cancelled' WHERE pr_id = ?`,
    [prId],
  );
};