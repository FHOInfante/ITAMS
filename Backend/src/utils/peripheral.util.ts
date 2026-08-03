import { resolvePeripheralIds } from "../models/computer.model.js";

export const validateIsArray = (value: unknown): void => {
  if (!Array.isArray(value)) {
    const err = new Error("Peripherals must be an array") as any;
    err.statusCode = 400;
    throw err;
  }
};

export const validateEntryIsObject = (entry: unknown): void => {
  if (typeof entry !== "object" || entry === null) {
    const err = new Error("Each peripheral entry must be an object") as any;
    err.statusCode = 400;
    throw err;
  }
};

export const validateEntryHasKey = (entry: Record<string, unknown>): void => {
  const hasId = entry.peripheral_id !== undefined;
  const hasName = entry.peripheral_name !== undefined;
  if (!hasId && !hasName) {
    const err = new Error(
      "Each peripheral entry must have at least peripheral_id or peripheral_name",
    ) as any;
    err.statusCode = 400;
    throw err;
  }
};

export const parseAndResolvePeripherals = async (
  rawPeripherals: unknown,
): Promise<number[]> => {
  if (rawPeripherals === undefined || rawPeripherals === null) return [];

  validateIsArray(rawPeripherals);

  for (const entry of rawPeripherals as unknown[]) {
    validateEntryIsObject(entry);
    validateEntryHasKey(entry as Record<string, unknown>);
  }

  return resolvePeripheralIds(rawPeripherals as Record<string, unknown>[]);
};
