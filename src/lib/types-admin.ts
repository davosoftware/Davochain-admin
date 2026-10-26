export interface UserListRow {
  /** 1 is the most recent sign-up. Continues across pages. */
  serial: number;
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  kycTier: string;
  kycStatus: string;
  isTest: boolean;
  walletReady: boolean;
  suspendedReason: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UserBalance {
  asset: string;
  name: string;
  isFiat: boolean;
  available: string;
  locked: string;
  total: string;
}

export interface UserDetail extends Omit<UserListRow, 'walletReady' | 'suspendedReason'> {
  suspendedAt: string | null;
  suspendedReason: string | null;
  suspendedBy: string | null;
  transactionCount: number;
  quidax: { quidaxUserId: string; quidaxSn: string; aliasEmail: string } | null;
  kyc: {
    tier: string;
    status: string;
    bvnLast4: string | null;
    ninLast4: string | null;
    submittedAt: string | null;
    rejectionReason: string | null;
  } | null;
  balances: UserBalance[];
  /** Where this customer's withdrawals may go (Part 2). Bank numbers are masked. */
  savedDestinations?: {
    bankAccounts: SavedBankAccountView[];
    cryptoAddresses: SavedCryptoAddressView[];
  };
  /** Where this customer RECEIVES crypto (spec 2026-10-26). Not the saved withdrawal addresses above. */
  depositAddresses?: {
    id: string;
    asset: string;
    network: string;
    networkLabel: string;
    status: 'PENDING' | 'ACTIVE' | 'FAILED' | 'DISABLED';
    address: string | null;
    destinationTag: string | null;
    autoCreated: boolean;
    requestedAt: string;
    failedAt: string | null;
  }[];
}

export interface SavedBankAccountView {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumberMasked: string;
  accountName: string;
  nickname: string | null;
  usableFrom: string;
  usableNow: boolean;
}

export interface SavedCryptoAddressView {
  id: string;
  assetCode: string;
  networkId: string;
  networkLabel: string;
  address: string;
  destinationTag: string | null;
  nickname: string | null;
  usableFrom: string;
  usableNow: boolean;
}

export interface UserStats {
  total: number;
  active: number;
  suspended: number;
  verified: number;
  withBalance: number;
}

/** The two fees are separate ladders and never share a row. */
export type FeeKind = 'RATE' | 'SELL_RATE' | 'SWAP' | 'WITHDRAWAL' | 'NGN_WITHDRAWAL';

export interface Band {
  id?: string;
  minAmount: string;
  maxAmount: string | null;
  /** ₦ per $ on a RATE ladder; flat $ on a SWAP one. */
  value: string;
}

export interface FeeLadderView {
  kind: FeeKind;
  /** What the FEE is charged in: "₦ per $", "$" or "₦". */
  unit: string;
  /** What the RUNGS are measured in. Naira only for the cash-out ladder. */
  bandUnit: 'USD' | 'NGN';
  global: {
    scheduleId: string;
    effectiveFrom: string;
    setBy: string;
    bands: Band[];
  } | null;
  assets: {
    asset: string;
    name: string;
    usesGlobal: boolean;
    scheduleId: string | null;
    effectiveFrom: string | null;
    setBy: string | null;
    bands: Band[];
  }[];
}

export interface BroadcastRow {
  id: string;
  title: string;
  body: string;
  audience: 'ALL' | 'SELECTED';
  recipientCount: number;
  readCount: number;
  /** The admin's id. `sentByName` is what a screen shows. */
  sentBy: string;
  sentByName: string;
  createdAt: string;
}

export type AdminRole = 'OWNER' | 'SUB_ADMIN';

export interface PermissionGroup {
  label: string;
  permissions: { key: string; label: string; hint?: string }[];
}

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  role: AdminRole;
  permissions: string[];
  hasAvatar: boolean;
  /** Bumped whenever the picture changes, so a cached one is never stale. */
  avatarVersion: string | null;
  passwordChangedAt: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminActivity {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
}

/** GET /v1/admin/me — the profile plus what the dashboard needs to render. */
export interface AdminMe extends AdminProfile {
  idleTimeoutMs: number;
  idleRemainingMs: number | null;
  permissionCatalogue: PermissionGroup[];
}

export interface AdminSessionRow {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  ip: string | null;
  userAgent: string | null;
  isCurrent: boolean;
}

export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  admin: { id: string; email: string; name: string; role: AdminRole };
}

