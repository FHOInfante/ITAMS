import { Request, Response } from "express";
import {
  createPrinter,
  updatePrinter,
  patchPrinterNetwork,
  getPrinters,
  getPrinterById,
} from "../models/printer.model.js";
import {
  createAuditLogWithSnapshot,
  createAuditLogWithSnapshotAfterOnly,
} from "../models/auditlog.model.js";

const VALID_STATUSES = ["Active", "Repair", "Spare", "Defective"];
const VALID_CONDITIONS = ["New", "Used"];
const VALID_CONNECTIVITY = ["USB", "LAN", "WIFI", "LAN & WIFI"];
const VALID_LOCATIONS = [
  "B2",
  "B1",
  "GF",
  "2F",
  "3F",
  "4F",
  "5F",
  "6F",
  "7F",
  "8F",
  "PO",
];

export const addPrinter = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const {
    printerName,
    department,
    assetTag,
    assetLocation,
    serialNo,
    brand,
    vendor,
    model,
    printerType,
    connectivity,
    ipAddress,
    macAddress,
    isColor,
    assetStatus,
    assetCondition,
    receivedDate,
    warrantyExpiry,
    dateDeployed,
    cost,
    remarks,
  } = req.body;

  if (
    !department ||
    !serialNo ||
    !brand ||
    !vendor ||
    !model ||
    !printerType ||
    !connectivity ||
    !assetStatus ||
    !receivedDate
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!Number.isInteger(department) || department < 1) {
    return res.status(400).json({ message: "Invalid department value" });
  }

  if (!VALID_STATUSES.includes(assetStatus)) {
    return res.status(400).json({ message: "Invalid asset status value" });
  }

  if (!VALID_CONNECTIVITY.includes(connectivity)) {
    return res.status(400).json({ message: "Invalid connectivity value" });
  }

  if (assetLocation !== undefined && assetLocation !== null) {
    if (!VALID_LOCATIONS.includes(assetLocation)) {
      return res.status(400).json({ message: "Invalid asset location value" });
    }
  }

  const resolvedCondition: string = assetCondition ?? "New";
  if (!VALID_CONDITIONS.includes(resolvedCondition)) {
    return res.status(400).json({ message: "Invalid asset condition value" });
  }

  const resolvedIsColor: boolean =
    typeof isColor === "boolean" ? isColor : false;

  if (cost !== undefined && cost !== null) {
    if (typeof cost !== "number" || cost < 0) {
      return res.status(400).json({ message: "Invalid cost value" });
    }
  }

  try {
    const printerId = await createPrinter(
      printerName ?? null,
      department,
      assetTag ?? null,
      assetLocation ?? null,
      serialNo,
      brand,
      vendor,
      model,
      printerType,
      connectivity,
      ipAddress ?? null,
      macAddress ?? null,
      resolvedIsColor,
      assetStatus,
      resolvedCondition,
      receivedDate,
      warrantyExpiry ?? null,
      dateDeployed ?? null,
      cost ?? null,
      remarks ?? null,
    );

    if (req.user) {
      const snapshotAfter = await getPrinterById(printerId);
      createAuditLogWithSnapshotAfterOnly(
        req.user.user_id,
        "Add Printer",
        `Added Printer. Model: ${model} Serial No: ${serialNo}.`,
        "printer",
        printerId,
        snapshotAfter ?? {},
      ).catch(() => {});
    }

    return res.status(201).json({ message: "Printer added successfully" });
  } catch (error) {
    console.error("Add Printer Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editPrinter = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const printerId = Number(req.params.id);
  const {
    printerName,
    department,
    assetTag,
    assetLocation,
    serialNo,
    brand,
    vendor,
    model,
    printerType,
    connectivity,
    ipAddress,
    macAddress,
    isColor,
    assetStatus,
    assetCondition,
    receivedDate,
    warrantyExpiry,
    dateDeployed,
    cost,
    remarks,
  } = req.body;

  if (!printerId) {
    return res.status(400).json({ message: "Missing printer ID" });
  }

  if (
    !department ||
    !serialNo ||
    !brand ||
    !vendor ||
    !model ||
    !printerType ||
    !connectivity ||
    !assetStatus ||
    !receivedDate
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!Number.isInteger(department) || department < 1) {
    return res.status(400).json({ message: "Invalid department value" });
  }

  if (!VALID_STATUSES.includes(assetStatus)) {
    return res.status(400).json({ message: "Invalid asset status value" });
  }

  if (!VALID_CONNECTIVITY.includes(connectivity)) {
    return res.status(400).json({ message: "Invalid connectivity value" });
  }

  if (assetLocation !== undefined && assetLocation !== null) {
    if (!VALID_LOCATIONS.includes(assetLocation)) {
      return res.status(400).json({ message: "Invalid asset location value" });
    }
  }

  const resolvedCondition: string = assetCondition ?? "New";
  if (!VALID_CONDITIONS.includes(resolvedCondition)) {
    return res.status(400).json({ message: "Invalid asset condition value" });
  }

  const resolvedIsColor: boolean =
    typeof isColor === "boolean" ? isColor : false;

  if (cost !== undefined && cost !== null) {
    if (typeof cost !== "number" || cost < 0) {
      return res.status(400).json({ message: "Invalid cost value" });
    }
  }

  try {
    const printer = await getPrinterById(printerId);

    if (!printer) {
      return res.status(404).json({ message: "Printer not found" });
    }

    const snapshotBefore = { ...printer };

    await updatePrinter(
      printerId,
      printerName ?? null,
      department,
      assetTag ?? null,
      assetLocation ?? null,
      serialNo,
      brand,
      vendor,
      model,
      printerType,
      connectivity,
      ipAddress ?? null,
      macAddress ?? null,
      resolvedIsColor,
      assetStatus,
      resolvedCondition,
      receivedDate,
      warrantyExpiry ?? null,
      dateDeployed ?? null,
      cost ?? null,
      remarks ?? null,
    );

    const snapshotAfter = (await getPrinterById(printerId)) ?? {};

    if (req.user) {
      createAuditLogWithSnapshot(
        req.user.user_id,
        "Update Printer",
        `Updated details of Printer. Model: ${model} Serial No: ${serialNo}.`,
        "printer",
        printerId,
        snapshotBefore,
        snapshotAfter,
      ).catch(() => {});
    }

    return res.status(200).json({ message: "Printer updated successfully" });
  } catch (error) {
    console.error("Update Printer Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updatePrinterNetwork = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const printerId = Number(req.params.id);
  const { connectivity, ipAddress } = req.body;

  if (!printerId) {
    return res.status(400).json({ message: "Missing printer ID" });
  }

  if (!connectivity) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!VALID_CONNECTIVITY.includes(connectivity)) {
    return res.status(400).json({ message: "Invalid connectivity value" });
  }

  // USB printers don't use IP addresses; clear it if provided to prevent inconsistent data
  const resolvedIpAddress = connectivity === "USB" ? null : (ipAddress ?? null);

  try {
    const printer = await getPrinterById(printerId);

    if (!printer) {
      return res.status(404).json({ message: "Printer not found" });
    }

    const snapshotBefore = { ...printer };

    await patchPrinterNetwork(printerId, connectivity, resolvedIpAddress);

    const snapshotAfter = (await getPrinterById(printerId)) ?? {};

    if (req.user) {
      createAuditLogWithSnapshot(
        req.user.user_id,
        "Update Printer Network",
        `Updated network details of Printer.`,
        "printer",
        printerId,
        snapshotBefore,
        snapshotAfter,
      ).catch(() => {});
    }

    return res
      .status(200)
      .json({ message: "Printer network info updated successfully" });
  } catch (error) {
    console.error("Patch Printer Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchPrinters = async (req: Request, res: Response) => {
  try {
    const printers = await getPrinters();
    return res.status(200).json(printers);
  } catch (error) {
    console.error("Fetch Printers Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchPrinter = async (req: Request, res: Response) => {
  const printerId = Number(req.params.id);

  if (!printerId) {
    return res.status(400).json({ message: "Missing printer ID" });
  }

  try {
    const printer = await getPrinterById(printerId);

    if (!printer) {
      return res.status(404).json({ message: "Printer not found" });
    }

    return res.status(200).json(printer);
  } catch (error) {
    console.error("Fetch Printer Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
