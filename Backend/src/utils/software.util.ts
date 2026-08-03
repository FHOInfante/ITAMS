// Shared date-derivation logic for the Software asset module.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RENEWAL_WINDOW_DAYS = 90;

// licenseType values (case-insensitive, trimmed) that never expire.
const NO_EXPIRY_LICENSE_TYPES = ["perpetual"];

/**
 * Returns true if the given licenseType represents a license that never
 * expires (Perpetual / Auto-Renewal / Auto-Renew), matched case-insensitively
 * and with surrounding whitespace trimmed.
 */
export const isNoExpiryLicenseType = (licenseType: unknown): boolean => {
  if (typeof licenseType !== "string") return false;
  return NO_EXPIRY_LICENSE_TYPES.includes(licenseType.trim().toLowerCase());
};

/**
 * Computes the date-derived software_status from an expiryDate.
 * - "Expired"      -> expiryDate is today or in the past
 * - "For Renewal"  -> expiryDate is within the next 90 days
 * - "Active"       -> expiryDate is more than 90 days away
 *
 * NOTE: This never returns "Discontinued" — that status can only
 * be set explicitly by the client and is never computed. Callers should
 * skip calling this entirely when expiryDate is null (always "Active" instead).
 */
export const computeSoftwareStatus = (expiryDate: string): string => {
  const expiry = new Date(expiryDate);
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / MS_PER_DAY);

  if (diffDays <= 0) return "Expired";
  if (diffDays <= RENEWAL_WINDOW_DAYS) return "For Renewal";
  return "Active";
};

/**
 * Computes renewalDate as exactly 90 calendar days before expiryDate —
 * i.e. the date the "For Renewal" status window begins. Returned as
 * a YYYY-MM-DD string to match the DATE column format.
 */
export const computeRenewalDate = (expiryDate: string): string => {
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  expiry.setDate(expiry.getDate() - RENEWAL_WINDOW_DAYS);
  return expiry.toISOString().split("T")[0];
};
