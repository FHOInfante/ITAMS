/**
 * Parses a raw LONGTEXT snapshot string from audit_log_detail into a plain object.
 * Returns null if the value is missing, not a string, or not valid JSON.
 */
export const parseSnapshot = (raw: unknown): object | null => {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) return parsed;
    return null;
  } catch {
    return null;
  }
};

/**
 * Maps each asset target_table to the column that holds its human-readable
 * display name. Used to resolve "Name of Affected Asset/Entity" directly
 * from the stored snapshot, rather than joining against the live asset
 * table (so the name shown is accurate as of the time of the interaction,
 * even if the asset was later renamed or deleted). UPS has no dedicated
 * name column in the schema, so serial_no is used as its identifier.
 *
 * purchase_request is intentionally NOT included here - it does not fit the
 * single-name-column pattern (see resolvePurchaseRequestEntityName below).
 */
export const ASSET_NAME_FIELDS: Record<string, string> = {
  computer: "computer_name",
  software: "software_name",
  printer: "printer_name",
  network_device: "network_device_name",
  ups: "serial_no",
  user: "user_name",
  end_user: "eu_name",
};

/**
 * Maps each asset target_table to its primary key column, so the PK can be
 * excluded when diffing snapshot fields — a record's own ID never counts
 * as an "edited field" for audit purposes, including at creation.
 */
const PRIMARY_KEY_FIELDS: Record<string, string> = {
  computer: "computer_id",
  software: "software_id",
  printer: "printer_id",
  ups: "ups_id",
  network_device: "network_device_id",
  user: "user_id",
  end_user: "eu_id",
};

/**
 * Maps a target_table to a list of "context-only" fields that are stored in
 * the snapshot purely to support entity_name resolution or grouping, but
 * should never themselves be reported as a changed field.
 *
 * purchase_request is the motivating case: pr_no is embedded in every
 * purchase-request snapshot (header AND item-level) so that
 * resolvePurchaseRequestEntityName can build "PR-<pr_no>" / "PR-<pr_no> –
 * <item description>" without a second lookup, but pr_no itself never
 * changes and is not a meaningful "field that was edited" - especially for
 * item deletions, where the snapshot_after is {} and pr_no would otherwise
 * incorrectly appear to have been "cleared" alongside the deleted item.
 */
const CONTEXT_ONLY_FIELDS: Record<string, string[]> = {
  purchase_request: ["pr_no"],
};

/**
 * The "permissions" key returned by user.model.ts's findUserById /
 * getUserDetails is a raw GROUP_CONCAT-encoded string (e.g.
 * "01||0||NULL||NULL~~02||1||2025-06-01 00:00:00||2025-06-08 00:00:00"),
 * parsed elsewhere by user.util.ts's parsePermissions. It does not fit the
 * plain field-diff model diffSnapshots expects, and would also be
 * mis-rendered by formatValueForDisplay, which already treats "||" as a
 * list separator for unrelated fields (peripherals/programs). Permission
 * changes are captured separately, as their own synthetic "permissions"
 * field, via buildPermissionAuditSnapshot below - so this raw column is
 * always stripped before a user record is used as an audit snapshot.
 */
const USER_SNAPSHOT_EXCLUDED_KEYS = ["permissions"];

/**
 * Strips fields that should never appear as a diffable column in a
 * target_table = "user" audit snapshot (see USER_SNAPSHOT_EXCLUDED_KEYS)
 * from a raw user record - e.g. the result of user.model.ts's
 * findUserById. Returns a plain object safe to pass as snapshotBefore /
 * snapshotAfter to createAuditLogWithSnapshot or
 * createAuditLogWithSnapshotAfterOnly.
 */
export const sanitizeUserSnapshot = (
  user: Record<string, unknown>,
): Record<string, unknown> => {
  const snapshot = { ...user };
  for (const key of USER_SNAPSHOT_EXCLUDED_KEYS) {
    delete snapshot[key];
  }
  return snapshot;
};

/**
 * Formats a list of permission_id values into the single string stored
 * under the synthetic "permissions" key of a Grant/Revoke Permission audit
 * snapshot (see buildPermissionAuditSnapshot). Sorted ascending and
 * comma-separated, matching the style already used for interaction_detail
 * in permission.controller.ts (e.g. "Granted ... permission(s): [1, 2]").
 * Returns null for an empty list so a user holding zero permissions renders
 * as old_value/new_value: null rather than an empty string.
 */
