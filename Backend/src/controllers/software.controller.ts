import { Request, Response } from "express";
import {
  createSoftware,
  assignSoftwareUser,
  updateSoftware,
  getSoftware,
  getSoftwareById,
} from "../models/software.model.js";
import {
  createAuditLogWithSnapshot,
  createAuditLogWithSnapshotAfterOnly,
} from "../models/auditlog.model.js";
import { resolveEndUserAssignment } from "../utils/enduser.util.js";
import {
  computeSoftwareStatus,
  computeRenewalDate,
  isNoExpiryLicenseType,
} from "../utils/software.util.js";

const isValidDate = (value: any): boolean => {
  if (typeof value !== "string" || !value.trim()) return false;
  const parsed = new Date(value);
  return !isNaN(parsed.getTime());
};

export const addSoftware = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const {
    softwareName,
    vendor,
    licenseType,
    purchaseDate,
    subscriptionId,
    expiryDate,
    cost,
    previousCost,
    softwareStatus,
    remarks,

    euEmpId,
    assignedDate,
    euName,
    euDivision,
    euDepartment,
    euLocation,
    euEmail,
    euContactNo,
  } = req.body;

  if (!softwareName || !vendor || !licenseType || !purchaseDate) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (cost !== undefined && cost !== null) {
    if (typeof cost !== "number" || cost < 0) {
      return res.status(400).json({ message: "Invalid cost value" });
    }
  }

  if (previousCost !== undefined && previousCost !== null) {
    if (typeof previousCost !== "number" || previousCost < 0) {
      return res.status(400).json({ message: "Invalid previousCost value" });
    }
  }

  if (subscriptionId !== undefined && subscriptionId !== null) {
    if (typeof subscriptionId !== "string" || !subscriptionId.trim()) {
      return res.status(400).json({ message: "Invalid subscriptionId value" });
    }
  }

  if (!isValidDate(purchaseDate)) {
    return res
      .status(400)
      .json({ message: "Invalid date format. Use YYYY-MM-DD" });
  }

  if (
    expiryDate !== undefined &&
    expiryDate !== null &&
    !isValidDate(expiryDate)
  ) {
    return res
      .status(400)
      .json({ message: "Invalid date format. Use YYYY-MM-DD" });
  }

  // 'Perpetual'/'Auto-Renewal'/'Auto-Renew' license types never expire — force
  // expiryDate to null regardless of what the client sent. Any other licenseType
  // respects an explicit null expiryDate too (e.g. a license with no known end date).
  const finalExpiryDate: string | null = isNoExpiryLicenseType(licenseType)
    ? null
    : (expiryDate ?? null);

  // renewalDate only makes sense when there's an expiryDate to count back from.
  const renewalDate: string | null = finalExpiryDate
    ? computeRenewalDate(finalExpiryDate)
    : null;

  let finalSoftwareStatus: string;

  if (softwareStatus !== undefined && softwareStatus !== null) {
    if (softwareStatus !== "Discontinued") {
      return res.status(400).json({
        message:
          "Invalid software status value. Only 'Discontinued' can be set manually; other statuses are determined automatically based on the expiry date.",
      });
    }
    finalSoftwareStatus = "Discontinued";
  } else if (finalExpiryDate === null) {
    finalSoftwareStatus = "Active";
  } else {
    finalSoftwareStatus = computeSoftwareStatus(finalExpiryDate);
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
    const softwareId = await createSoftware(
      softwareName,
      vendor,
      licenseType,
      purchaseDate,
      subscriptionId ?? null,
      renewalDate,
      finalExpiryDate,
      cost ?? null,
      previousCost ?? null,
      finalSoftwareStatus,
      remarks ?? null,
      resolvedEuId,
      resolvedAssignedDate,
    );

    if (req.user) {
      const snapshotAfter = await getSoftwareById(softwareId);
      createAuditLogWithSnapshotAfterOnly(
        req.user.user_id,
        "Add Software",
        `Added Software. Software name: ${softwareName}.`,
        "software",
        softwareId,
        snapshotAfter ?? {},
      ).catch(() => {});
    }

    return res.status(201).json({ message: "Software added successfully" });
  } catch (error) {
    console.error("Add Software Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const assignSoftware = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const softwareId = Number(req.params.id);

  if (!softwareId) {
    return res.status(400).json({ message: "Missing software ID" });
  }

  try {
    const software = await getSoftwareById(softwareId);

    if (!software) {
      return res.status(404).json({ message: "Software not found" });
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

    const snapshotBefore = { ...software };

    await assignSoftwareUser(softwareId, resolvedEuId, resolvedAssignedDate);

    const snapshotAfter = await getSoftwareById(softwareId);

    if (req.user) {
      const interactionType =
        resolvedEuId === null ? "Unassign Software" : "Assign Software";
      const interactionDetail =
        resolvedEuId === null
          ? `Unassigned end user for ${software.software_name}.`
          : `Assigned an end user for ${software.software_name}. Employee ID: ${euEmpId}.`;

      createAuditLogWithSnapshot(
        req.user.user_id,
        interactionType,
        interactionDetail,
        "software",
        softwareId,
        snapshotBefore,
        snapshotAfter,
      ).catch(() => {});
    }

    return res.status(200).json({
      message:
        resolvedEuId === null
          ? "Software unassigned successfully"
          : "Software assigned successfully",
    });
  } catch (error) {
    console.error("Assign Software Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editSoftware = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const softwareId = Number(req.params.id);

  if (!softwareId) {
    return res.status(400).json({ message: "Missing software ID" });
  }

  const {
    softwareName,
    vendor,
    licenseType,
    purchaseDate,
    subscriptionId,
    expiryDate,
    cost,
    previousCost,
    softwareStatus,
    remarks,

    euEmpId,
    assignedDate,
    euName,
    euDivision,
    euDepartment,
    euLocation,
    euEmail,
    euContactNo,
  } = req.body;

  if (!softwareName || !vendor || !licenseType || !purchaseDate) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (cost !== undefined && cost !== null) {
    if (typeof cost !== "number" || cost < 0) {
      return res.status(400).json({ message: "Invalid cost value" });
    }
  }

  if (previousCost !== undefined && previousCost !== null) {
    if (typeof previousCost !== "number" || previousCost < 0) {
      return res.status(400).json({ message: "Invalid previousCost value" });
    }
  }

  if (subscriptionId !== undefined && subscriptionId !== null) {
    if (typeof subscriptionId !== "string" || !subscriptionId.trim()) {
      return res.status(400).json({ message: "Invalid subscriptionId value" });
    }
  }

  if (!isValidDate(purchaseDate)) {
    return res
      .status(400)
      .json({ message: "Invalid date format. Use YYYY-MM-DD" });
  }

  if (
    expiryDate !== undefined &&
    expiryDate !== null &&
    !isValidDate(expiryDate)
  ) {
    return res
      .status(400)
      .json({ message: "Invalid date format. Use YYYY-MM-DD" });
  }

  // Same no-expiry rule as create: Perpetual/Auto-Renewal/Auto-Renew always
  // force null, any other licenseType respects an explicit null expiryDate.
  const finalExpiryDate: string | null = isNoExpiryLicenseType(licenseType)
    ? null
    : (expiryDate ?? null);

  const renewalDate: string | null = finalExpiryDate
    ? computeRenewalDate(finalExpiryDate)
    : null;

  let finalSoftwareStatus: string;

  if (softwareStatus !== undefined && softwareStatus !== null) {
    if (softwareStatus !== "Discontinued") {
      return res.status(400).json({
        message:
          "Invalid software status value. Only 'Discontinued' can be set manually; other statuses are determined automatically based on the expiry date.",
      });
    }
    finalSoftwareStatus = "Discontinued";
  } else if (finalExpiryDate === null) {
    finalSoftwareStatus = "Active";
  } else {
    finalSoftwareStatus = computeSoftwareStatus(finalExpiryDate);
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
    const software = await getSoftwareById(softwareId);

    if (!software) {
      return res.status(404).json({ message: "Software not found" });
    }

    const snapshotBefore = { ...software };

    const finalEuId =
      resolvedEuId !== undefined ? resolvedEuId : software.assigned_user_id;
    const finalAssignedDate =
      resolvedAssignedDate !== undefined
        ? resolvedAssignedDate
        : software.assigned_date;

    await updateSoftware(
      softwareId,
      softwareName,
      vendor,
      licenseType,
      purchaseDate,
      subscriptionId ?? null,
      renewalDate,
      finalExpiryDate,
      cost ?? null,
      previousCost ?? null,
      finalSoftwareStatus,
      remarks ?? null,
      finalEuId,
      finalAssignedDate,
    );

    const snapshotAfter = await getSoftwareById(softwareId);

    if (req.user) {
      createAuditLogWithSnapshot(
        req.user.user_id,
        "Update Software",
        `Updated details of ${software.software_name}.`,
        "software",
        softwareId,
        snapshotBefore,
        snapshotAfter,
      ).catch(() => {});
    }

    return res.status(200).json({ message: "Software updated successfully" });
  } catch (error) {
    console.error("Update Software Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchSoftware = async (req: Request, res: Response) => {
  try {
    const software = await getSoftware();
    return res.status(200).json(software);
  } catch (error) {
    console.error("Fetch Software Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchSoftwareById = async (req: Request, res: Response) => {
  const softwareId = Number(req.params.id);

  if (!softwareId) {
    return res.status(400).json({ message: "Missing software ID" });
  }

  try {
    const software = await getSoftwareById(softwareId);

    if (!software) {
      return res.status(404).json({ message: "Software not found" });
    }

    return res.status(200).json(software);
  } catch (error) {
    console.error("Fetch Software Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