export interface AuditPage {
  rows: AuditEntry[];
  nextCursor: string | null;
  total: number;
  actors: { id: string; email: string; name: string }[];
}

/** GET /v1/admin/overview — every figure on the dashboard, in one pass. */
export interface OverviewSnapshot {
  users: {
    total: number;
    active: number;
    suspended: number;
    kycApproved: number;
    kycPending: number;
  };
  ngn: {
    deposits: string;
    withdrawals: string;
    spentBuying: string;
    fromSelling: string;
    available: string;
    locked: string;
  };
  range: { from: string | null; to: string | null };
  /** Dollars that actually moved. */
  crypto: {
    boughtUsd: string;
    soldUsd: string;
    swappedUsd: string;
    depositedUsd: string;
    withdrawnUsd: string;
  };
  /** What the platform kept. Two currencies, never added together. */
  earnings: {
    rateFeeNgn: string;
    swapFeeUsd: string;
    withdrawalFeeUsd: string;
    ngnWithdrawalFeeNgn: string;
    /** The margin on traded gift cards. Naira, and can be negative. */
    giftCardProfitNgn: string;
  };
  /** Counts — how many of each thing happened, and how they ended. */
  transactions: {
    total: number;
    buys: number;
    sells: number;
    swaps: number;
    deposits: number;
    withdrawals: number;
    pending: number;
    failed: number;
  };
}

/** GET /v1/admin/site-settings — everything the public website reads. */
export interface SiteSettings {
  companyName: string;
  supportEmail: string;
  phone: string | null;
  address: string | null;
  iosVersion: string | null;
  androidVersion: string | null;
  iosStoreUrl: string | null;
  androidStoreUrl: string | null;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  // Social links live in their own table now — see SocialLinkRow.
  emailLegalName: string | null;
  emailAddressLine: string | null;
  emailOptInNote: string | null;
  emailUnsubscribeNote: string | null;
  emailUnsubscribeUrl: string | null;
  hasLogo: boolean;
  logoVersion: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

/**
 * GET /v1/admin/credentials — which partner keys are set.
 *
 * Deliberately has no field for the value. Nothing returns one.
 */
export interface CredentialsView {
  encryptionConfigured: boolean;
  credentials: {
    name: string;
    group: string;
    label: string;
    hint: string;
    envVar: string;
    source: 'database' | 'environment' | 'unset';
    last4: string | null;
    updatedAt: string | null;
    updatedBy: string | null;
  }[];
}

// ── CMS ─────────────────────────────────────────────────────

/** GET /v1/admin/cms/pages */
export interface StaticPageRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  /** Markdown, which is what the editor edits. */
  body: string;
  isPublished: boolean;
  /** Linked from the apps by slug: editable, but not renameable or deletable. */
  isSystem: boolean;
  sortOrder: number;
  updatedAt: string;
  updatedBy: string | null;
  /** Rendered server-side, so the preview matches the website exactly. */
  html: string;
}

/** GET /v1/admin/cms/faqs */
export interface FaqRow {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  isPublished: boolean;
  sortOrder: number;
  updatedAt: string;
  updatedBy: string | null;
}

