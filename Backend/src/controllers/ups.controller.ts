import { Request, Response } from "express";
import {
  createUps,
  updateUps,
  getUps,
  getUpsById,
} from "../models/ups.model.js";
import {
  createAuditLogWithSnapshot,
  createAuditLogWithSnapshotAfterOnly,
} from "../models/auditlog.model.js";

const VALID_STATUSES = ["Active", "Repair", "Spare", "Defective"];
const VALID_CONDITIONS = ["New", "Used"];

export const addUps = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const {
    computerAssignedTo,
    assetTag,
    serialNo,
    brand,
    vendor,
    model,
    capacityVa,
    batteryReplaceDate,
    assetStatus,
    assetCondition,
    receivedDate,
    warrantyExpiry,
    dateDeployed,
    cost,
    remarks,
  } = req.body;

  if (
    !serialNo ||
    !brand ||
    !vendor ||
    !model ||
    capacityVa === undefined ||
    !assetStatus ||
    !receivedDate
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!VALID_STATUSES.includes(assetStatus)) {
    return res.status(400).json({ message: "Invalid asset status value" });
  }

  const resolvedCondition: string = assetCondition ?? "New";
  if (!VALID_CONDITIONS.includes(resolvedCondition)) {
    return res.status(400).json({ message: "Invalid asset condition value" });
  }

  if (!Number.isInteger(capacityVa) || capacityVa < 1 || capacityVa > 65535) {
    return res.status(400).json({ message: "Invalid capacity VA value" });
  }

  if (computerAssignedTo !== undefined && computerAssignedTo !== null) {
    if (!Number.isInteger(computerAssignedTo) || computerAssignedTo < 1) {
      return res
        .status(400)
        .json({ message: "Invalid computer assigned to value" });
    }
  }

  if (cost !== undefined && cost !== null) {
    if (typeof cost !== "number" || cost < 0) {
      return res.status(400).json({ message: "Invalid cost value" });
    }
  }

  try {
    const upsId = await createUps(
      computerAssignedTo ?? null,
      assetTag ?? null,
      serialNo,
      brand,
      vendor,
      model,
      capacityVa,
      batteryReplaceDate ?? null,
      assetStatus,
      resolvedCondition,
      receivedDate,
      warrantyExpiry ?? null,
      dateDeployed ?? null,
      cost ?? null,
      remarks ?? null,
    );

    if (req.user) {
      const snapshotAfter = await getUpsById(upsId);
      createAuditLogWithSnapshotAfterOnly(
        req.user.user_id,
        "Add UPS",
        `Added UPS. Model: ${model} Serial No: ${serialNo}.`,
        "ups",
        upsId,
        snapshotAfter ?? {},
      ).catch(() => {});
    }

    return res.status(201).json({ message: "UPS added successfully" });
  } catch (error) {
    console.error("Add UPS Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editUps = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const upsId = Number(req.params.id);
  const {
    computerAssignedTo,
    assetTag,
    serialNo,
    brand,
    vendor,
    model,
    capacityVa,
    batteryReplaceDate,
    assetStatus,
    assetCondition,
    receivedDate,
    warrantyExpiry,
    dateDeployed,
    cost,
    remarks,
  } = req.body;

  if (!upsId) {
    return res.status(400).json({ message: "Missing UPS ID" });
  }

  if (
    !serialNo ||
    !brand ||
    !vendor ||
    !model ||
    capacityVa === undefined ||
    !assetStatus ||
    !receivedDate
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!VALID_STATUSES.includes(assetStatus)) {
    return res.status(400).json({ message: "Invalid asset status value" });
  }

  const resolvedCondition: string = assetCondition ?? "New";
  if (!VALID_CONDITIONS.includes(resolvedCondition)) {
    return res.status(400).json({ message: "Invalid asset condition value" });
  }

  if (!Number.isInteger(capacityVa) || capacityVa < 1 || capacityVa > 65535) {
    return res.status(400).json({ message: "Invalid capacity VA value" });
  }

  if (computerAssignedTo !== undefined && computerAssignedTo !== null) {
    if (!Number.isInteger(computerAssignedTo) || computerAssignedTo < 1) {
      return res
        .status(400)
        .json({ message: "Invalid computer assigned to value" });
    }
  }

  if (cost !== undefined && cost !== null) {
    if (typeof cost !== "number" || cost < 0) {
      return res.status(400).json({ message: "Invalid cost value" });
    }
  }

  try {
    const ups = await getUpsById(upsId);

    if (!ups) {
      return res.status(404).json({ message: "UPS not found" });
    }

    const snapshotBefore = { ...ups };

    await updateUps(
      upsId,
      computerAssignedTo ?? null,
      assetTag ?? null,
      serialNo,
      brand,
      vendor,
      model,
      capacityVa,
      batteryReplaceDate ?? null,
      assetStatus,
      resolvedCondition,
      receivedDate,
      warrantyExpiry ?? null,
      dateDeployed ?? null,
      cost ?? null,
      remarks ?? null,
    );

    const snapshotAfter = (await getUpsById(upsId)) ?? {};

    if (req.user) {
      createAuditLogWithSnapshot(
        req.user.user_id,
        "Update UPS",
        `Updated details of UPS. Model: ${model} Serial No: ${serialNo}.`,
        "ups",
        upsId,
        snapshotBefore,
        snapshotAfter,
      ).catch(() => {});
    }

    return res.status(200).json({ message: "UPS updated successfully" });
  } catch (error) {
    console.error("Update UPS Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchUps = async (req: Request, res: Response) => {
  try {
    const upsList = await getUps();
    return res.status(200).json(upsList);
  } catch (error) {
    console.error("Fetch UPS Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchUpsById = async (req: Request, res: Response) => {
  const upsId = Number(req.params.id);

  if (!upsId) {
    return res.status(400).json({ message: "Missing UPS ID" });
  }

  try {
    const ups = await getUpsById(upsId);

    if (!ups) {
      return res.status(404).json({ message: "UPS not found" });
    }

    return res.status(200).json(ups);
  } catch (error) {
    console.error("Fetch UPS Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