export const formatPermissionIdList = (
  permissionIds: number[],
): string | null =>
  permissionIds.length > 0
    ? [...permissionIds].sort((a, b) => a - b).join(", ")
    : null;

/**
 * Builds one side (before OR after) of a Grant/Revoke Permission audit
 * snapshot. Always includes user_name - even though it never changes
 * between the before/after pair of a permission-only event - purely so
 * resolveEntityName can still resolve "Name of Affected Asset/Entity" via
 * ASSET_NAME_FIELDS.user; diffSnapshots will not report it as a changed
 * field since the value is identical on both sides.
 *
 * permissionIds MUST be the user's FULL held permission_id set at that
 * point in time (not just the ones being granted/revoked in this request),
 * so the resulting "Permissions" row reads as a complete before/after
 * picture rather than a partial delta.
 */
export const buildPermissionAuditSnapshot = (
  userName: string,
  permissionIds: number[],
): Record<string, unknown> => ({
  user_name: userName,
  permissions: formatPermissionIdList(permissionIds),
});

/**
 * getEndUserById (enduser.model.ts) returns an enriched shape - the raw
 * end_user row joined with department_name, plus assignedComputers and
 * assignedSoftware arrays pulled from separate tables. None of these three
 * belong in an end_user audit snapshot: department_name is a display-only
 * duplicate of eu_department (the FK actually stored on the row), and the
 * two assigned* arrays reflect OTHER tables' state (computer/software),
 * not a field that was ever written to end_user itself. Left in, they
 * would either mis-render (arrays aren't diffable the way scalar fields
 * are) or produce a false "changed" row whenever an unrelated asset is
 * assigned/unassigned. Always stripped before an end user record is used
 * as an audit snapshot.
 */
const EU_SNAPSHOT_EXCLUDED_KEYS = [
  "department_name",
  "assignedComputers",
  "assignedSoftware",
];

/**
 * Strips fields that should never appear as a diffable column in a
 * target_table = "end_user" audit snapshot (see EU_SNAPSHOT_EXCLUDED_KEYS)
 * from a getEndUserById result. Returns a plain object safe to pass as
 * snapshotBefore / snapshotAfter to createAuditLogWithSnapshot.
 */
export const sanitizeEndUserSnapshot = (
  endUser: Record<string, unknown>,
): Record<string, unknown> => {
  const snapshot = { ...endUser };
  for (const key of EU_SNAPSHOT_EXCLUDED_KEYS) {
    delete snapshot[key];
  }
  return snapshot;
};

/**
 * The write-path shape of an end_user record - exactly the columns that
 * addEndUser / editEndUser / the asset-assignment auto-registration path
 * (resolveEndUserAssignment) ever set. Centralized here so every caller
 * that builds an end_user audit snapshot uses the same field set and key
 * names as the actual end_user table columns, matching what
 * sanitizeEndUserSnapshot leaves behind on the "before" side.
 */
export type EndUserSnapshotInput = {
  eu_id: number;
  eu_name: string;
  eu_emp_id: number;
  eu_division: string;
  eu_department: number;
  eu_location: string;
  eu_email: string | null;
  eu_contact_no: string | null;
  eu_status: string;
};

/**
 * Builds a plain end_user audit snapshot object from write-path inputs.
 * Used for the "after" side of "Add End User" / "Update End User" events,
 * where the values just written to the database are already in hand and
 * re-querying the row would be redundant.
 */
export const buildEndUserSnapshot = (
  input: EndUserSnapshotInput,
): Record<string, unknown> => ({ ...input });

/**
 * Acronyms and proper-noun fragments that should not be title-cased word by
 * word when humanizing a snake_case column name for display.
 */
const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  ip: "IP",
  mac: "MAC",
  vpn: "VPN",
  ups: "UPS",
  os: "OS",
  pr: "PR",
  id: "ID",
  ram: "RAM",
  url: "URL",
  api: "API",
  anydesk: "AnyDesk",
  eu: "End User",
};

