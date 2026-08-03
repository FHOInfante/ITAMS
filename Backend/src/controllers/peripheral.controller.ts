import { Request, Response } from "express";
import {
  createPeripheral,
  updatePeripheral,
  getPeripherals,
  getPeripheralById,
  getPeripheralByName,
} from "../models/peripheral.model.js";

export const addPeripheral = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const { peripheralName } = req.body;

  if (
    !peripheralName ||
    typeof peripheralName !== "string" ||
    !peripheralName.trim()
  ) {
    return res
      .status(400)
      .json({ message: "Missing or invalid peripheralName" });
  }

  try {
    const peripheral = await getPeripheralByName(peripheralName.trim());
    if (peripheral) {
      return res
        .status(409)
        .json({ message: "A peripheral with this name already exists" });
    }

    const peripheralId = await createPeripheral(peripheralName.trim());

    return res.status(201).json({ message: "Peripheral added successfully" });
  } catch (error) {
    console.error("Add Peripheral Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editPeripheral = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const peripheralId = Number(req.params.id);

  if (!peripheralId) {
    return res.status(400).json({ message: "Missing peripheral ID" });
  }

  const { peripheralName } = req.body;

  if (
    !peripheralName ||
    typeof peripheralName !== "string" ||
    !peripheralName.trim()
  ) {
    return res
      .status(400)
      .json({ message: "Missing or invalid peripheralName" });
  }

  try {
    const peripheral = await getPeripheralById(peripheralId);
    if (!peripheral) {
      return res.status(404).json({ message: "Peripheral not found" });
    }

    // Check name conflict only if the name is actually changing
    if (
      peripheralName.trim().toLowerCase() !==
      peripheral.peripheral_name.toLowerCase()
    ) {
      const conflict = await getPeripheralByName(peripheralName.trim());
      if (conflict) {
        return res
          .status(409)
          .json({ message: "A peripheral with this name already exists" });
      }
    }

    await updatePeripheral(peripheralId, peripheralName.trim());

    return res.status(200).json({ message: "Peripheral updated successfully" });
  } catch (error) {
    console.error("Update Peripheral Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchPeripherals = async (req: Request, res: Response) => {
  try {
    const peripherals = await getPeripherals();
    return res.status(200).json(peripherals);
  } catch (error) {
    console.error("Fetch Peripherals Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
