import { Request, Response } from "express";
import {
  createPurchaseRequest,
  getPurchaseRequests,
  getPurchaseRequestById,
  updatePurchaseRequestFields,
  createPurchaseRequestItem,
  getPurchaseRequestItemById,
  countUnprocessedPurchaseRequestItems,
  countReceivedPurchaseRequestItems,
  updatePurchaseRequestItemStatus,
  markAllPrItemsAsReceived,
  markAllPrItemsAsVoided,
  autoCompletePurchaseRequest,
  autoCancelPurchaseRequest,
} from "../models/purchasereq.model.js";
import {
  validateItems,
  validateNewItems,
  normalizeItemsPayload,
  resolveItemStatus,
  isPrEditable,
  hasReceivedItems,
  validatePatchFields,
  validateItemStatusPatch,
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
    // itemStatus value is honored as submitted (see purchasereq.util.ts).
    // Each item also gets its own "Add Purchase Request Item" creation-style
    // entry, logged against the parent PR's target_id (see decision to roll
    // item-level events into target_table = "purchase_request").
    for (const item of items) {
      const itemStatus = resolveItemStatus("In Process", item.itemStatus);

      await createPurchaseRequestItem(
        prId,
        item.itemDescription,
        item.itemQuantity,
        item.unitPrice,
        itemStatus,
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
            item_status: itemStatus,
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

    // Items added after PR creation always start as "In Process" — this
    // endpoint's request shape has no itemStatus field at all (see
    // NewPurchaseRequestItemInput in purchasereq.util.ts).
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
        "In Process",
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
            item_status: "In Process",
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
    // available for the "Update Purchase Request" audit entry below, and so
    // its nested items array is available to guard the Cancelled transition
    // below.
    const record = await getPurchaseRequestById(prId);

    if (!record) {
      return res.status(404).json({ message: "Purchase request not found" });
    }

    if (!isPrEditable(record.pr_status)) {
      return res.status(409).json({
        message: `Cannot edit a purchase request with status "${record.pr_status}"`,
      });
    }

    // A purchase request can only be cancelled while none of its items have
    // already been received — once an item is received it is considered
    // fulfilled and permanent, so cancelling the whole PR out from under it
    // is rejected rather than silently discarding that fulfilled item.
    if (prStatus === "Cancelled" && hasReceivedItems(record.items)) {
      return res.status(409).json({
        message:
          "Cannot cancel a purchase request that has one or more received items",
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
    // resolveItemStatus in purchasereq.util.ts).
    //
    // Marking a PR as "Cancelled" forces every one of its items to
    // "Voided". This is only reachable once the guard above has confirmed
    // no item is currently "Received", so this only ever moves items that
    // were "In Process" (or already "Voided") into "Voided".
    //
    // Note: this mass side-effect on individual items is intentionally not
    // logged separately in either case — the PR's own pr_status field
    // flipping in this same entry already communicates that every item is
    // now settled.
    if (prStatus === "Received") {
      await markAllPrItemsAsReceived(prId);
    } else if (prStatus === "Cancelled") {
      await markAllPrItemsAsVoided(prId);
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

export const editPurchaseRequestItemStatus = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const itemId = Number(req.params.id);
  const { itemStatus } = req.body;

  if (!itemId) {
    return res
      .status(400)
      .json({ message: "Missing purchase request item ID" });
  }

  const statusError = validateItemStatusPatch(itemStatus);
  if (statusError) {
    return res.status(400).json({ message: statusError });
  }

  try {
    const existingItem = await getPurchaseRequestItemById(itemId);

    if (!existingItem) {
      return res
        .status(404)
        .json({ message: "Purchase request item not found" });
    }

    if (existingItem.item_status !== "In Process") {
      return res.status(409).json({
        message: `This item is already marked as "${existingItem.item_status}" and can no longer be edited`,
      });
    }

    // Fetched via getPurchaseRequestById (rather than the lighter
    // getPurchaseRequestStatusById) so pr_no is available for the item's
    // audit entry, and the full header snapshot is available up front in
    // case this update triggers an auto-complete / auto-cancel transition
    // below.
    const record = await getPurchaseRequestById(existingItem.pr_id);

    if (!record || !isPrEditable(record.pr_status)) {
      return res.status(409).json({
        message: `Cannot update items on a purchase request with status "${record?.pr_status}"`,
      });
    }

    await updatePurchaseRequestItemStatus(itemId, itemStatus);

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
        `Marked item as ${itemStatus} under PR No: ${record.pr_no}. Item: ${existingItem.item_description}.`,
        "purchase_request",
        existingItem.pr_id,
        { ...itemSnapshotBase, item_status: "In Process" },
        { ...itemSnapshotBase, item_status: itemStatus },
      ).catch(() => {});
    }

    // If that was the last outstanding ("In Process") item on this PR, the
    // whole purchase request is automatically settled:
    //   - if at least one item on the PR ended up "Received", pr_status
    //     becomes "Received" (date_received / received_by are backfilled if
    //     not already set — see autoCompletePurchaseRequest).
    //   - if every item on the PR ended up "Voided" (none were ever
    //     received), pr_status becomes "Cancelled" instead (see
    //     autoCancelPurchaseRequest).
    const remainingUnprocessed = await countUnprocessedPurchaseRequestItems(
      existingItem.pr_id,
    );

    let prAutoCompleted = false;
    let prAutoStatus: "Received" | "Cancelled" | null = null;

    if (remainingUnprocessed === 0) {
      const receivedCount = await countReceivedPurchaseRequestItems(
        existingItem.pr_id,
      );

      if (receivedCount > 0) {
        // received_by is resolved from the authenticated user's user_name
        // via resolveReceivedByName (falls back to "Unknown User" if the
        // account record can no longer be found — see purchasereq.util.ts).
        const receivedByName = req.user
          ? await resolveReceivedByName(req.user.user_id)
          : "Unknown User";
        const dateReceivedToday = getTodayDateString();

        await autoCompletePurchaseRequest(
          existingItem.pr_id,
          dateReceivedToday,
          receivedByName,
        );
        prAutoCompleted = true;
        prAutoStatus = "Received";
      } else {
        await autoCancelPurchaseRequest(existingItem.pr_id);
        prAutoCompleted = true;
        prAutoStatus = "Cancelled";
      }

      // This is logged as its own "Update Purchase Request" header-level
      // entry, distinct from the item-level entry above, since it's a real
      // system-driven change to the PR's own pr_status (and, when
      // auto-completed as Received, date_received / received_by) columns.
      if (req.user) {
        const updatedRecord = await getPurchaseRequestById(existingItem.pr_id);

        createAuditLogWithSnapshot(
          req.user.user_id,
          "Update Purchase Request",
          prAutoStatus === "Received"
            ? `All items settled — Purchase Request auto-completed. PR No: ${record.pr_no}.`
            : `All items voided — Purchase Request auto-cancelled. PR No: ${record.pr_no}.`,
          "purchase_request",
          existingItem.pr_id,
          extractPrHeaderSnapshot(record),
          extractPrHeaderSnapshot(updatedRecord),
        ).catch(() => {});
      }
    }

    const message = !prAutoCompleted
      ? `Purchase request item marked as ${itemStatus}`
      : prAutoStatus === "Received"
        ? `Purchase request item marked as ${itemStatus}. All items are now settled — purchase request automatically marked as Received.`
        : `Purchase request item marked as ${itemStatus}. All items have been voided — purchase request automatically marked as Cancelled.`;

    return res.status(200).json({
      message,
      prAutoCompleted,
      prAutoStatus,
    });
  } catch (error) {
    console.error("Update Purchase Request Item Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};