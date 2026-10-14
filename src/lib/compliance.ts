import type { BasicReviewRow, MatchField } from './types-admin';

export const CATEGORY_LABEL: Record<string, string> = {
  SANCTIONS: 'Sanctions',
  PEP: 'Politically exposed person',
  ADVERSE_MEDIA: 'Adverse media',
  WARNING: 'Watch list',
  UNKNOWN: 'Unclear result',
  ERROR: 'Screening failed',
};

export const DECISION_LABEL: Record<string, string> = {
  CLEARED: 'Clear (false positive)',
  PEP_APPROVED_EDD: 'Approve with enhanced due diligence',
  RESTRICTED: 'Restrict',
  SANCTIONS_CONFIRMED: 'Confirm sanctions match (keep blocked)',
  SANCTIONS_FALSE_POSITIVE: 'Propose clearance (needs a second admin)',
};

/** Mirrors the API's rules; the API remains the authority. */
export function decisionsFor(category: string, status: string): string[] {
  if (status === 'RESTRICTED') return category === 'SANCTIONS' ? [] : ['CLEARED'];
  if (status !== 'OPEN') return [];
  return category === 'SANCTIONS' ? ['SANCTIONS_CONFIRMED', 'SANCTIONS_FALSE_POSITIVE'] : ['CLEARED', 'PEP_APPROVED_EDD', 'RESTRICTED'];
}

export function reasonLabel(reviewReason: string | null): string {
  if (reviewReason === 'NAME_MISMATCH') return 'Name does not match the record';
  if (reviewReason === 'DOB_MISMATCH') return 'Date of birth does not match the record';
  if (reviewReason === 'UNUSABLE_RECORD') return 'The record is incomplete';
  return 'Needs review';
}

type ComparedFields = Pick<
  BasicReviewRow,
  | 'typedFirstName' | 'typedMiddleName' | 'typedLastName' | 'typedDateOfBirth'
  | 'recordFirstName' | 'recordMiddleName' | 'recordLastName' | 'recordDateOfBirth' | 'match'
>;

/** Typed beside record, field by field. Without a match result, nothing is shown as matching. */
export function comparison(row: ComparedFields): Array<{ field: string; typed: string; record: string; result: MatchField }> {
  const f = row.match?.fields;
  const dash = (v: string | null | undefined) => (v && v.trim() ? v : '—');
  return [
    { field: 'First name', typed: dash(row.typedFirstName), record: dash(row.recordFirstName), result: f?.firstName ?? 'MISMATCH' },
    { field: 'Last name', typed: dash(row.typedLastName), record: dash(row.recordLastName), result: f?.lastName ?? 'MISMATCH' },
    { field: 'Middle name', typed: dash(row.typedMiddleName), record: dash(row.recordMiddleName), result: f?.middleName ?? 'SKIPPED' },
    { field: 'Date of birth', typed: dash(row.typedDateOfBirth), record: dash(row.recordDateOfBirth), result: f?.dateOfBirth ?? 'MISMATCH' },
  ];
}

export function formatNaira(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '—';
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Only http(s) links from a provider become clickable; anything else (javascript:, data:) is shown as text. */
export function safeHref(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

const FLOW_STEP: Record<string, string> = {
  CREATED: 'checking the number',
  LOOKED_UP: 'AML screening running',
  COMPLIANCE_REVIEW: 'compliance review',
  IDENTITY_REVIEW: 'identity review',
};

/** For a pending KYC row whose Basic verification is not waiting on identity review. */
export function basicFlowLabel(state: string): string {
  return `In Basic verification: ${FLOW_STEP[state] ?? state.toLowerCase().replaceAll('_', ' ')}`;
}
