import { Request, Response } from "express";
import {
  createDepartment,
  updateDepartment,
  getDepartments,
  getDepartmentById,
  getDepartmentByName,
} from "../models/department.model.js";

export const addDepartment = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const { departmentName } = req.body;

  if (
    !departmentName ||
    typeof departmentName !== "string" ||
    !departmentName.trim()
  ) {
    return res
      .status(400)
      .json({ message: "Missing or invalid departmentName" });
  }

  try {
    const department = await getDepartmentByName(departmentName.trim());
    if (department) {
      return res
        .status(409)
        .json({ message: "A department with this name already exists" });
    }

    const departmentId = await createDepartment(departmentName.trim());

    return res.status(201).json({ message: "Department added successfully" });
  } catch (error) {
    console.error("Add Department Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editDepartment = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const departmentId = Number(req.params.id);

  if (!departmentId) {
    return res.status(400).json({ message: "Missing department ID" });
  }

  const { departmentName } = req.body;

  if (
    !departmentName ||
    typeof departmentName !== "string" ||
    !departmentName.trim()
  ) {
    return res
      .status(400)
      .json({ message: "Missing or invalid departmentName" });
  }

  try {
    const department = await getDepartmentById(departmentId);
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Check name conflict only if the name is actually changing
    if (
      departmentName.trim().toLowerCase() !==
      department.department_name.toLowerCase()
    ) {
      const conflict = await getDepartmentByName(departmentName.trim());
      if (conflict) {
        return res
          .status(409)
          .json({ message: "A department with this name already exists" });
      }
    }

    await updateDepartment(departmentId, departmentName.trim());

    return res.status(200).json({ message: "Department updated successfully" });
  } catch (error) {
    console.error("Update Department Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchDepartments = async (req: Request, res: Response) => {
  try {
    const departments = await getDepartments();
    return res.status(200).json(departments);
  } catch (error) {
    console.error("Fetch Departments Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