/** GET /v1/admin/cms/email-templates */
export interface EmailTemplateRow {
  key: string;
  label: string;
  hint: string;
  group: string;
  /** Where in the API it is sent from. */
  sentBy: string;
  /** Set when the code path exists but the rail behind it does not yet. */
  pending: string | null;
  /** Placeholders this email may use. Sent with the list, not fetched. */
  variables: string[];
  /** Absolute, so a mail client can fetch it. Null when none is set. */
  imageUrl: string | null;
  imageAlt: string | null;
  subject: string;
  body: string;
  isActive: boolean;
  edited: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  defaultSubject: string;
  defaultBody: string;
}

/** POST /v1/admin/cms/email-templates/{key}/preview */
export interface EmailPreview {
  key: string;
  subject: string;
  html: string;
  text: string;
  /** Placeholders the catalogue does not define — almost always a typo. */
  unknownVariables: string[];
  allowedVariables: string[];
  sampleValues: Record<string, string>;
  /** null when no test send was asked for. */
  sent: boolean | null;
  smtpConfigured: boolean;
}

/**
 * Where an invitation went, and how long it lasts.
 *
 * Deliberately has no field for a credential. Creating an admin no longer
 * produces one — they choose their own from the emailed link.
 */
export interface AdminInvite {
  sentTo: string;
  /** False when SMTP is not configured, or the mail server refused it. */
  delivered: boolean;
  expiresAt: string;
}

/** GET /v1/admin/cms/socials — one network in the email footer and on the site. */
export interface SocialLinkRow {
  id: string;
  label: string;
  url: string;
  isEnabled: boolean;
  sortOrder: number;
  /** An uploaded icon. Null means the letterform below is drawn instead. */
  iconUrl: string | null;
  /** What an email shows when there is no icon. */
  glyph: string;
  updatedAt: string;
  updatedBy: string | null;
}

/** GET /v1/admin/cms/socials/known — the networks worth offering by name. */
export interface KnownNetworks {
  networks: { label: string; glyph: string; placeholder: string }[];
  /** The size to upload an icon at. */
  iconPixels: number;
}

// ── earnings ────────────────────────────────────────────────

/** Which of the four fee ladders produced an earning. */
export type EarningKind = 'RATE' | 'SWAP' | 'WITHDRAWAL' | 'NGN_WITHDRAWAL' | 'GIFT_CARD';

/** The currency a fee was CHARGED in. Never converted into the other one. */
export type EarningCurrency = 'NGN' | 'USD';

/**
 * One fee the platform kept, and the trade that produced it.
 *
 * `total` is what the trade was worth gross and `amount` is what reached the
 * user, both in the fee's own currency — so amount + fee = total on every row,
 * whichever side the fee was taken from.
 */
export interface EarningRow {
  id: string;
  reference: string;
  kind: EarningKind;
  type: string;
  currency: EarningCurrency;
  fee: string;
  amount: string;
  total: string;
  fromAsset: string | null;
  toAsset: string | null;
  userId: string;
  name: string;
  email: string;
  createdAt: string;
}

/**
 * What a set of earnings adds up to.
 *
 * Two figures, never one. Adding naira to dollars needs an exchange rate, and
 * picking one would make today's rate silently rewrite last month's earnings.
 */
export interface EarningTotals {
  count: number;
  ngn: string;
  usd: string;
}

/** GET /v1/admin/earnings — one page, plus what the whole filtered set comes to. */
export interface EarningsPage {
  rows: EarningRow[];
  page: number;
  pageSize: number;
  total: number;
  /** Everything matching the filters, not just this page. */
  totals: EarningTotals;
  /** Date-scoped but tab-independent, so the ladder figures stay still. */
  summary: {
    all: EarningTotals;
    byKind: Record<EarningKind, EarningTotals>;
  };
}

// ── the transactions manager ────────────────────────────────

export type TxTab = 'ALL' | 'BUY' | 'SELL' | 'SWAP' | 'DEPOSIT' | 'WITHDRAWAL' | 'APPROVAL';
export type AmountType = 'DEBIT' | 'CREDIT';

export interface TxLeg {
  kind: string;
  state: string;
  amount: string;
  reference: string;
  lastError: string | null;
}

