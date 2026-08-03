type PermissionEntry = {
  permission_id: number;
  is_temporary: boolean;
  valid_from: string | null;
  valid_to: string | null;
};

export const parsePermissions = (raw: string | null): PermissionEntry[] => {
  if (!raw) return [];

  return raw.split("~~").map((entry) => {
    const [permission_id, is_temporary, valid_from, valid_to] =
      entry.split("||");

    return {
      permission_id: Number(permission_id),
      is_temporary: is_temporary === "1",
      valid_from: valid_from === "NULL" ? null : valid_from,
      valid_to: valid_to === "NULL" ? null : valid_to,
    };
  });
};
