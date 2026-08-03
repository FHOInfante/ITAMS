import { Request, Response } from "express";
import {
  createPurchaseRequest,
  getPurchaseRequests,
  getPurchaseRequestById,
  updatePurchaseRequestFields,
  createPurchaseRequestItem,
  getPurchaseRequestItemById,
  countPurchaseRequestItems,
  countUnreceivedPurchaseRequestItems,
  deletePurchaseRequestItemById,
  updatePurchaseRequestItemAsReceived,
  markAllPrItemsAsReceived,
  autoCompletePurchaseRequest,
} from "../models/purchasereq.model.js";
import {
  validateItems,
  validateNewItems,
  normalizeItemsPayload,
  resolveItemReceivedStatus,
  isPrEditable,
  validatePatchFields,
  getTodayDateString,
  resolveReceivedByName,
} from "../utils/purchasereq.util.js";
import {
  createAuditLogWithSnapshot,
  createAuditLogWithSnapshotAfterOnly,
} from "../models/auditlog.model.js";

export const addPurchaseRecord = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const { prNo, dateRequested, requestedBy, remarks, items } = req.body;

  // prStatus is not accepted here — every new purchase request is created
  // as "In Process" (see purchasereq.model.ts / createPurchaseRequest).
  if (!prNo || !dateRequested || !requestedBy) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const itemError = validateItems(items);
  if (itemError) {
    return res.status(400).json({ message: itemError });
  }

  try {
    const prId = await createPurchaseRequest(
      prNo,
      dateRequested,
      requestedBy,
      remarks ?? null,
    );

    // Header creation is logged as its own "Add Purchase Request" entry,
    // separate from the per-item entries below — pr_status is hardcoded to
    // "In Process" here since it mirrors createPurchaseRequest and is never
    // accepted from the request body on creation.
    if (req.user) {
      createAuditLogWithSnapshotAfterOnly(
        req.user.user_id,
        "Add Purchase Request",
        `Added Purchase Request. PR No: ${prNo}.`,
        "purchase_request",
        prId,
        {
          pr_no: prNo,
          pr_status: "In Process",
          date_requested: dateRequested,
          requested_by: requestedBy,
          received_by: null,
          date_received: null,
          remarks: remarks ?? null,
        },
      ).catch(() => {});
    }

    // A newly created PR is always "In Process", so each item's own
    // isReceived value is honored as submitted (see purchasereq.util.ts).
    // Each item also gets its own "Add Purchase Request Item" creation-style
    // entry, logged against the parent PR's target_id (see decision to roll
    // item-level events into target_table = "purchase_request").
    for (const item of items) {
      const isReceived = resolveItemReceivedStatus(
        "In Process",
        item.isReceived,
      );

      await createPurchaseRequestItem(
        prId,
        item.itemDescription,
        item.itemQuantity,
        item.unitPrice,
        isReceived,
      );

      if (req.user) {
        createAuditLogWithSnapshotAfterOnly(
          req.user.user_id,
          "Add Purchase Request Item",
          `Added item to PR No: ${prNo}. Item: ${item.itemDescription}.`,
          "purchase_request",
          prId,
          {
            pr_no: prNo,
            item_description: item.itemDescription,
            item_quantity: item.itemQuantity,
            unit_price: item.unitPrice,
            is_received: isReceived,
          },
        ).catch(() => {});
      }
    }

    return res
      .status(201)
      .json({ message: "Purchase request added successfully" });
  } catch (error) {
    console.error("Add Purchase Request Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchPurchaseRecords = async (req: Request, res: Response) => {
  try {
    const records = await getPurchaseRequests();
    return res.status(200).json(records);
  } catch (error) {
    console.error("Fetch Purchase Requests Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchPurchaseRecord = async (req: Request, res: Response) => {
  const prId = Number(req.params.id);

  if (!prId) {
    return res.status(400).json({ message: "Missing purchase request ID" });
  }

  try {
    const record = await getPurchaseRequestById(prId);

    if (!record) {
      return res.status(404).json({ message: "Purchase request not found" });
    }

    return res.status(200).json(record);
  } catch (error) {
    console.error("Fetch Purchase Request Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const addPurchaseRequestItems = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const prId = Number(req.params.id);

  if (!prId) {
    return res.status(400).json({ message: "Missing purchase request ID" });
  }

  // Accepts either a single item object or a JSON array of item objects.
  const items = normalizeItemsPayload(req.body);

  const itemError = validateNewItems(items);
  if (itemError) {
    return res.status(400).json({ message: itemError });
  }

  try {
    // Fetched via getPurchaseRequestById (rather than the lighter
    // getPurchaseRequestStatusById) so pr_no is available for each item's
    // "Add Purchase Request Item" audit entry below.
    const record = await getPurchaseRequestById(prId);

    if (!record) {
      return res.status(404).json({ message: "Purchase request not found" });
    }

    if (!isPrEditable(record.pr_status)) {
      return res.status(409).json({
        message: `Cannot add items to a purchase request with status "${record.pr_status}"`,
      });
    }

    // Items added after PR creation always start as not received.
    for (const item of items as {
      itemDescription: string;
      itemQuantity: number;
      unitPrice: number;
    }[]) {
      await createPurchaseRequestItem(
        prId,
        item.itemDescription,
        item.itemQuantity,
        item.unitPrice,
        false,
      );

      if (req.user) {
        createAuditLogWithSnapshotAfterOnly(
          req.user.user_id,
          "Add Purchase Request Item",
          `Added item to PR No: ${record.pr_no}. Item: ${item.itemDescription}.`,
          "purchase_request",
          prId,
          {
            pr_no: record.pr_no,
            item_description: item.itemDescription,
            item_quantity: item.itemQuantity,
            unit_price: item.unitPrice,
            is_received: false,
          },
        ).catch(() => {});
      }
    }

    return res
      .status(201)
      .json({ message: "Purchase request item(s) added successfully" });
  } catch (error) {
    console.error("Add Purchase Request Item Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

/**
 * Extracts just the auditable header fields from a full purchase request
 * record (which also carries a nested items array that is not part of the
 * purchase_request table itself, and is therefore excluded from the
 * before/after snapshot passed to diffSnapshots).
 */
const extractPrHeaderSnapshot = (record: any) => ({
  pr_no: record.pr_no,
  pr_status: record.pr_status,
  requested_by: record.requested_by,
  received_by: record.received_by,
  date_received: record.date_received,
  remarks: record.remarks,
});

export const editPurchaseRequestStatus = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const prId = Number(req.params.id);
  const { prStatus, requestedBy, receivedBy, dateReceived, remarks } = req.body;

  if (!prId) {
    return res.status(400).json({ message: "Missing purchase request ID" });
  }

  const patchError = validatePatchFields({
    prStatus,
    requestedBy,
    receivedBy,
    dateReceived,
    remarks,
  });
  if (patchError) {
    return res.status(400).json({ message: patchError });
  }

  try {
    // Fetched via getPurchaseRequestById (rather than the lighter
    // getPurchaseRequestStatusById) so the full header snapshot is
    // available for the "Update Purchase Request" audit entry below.
    const record = await getPurchaseRequestById(prId);

    if (!record) {
      return res.status(404).json({ message: "Purchase request not found" });
    }

    if (!isPrEditable(record.pr_status)) {
      return res.status(409).json({
        message: `Cannot edit a purchase request with status "${record.pr_status}"`,
      });
    }

    const snapshotBefore = extractPrHeaderSnapshot(record);

    await updatePurchaseRequestFields(prId, {
      prStatus,
      requestedBy,
      receivedBy,
      dateReceived,
      remarks,
    });

    // Marking a PR as "Received" forces every one of its items to be
    // considered received as well, regardless of each item's prior state —
    // mirrors the same rule applied to items at PR creation time (see
    // resolveItemReceivedStatus in purchasereq.util.ts). Note: this mass
    // side-effect on individual items is intentionally not logged
    // separately — the PR's own pr_status field flipping to "Received" in
    // this same entry already communicates that every item is now settled.
    if (prStatus === "Received") {
      await markAllPrItemsAsReceived(prId);
    }

    if (req.user) {
      const updatedRecord = await getPurchaseRequestById(prId);
      const snapshotAfter = extractPrHeaderSnapshot(updatedRecord);

      createAuditLogWithSnapshot(
        req.user.user_id,
        "Update Purchase Request",
        `Updated Purchase Request. PR No: ${record.pr_no}.`,
        "purchase_request",
        prId,
        snapshotBefore,
        snapshotAfter,
      ).catch(() => {});
    }

    return res
      .status(200)
      .json({ message: "Purchase request updated successfully" });
  } catch (error) {
    console.error("Update Purchase Request Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editPurchaseRequestItemReceived = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const itemId = Number(req.params.id);

  if (!itemId) {
    return res
      .status(400)
      .json({ message: "Missing purchase request item ID" });
  }

  try {
    const existingItem = await getPurchaseRequestItemById(itemId);

    if (!existingItem) {
      return res
        .status(404)
        .json({ message: "Purchase request item not found" });
    }

    if (existingItem.is_received) {
      return res.status(409).json({
        message:
          "This item is already marked as received and can no longer be edited",
      });
    }

    // Fetched via getPurchaseRequestById (rather than the lighter
    // getPurchaseRequestStatusById) so pr_no is available for the item's
    // audit entry, and the full header snapshot is available up front in
    // case this update triggers an auto-complete transition below.
    const record = await getPurchaseRequestById(existingItem.pr_id);

    if (!record || !isPrEditable(record.pr_status)) {
      return res.status(409).json({
        message: `Cannot update items on a purchase request with status "${record?.pr_status}"`,
      });
    }

    await updatePurchaseRequestItemAsReceived(itemId);

    if (req.user) {
      const itemSnapshotBase = {
        pr_no: record.pr_no,
        item_description: existingItem.item_description,
        item_quantity: existingItem.item_quantity,
        unit_price: existingItem.unit_price,
      };

      createAuditLogWithSnapshot(
        req.user.user_id,
        "Update Purchase Request Item",
        `Marked item as received under PR No: ${record.pr_no}. Item: ${existingItem.item_description}.`,
        "purchase_request",
        existingItem.pr_id,
        { ...itemSnapshotBase, is_received: false },
        { ...itemSnapshotBase, is_received: true },
      ).catch(() => {});
    }

    // If that was the last outstanding item on this PR, the whole purchase
    // request is automatically completed: pr_status becomes "Received", and
    // date_received / received_by are backfilled if not already set (see
    // autoCompletePurchaseRequest in purchasereq.model.ts for the
    // "don't overwrite existing values" behavior).
    const remainingUnreceived = await countUnreceivedPurchaseRequestItems(
      existingItem.pr_id,
    );
    const prAutoCompleted = remainingUnreceived === 0;

    if (prAutoCompleted) {
      // received_by is resolved from the authenticated user's user_name via
      // resolveReceivedByName (falls back to "Unknown User" if the account
      // record can no longer be found — see purchasereq.util.ts).
      const receivedByName = req.user
        ? await resolveReceivedByName(req.user.user_id)
        : "Unknown User";
      const dateReceivedToday = getTodayDateString();

      await autoCompletePurchaseRequest(
        existingItem.pr_id,
        dateReceivedToday,
        receivedByName,
      );

      // This is logged as its own "Update Purchase Request" header-level
      // entry, distinct from the item-level entry above, since it's a real
      // system-driven change to the PR's own pr_status / date_received /
      // received_by columns.
      if (req.user) {
        const updatedRecord = await getPurchaseRequestById(existingItem.pr_id);

        createAuditLogWithSnapshot(
          req.user.user_id,
          "Update Purchase Request",
          `All items received — Purchase Request auto-completed. PR No: ${record.pr_no}.`,
          "purchase_request",
          existingItem.pr_id,
          extractPrHeaderSnapshot(record),
          extractPrHeaderSnapshot(updatedRecord),
        ).catch(() => {});
      }
    }

    return res.status(200).json({
      message: prAutoCompleted
        ? "Purchase request item marked as received. All items are now received — purchase request automatically marked as Received."
        : "Purchase request item marked as received",
      prAutoCompleted,
    });
  } catch (error) {
    console.error("Update Purchase Request Item Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletePurchaseRequestItem = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const itemId = Number(req.params.id);

  if (!itemId) {
    return res
      .status(400)
      .json({ message: "Missing purchase request item ID" });
  }

  try {
    const existingItem = await getPurchaseRequestItemById(itemId);

    if (!existingItem) {
      return res
        .status(404)
        .json({ message: "Purchase request item not found" });
    }

    if (existingItem.is_received) {
      return res
        .status(409)
        .json({ message: "Received items cannot be deleted" });
    }

    // Fetched via getPurchaseRequestById (rather than the lighter
    // getPurchaseRequestStatusById) so pr_no is available for the item's
    // "Delete Purchase Request Item" audit entry below.
    const record = await getPurchaseRequestById(existingItem.pr_id);

    if (!record || !isPrEditable(record.pr_status)) {
      return res.status(409).json({
        message: `Cannot delete items from a purchase request with status "${record?.pr_status}"`,
      });
    }

    const itemCount = await countPurchaseRequestItems(existingItem.pr_id);

    if (itemCount <= 1) {
      return res.status(409).json({
        message: "Cannot delete the only remaining item on a purchase request",
      });
    }

    await deletePurchaseRequestItemById(itemId);

    // snapshot_after is {} to signal a deletion — diffSnapshots then
    // reports every field the item held immediately before removal, each
    // with new_value: null (see audit.util.ts).
    if (req.user) {
      createAuditLogWithSnapshot(
        req.user.user_id,
        "Delete Purchase Request Item",
        `Deleted item from PR No: ${record.pr_no}. Item: ${existingItem.item_description}.`,
        "purchase_request",
        existingItem.pr_id,
        {
          pr_no: record.pr_no,
          item_description: existingItem.item_description,
          item_quantity: existingItem.item_quantity,
          unit_price: existingItem.unit_price,
          is_received: existingItem.is_received,
        },
        {},
      ).catch(() => {});
    }

    return res
      .status(200)
      .json({ message: "Purchase request item deleted successfully" });
  } catch (error) {
    console.error("Delete Purchase Request Item Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