/**
 * One transaction, as the manager shows it.
 *
 * `unit` is the currency all three money figures are stated in — a transaction
 * has two sides in two assets, so there is no single currency for a row, but
 * there is one for the fee and that is the side the figures are given in.
 * amount + fee = total on every row.
 */
export interface TxRow {
  id: string;
  reference: string;
  type: string;
  status: string;
  amountType: AmountType;

  unit: string;
  total: string;
  amount: string;
  fee: string;
  /** What the chain took on a withdrawal. A cost, never revenue. */
  networkFee: string | null;

  mode: string;
  modeLabel: string;
  fromAsset: string | null;
  toAsset: string | null;
  fromAmount: string | null;
  toAmount: string | null;

  settledFrom: string | null;
  quidaxRawStatus: string | null;
  failureReason: string | null;
  legs: TxLeg[];

  userId: string;
  name: string;
  email: string;
  createdAt: string;
  completedAt: string | null;

  /** A naira deposit held over the depositor's tier limit, waiting on a person. */
  needsApproval: boolean;

  /**
   * Whether releasing this held deposit would now be inside the depositor's
   * limits, asked fresh against their tier and the caps as they stand.
   *
   * Null on anything not awaiting approval. True means the reason it was held
   * has gone away — their tier was raised, or the cap was — so letting it
   * through overrides nothing. It never releases anything by itself.
   */
  withinLimitsNow: boolean | null;
  /** Why it still would not be allowed, when it would not. */
  limitReason: string | null;
  /** A Payrep bank deposit: rejecting it sends the money back to the account it came from. */
  returnsToSender?: boolean;

  reviewedBy: string | null;
  reviewedAt: string | null;
}

/** GET /v1/admin/transactions/manager */
export interface TxPage {
  rows: TxRow[];
  page: number;
  pageSize: number;
  total: number;
  /** How many of each type in the date range, for the tabs. */
  counts: Record<string, number>;
  /** Held deposits waiting on somebody. Never date-scoped — waiting is now. */
  awaiting: number;
  /** Transactions whose outcome is genuinely unknown. Never actionable by hand. */
  stuck: number;
}

// ── referrals and rewards ───────────────────────────────────

export type KycTierName = 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3';
export type ReferralStatus = 'PENDING' | 'COMPLETED' | 'VOID';
export type ReferralRewardStatus = 'PENDING' | 'RELEASED' | 'VOID';

/**
 * The offer.
 *
 * Changing any of the amounts affects only the NEXT signup — the figures are
 * copied onto a reward when it is promised. The two caps are the exception:
 * they are read at payout, so raising one releases rewards that were paused.
 */
export interface ReferralSettings {
  isEnabled: boolean;
  referrerRewardNgn: string;
  refereeRewardNgn: string;
  unlockTier: KycTierName;
  refereeTradeVolumeNgn: string;
  maxPaidReferralsPerUser: number;
  maxEarningsPerUserNgn: string;
  headline: string;
  terms: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface ReferralRewardView {
  amountNgn: string;
  status: ReferralRewardStatus;
  /** What it is still waiting for. Null once released. */
  blockedReason: string | null;
  releasedAt: string | null;
}

export interface ReferralRow {
  id: string;
  codeUsed: string;
  status: ReferralStatus;
  createdAt: string;
  completedAt: string | null;
  referrer: { name: string; email: string };
  referee: { name: string; email: string; kycTier: KycTierName };
  referrerReward: ReferralRewardView | null;
  refereeReward: ReferralRewardView | null;
}

/** GET /v1/admin/referrals */
export interface ReferralsPage {
  rows: ReferralRow[];
  page: number;
  pageSize: number;
  total: number;
  /**
   * What the programme has cost and what it still owes. Never added together:
   * one is money that has gone, the other may never go at all.
   */
  totals: {
    paidNgn: string;
    paidCount: number;
    pendingNgn: string;
    pendingCount: number;
  };
}

// ── gift cards ──────────────────────────────────────────────

export type GiftCardTradeStatus = 'PENDING' | 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED';

/**
 * A currency a card type may be priced in.
 *
 * Served by the API rather than listed in the dashboard, so the dropdown can
 * only offer codes the app has a symbol for.
 */
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  /** False for the Nordic krona and the złoty — "500 kr", not "kr 500". */
  symbolFirst: boolean;
}

