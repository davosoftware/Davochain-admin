/** ID documents on the KYC page (H8). Pure helpers, shared by the page and the file route. */

export type StorageStatus = { driver: 'memory' | 'r2'; reachable: boolean; bucket: string | null };

const LABELS: Record<string, string> = {
  NATIONAL_ID: 'National ID (front)',
  ID_BACK: 'ID (back)',
  PASSPORT: 'Passport',
  DRIVERS_LICENSE: "Driver's licence",
  VOTERS_CARD: "Voter's card",
  SELFIE: 'Selfie',
  PROOF_OF_ADDRESS: 'Proof of address',
  BVN: 'BVN',
  NIN: 'NIN',
};

export function documentLabel(type: string): string {
  return LABELS[type] ?? type;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The one API path the document route may forward to, or null. Anything that
 * is not exactly a document id is refused, so the route can never be turned
 * into a proxy for the rest of the admin API.
 */
export function documentApiPath(id: string): string | null {
  return UUID.test(id) ? `/v1/admin/kyc/documents/${id}/file` : null;
}

export function storageLine(s: StorageStatus | null): { tone: 'ok' | 'warn' | 'bad'; text: string } {
  if (!s) return { tone: 'bad', text: 'File storage: could not check right now.' };
  if (s.driver === 'memory') {
    return { tone: 'warn', text: 'File storage: test mode (kept in memory, lost when the API restarts). Use Cloudflare R2 on the live server.' };
  }
  const name = `Cloudflare R2 (${s.bucket})`;
  return s.reachable
    ? { tone: 'ok', text: `File storage: ${name} is working.` }
    : { tone: 'bad', text: `File storage: ${name} is NOT reachable. Customers cannot upload documents and documents cannot be opened until it is.` };
}
