import { Request, Response } from "express";
import {
  createProgram,
  updateProgram,
  getPrograms,
  getProgramById,
  getProgramByName,
} from "../models/program.model.js";

export const addProgram = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const { programName } = req.body;

  if (!programName || typeof programName !== "string" || !programName.trim()) {
    return res.status(400).json({ message: "Missing or invalid programName" });
  }

  try {
    const program = await getProgramByName(programName.trim());
    if (program) {
      return res
        .status(409)
        .json({ message: "A program with this name already exists" });
    }

    const programId = await createProgram(programName.trim());

    return res.status(201).json({ message: "Program added successfully" });
  } catch (error) {
    console.error("Add Program Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editProgram = async (
  req: Request & { user?: { user_id: number } },
  res: Response,
) => {
  const programId = Number(req.params.id);

  if (!programId) {
    return res.status(400).json({ message: "Missing program ID" });
  }

  const { programName } = req.body;

  if (!programName || typeof programName !== "string" || !programName.trim()) {
    return res.status(400).json({ message: "Missing or invalid programName" });
  }

  try {
    const program = await getProgramById(programId);
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    // Check name conflict only if the name is actually changing
    if (
      programName.trim().toLowerCase() !== program.program_name.toLowerCase()
    ) {
      const conflict = await getProgramByName(programName.trim());
      if (conflict) {
        return res
          .status(409)
          .json({ message: "A program with this name already exists" });
      }
    }

    await updateProgram(programId, programName.trim());

    return res.status(200).json({ message: "Program updated successfully" });
  } catch (error) {
    console.error("Update Program Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const fetchPrograms = async (req: Request, res: Response) => {
  try {
    const programs = await getPrograms();
    return res.status(200).json(programs);
  } catch (error) {
    console.error("Fetch Programs Error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
