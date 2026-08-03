import { Request, Response } from "express";
import {
  createComputer,
  assignComputerUser,
  updateComputer,
  updateComputerNetwork,
  getComputers,
  getComputerById,
} from "../models/computer.model.js";
import {
  createAuditLogWithSnapshot,
  createAuditLogWithSnapshotAfterOnly,
} from "../models/auditlog.model.js";
import { resolveEndUserAssignment } from "../utils/enduser.util.js";
import { parseAndResolvePeripherals } from "../utils/peripheral.util.js";
import { parseAndResolvePrograms } from "../utils/program.util.js";

const formatComputer = (computer: any) => ({
  ...computer,
  peripherals: computer.peripherals ? computer.peripherals.split("||") : [],
  programs: computer.programs ? computer.programs.split("||") : [],
});

export const addComputer = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const {
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
    peripherals,
    programs,
    toReturnBy,

    euEmpId,
    assignedDate,
    euName,
    euDivision,
    euDepartment,
    euLocation,
    euEmail,
    euContactNo,
  } = req.body;

  if (
    !computerName ||
    !serialNo ||
    !model ||
    !brand ||
    !deviceType ||
    !operatingSystem ||
    !computerStatus ||
    !receivedDate ||
    !vendor ||
    !processor ||
    !ramSize ||
    !storageType ||
    !storageCapacity ||
    !ipAddress ||
    !networkConnectivity
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!["Active", "Repair", "Spare", "Defective"].includes(computerStatus)) {
    return res.status(400).json({ message: "Invalid computer status value" });
  }

  if (assetCondition && !["New", "Used"].includes(assetCondition)) {
    return res.status(400).json({ message: "Invalid asset condition value" });
  }

  // network_connectivity is NOT NULL with no DEFAULT in the schema, so it must always be a valid ENUM value
  if (!["WIFI", "LAN", "WIFI & LAN"].includes(networkConnectivity)) {
    return res
      .status(400)
      .json({ message: "Invalid network connectivity value" });
  }

  // cost has no NOT NULL constraint in the schema, so only validate type/range when it's actually provided
  if (cost !== undefined && cost !== null) {
    if (typeof cost !== "number" || cost < 0) {
      return res.status(400).json({ message: "Invalid cost value" });
    }
  }

  let peripheralIds: number[];
  try {
    peripheralIds = await parseAndResolvePeripherals(peripherals);
  } catch (err: any) {
    return res.status(err.statusCode ?? 400).json({ message: err.message });
  }

  let programIds: number[];
  try {
    programIds = await parseAndResolvePrograms(programs);
  } catch (err: any) {
    return res.status(err.statusCode ?? 400).json({ message: err.message });
  }

  let resolvedEuId: number | null = null;
  let resolvedAssignedDate: string | null = null;

  if (euEmpId !== undefined) {
    try {
      const assignment = await resolveEndUserAssignment(
        {
          euEmpId,
          assignedDate,
          euName,
          euDivision,
          euDepartment,
          euLocation,
          euEmail,
          euContactNo,
        },
        req.user?.user_id,
      );
      resolvedEuId = assignment.euId;
      resolvedAssignedDate = assignment.assignedDate;
    } catch (err: any) {
      return res.status(err.statusCode ?? 400).json({ message: err.message });
    }
  }

  try {
    const computerId = await createComputer(
      computerName,
      assetTag ?? null,
      serialNo,
      model,
      brand,
      deviceType,
      operatingSystem,
      computerStatus,
      assetCondition ?? null,
      receivedDate,
      warrantyExpiry ?? null,
      vendor,
      resolvedEuId,
      resolvedAssignedDate,
      toReturnBy ?? null,
      processor,
      ramSize,
      storageType,
      storageCapacity,
      ipAddress,
      macAddress ?? null,
      networkConnectivity,
      hasVpnAccess ?? false,
      anyDeskIp ?? null,
      remarks ?? null,
      cost ?? null,
      peripheralIds,
      programIds,
    );

    if (req.user) {
      const snapshotAfter = await getComputerById(computerId);
      createAuditLogWithSnapshotAfterOnly(
        req.user.user_id,
        "Add Computer",
        `Added Computer. Computer name: ${computerName} Serial No: ${serialNo}.`,
        "computer",
        computerId,
        snapshotAfter ?? {},
      ).catch(() => {});
    }

    return res.status(201).json({ message: "Computer added successfully" });
  } catch (error) {
    console.error("Add Computer Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const assignComputer = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const computerId = Number(req.params.id);

  if (!computerId) {
    return res.status(400).json({ message: "Missing computer ID" });
  }

  try {
    const computer = await getComputerById(computerId);

    if (!computer) {
      return res.status(404).json({ message: "Computer not found" });
    }

    const {
      euEmpId,
      assignedDate,
      euName,
      euDivision,
      euDepartment,
      euLocation,
      euEmail,
      euContactNo,
    } = req.body;

    let resolvedEuId: number | null;
    let resolvedAssignedDate: string | null;

    try {
      const assignment = await resolveEndUserAssignment(
        {
          euEmpId,
          assignedDate,
          euName,
          euDivision,
          euDepartment,
          euLocation,
          euEmail,
          euContactNo,
        },
        req.user?.user_id,
      );
      resolvedEuId = assignment.euId;
      resolvedAssignedDate = assignment.assignedDate;
    } catch (err: any) {
      return res.status(err.statusCode ?? 400).json({ message: err.message });
    }

    const snapshotBefore = { ...computer };

    await assignComputerUser(computerId, resolvedEuId, resolvedAssignedDate);

    const snapshotAfter = await getComputerById(computerId);

    if (req.user) {
      const interactionType =
        resolvedEuId === null ? "Unassign Computer" : "Assign Computer";
      const interactionDetail =
        resolvedEuId === null
          ? `Unassigned end user for ${computer.computer_name}.`
          : `Assigned an end user for ${computer.computer_name}. Employee ID: ${euEmpId}.`;

      createAuditLogWithSnapshot(
        req.user.user_id,
        interactionType,
        interactionDetail,
        "computer",
        computerId,
        snapshotBefore,
        snapshotAfter,
      ).catch(() => {});
    }

    return res.status(200).json({
      message:
        resolvedEuId === null
          ? "Computer unassigned successfully"
          : "Computer assigned successfully",
    });
  } catch (error) {
    console.error("Assign Computer Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editComputer = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const computerId = Number(req.params.id);

  if (!computerId) {
    return res.status(400).json({ message: "Missing computer ID" });
  }

  const {
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
    peripherals,
    programs,
    toReturnBy,

    euEmpId,
    assignedDate,
    euName,
    euDivision,
    euDepartment,
    euLocation,
    euEmail,
    euContactNo,
  } = req.body;

  if (
    !computerName ||
    !serialNo ||
    !model ||
    !brand ||
    !deviceType ||
    !operatingSystem ||
    !computerStatus ||
    !receivedDate ||
    !vendor ||
    !processor ||
    !ramSize ||
    !storageType ||
    !storageCapacity ||
    !ipAddress ||
    !networkConnectivity
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (!["Active", "Repair", "Spare", "Defective"].includes(computerStatus)) {
    return res.status(400).json({ message: "Invalid computer status value" });
  }

  if (assetCondition && !["New", "Used"].includes(assetCondition)) {
    return res.status(400).json({ message: "Invalid asset condition value" });
  }

  if (!["WIFI", "LAN", "WIFI & LAN"].includes(networkConnectivity)) {
    return res
      .status(400)
      .json({ message: "Invalid network connectivity value" });
  }

  if (cost !== undefined && cost !== null) {
    if (typeof cost !== "number" || cost < 0) {
      return res.status(400).json({ message: "Invalid cost value" });
    }
  }

  let peripheralIds: number[];
  try {
    peripheralIds = await parseAndResolvePeripherals(peripherals);
  } catch (err: any) {
    return res.status(err.statusCode ?? 400).json({ message: err.message });
  }

  let programIds: number[];
  try {
    programIds = await parseAndResolvePrograms(programs);
  } catch (err: any) {
    return res.status(err.statusCode ?? 400).json({ message: err.message });
  }

  let resolvedEuId: number | null | undefined = undefined;
  let resolvedAssignedDate: string | null | undefined = undefined;

  if (euEmpId !== undefined) {
    try {
      const assignment = await resolveEndUserAssignment(
        {
          euEmpId,
          assignedDate,
          euName,
          euDivision,
          euDepartment,
          euLocation,
          euEmail,
          euContactNo,
        },
        req.user?.user_id,
      );
      resolvedEuId = assignment.euId;
      resolvedAssignedDate = assignment.assignedDate;
    } catch (err: any) {
      return res.status(err.statusCode ?? 400).json({ message: err.message });
    }
  }

  try {
    const computer = await getComputerById(computerId);

    if (!computer) {
      return res.status(404).json({ message: "Computer not found" });
    }

    const snapshotBefore = { ...computer };

    const finalEuId =
      resolvedEuId !== undefined ? resolvedEuId : computer.assigned_user_id;
    const finalAssignedDate =
      resolvedAssignedDate !== undefined
        ? resolvedAssignedDate
        : computer.assigned_date;

    await updateComputer(
      computerId,
      computerName,
      assetTag ?? null,
      serialNo,
      model,
      brand,
      deviceType,
      operatingSystem,
      computerStatus,
      assetCondition ?? null,
      receivedDate,
      warrantyExpiry ?? null,
      vendor,
      finalEuId,
      finalAssignedDate,
      toReturnBy ?? null,
      processor,
      ramSize,
      storageType,
      storageCapacity,
      ipAddress,
      macAddress ?? null,
      networkConnectivity,
      hasVpnAccess ?? false,
      anyDeskIp ?? null,
      remarks ?? null,
      cost ?? null,
      peripheralIds,
      programIds,
    );

    const snapshotAfter = await getComputerById(computerId);

    if (req.user) {
      createAuditLogWithSnapshot(
        req.user.user_id,
        "Update Computer",
        `Updated details of ${computer.computer_name}.`,
        "computer",
        computerId,
        snapshotBefore,
        snapshotAfter,
      ).catch(() => {});
    }

    return res.status(200).json({ message: "Computer updated successfully" });
  } catch (error) {
    console.error("Update Computer Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const patchComputerNetwork = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const computerId = Number(req.params.id);

  if (!computerId) {
    return res.status(400).json({ message: "Missing computer ID" });
  }

  const { ipAddress, networkConnectivity, hasVpnAccess } = req.body;

  if (!ipAddress || !networkConnectivity) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (
    networkConnectivity &&
    !["WIFI", "LAN", "WIFI & LAN"].includes(networkConnectivity)
  ) {
    return res
      .status(400)
      .json({ message: "Invalid network connectivity value" });
  }

  try {
    const computer = await getComputerById(computerId);

    if (!computer) {
      return res.status(404).json({ message: "Computer not found" });
    }

    const snapshotBefore = { ...computer };

    await updateComputerNetwork(
      computerId,
      ipAddress,
      networkConnectivity,
      hasVpnAccess ?? false,
    );

    const snapshotAfter = await getComputerById(computerId);

    if (req.user) {
      createAuditLogWithSnapshot(
        req.user.user_id,
        "Update Computer Network",
        `Updated network details of ${computer.computer_name}.`,
        "computer",
        computerId,
        snapshotBefore,
        snapshotAfter,
      ).catch(() => {});
    }

    return res
      .status(200)
      .json({ message: "Computer network info updated successfully" });
  } catch (error) {
    console.error("Patch Computer Network Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchComputers = async (req: Request, res: Response) => {
  try {
    const computers = await getComputers();
    return res.status(200).json(computers.map(formatComputer));
  } catch (error) {
    console.error("Fetch Computers Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchComputer = async (req: Request, res: Response) => {
  const computerId = Number(req.params.id);

  if (!computerId) {
    return res.status(400).json({ message: "Missing computer ID" });
  }

  try {
    const computer = await getComputerById(computerId);

    if (!computer) {
      return res.status(404).json({ message: "Computer not found" });
    }

    return res.status(200).json(formatComputer(computer));
  } catch (error) {
    console.error("Fetch Computer Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