export interface GiftCardCategoryRow {
  id: string;
  name: string;
  isActive: boolean;
  /** How many brands hang off it — what stops a delete. */
  brandCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GiftCardBrandRow {
  id: string;
  name: string;
  category: { id: string; name: string };
  /** A path, not a full URL. Versioned, so it can be cached forever. */
  imageUrl: string | null;
  isActive: boolean;
  typeCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * One tradeable variety of a brand — Amazon E-code, Amazon Physical.
 *
 * The rate lives here rather than on the brand because the two are not worth
 * the same, and each carries its own currency: a UK card is priced in pounds.
 */
export interface GiftCardTypeRow {
  id: string;
  name: string;
  brand: { id: string; name: string };
  category: { id: string; name: string };
  currency: string;
  /** From the API, so no screen carries its own code-to-symbol table. */
  currencySymbol: string;
  minAmount: string;
  maxAmount: string;
  /** Naira per one unit of `currency`. What the app quotes. */
  rateNgn: string;
  isActive: boolean;
  tradeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GiftCardTradeRow {
  id: string;
  user: { name: string; email: string };
  brand: string;
  type: string;
  currency: string;
  currencySymbol: string;
  faceValue: string;
  /** The rate quoted, frozen at submission. */
  rateNgn: string;
  expectedNgn: string;
  status: GiftCardTradeStatus;
  approvedValue: string | null;
  approvedRateNgn: string | null;
  /** Admin-only. Never reaches a user endpoint. */
  actualRateNgn: string | null;
  creditedNgn: string | null;
  /** What the desk made. Can be negative when a card cleared below the quote. */
  profitNgn: string | null;
  reason: string | null;
  hasCode: boolean;
  images: string[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/** GET /v1/admin/giftcards/trades/{id} — adds the decrypted code. */
export interface GiftCardTradeDetail extends GiftCardTradeRow {
  code: string | null;
  /** True when a code was stored but could not be decrypted. */
  codeUnreadable: boolean;
}

/** GET /v1/admin/giftcards/trades */
export interface GiftCardTradesPage {
  rows: GiftCardTradeRow[];
  page: number;
  pageSize: number;
  total: number;
  /** Waiting on a person. Never date-scoped. */
  waiting: number;
  totals: { profitNgn: string; creditedNgn: string };
}

/** Naira withdrawals still on their way to banks. */
export interface NgnInFlight {
  count: number;
  totalNgn: string;
}

/** GET / PUT /v1/admin/withdrawals/ngn: the naira-withdrawal switch. */
export interface NgnWithdrawalsState {
  enabled: boolean;
  /** 'override' = set from this dashboard; 'server' = NGN_WITHDRAWALS_ENABLED. */
  source: 'override' | 'server';
  serverSetting: boolean;
  updatedAt: string | null;
  updatedBy: { id: string; name: string; email: string } | null;
  inFlight: NgnInFlight;
}

export interface AlertRecipientRow {
  id: string;
  type: string;
  email: string;
  enabled: boolean;
}

export interface AlertRecipientsView {
  /** False when the server has no ALERT_DEFAULT_RECIPIENTS: a type with nobody here reaches nobody. */
  fallbackConfigured: boolean;
  types: Array<{
    type: string;
    label: string;
    description: string;
    security: boolean;
    usingEnvFallback: boolean;
    recipients: AlertRecipientRow[];
  }>;
}

// ── Basic verification, compliance review and Dojah (API Tasks 10–13) ──

export type MatchField = 'MATCH' | 'MISMATCH' | 'SKIPPED';

/** The latest IDENTITY_REVIEW verification on a pending KYC row. Never the raw BVN/NIN. */
export interface BasicReviewRow {
  id: string;
  idType: 'BVN' | 'NIN';
  idLast4: string;
  typedFirstName: string;
  typedMiddleName: string | null;
  typedLastName: string;
  typedDateOfBirth: string;
  typedAddress: { street?: string; city?: string; state?: string; lga?: string; postcode?: string; stateOfOrigin?: string };
  recordFirstName: string | null;
  recordMiddleName: string | null;
  recordLastName: string | null;
  recordDateOfBirth: string | null;
  recordGender: string | null;
  recordUsable: boolean | null;
  match: { matched: boolean; swapped: boolean; fields: { firstName: MatchField; lastName: MatchField; middleName: MatchField; dateOfBirth: MatchField } } | null;
  reviewReason: string | null;
  createdAt: string;
  /** The verification state; only IDENTITY_REVIEW is decided on the KYC page. */
  state?: string;
  screening: { status: string } | null;
}

export interface ComplianceCaseRow {
  id: string;
  status: string;
  category: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  possible: boolean;
  riskLevel: string | null;
  createdAt: string;
  proposedBy: string | null;
  user: { id: string; firstName: string; lastName: string; email: string; amlStatus: string } | null;
}

export interface AmlMatchView {
  name: string | null;
  aliases: string[];
  dateOfBirth: string | null;
  country: string | null;
  positions: string[];
  sourceType: string | null;
  score: number | null;
  articles: { title: string; url: string }[];
}

export interface ComplianceCaseDetail {
  case: {
    id: string;
    userId: string;
    screeningId: string;
    status: string;
    category: string;
    priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
    possible: boolean;
    riskLevel: string | null;
    entityId: string | null;
    rescreenCount: number;
    rescreenResult: string | null;
    proposedBy: string | null;
    proposedAt: string | null;
    proposalReason: string | null;
    confirmedBy: string | null;
    confirmedAt: string | null;
    decidedBy: string | null;
    decidedAt: string | null;
    reason: string | null;
    reportedToAuthority: boolean | null;
    reportReference: string | null;
    reportedAt: string | null;
    createdAt: string;
  };
  user: { id: string; firstName: string; lastName: string; email: string; amlStatus: string } | null;
  screening: {
    status: string;
    matchStatus: string | null;
    riskLevel: string | null;
    entityId: string | null;
    inputs: { names?: string; date_of_birth?: string; gender?: string; nationality?: string };
    matches: AmlMatchView[] | null;
    sendCount: number;
    possibleDuplicateCharge: boolean;
  } | null;
  verification: {
    idType: string;
    idLast4: string;
    typedFirstName: string;
    typedMiddleName: string | null;
    typedLastName: string;
    typedDateOfBirth: string;
    recordFirstName: string | null;
    recordMiddleName: string | null;
    recordLastName: string | null;
    recordDateOfBirth: string | null;
    recordGender: string | null;
  } | null;
  eligibility: { canConfirm: boolean; why: string | null };
}

export interface DojahReadiness {
  ready: boolean;
  enabled: boolean;
  checkedAt: string;
  /** fix: what to do when a check fails, in plain words. */
  checks: { key: string; ok: boolean; required: boolean; detail: string; fix?: string }[];
  balance: { naira: number | null; minimum: number; warnAt: number | null; asOf: string | null };
  observed: { peakHour7d: number; peakDay7d: number };
  /** What applies now, and whether each value was set on the Dojah screen or is the server default. */
  settings: import('./dojah').DojahSettings;
}

export interface DojahUnknownCall {
  kind: 'LOOKUP' | 'AML';
  id: string;
  userId: string;
  at: string;
  outcome: string;
  possiblyCharged: boolean;
  possibleDuplicateCharge: boolean;
  entityId: string | null;
}
