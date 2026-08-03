import { Request, Response } from "express";
import {
  createVendor,
  updateVendor,
  getVendors,
  getVendorById,
  getVendorByName,
} from "../models/vendor.model.js";

export const addVendor = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const { vendorName } = req.body;

  if (!vendorName || typeof vendorName !== "string" || !vendorName.trim()) {
    return res.status(400).json({ message: "Missing or invalid vendorName" });
  }

  try {
    const vendor = await getVendorByName(vendorName.trim());
    if (vendor) {
      return res
        .status(409)
        .json({ message: "A vendor with this name already exists" });
    }

    const vendorId = await createVendor(vendorName.trim());

    return res.status(201).json({ message: "Vendor added successfully" });
  } catch (error) {
    console.error("Add Vendor Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editVendor = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const vendorId = Number(req.params.id);

  if (!vendorId) {
    return res.status(400).json({ message: "Missing vendor ID" });
  }

  const { vendorName } = req.body;

  if (!vendorName || typeof vendorName !== "string" || !vendorName.trim()) {
    return res.status(400).json({ message: "Missing or invalid vendorName" });
  }

  try {
    const vendor = await getVendorById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Check name conflict only if the name is actually changing (case-insensitive)
    if (vendorName.trim().toLowerCase() !== vendor.vendor_name.toLowerCase()) {
      const conflict = await getVendorByName(vendorName.trim());
      if (conflict) {
        return res
          .status(409)
          .json({ message: "A vendor with this name already exists" });
      }
    }

    await updateVendor(vendorId, vendorName.trim());

    return res.status(200).json({ message: "Vendor updated successfully" });
  } catch (error) {
    console.error("Update Vendor Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchVendors = async (req: Request, res: Response) => {
  try {
    const vendors = await getVendors();
    return res.status(200).json(vendors);
  } catch (error) {
    console.error("Fetch Vendors Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
