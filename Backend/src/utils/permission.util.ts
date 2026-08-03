import {
  grantPermanentUserPermissions,
  revokeUserPermissions,
  getPermanentUserPermissions,
  getActiveTemporaryPermissions,
} from "../models/permission.model.js";

// Permission ID mapping:
// 1 : View Audit Trails - Computer
// 2 : View Audit Trails - Software
// 3 : View Audit Trails - Printer
// 4 : View Audit Trails - UPS
// 5 : View Audit Trails - Network Device
// 6 : View Audit Trails - System
// 7 : View Purchase Requests
// 8 : View System Users
// 9 : Add Asset - Computer
// 10: Add Asset - Software
// 11: Add Asset - Printer
// 12: Add Asset - UPS
// 13: Add Asset - Network Device
// 14: Create Purchase Requests
// 15: Add New Department
// 16: Add New Peripheral
// 17: Add New Program
// 18: Add New Dropdown Option
// 19: Add New Vendor
// 20: Add New End Users
// 21: Add New System User
// 22: Assign Asset - Computer
// 23: Assign Asset - Software
// 24: Edit Asset - Computer
// 25: Edit Asset - Software
// 26: Edit Asset - Printer
// 27: Edit Asset - UPS
// 28: Edit Asset - Network Device
// 29: Edit Asset - Computer (Network Fields)
// 30: Edit Asset - Printer (Network Fields)
// 31: Edit Department Details
// 32: Edit Peripheral Details
// 33: Edit Program Details
// 34: Edit Dropdown Option Status
// 35: Edit Vendor Details
// 36: Edit End User Details
// 37: Edit Purchase Requests
// 38: Edit System User Account
// 39: Grant Special Access
// 40: Revoke Special Access
// 41: Reset System User Password
// 42: Generate Report

// Note: The following permissions are implicitly granted to all authenticated
// users and are therefore not included in the role permission map:
//   - View Asset (Computer, Software, Printer, UPS, Network Device)
//   - View Departments
//   - View Peripherals
//   - View Programs
//   - View Dropdown Options
//   - View Vendors
//   - View End Users
//   - View Permission List

const rolePermissionsMap: Record<string, number[]> = {
  "IT Manager": [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42,
  ],
  "IT Supervisor": [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
    41, 42,
  ],
  "Network Admin": [13, 28, 29, 30],
  "System Specialist": [7, 14, 37],
  "IT Helpdesk": [9, 11, 12, 22],
};

export const VALID_ROLES = Object.keys(rolePermissionsMap);

// Revokes every currently active temporary permission held by the user (i.e.
// is_temporary = TRUE and NOW() within valid_from/valid_to), returning the
// permission_ids that were removed.
//
// Temporary permissions are intentionally NOT carried across a role change
// or account deactivation — they always represent a short-lived, situational
// grant tied to the user's context at the time they were issued, and that
// context is considered void the moment the role changes or the account is
// deactivated. Rather than diffing temporary permissions against the new
// role's permanent set (which would keep any that happen to overlap), the
// full set is unconditionally cleared so every future temporary grant is a
// deliberate, explicit decision under the user's new role/status.
export const revokeAllTemporaryPermissions = async (
  userId: number,
): Promise<number[]> => {
  const activeTemporaryPermissions =
    await getActiveTemporaryPermissions(userId);

  if (activeTemporaryPermissions.length === 0) return [];

  await revokeUserPermissions(userId, activeTemporaryPermissions);

  return activeTemporaryPermissions;
};

export const handleUserPermissionsByRole = async (
  userId: number,
  role: string,
): Promise<void> => {
  const targetPermissions = rolePermissionsMap[role] ?? [];

  const currentPermanentPermissions = await getPermanentUserPermissions(userId);

  const toGrant = targetPermissions.filter(
    (id) => !currentPermanentPermissions.includes(id),
  );

  const toRevoke = currentPermanentPermissions.filter(
    (id) => !targetPermissions.includes(id),
  );

  // A role change fully resets temporary access — every currently active
  // temporary permission is revoked here, regardless of whether its
  // permission_id also appears in the new role's permanent set. This MUST
  // run, and be awaited, BEFORE the permanent grant below: user_permission's
  // primary key is (user_id, permission_id), so a lingering temporary row
  // for a permission_id the new role grants permanently would cause the
  // INSERT IGNORE in grantPermanentUserPermissions to silently skip that
  // permission, leaving it stuck as temporary instead of becoming permanent.
  await revokeAllTemporaryPermissions(userId);

  // Active temporary permissions are handled above. From this point on,
  // toGrant/toRevoke only ever touch the PERMANENT permission set, and are
  // disjoint (toGrant = target - current, toRevoke = current - target), so
  // they're safe to run concurrently.

  // TODO: No error handling here. If grantPermanentUserPermissions or
  // revokeUserPermissions rejects, the failure is silently swallowed by the
  // caller unless it awaits and catches this function itself. Add a
  // try/catch with logging once a decision is made on whether a partial
  // failure here should roll back, retry, or just be reported.
  await Promise.all([
    grantPermanentUserPermissions(userId, toGrant),
    revokeUserPermissions(userId, toRevoke),
  ]);
};