/**
 * Converts a snake_case database column name into a human-readable label
 * for display in the audit trail (e.g. "ip_address" -> "IP Address").
 */
export const humanizeFieldName = (field: string): string =>
  field
    .split("_")
    .map((word) => {
      const override = FIELD_LABEL_OVERRIDES[word.toLowerCase()];
      if (override) return override;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");

/**
 * Resolves the display name of the asset/entity affected by an interaction,
 * pulled from the stored snapshot rather than a live table join. Prefers
 * snapshot_after (covers both updates and creation events, where
 * snapshot_before is empty), falling back to snapshot_before. Returns null
 * for non-asset (system) interactions, which have no target_table.
 *
 * Not used for target_table = "purchase_request" - see
 * resolvePurchaseRequestEntityName instead.
 */
export const resolveEntityName = (
  targetTable: string | null,
  snapshotAfter: Record<string, unknown> | null,
  snapshotBefore: Record<string, unknown> | null,
): string | null => {
  if (!targetTable) return null;

  const nameField = ASSET_NAME_FIELDS[targetTable];
  if (!nameField) return null;

  const value = snapshotAfter?.[nameField] ?? snapshotBefore?.[nameField];
  return value !== undefined && value !== null ? String(value) : null;
};

/**
 * Resolves the display name for purchase-request audit rows. Purchase
 * requests don't fit the single-name-column pattern used by
 * ASSET_NAME_FIELDS, for two reasons:
 *
 * 1. Their natural identifier is pr_no, a number, not a dedicated "name"
 *    column.
 * 2. A single purchase request can have many line items, and several
 *    interaction types (Add/Update/Delete Purchase Request Item) act on one
 *    specific item rather than the PR header - pr_no alone would not tell
 *    you which item was affected.
 *
 * Header-level events (Add/Update Purchase Request) resolve to "PR-<pr_no>".
 * Item-level events additionally surface the item's description, e.g.
 * "PR-1023 – Laptop Charger", since the snapshot for those events also
 * carries an item_description field.
 */
export const resolvePurchaseRequestEntityName = (
  snapshotAfter: Record<string, unknown> | null,
  snapshotBefore: Record<string, unknown> | null,
): string | null => {
  const snapshot = snapshotAfter ?? snapshotBefore;
  if (!snapshot) return null;

  const prNo = snapshot.pr_no;
  if (prNo === undefined || prNo === null) return null;

  const itemDescription = snapshot.item_description;
  if (typeof itemDescription === "string" && itemDescription.trim()) {
    return `PR-${prNo} – ${itemDescription}`;
  }

  return `PR-${prNo}`;
};

/**
 * Formats a single field value for display in Old Value / New Value.
 * Pipe-delimited values (e.g. peripherals/programs stored as "Mouse||Keyboard")
 * are rendered as a comma-separated list for readability. Booleans (e.g.
 * has_vpn_access, is_received) are rendered as "Yes"/"No" rather than the
 * raw "true"/"false" string, matching the human-readable style of the rest
 * of the audit trail.
 */
const formatValueForDisplay = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && value.includes("||")) {
    return value.split("||").join(", ");
  }
  return String(value);
};

export type AuditFieldChange = {
  field: string;
  old_value: string | null;
  new_value: string | null;
};

/**
 * Compares a before/after snapshot pair field by field and returns one
 * entry per field whose value actually changed. The target table's primary
 * key column, along with any table-specific context-only fields (see
 * CONTEXT_ONLY_FIELDS), are always excluded, since neither is ever a
 * meaningful "edited field".
 *
 * Doubles as the creation-event diff: passing an empty object ({}) as
 * snapshotBefore means every populated field in snapshotAfter is treated as
 * "changed" (old_value: null, new_value: <initial value>), while fields left
 * null/unset at creation are correctly skipped, since null vs. null is not
 * a change.
 *
 * It also doubles as the deletion-event diff: passing an empty object ({})
 * as snapshotAfter means every populated field in snapshotBefore is treated
 * as "changed" (old_value: <last value>, new_value: null) - used by
 * "Delete Purchase Request Item".
 */
