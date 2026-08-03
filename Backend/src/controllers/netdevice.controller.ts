import { Request, Response } from "express";
import {
  createNetworkDevice,
  updateNetworkDevice,
  getNetworkDevices,
  getNetworkDeviceById,
} from "../models/netdevice.model.js";
import {
  createAuditLogWithSnapshot,
  createAuditLogWithSnapshotAfterOnly,
} from "../models/auditlog.model.js";

const VALID_STATUSES = ["Active", "Repair", "Spare", "Defective"];
const VALID_CONDITIONS = ["New", "Used"];
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

export const addNetworkDevice = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const {
    deviceName,
    assetTag,
    assetLocation,
    serialNo,
    brand,
    vendor,
    model,
    deviceType,
    ipAddress,
    macAddress,
    portCount,
    firmwareVersion,
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
    !deviceType ||
    !assetStatus ||
    !receivedDate
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (assetLocation !== undefined && assetLocation !== null) {
    if (!VALID_LOCATIONS.includes(assetLocation)) {
      return res.status(400).json({ message: "Invalid asset location value" });
    }
  }

  if (!VALID_STATUSES.includes(assetStatus)) {
    return res.status(400).json({ message: "Invalid asset status value" });
  }

  const resolvedCondition: string = assetCondition ?? "New";
  if (!VALID_CONDITIONS.includes(resolvedCondition)) {
    return res.status(400).json({ message: "Invalid asset condition value" });
  }

  if (portCount !== undefined && portCount !== null) {
    if (!Number.isInteger(portCount) || portCount < 1) {
      return res.status(400).json({ message: "Invalid port count value" });
    }
  }

  if (cost !== undefined && cost !== null) {
    if (typeof cost !== "number" || cost < 0) {
      return res.status(400).json({ message: "Invalid cost value" });
    }
  }

  try {
    const networkDeviceId = await createNetworkDevice(
      deviceName ?? null,
      assetTag ?? null,
      assetLocation ?? null,
      serialNo,
      brand,
      vendor,
      model,
      deviceType,
      ipAddress ?? null,
      macAddress ?? null,
      portCount ?? null,
      firmwareVersion ?? null,
      assetStatus,
      resolvedCondition,
      receivedDate,
      warrantyExpiry ?? null,
      dateDeployed ?? null,
      cost ?? null,
      remarks ?? null,
    );

    if (req.user) {
      const snapshotAfter = await getNetworkDeviceById(networkDeviceId);
      createAuditLogWithSnapshotAfterOnly(
        req.user.user_id,
        "Add Network Device",
        `Added Network Device ID. Model ${model} Serial No: ${serialNo}.`,
        "network_device",
        networkDeviceId,
        snapshotAfter ?? {},
      ).catch(() => {});
    }

    return res
      .status(201)
      .json({ message: "Network device added successfully" });
  } catch (error) {
    console.error("Add Network Device Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editNetworkDevice = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const networkDeviceId = Number(req.params.id);
  const {
    deviceName,
    assetTag,
    assetLocation,
    serialNo,
    brand,
    vendor,
    model,
    deviceType,
    ipAddress,
    macAddress,
    portCount,
    firmwareVersion,
    assetStatus,
    assetCondition,
    receivedDate,
    warrantyExpiry,
    dateDeployed,
    cost,
    remarks,
  } = req.body;

  if (!networkDeviceId) {
    return res.status(400).json({ message: "Missing network device ID" });
  }

  if (
    !serialNo ||
    !brand ||
    !vendor ||
    !model ||
    !deviceType ||
    !assetStatus ||
    !receivedDate
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (assetLocation !== undefined && assetLocation !== null) {
    if (!VALID_LOCATIONS.includes(assetLocation)) {
      return res.status(400).json({ message: "Invalid asset location value" });
    }
  }

  if (!VALID_STATUSES.includes(assetStatus)) {
    return res.status(400).json({ message: "Invalid asset status value" });
  }

  const resolvedCondition: string = assetCondition ?? "New";
  if (!VALID_CONDITIONS.includes(resolvedCondition)) {
    return res.status(400).json({ message: "Invalid asset condition value" });
  }

  if (portCount !== undefined && portCount !== null) {
    if (!Number.isInteger(portCount) || portCount < 1) {
      return res.status(400).json({ message: "Invalid port count value" });
    }
  }

  if (cost !== undefined && cost !== null) {
    if (typeof cost !== "number" || cost < 0) {
      return res.status(400).json({ message: "Invalid cost value" });
    }
  }

  try {
    const netDevice = await getNetworkDeviceById(networkDeviceId);

    if (!netDevice) {
      return res.status(404).json({ message: "Network device not found" });
    }

    const snapshotBefore = { ...netDevice };

    await updateNetworkDevice(
      networkDeviceId,
      deviceName ?? null,
      assetTag ?? null,
      assetLocation ?? null,
      serialNo,
      brand,
      vendor,
      model,
      deviceType,
      ipAddress ?? null,
      macAddress ?? null,
      portCount ?? null,
      firmwareVersion ?? null,
      assetStatus,
      resolvedCondition,
      receivedDate,
      warrantyExpiry ?? null,
      dateDeployed ?? null,
      cost ?? null,
      remarks ?? null,
    );

    const snapshotAfter = (await getNetworkDeviceById(networkDeviceId)) ?? {};

    if (req.user) {
      createAuditLogWithSnapshot(
        req.user.user_id,
        "Update Network Device",
        `Updated details of Network Device.`,
        "network_device",
        networkDeviceId,
        snapshotBefore,
        snapshotAfter,
      ).catch(() => {});
    }

    return res
      .status(200)
      .json({ message: "Network device updated successfully" });
  } catch (error) {
    console.error("Update Network Device Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchNetworkDevices = async (req: Request, res: Response) => {
  try {
    const devices = await getNetworkDevices();
    return res.status(200).json(devices);
  } catch (error) {
    console.error("Fetch Network Devices Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchNetworkDevice = async (req: Request, res: Response) => {
  const networkDeviceId = Number(req.params.id);

  if (!networkDeviceId) {
    return res.status(400).json({ message: "Missing network device ID" });
  }

  try {
    const device = await getNetworkDeviceById(networkDeviceId);

    if (!device) {
      return res.status(404).json({ message: "Network device not found" });
    }

    return res.status(200).json(device);
  } catch (error) {
    console.error("Fetch Network Device Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
