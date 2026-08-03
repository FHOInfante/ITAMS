import { findUserById } from "../models/user.model.js";

export const VALID_PR_STATUSES = [
  "Received",
  "In Process",
  "On Hold",
  "Cancelled",
] as const;

type PrStatus = (typeof VALID_PR_STATUSES)[number];

type PurchaseRequestItemInput = {
  itemDescription: string;
  itemQuantity: number;
  unitPrice: number;
  isReceived?: boolean;
};

type NewPurchaseRequestItemInput = {
  itemDescription: string;
  itemQuantity: number;
  unitPrice: number;
};

type PurchaseRequestPatchInput = {
  prStatus?: string;
  requestedBy?: string;
  receivedBy?: string | null;
  dateReceived?: string | null;
  remarks?: string | null;
};

/**
 * Validates the items array submitted on PR creation (POST /purchase-request).
 * Each item may optionally carry its own isReceived flag.
 * Returns a human-readable error message string if invalid, or null if valid.
 */
export const validateItems = (items: unknown): string | null => {
  if (!Array.isArray(items) || items.length === 0) {
    return "At least one item is required";
  }
  for (const item of items) {
    if (!item || typeof item !== "object") {
      return "Each item must have itemDescription, itemQuantity, and unitPrice";
    }
    if (
      !item.itemDescription ||
      item.itemQuantity === undefined ||
      item.unitPrice === undefined
    ) {
      return "Each item must have itemDescription, itemQuantity, and unitPrice";
    }
    if (typeof item.itemQuantity !== "number" || item.itemQuantity < 1) {
      return "itemQuantity must be a positive number";
    }
    if (typeof item.unitPrice !== "number" || item.unitPrice < 0) {
      return "unitPrice must be a non-negative number";
    }
    if (item.isReceived !== undefined && typeof item.isReceived !== "boolean") {
      return "isReceived must be a boolean value when provided";
    }
  }
  return null;
};

/**
 * Validates the items submitted through POST /purchase-request/:id (adding
 * item(s) to an existing PR). Unlike validateItems, isReceived is not part of
 * this shape at all — items added after the fact always start as not received,
 * since "already received on arrival" only makes sense at PR creation time.
 */
export const validateNewItems = (items: unknown): string | null => {
  if (!Array.isArray(items) || items.length === 0) {
    return "At least one item is required";
  }
  for (const item of items) {
    if (!item || typeof item !== "object") {
      return "Each item must have itemDescription, itemQuantity, and unitPrice";
    }
    if (
      !item.itemDescription ||
      item.itemQuantity === undefined ||
      item.unitPrice === undefined
    ) {
      return "Each item must have itemDescription, itemQuantity, and unitPrice";
    }
    if (typeof item.itemQuantity !== "number" || item.itemQuantity < 1) {
      return "itemQuantity must be a positive number";
    }
    if (typeof item.unitPrice !== "number" || item.unitPrice < 0) {
      return "unitPrice must be a non-negative number";
    }
  }
  return null;
};

/**
 * POST /purchase-request/:id accepts either a single item object or a JSON
 * array of item objects ("Can be a JSON array for multiple addition").
 * This normalizes both shapes into an array so the rest of the pipeline
 * (validateNewItems, the insert loop) only ever has to deal with one shape.
 */
export const normalizeItemsPayload = (body: unknown): unknown[] => {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") return [body];
  return [];
};

/**
 * Determines the final is_received value for a single line item being
 * created as part of PR creation (POST /purchase-request).
 *
 * Business rule: a newly created purchase request always starts out with
 * pr_status "In Process" (see purchasereq.model.ts / createPurchaseRequest),
 * so each item's own isReceived is honored as submitted (defaulting to false
 * if omitted). This allows a PR to be filed while some individual items
 * (e.g. already-stocked items) are pre-marked as received.
 *
 * The prStatus parameter is kept explicit (rather than hardcoding "In
 * Process" inline) so this function still mirrors the same
 * "Received overrides everything" rule applied elsewhere in the system
 * (e.g. editPurchaseRequestStatus forcing every item to received), should PR
 * creation ever need to support a non-default initial status.
 *
 * Items can always be marked received afterwards, individually, through the
 * dedicated PATCH /purchase-request/item/:id endpoint.
 */
export const resolveItemReceivedStatus = (
  prStatus: string,
  itemIsReceived?: boolean,
): boolean => {
  if (prStatus === "Received") return true;
  return itemIsReceived === true;
};

/**
 * A purchase request can no longer be modified — its status, its line items
 * (add/delete), or any individual item's received flag — once it has reached
 * one of the two terminal states, "Received" or "Cancelled".
 */
export const isPrEditable = (prStatus: string): boolean => {
  return prStatus !== "Received" && prStatus !== "Cancelled";
};

/**
 * Validates the body of PATCH /purchase-request/:id. This is a partial
 * update — the caller may send any subset of prStatus, requestedBy,
 * receivedBy, dateReceived, and remarks, but at least one of them must be
 * present. prNo and dateRequested are immutable after creation and are
 * intentionally not editable through this endpoint.
 */
export const validatePatchFields = (
  body: PurchaseRequestPatchInput,
): string | null => {
  const { prStatus, requestedBy, receivedBy, dateReceived, remarks } = body;

  if (
    prStatus === undefined &&
    requestedBy === undefined &&
    receivedBy === undefined &&
    dateReceived === undefined &&
    remarks === undefined
  ) {
    return "At least one of prStatus, requestedBy, receivedBy, dateReceived, or remarks must be provided";
  }

  if (
    prStatus !== undefined &&
    !VALID_PR_STATUSES.includes(prStatus as PrStatus)
  ) {
    return "Invalid PR status value";
  }

  if (
    requestedBy !== undefined &&
    (typeof requestedBy !== "string" || !requestedBy.trim())
  ) {
    return "requestedBy must be a non-empty string when provided";
  }

  if (
    receivedBy !== undefined &&
    receivedBy !== null &&
    (typeof receivedBy !== "string" || !receivedBy.trim())
  ) {
    return "receivedBy must be a non-empty string or null when provided";
  }

  if (
    dateReceived !== undefined &&
    dateReceived !== null &&
    typeof dateReceived !== "string"
  ) {
    return "dateReceived must be a date string or null when provided";
  }

  if (
    remarks !== undefined &&
    remarks !== null &&
    typeof remarks !== "string"
  ) {
    return "remarks must be a string or null when provided";
  }

  return null;
};

/**
 * Returns today's date formatted as YYYY-MM-DD (MariaDB DATE compatible).
 * Used to auto-stamp date_received when a purchase request is automatically
 * completed after its last outstanding item is marked received (see
 * editPurchaseRequestItemReceived in purchasereq.controller.ts).
 */
export const getTodayDateString = (): string => {
  return new Date().toISOString().slice(0, 10);
};

/**
 * Resolves the authenticated user's full name (user_name) for use as
 * received_by when a purchase request is auto-completed after its last
 * outstanding item is marked received (see autoCompletePurchaseRequest in
 * purchasereq.model.ts).
 *
 * Falls back to "Unknown User" in the edge case where the user record can
 * no longer be found (e.g. the account was deleted after the token was
 * issued) — this should not block the auto-completion itself from going
 * through.
 */
export const resolveReceivedByName = async (
  userId: number,
): Promise<string> => {
  const user = await findUserById(userId);
  return user?.user_name || "Unknown User";
};

export type {
  PrStatus,
  PurchaseRequestItemInput,
  NewPurchaseRequestItemInput,
  PurchaseRequestPatchInput,
};
