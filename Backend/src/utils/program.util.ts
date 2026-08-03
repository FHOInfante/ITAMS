import { resolveProgramIds } from "../models/computer.model.js";

export const validateIsArray = (value: unknown): void => {
  if (!Array.isArray(value)) {
    const err = new Error("Programs must be an array") as any;
    err.statusCode = 400;
    throw err;
  }
};

export const validateEntryIsObject = (entry: unknown): void => {
  if (typeof entry !== "object" || entry === null) {
    const err = new Error("Each program entry must be an object") as any;
    err.statusCode = 400;
    throw err;
  }
};

export const validateEntryHasKey = (entry: Record<string, unknown>): void => {
  const hasId = entry.program_id !== undefined;
  const hasName = entry.program_name !== undefined;
  if (!hasId && !hasName) {
    const err = new Error(
      "Each program entry must have at least program_id or program_name",
    ) as any;
    err.statusCode = 400;
    throw err;
  }
};

export const parseAndResolvePrograms = async (
  rawPrograms: unknown,
): Promise<number[]> => {
  if (rawPrograms === undefined || rawPrograms === null) return [];

  validateIsArray(rawPrograms);

  for (const entry of rawPrograms as unknown[]) {
    validateEntryIsObject(entry);
    validateEntryHasKey(entry as Record<string, unknown>);
  }

  return resolveProgramIds(rawPrograms as Record<string, unknown>[]);
};
