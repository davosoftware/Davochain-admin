# Flutter API Route Gap Analysis

> **Status 27 Oct 2026:** **superseded.** The routes this asked for are built. The app developer's current guides are `api/docs/FLUTTER_API.md` and `Reports/FLUTTER_WIRING_GUIDE.md`. Kept for history.

**Reviewed:** 1 October 2026  
**Purpose:** Tell the Flutter/API owners which mobile routes already exist,
which product work needs new routes, and what the client documentation must
say to match the current code.

## Verdict

The workspace already has a substantial Flutter integration guide in
[`FLUTTER.md`](FLUTTER.md). Do not start a second API guide from a blank page.
Use that guide as the current-client handbook, then update its endpoint index
and append the contract warnings in this report. Keep **implemented routes**
separate from **planned routes** so the Flutter developer does not build against
an API that has not been selected or implemented.

The answer to “does remaining work require new routes?” depends on the app
scope:

| Flutter scope | New routes needed? | Reason |
| --- | --- | --- |
| Crypto-only MVP using existing Quidax-backed deposit, trade, and withdrawal paths; plus gift cards/referrals | **No new business routes are required**, but fix the gift-card upload contract and document existing routes accurately. | The required route families exist. Security, idempotency, reconciliation, distributed rate limiting, and most performance work are backend changes. |
| Complete Nigerian exchange where users can fund NGN and cash NGN out to a bank | **Yes, for funding; payout route is wired but gated.** | NGN funding instructions remain unimplemented. Bank payout routes now exist, but submission is disabled by default and must not be enabled before treasury reserve, fees, webhooks, and reconciliation are verified. |
| KYC with actual identity-document photos/files | **Yes, or change the existing document route contract.** | `POST /v1/kyc/documents` records client-supplied metadata/storage key; it does not upload or verify a file. |
| Useful deposit/withdrawal activity detail with address, network, or blockchain transaction hash | **Response/schema changes are required; a detail route is recommended.** | Current history rows omit these details, and destination address/network/chain tx id are not persisted as a mobile-readable withdrawal record. |

## Routes Already Available to Flutter

All paths below use `/v1` except `/health`. Global auth is on by default;
“public” means that route opts out of the user JWT guard. `TIER_1` is an
additional KYC gate, not an alternative to authentication.

| Area | Current routes | Access / notes |
| --- | --- | --- |
| Health | `GET /health` | Public; excluded from `/v1` prefix. |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `/auth/reset/request`, `/auth/reset/confirm`; `GET /auth/me` | Login/register/refresh/reset are public; logout/change-password/me require bearer JWT. Login and refresh return `{accessToken, refreshToken, expiresIn}`. Register adds `userId`. Reset confirm returns 204 and no session. |
| Profile and balances | `GET /me`, `GET /wallets` | Bearer. `GET /auth/me` is token claims; `/me` reads profile and wallet readiness. Balances come from Davochain's ledger. |
| KYC | `GET /kyc`, `POST /kyc/tier1`, `POST /kyc/documents` | Bearer. Tier-1 submit accepts BVN or NIN plus date of birth. The document endpoint is currently metadata registration only, not an upload. |
| Assets/networks | `GET /assets`, `GET /assets/{code}/networks?purpose=deposit\|withdraw` | Public. Network availability and destination-tag requirement are data-driven. |
| Deposit addresses/history | `POST /deposits/address`, `GET /deposits/addresses`, `GET /deposits` | Address creation requires TIER_1 and is asynchronous/get-or-create. Deposit/address list is bearer-protected. There is no deposit detail route. |
| Quotes and trades | `POST /quotes`, `POST /trades`, `GET /trades`, `GET /trades/{id}` | Quote and execution require TIER_1. Trade execution requires `Idempotency-Key`; quote expires quickly and is single-use. |
| Withdrawals | `GET /withdrawals/quote`, `GET /withdrawals/quote/ngn?amount=`, `GET /withdrawals/ngn/banks`, `POST /withdrawals/ngn/verify-account`, `POST /withdrawals/crypto`, `POST /withdrawals/ngn`, `GET /withdrawals` | Bearer; bank verification and both submit routes require TIER_1. Submits require `Idempotency-Key`. All NGN bank lookup/verification/submit operations are guarded by `NGN_WITHDRAWALS_ENABLED`, default false. No withdrawal detail route exists. |
| Notifications/devices | `GET /notifications`, `POST /notifications/read`; `POST /devices`, `DELETE /devices`, `GET /devices` | Bearer. Device platform enum also permits `WEB`; Flutter should send `IOS` or `ANDROID`. |
| Gift cards | `GET /giftcards/catalogue`, `GET /giftcards/brands/{id}/image`, `POST /giftcards/trades`, `GET /giftcards/trades`, `GET /giftcards/trades/{id}`, `GET /giftcards/trades/{id}/images/{imageId}` | Catalogue/brand image are public; trade submission/history/images are bearer-protected and scoped to the owner. Submission freezes the rate; no money moves until admin review. |
| Referrals | `GET /referrals/me`, `PUT /referrals/username`, `GET /referrals/code/{code}` | Bearer except public code lookup. Referral code is supplied during registration; there is no later “attach referral” route. |
| Public settings/content | `GET /site`, `/site/logo`, `/site/social/{id}/icon`, `/site/email-image/{key}`; `GET /content/pages`, `/content/pages/{slug}`, `/content/faqs` | Public. FAQs are documented as website-only; logo/site returns a relative logo URL while social/icon and gift-card image URLs may be absolute. Resolve URLs against the configured API base correctly. |

