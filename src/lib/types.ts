import type { BasicReviewRow } from './types-admin';

/**
 * Response shapes from the API.
 *
 * Every monetary field is a STRING, deliberately — see the API's money rules.
 * Parsing to a number happens only at the point of display.
 */

export interface RateConfig {
  asset: string;
  name: string;
  gateNgnPerUsd: string;
  swapFeeUsd: string;
  floorUsd: string;
  maxTradeUsd: string;
  withdrawalFee: string;
  quoteTtlSeconds: number;
  effectiveFrom: string;
  setBy: string;
}

export interface InventoryRow {
  asset: string;
  held: string;
  target: string;
  soldSinceRefill: string;
  avgReceivedUsd: string;
  priceNowUsd: string;
  vsAvgPct: string;
  restockCostUsd: string;
  marginLostPerDayNgn: string;
  belowFloor: boolean;
  fallbackEnabled: boolean;
}

export interface FuelLevel {
  balanceNgn: string;
  dailyBurnNgn: string;
  daysOfCover: string;
}

export interface DriftRow {
  asset: string;
  ledgerTotal: string;
  receivableTotal: string;
  lockedTotal: string;
  heldInSubAccounts: string;
  drift: string;
  withinTolerance: boolean;
  partial: boolean;
}

export interface SettlementLeg {
  kind: string;
  state: string;
  amount: string;
  reference: string;
  lastError: string | null;
}

export interface AdminTransaction {
  id: string;
  user: string;
  type: 'BUY' | 'SELL' | 'SWAP' | 'DEPOSIT' | 'WITHDRAWAL' | string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RECONCILING' | 'ON_HOLD' | string;
  quidaxRawStatus: string | null;
  fromAsset: string | null;
  fromAmount: string | null;
  toAsset: string | null;
  toAmount: string | null;
  settledFrom: string | null;
  failureReason: string | null;
  legs: SettlementLeg[];
  createdAt: string;
}

export interface ClaimableRow {
  asset: string;
  users: number;
  held: string;
  accruedUsd: string;
  currentUsd: string;
  driftPct: string;
  direct: number;
  convert: number;
  belowThreshold: number;
  estimatedCalls: number;
}

export interface MarginRow {
  asset: string;
  trades: number;
  expectedMarginNgn: string;
}

export interface PendingKyc {
  id: string;
  userId: string;
  tier: string;
  status: string;
  bvnLast4: string | null;
  ninLast4: string | null;
  submittedAt: string | null;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    /** The latest Basic verification waiting for identity review, if any. */
    kycVerifications?: BasicReviewRow[];
  };
  documents: { id: string; type: string; status: string; uploadedAt: string }[];
}

/** One Advanced check waiting for a person (GET /v1/admin/kyc/advanced, spec 2026-10-21 §8). */
export interface AdvancedReviewRow {
  id: string;
  step: 'IDENTITY' | 'ADDRESS';
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
  idType: string | null;
  addressKind: string | null;
  documents: { id: string; type: string; mimeType: string }[];
  /** null when the customer's verified Basic record can't be read: decide from the files. */
  verified: {
    firstName: string;
    middleName: string | null;
    lastName: string;
    dateOfBirth: string;
    address: { street: string | null; city: string | null; state: string | null };
  } | null;
  /** A minimal summary kept by the API: never the ID photo, a full number, or the document's text. */
  findings: {
    id?: { firstName: string | null; middleName: string | null; lastName: string | null; dateOfBirth: string | null; expiry: string | null; documentName: string | null; valid: boolean };
    liveness?: { live: boolean; probability: number | null; faceDetected: boolean; multiFace: boolean };
    match?: { confidence: number | null };
    noPortrait?: boolean;
    readAgain?: boolean;
    address?: { source: 'BILL' | 'TEXT'; name: string; date: string | null; address: string; provider?: string | null };
  };
  reviewReasons: string[];
  docLast4: string | null;
}

export interface AdvancedQueue {
  waiting: number;
  approvedToday: number;
  rejectedToday: number;
  rows: AdvancedReviewRow[];
}
