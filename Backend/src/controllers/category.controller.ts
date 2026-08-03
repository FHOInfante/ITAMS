import { Request, Response } from "express";
import {
  getCategoryByGroup,
  getCategoryByGroupAndValue,
  getCategoryById,
  getAllCategories,
  getCategoriesByGroups,
  createCategory,
  updateCategoryStatus,
} from "../models/category.model.js";
import {
  isAllowedAsset,
  getGroupsByAsset,
  isDuplicateCategoryValue,
  ALL_CATEGORY_GROUPS,
} from "../utils/category.util.js";

export const fetchCategoryOptions = async (req: Request, res: Response) => {
  const asset = req.query.asset;

  // No asset provided — return all category rows across every group
  if (!asset) {
    try {
      const categories = await getAllCategories();
      return res.status(200).json(categories);
    } catch (error) {
      console.error("Fetch All Categories Error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }

  if (typeof asset !== "string" || !asset.trim()) {
    return res
      .status(400)
      .json({ message: "Missing or invalid asset query parameter" });
  }

  if (!isAllowedAsset(asset.trim())) {
    return res.status(400).json({
      message:
        "Invalid asset. Allowed values: computer, printer, network_device, ups, software",
    });
  }

  try {
    const groups = getGroupsByAsset(asset.trim());
    const categories = await getCategoriesByGroups(groups);
    return res.status(200).json(categories);
  } catch (error) {
    console.error("Fetch Category Options Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const addCategory = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const { categoryGroup, categoryValue } = req.body;

  if (
    !categoryGroup ||
    typeof categoryGroup !== "string" ||
    !categoryGroup.trim()
  ) {
    return res
      .status(400)
      .json({ message: "Missing or invalid categoryGroup" });
  }

  if (
    !categoryValue ||
    typeof categoryValue !== "string" ||
    !categoryValue.trim()
  ) {
    return res
      .status(400)
      .json({ message: "Missing or invalid categoryValue" });
  }

  if (!ALL_CATEGORY_GROUPS.includes(categoryGroup.trim())) {
    return res.status(400).json({ message: "Invalid category group" });
  }

  try {
    const category = await getCategoryByGroupAndValue(
      categoryGroup.trim(),
      categoryValue.trim(),
    );

    if (category) {
      return res.status(409).json({
        message: "This value already exists for the given category group",
      });
    }

    const allInGroup = await getCategoryByGroup(categoryGroup.trim());
    const existingValues = allInGroup.map((c) => c.category_value);

    if (isDuplicateCategoryValue(existingValues, categoryValue.trim())) {
      return res.status(409).json({
        message: "A similar value already exists (case-insensitive match)",
      });
    }

    const categoryId = await createCategory(
      categoryGroup.trim(),
      categoryValue.trim(),
    );

    return res
      .status(201)
      .json({ message: "Category option added successfully" });
  } catch (error) {
    console.error("Add Category Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editCategoryStatus = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const categoryId = Number(req.params.id);

  if (!categoryId) {
    return res.status(400).json({ message: "Missing category ID" });
  }

  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    return res
      .status(400)
      .json({ message: "Missing or invalid isActive (must be boolean)" });
  }

  try {
    const category = await getCategoryById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (category.is_active === isActive) {
      return res.status(200).json({ message: "Category status unchanged" });
    }

    await updateCategoryStatus(categoryId, isActive);

    return res
      .status(200)
      .json({ message: "Category status updated successfully" });
  } catch (error) {
    console.error("Update Category Status Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
