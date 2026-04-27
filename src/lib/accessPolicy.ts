export const MAX_ACTIVE_OR_PENDING_PROFILES = 3;
export const MASKED_VALUE = "*****";

export interface AccountAccessInput {
  isLoggedIn: boolean;
  nonDeletedProfileCount: number;
  hasValidSubscription: boolean;
}

export interface AccountAccessState {
  isLoggedIn: boolean;
  nonDeletedProfileCount: number;
  hasOwnedProfile: boolean;
  hasValidSubscription: boolean;
  canSave: boolean;
  canSendInterest: boolean;
  canContact: boolean;
  canCreateProfile: boolean;
  shouldMaskSensitiveFields: boolean;
}

export function resolveAccountAccess(input: AccountAccessInput): AccountAccessState {
  const hasOwnedProfile = input.nonDeletedProfileCount > 0;
  const canSave = input.isLoggedIn;
  const canSendInterest = input.isLoggedIn && hasOwnedProfile;
  const canContact = input.isLoggedIn && hasOwnedProfile && input.hasValidSubscription;
  const canCreateProfile =
    input.isLoggedIn && input.nonDeletedProfileCount < MAX_ACTIVE_OR_PENDING_PROFILES;
  const shouldMaskSensitiveFields = !input.hasValidSubscription;

  return {
    isLoggedIn: input.isLoggedIn,
    nonDeletedProfileCount: input.nonDeletedProfileCount,
    hasOwnedProfile,
    hasValidSubscription: input.hasValidSubscription,
    canSave,
    canSendInterest,
    canContact,
    canCreateProfile,
    shouldMaskSensitiveFields,
  };
}

export function maskLastName(fullName: string): string {
  const clean = (fullName || "").trim();
  if (!clean) return MASKED_VALUE;
  const parts = clean.split(/\s+/);
  if (parts.length <= 1) return `${parts[0]} ${MASKED_VALUE}`.trim();
  const first = parts.slice(0, -1).join(" ");
  return `${first} ${MASKED_VALUE}`;
}

export function maskBirthDateKeepYear(isoDate?: string): string {
  if (!isoDate) return `${MASKED_VALUE}/${MASKED_VALUE}/${MASKED_VALUE}`;
  const year = String(isoDate).slice(0, 4);
  if (!/^\d{4}$/.test(year)) return `${MASKED_VALUE}/${MASKED_VALUE}/${MASKED_VALUE}`;
  return `${MASKED_VALUE}/${MASKED_VALUE}/${year}`;
}
