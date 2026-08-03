export const ASSET_CATEGORY_GROUPS: Record<string, string[]> = {
  computer: [
    "computer.brand",
    "computer.device_type",
    "computer.operating_system",
    "computer.ram_size",
    "computer.storage_type",
    "computer.storage_capacity",
  ],
  printer: ["printer.brand", "printer.printer_type"],
  network_device: ["network_device.brand", "network_device.device_type"],
  ups: ["ups.brand"],
  software: ["software.license_type"],
};

export const ALL_CATEGORY_GROUPS: string[] = Object.values(
  ASSET_CATEGORY_GROUPS,
).flat();

export const isAllowedAsset = (asset: string): boolean => {
  return Object.prototype.hasOwnProperty.call(ASSET_CATEGORY_GROUPS, asset);
};

export const getGroupsByAsset = (asset: string): string[] => {
  return ASSET_CATEGORY_GROUPS[asset] ?? [];
};

export const isDuplicateCategoryValue = (
  existingValues: string[],
  newValue: string,
): boolean => {
  return existingValues.some(
    (v) => v.toLowerCase() === newValue.trim().toLowerCase(),
  );
};