The API controllers, rather than the route list in prose docs, are the source
of truth for exact access and route registration. See
[`api/src/main.ts`](../../api/src/main.ts),
[`api/src/auth/auth.controller.ts`](../../api/src/auth/auth.controller.ts),
[`api/src/quotes/quotes.controller.ts`](../../api/src/quotes/quotes.controller.ts),
and the other feature controllers under `api/src/`.

## Routes Needed for the Full Product

These paths are **proposals**, not implemented endpoints. Choose the provider
and its workflow first; do not publish a speculative route as a current API.

### 1. NGN funding

The current app can read `/v1/wallets` and `/v1/deposits`, but it has no route
that tells a user how to put NGN into the ledger. A funding provider commonly
requires virtual-account issuance/instructions and a provider reference.

Possible contract after provider selection:

| Proposed operation | Why it is needed |
| --- | --- |
| `POST /v1/funding/accounts` or `GET /v1/funding/instructions` | Create/retrieve the user's bank-transfer or virtual-account instructions. The exact operation depends on provider semantics. |
| `GET /v1/funding/instructions` | Read existing instructions after reinstall/sign-in without creating duplicates. |
| Existing `GET /v1/deposits` | Keep as the user's funding/deposit history; extend response to identify method, provider reference/status, and NGN hold state. |

Provider callbacks are backend-to-backend webhook routes, not Flutter routes.
The API must verify/deduplicate the callback, credit the ledger once, and only
then expose the completed deposit. Do not let Flutter submit a “credit my
wallet” request.

### 2. NGN bank payout

