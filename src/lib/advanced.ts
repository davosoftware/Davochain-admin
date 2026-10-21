/** Wording for the Advanced checks page (spec 2026-10-21 §8). Kept apart from the page so it can be tested. */
const REASONS: Record<string, string> = {
  ID_TYPE_DIFFERS: 'The document looks like a different kind of ID than the customer chose',
  ID_FIELD_UNREADABLE: 'The name on the ID could not be read clearly',
  NAME_DIFFERS: 'The name on the ID differs from the verified Basic name',
  DOB_UNREADABLE: 'The date of birth on the ID could not be read',
  NO_EXPIRY: 'No expiry date was found on the ID',
  LIVENESS_LOW: 'The selfie looked live, but with a low score',
  FACE_MATCH_BORDERLINE: 'The selfie and the ID photo are similar, but not clearly the same person',
  NO_ID_PHOTO: 'No face photo was found on the ID to compare with the selfie',
  DUPLICATE_ID: 'This ID number is already approved on another account',
  TEXT_SPARSE: 'Very little text could be read from the document',
  NAME_NOT_FOUND: "The customer's verified name was not found on the document",
  NO_DATE: 'No issue date was found on the document',
  NO_END_DATE: 'No end date was found on the tenancy agreement',
  ADDRESS_PARTIAL: 'Only the state matches the address typed at Basic',
  ADDRESS_NOT_FOUND: 'The address typed at Basic was not found on the document',
  PDF: 'A PDF: the automatic readers take photos only, so a person reads it',
  SYSTEM: 'The check could not finish on its own; please read the document',
};
export const reasonText = (code: string): string => REASONS[code] ?? code;

/** "Face match 68 — needs 75 to pass (60–74 goes to a person)". */
export function scoreLine(label: string, value: number | null, pass: number, review?: number): string {
  if (value === null) return `${label} — not checked`;
  const v = Math.round(value);
  if (v >= pass) return `${label} ${v} — passes (needs ${pass})`;
  return review === undefined ? `${label} ${v} — needs ${pass} to pass` : `${label} ${v} — needs ${pass} to pass (${review}–${pass - 1} goes to a person)`;
}

/** The API's reject reasons (src/kyc/advanced/advanced-review.service.ts), in an admin's words. */
export const REJECT_OPTIONS = [
  { value: 'DOC_UNCLEAR', label: 'Document unclear' },
  { value: 'DOC_ALTERED', label: 'Document looks altered' },
  { value: 'NAME_MISMATCH', label: "Name doesn't match" },
  { value: 'ADDRESS_NOT_SHOWN', label: 'Address not shown' },
  { value: 'NOT_ACCEPTED', label: 'Not an accepted document' },
  { value: 'OTHER', label: 'Other (the customer sees your note)' },
];

export const stepLabel = (step: 'IDENTITY' | 'ADDRESS') => (step === 'IDENTITY' ? 'ID and selfie' : 'Proof of address');

const KINDS: Record<string, string> = {
  NATIONAL_ID: 'National ID card',
  PASSPORT: 'International passport',
  DRIVERS_LICENSE: "Driver's licence",
  UTILITY_BILL: 'Utility bill',
  BANK_STATEMENT: 'Bank statement',
  GOVERNMENT_LETTER: 'Government letter',
  TENANCY: 'Tenancy agreement',
};
export const kindLabel = (k: string | null | undefined): string => (k ? (KINDS[k] ?? k) : '');