export const diffSnapshots = (
  targetTable: string,
  snapshotBefore: Record<string, unknown>,
  snapshotAfter: Record<string, unknown>,
): AuditFieldChange[] => {
  const primaryKey = PRIMARY_KEY_FIELDS[targetTable];
  const contextOnlyFields = CONTEXT_ONLY_FIELDS[targetTable] ?? [];
  const excludedFields = new Set<string>(
    [primaryKey, ...contextOnlyFields].filter(
      (field): field is string => !!field,
    ),
  );

  const keys = new Set([
    ...Object.keys(snapshotBefore ?? {}),
    ...Object.keys(snapshotAfter ?? {}),
  ]);

  const changes: AuditFieldChange[] = [];

  for (const key of keys) {
    if (excludedFields.has(key)) continue;

    const beforeValue = snapshotBefore?.[key] ?? null;
    const afterValue = snapshotAfter?.[key] ?? null;

    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) continue;

    changes.push({
      field: humanizeFieldName(key),
      old_value: formatValueForDisplay(beforeValue),
      new_value: formatValueForDisplay(afterValue),
    });
  }

  return changes;
};

export type BizBoxAuditRow = {
  audit_log_id: number;
  entity_name: string | null;
  interaction_date: string;
  interaction_type: string;
  user_name: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  interaction_detail: string;
};

/**
 * Transforms one raw audit_log row (optionally joined with its
 * audit_log_detail snapshot) into one or more BizBox-style audit rows.
 *
 * - Non-asset (system) events — no target_table, so no snapshot exists at
 *   all — produce a single summary row with field, old_value, and new_value
 *   set to null. There's nothing to diff, so interaction_detail is the only
 *   source of context.
 * - All other interactions (asset tables AND purchase_request), INCLUDING
 *   creation and deletion events, are diffed via diffSnapshots and produce
 *   one row per individually changed field.
 *   For a creation event, snapshot_before is stored as {}, so every
 *   populated field on the new record surfaces as its own row with
 *   old_value: null and new_value: <initial value> — a computer added with
 *   15 populated fields will produce 15 rows sharing the same audit_log_id.
 *   For a deletion event (e.g. Delete Purchase Request Item), snapshot_after
 *   is {}, so the same mechanism produces one row per field with
 *   old_value: <last value> and new_value: null.
 * - If an interaction is logged but produces zero actual field changes (an
 *   edge case — e.g. a save with no net differences), a single fallback row
 *   with null field/old_value/new_value is returned so the interaction
 *   still appears in the trail exactly once.
 * - entity_name resolution branches by target_table: purchase_request uses
 *   resolvePurchaseRequestEntityName (PR number, optionally with an item
 *   description), while every other asset table uses the generic
 *   resolveEntityName / ASSET_NAME_FIELDS lookup.
 */
export const buildBizBoxRows = (row: any): BizBoxAuditRow[] => {
  const snapshotBefore = parseSnapshot(row.snapshot_before) as Record<
    string,
    unknown
  > | null;
  const snapshotAfter = parseSnapshot(row.snapshot_after) as Record<
    string,
    unknown
  > | null;

  const entityName =
    row.target_table === "purchase_request"
      ? resolvePurchaseRequestEntityName(snapshotAfter, snapshotBefore)
      : resolveEntityName(row.target_table, snapshotAfter, snapshotBefore);

  const base = {
    audit_log_id: row.audit_log_id,
    entity_name: entityName,
    interaction_date: row.interaction_date,
    interaction_type: row.interaction_type,
    user_name: row.user_name,
    interaction_detail: row.interaction_detail,
  };

  const isSystemEvent = !row.target_table;

  if (isSystemEvent) {
    return [{ ...base, field: null, old_value: null, new_value: null }];
  }

  const changes = diffSnapshots(
    row.target_table,
    snapshotBefore ?? {},
    snapshotAfter ?? {},
  );

  if (changes.length === 0) {
    return [{ ...base, field: null, old_value: null, new_value: null }];
  }

  return changes.map((change) => ({ ...base, ...change }));
};

/**
 * Applies buildBizBoxRows across a full result set and flattens the output
 * into a single array of BizBox audit rows.
 */
export const buildBizBoxRowsForLogs = (rows: any[]): BizBoxAuditRow[] =>
  rows.flatMap(buildBizBoxRows);