The Quidax adapter and Flutter-facing routes are now wired from Quidax's
[Create Bank Withdraw guide](https://docs.quidax.io/reference/create-bank-withdrawal):

```text
GET  /v1/withdrawals/ngn/banks
POST /v1/withdrawals/ngn/verify-account  { accountNumber, bankCode }
POST /v1/withdrawals/ngn                 { amount, accountNumber, bankCode }
```

Account verification and payout submission require TIER_1. Submission also
requires `Idempotency-Key`. The route calls Quidax's
`GET /banks`, `POST /banks/verify_account`, then
`POST /users/me/withdraws` with `currency: "ngn"`, `fund_uid` as the account
number, `fund_uid2` as the bank code, and our unique reference. It stores only
bank name/code and the account's last four digits.

`NGN_WITHDRAWALS_ENABLED` defaults to false. `payoutAvailable` mirrors that
setting, so the Flutter submit button must remain disabled while false. No
bank-beneficiary CRUD routes are currently required: the API resolves the name
on verification and again at submit time. Add saved-beneficiary routes only if
product requirements call for them.

**Still required before enabling:** verify live main-account NGN liquidity and
reserve separation from buy fuel, confirm Quidax fee/stamp-duty debit semantics,
confirm webhook signing and reference delivery, exercise webhook plus polling
reconciliation, and get finance approval for treating provider fees as treasury
cost. The Quidax bank payout response reports fee and stamp duty after request
creation; the customer quote only promises the payout amount plus Davochain's
configured NGN fee. This payout path is code-wired but is not production-ready.

The Quidax docs say to use `me` for the merchant main account. Therefore, the
source is the platform's Quidax NGN wallet, not the user's ledger balance or
Quidax sub-account. Do not turn on the feature until treasury controls are in
place.

### 3. KYC document upload

`POST /v1/kyc/documents` currently takes `{type, storageKey, mimeType,
sizeBytes}` from the client and creates a DB row. It does not upload bytes or
verify that the storage key/object exists. A client-provided key must not be
trusted.

Select private object storage, then choose one of these contracts:

- **Recommended for large/private files:** `POST /v1/kyc/documents/upload-intent`
  returns a short-lived upload URL and opaque upload ID; Flutter uploads bytes
  directly to private storage; `POST /v1/kyc/documents/complete` lets the API
  verify the object and record it.
- **Simpler but API-bandwidth-heavy:** change `POST /v1/kyc/documents` to
  accept multipart bytes, store them through a server-side adapter, and return
  the record. Enforce actual file type, size, malware checks, and rate limits.

The provider's verification callback/polling route is internal, not a mobile
route. The existing `GET /v1/kyc` can continue to expose the user's state,
documents' status, and limits.

### 4. Deposit/withdrawal details (recommended for a polished activity screen)

Current `GET /v1/deposits` and `GET /v1/withdrawals` responses are short
history rows. They do not expose a detail view with network, destination,
confirmations, provider reference, or blockchain transaction hash. Withdrawal
destination/network are not currently persisted on the transaction, and the
provider tx hash is not modeled as a transaction field.

Either enrich the existing list rows or add:

```text
GET /v1/deposits/{id}
GET /v1/withdrawals/{id}
```

Before adding those routes, persist the data the app needs (for example a
`WithdrawalDetail` row with asset/network/destination/tag and a chain tx ID).
Scope every read to the authenticated owner. Return a redacted destination in
lists and only the exact detail fields the product needs. Do not store private
keys or expose raw Quidax payloads. This is useful but not necessary if the MVP
only needs the existing status lists and the immediate withdrawal response.

### Optional: pagination and combined activity

Current activity lists mostly accept `limit` and cap it at 100; they do not
provide a cursor/next-page token. If users need deep history/infinite scroll,
add cursor pagination to the existing routes (`createdAt` + stable ID cursor)
rather than creating `/history-v2` routes. A combined `GET /v1/activity` is
optional convenience only; Flutter can combine the existing trade/deposit/
withdrawal lists. Neither is a product blocker for a small MVP.

## Contract Mismatches to Fix Before Calling the Existing API “Perfectly Documented”

| Finding | Current behavior | Documentation/client action |
| --- | --- | --- |
| Quote DTO requires both assets | `QuoteDto.fromAsset` and `toAsset` are required strings even though a buy/sell only uses one side semantically. | Document canonical values for all sides: buy `ngn -> coin`, sell `coin -> ngn`, swap `coin -> coin`; include both fields every time. Or change DTO decorators to make side-specific fields optional and validate by side. |
| POST success status codes | Nest defaults POST to 201 unless an explicit `@HttpCode` overrides it. Auth login/refresh/reset routes have explicit statuses; quotes/trades/address/crypto withdrawal/gift-card/device routes mostly use default POST behavior. | Document exact success status for each route. Flutter should accept the documented 201/200 and parse the JSON body; do not assume every successful POST is 200. |
| Gift-card upload payload limit | `SubmitGiftCardDto` permits up to five data URLs with a 5 MB per-image decoder limit, but `main.ts` limits JSON bodies to 1 MB total. Base64 also expands the payload. | Do not tell Flutter that 5 MB images can be sent as JSON. Prefer object storage + upload-intent/complete routes. If retaining base64 temporarily, set a route-specific body limit and explicit aggregate-size cap, and update docs to the real limit. |
| KYC documents wording | Existing route registers metadata only; no uploader exists. | Mark upload as unavailable until the storage route/adapter is implemented. Never have Flutter invent or submit arbitrary `storageKey`. |
| Withdrawal quote vs execution | Quote response says `totalDeducted` includes amount + network fee + platform fee, while current withdrawal execution locks amount + platform fee only. Network fee lookup can fail and is currently reported as zero. | Do not build fee arithmetic as final until backend/provider semantics are fixed. The quote response is not currently a reliable guarantee of the debit. |
| Histories lack details and pagination | Deposits/withdrawals list rows return limited fields and the histories cap at 100; no cursor. Gift-card history is fixed at 100. | Document first-page behavior; add cursor query/response only when required. Add detail routes/fields before promising explorers or recipient recall. |
| New route status | NGN bank list, verify, and submit routes are wired; submit is disabled by default. KYC review remains manual; push needs Firebase configuration. | Gate the payout UI on `payoutAvailable`; do not treat code wiring as production availability. |
| Error policy | Nest validation can return `message` as a string or array; some user errors distinguish auth/KYC/limits/provider. | Document error status + shape and parse both string/list. Distinguish a definite 400 failure from `RECONCILING`, which is a successful response state, not a retryable failure. |

## Existing Routes That Do Not Need Replacing

- `POST /v1/quotes` + `POST /v1/trades` already implement buy/sell/swap. No
  separate `POST /buy`, `/sell`, or `/swap` routes are required.
- `GET /v1/trades/{id}` already supports polling a quote execution that is
  `PROCESSING` or `RECONCILING`.
- `POST /v1/deposits/address` is get-or-create and the response includes
  `status`, `address`, `destinationTag`, `requiresTag`, `confirmations`, and
  `usable`. Flutter polls this response; no mobile address-status route is
  needed for the current contract.
- Referral attachment is part of `POST /v1/auth/register`; only the public
  check and authenticated dashboard/name routes are needed.
- KYC review/provider callbacks, webhook ingestion, Quidax sync, reconciliation,
  and fee claims are backend/admin operations, not Flutter routes.
- Idempotency races, throttling, cache invalidation, job reliability, and
  horizontal scaling are backend implementation changes. They do not require
  new mobile paths, though enabling a limiter makes 429 behavior part of the
  client contract.

## How to Make the Flutter Route Documentation Reliable

Keep [`FLUTTER.md`](FLUTTER.md) as the high-level integration guide, but treat
the code-first Swagger document at `/docs` (development only) and controller
DTOs as the contract source. For each route, document:

1. Exact method/path and whether `/v1` is included in the base URL.
2. Authentication, KYC tier, and required permission (if applicable).
3. Request body/query schema, string money types, size limits, and required
   idempotency header.
4. Exact success status and response schema, including nullable fields and
   enums/state transitions.
5. Error status/body shapes, retry safety, and whether money may be locked or
   moved for that result.
6. Pagination, cache behavior, polling interval, and eventual consistency.
7. A contract test or captured example generated from the real API, not a
   manually invented payload.

Publish two sections: **Available now** (implemented/tested route contract) and
**Planned** (provider/decision-gated routes). Do not document a proposed URL as
callable until its controller, DTO, guard, service, response, and tests exist.

### Suggested documentation delivery order

1. Correct the existing guide's known payload/status/fee/upload caveats.
2. Freeze and test the crypto-only route contract; give that section to the
   Flutter developer now.
3. Decide NGN funding and KYC storage providers; bank payout routes are wired,
  but verify the live Quidax contract and treasury reserve before enabling.
4. Add the funding and document-upload route contracts to the planned section,
  implement them, then move them to available after integration tests pass.
5. Add deposit/withdrawal details and cursor pagination only if product screens
   need them; enrich existing routes where possible instead of multiplying
   similar endpoints.
