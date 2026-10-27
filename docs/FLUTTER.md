# Flutter integration

> **Updated 23 October 2026: this page is out of date. Use the API's own documents instead.**
>
> - **Start here:** `api/docs/CUSTOMER_JOURNEY_API_GUIDE.md`. One customer through the whole app in order, with real responses captured on 23 Oct: register → email code → Basic verification → sign in again → **naira account number** → money in → crypto deposit address → buy, sell, swap → naira and crypto withdrawals → gift cards → Advanced verification → sign out.
> - **Postman collection** that saves and refreshes tokens by itself: `api/docs/postman/DavoChain-Customer-Journey.postman_collection.json`.
> - **Full reference** (every field and error): `api/docs/FLUTTER_API.md`.
>
> **What changed since this page was written** (the rest of this page doesn't reflect it):
> - Naira deposits and payouts **are live** through Payrep, and KYC documents are stored. The "not implemented" notes below are no longer true.
> - **The naira account number needs no BVN or NIN** (changed later on 23 Oct). It's opened automatically after Basic verification, named after the customer as on their ID (e.g. `DavoChain-ADA CHIOMA OBI`). The app just calls `GET /v1/deposits/ngn/account`: `200` with the number, or `202 {"status":"PENDING"}` for a few seconds while it opens. `POST` needs no body. A push `ngn_account.ready` says when it's ready. Remove any "enter your BVN to get an account" screen.
> - **Email confirmation:** a 6-digit code is emailed at sign-up. Until it's entered, money, verification and the naira account answer `403 code: "EMAIL_NOT_VERIFIED"`.
> - **`phone` is required** at sign-up and must be unique.
> - **Approval signs the customer out:** when Basic verification passes (at once, or by an admin) or an Advanced step passes, every refresh token stops working. Show "You're verified, please sign in again" and go to sign-in.
> - **Refresh:** the access token lasts 15 minutes; the refresh token lasts 30 days and works **once**. **Save both** new tokens after every refresh. Two refreshes at the same moment: one wins and the other gets `401`. Reusing an already-used refresh token signs out that whole session. Run one refresh at a time.
> - Withdrawals go only to **saved** bank accounts and addresses (saved with the password), and every money request needs an `Idempotency-Key`.

Everything the app needs, in the order you will build it.

Base URL `https://api.davochain.com/v1`. Locally `http://10.0.2.2:3000/v1` from
the Android emulator, `http://localhost:3000/v1` from iOS Simulator, and your
machine's LAN address from a real device.

Every JSON shape on this page was captured from the running API, not written
from memory. Where a shape looks surprising, it is the shape.

This guide describes the routes currently present; some unfinished product
flows and implementation mismatches are called out in
[Flutter API route gaps](FLUTTER_API_ROUTE_GAP_ANALYSIS.md). In particular,
NGN funding/payout are not implemented, KYC document storage is not wired, and
the current gift-card request limit conflicts with the documented image sizes.
Do not treat a planned route in that report as available until it is implemented
and tested.

---

## The five rules

Read these before writing a line. Each one is a bug that has to be designed out
rather than fixed later.

1. **Every amount is a string.** Parse to `Decimal`, never `double`. Send them
   as strings too.
2. **One refresh at a time**, queued. Two concurrent refreshes sign the user out.
3. **Generate an `Idempotency-Key` once per tap** and reuse it across retries of
   that tap.
4. **Never auto-requote a live quote.** Let it visibly expire.
5. **`RECONCILING` is not a failure.** Never tell the user the money is gone.

---

## Auth

Email and password. Two tokens: a short access JWT and a long opaque refresh
token.

```
POST /v1/auth/register          { email, password, firstName, lastName, phone?, referralCode? }
POST /v1/auth/login             { email, password }
POST /v1/auth/refresh           { refreshToken }
POST /v1/auth/logout            { refreshToken }              → 204
POST /v1/auth/change-password   { currentPassword, newPassword } → 204
POST /v1/auth/reset/request     { email }                     → 200, always
POST /v1/auth/reset/confirm     { email, code, newPassword }  → 204
GET  /v1/auth/me
```

**Register, login and refresh all return the same shape.** One
`AuthTokens.fromJson`, one place that stores a session.

```jsonc
// POST /v1/auth/register  → 201
{ "accessToken": "eyJ…", "refreshToken": "…", "expiresIn": "15m",
  "userId": "9b4e20f9-…" }

// POST /v1/auth/login and /v1/auth/refresh  → 200
{ "accessToken": "eyJ…", "refreshToken": "…", "expiresIn": "15m" }
```

Register adds `userId`, which the others do not — everything else is identical,
and `userId` is also in the JWT, so a parser that ignores it is fine.

> Registering signs the person in. There is no separate login call after it.

```
GET /v1/auth/me → { id, email, kycTier, kycStatus }
```

Read straight from the JWT, so it is free and always agrees with what the guard
will decide. `GET /v1/me` (below) is the fuller profile and hits the database.

Send `Authorization: Bearer <accessToken>` on everything except register, login,
refresh, `/health`, `/assets`, `/assets/{code}/networks` and `/site`.

### Password policy

Ten characters minimum, 128 maximum, at least one letter and one digit. Validate
client-side with those exact rules so the user is not told after a round trip.

### Forgot password

Two steps, one screen.

```jsonc
// POST /v1/auth/reset/request  { "email": "…" }  → 200
{ "message": "If that email belongs to an account, a six-digit code is on its way to it." }
```

> **That answer is identical whether or not the email matched**, and it always
> returns 200. Do not branch on it — a different response for a real address is
> a way to find out who has an account here. Show step two either way; a wrong
> address simply never receives a code.

```
POST /v1/auth/reset/confirm  { email, code, newPassword }  → 204
```

A wrong code returns **400** with how many tries are left — show it verbatim,
because "4 tries left" is what stops somebody guessing blind and then being
locked out with no warning. Five wrong ones burn the code. So does using it:
codes are single-use and expire after ten minutes.

**Confirm returns no session, deliberately.** Proving control of an inbox is
weaker than knowing a password, so the app sends them to the sign-in screen with
the address filled in. Every device that was signed in has been signed out — if
the account was taken over, that is what ends the intruder's session.

### The refresh rules that will bite you

**Refresh tokens rotate.** Every call returns a new one and kills the old. If two
requests refresh concurrently, the second presents an already-used token — the
server reads that as a leak and **revokes the entire family**, signing the user
out.

So: one refresh at a time, queued.

```dart
Future<String>? _refreshing;

Future<String> _freshToken() {
  // Every 401 awaits the same future instead of starting its own refresh.
  return _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);
}
```

Store both tokens in `flutter_secure_storage`, never `SharedPreferences`.

A **401** means refresh once and retry. If the refresh also 401s, sign out — the
session is genuinely gone. A **403** is not an auth problem: it means KYC, a
paused asset, or a limit, and the body says which.

### Blocked accounts

`POST /v1/auth/login` returns **403** with a `code` when the account cannot sign
in:

```json
{ "code": "ACCOUNT_SUSPENDED", "message": "<the admin's reason, verbatim>", "suspendedAt": "…" }
{ "code": "ACCOUNT_CLOSED",    "message": "This account is closed. Contact support." }
```

Route these to a dedicated screen rather than the generic login error, and show
`message` as-is — a suspension reason is written by a human for this specific
user. Every refresh token is revoked at the moment of suspension, so an
already-open session stops at its next refresh too.

---

## KYC

Trading, deposit addresses and crypto withdrawals need `TIER_1`. A blocked call
returns exactly this — captured from the live API:

```json
403 { "message": "Verification required before you can do this",
      "requiredTier": "TIER_1", "currentTier": "TIER_0", "kycStatus": "NOT_STARTED" }
```

Branch on the presence of `requiredTier`, not on the message text.

```
GET  /v1/kyc
POST /v1/kyc/tier1       { bvn | nin, dateOfBirth }   one of bvn/nin, 11 digits
POST /v1/kyc/documents   { type, storageKey, mimeType, sizeBytes }
```

**Document upload is not implemented yet.** The current route only records
metadata and trusts a client-supplied `storageKey`; there is no object-store
upload behind it. Do not send an arbitrary key or tell users a document was
uploaded until the private-storage/upload-intent flow in
[Flutter API route gaps](FLUTTER_API_ROUTE_GAP_ANALYSIS.md) is implemented.

### What `GET /v1/kyc` returns

```jsonc
{
  "tier": "TIER_0",
  "status": "NOT_STARTED",
  "rejectionReason": null,
  "submittedAt": null,
  "bvnLast4": null,
  "documents": [],
  "limits": {
    // This user, this tier, today. Resets at midnight Lagos time.
    "current": {
      "deposit":  { "singleNgn": "0.00", "dailyNgn": "0.00",
                    "usedTodayNgn": "0.00", "remainingTodayNgn": "0.00" },
      "withdraw": { "singleNgn": "0.00", "dailyNgn": "0.00",
                    "usedTodayNgn": "0.00", "remainingTodayNgn": "0.00" }
    },
    // Every tier, so a screen can show what verifying further unlocks.
    "tiers": [
      { "tier": "TIER_0", "depositSingleNgn": "0",        "depositDailyNgn": "0",
        "withdrawSingleNgn": "0",        "withdrawDailyNgn": "0" },
      { "tier": "TIER_1", "depositSingleNgn": "20000",    "depositDailyNgn": "50000",
        "withdrawSingleNgn": "20000",    "withdrawDailyNgn": "50000" },
      { "tier": "TIER_2", "depositSingleNgn": "200000",   "depositDailyNgn": "5000000",
        "withdrawSingleNgn": "200000",   "withdrawDailyNgn": "3000000" },
      { "tier": "TIER_3", "depositSingleNgn": "50000000", "depositDailyNgn": "100000000",
        "withdrawSingleNgn": "50000000", "withdrawDailyNgn": "100000000" }
    ]
  }
}
```

**Limits are naira only.** Nothing else is capped by tier — not coin balances,
not swap size, not crypto withdrawals. Do not build a UI that implies a dollar
or per-coin tier limit; there is none, and inventing one would be a promise the
API never keeps. The real ceiling on a trade is the quote's own `minimum` and
`maximum`.

The numbers above are the seeded defaults. **They are admin-editable at any
time** — read them, never hard-code them. Show `current` on the deposit and
withdraw screens (`remainingTodayNgn` is the number a user actually wants), and
`tiers` on the "verify to unlock more" screen.

`TIER_0` is `0` across the board, so a brand-new account cannot move naira at
all until TIER_1. Say that plainly on the screen rather than letting someone type
an amount and be refused.

### The re-login after approval

**When KYC is approved, the user's sessions are revoked deliberately** — the tier
lives in the JWT, so this is what makes the upgrade take effect immediately
rather than up to fifteen minutes later. The app must treat a 401 right after
approval as normal: refresh (it will fail), then sign in again, or prompt for it.
Don't show a crash.

---

## Profile and wallets

```
GET /v1/me        profile + walletReady
GET /v1/wallets   balances, from OUR ledger
```

```jsonc
// GET /v1/me
{ "id": "…", "email": "…", "firstName": "Doc", "lastName": "Check", "phone": null,
  "status": "ACTIVE",
  "kyc": { "tier": "TIER_0", "status": "NOT_STARTED",
           "rejectionReason": null, "submittedAt": null },
  "walletReady": true,
  "createdAt": "2026-09-06T14:20:20.929Z" }

// GET /v1/wallets — one row per listed coin, zeros included
[ { "asset": "ngn",  "name": "Nigerian Naira", "isFiat": true,
    "available": "0.00", "locked": "0.00", "total": "0.00" },
  { "asset": "btc",  "name": "Bitcoin", "isFiat": false,
    "available": "0.00000000", "locked": "0.00000000", "total": "0.00000000" } ]
```

`walletReady: false` means the Quidax sub-account is still being provisioned (it
happens on a worker so signup never fails on an upstream hiccup). Show "setting
up your wallet" and poll `GET /v1/me` rather than blocking the whole app.

`locked` is money committed to an in-flight trade or withdrawal. Show
`available` as the spendable figure and surface `locked` only when it is
non-zero, or a user sees a balance they cannot touch and reads it as a bug.

Every wallet comes back even at zero, already formatted to that coin's display
scale — render the string as given rather than reformatting it.

---

## The crypto list

```
GET /v1/assets                              public
GET /v1/assets/{code}/networks?purpose=deposit|withdraw   public
```

```jsonc
// GET /v1/assets
[ { "code": "btc", "name": "Bitcoin", "displayScale": 8,
    "networks": [ { "id": "btc", "label": "Bitcoin Network",
                    "depositsEnabled": true, "withdrawsEnabled": true,
                    "requiresTag": false, "isDefault": true } ] },
  { "code": "usdt", "name": "Tether", "displayScale": 6,
    "networks": [ { "id": "arbitrum", "label": "Arbitrum One",
                    "depositsEnabled": true, "withdrawsEnabled": false, … },
                  { "id": "bep20", "label": "Binance Smart Chain",
                    "depositsEnabled": true, "withdrawsEnabled": true,
                    "requiresTag": false, "isDefault": true }, … ] } ]
```

**`depositsEnabled` and `withdrawsEnabled` differ per network on the same coin.**
USDT can be received on Arbitrum and not sent back out on it. Filter the network
picker on the direction the user is in, or use the `purpose` query on the
networks endpoint, which does it for you:

```jsonc
// GET /v1/assets/xrp/networks?purpose=withdraw
[ { "id": "ripple", "label": "Ripple Network",
    "requiresTag": true, "confirmations": 1, "isDefault": true } ]
```

Preselect the network where `isDefault` is true. Both endpoints are public, so
the crypto list renders for a signed-out user.

---

## Deposit addresses

```
POST /v1/deposits/address    { asset, network }     TIER_1
GET  /v1/deposits/addresses  everything already generated
GET  /v1/deposits            deposit history, every status
```

```json
{ "asset": "usdt", "network": "trc20", "networkLabel": "Tron Network",
  "status": "PENDING", "address": null, "destinationTag": null,
  "requiresTag": false, "confirmations": 1, "usable": false }
```

`POST` is get-or-create: calling it again for the same coin and network returns
the same address rather than making another.

Generation is **asynchronous** — the first call comes back with
`address: null, status: "PENDING"`. Poll every few seconds until `usable: true`.

> **Gate the copy button and the QR on `usable`, not on `address != null`.**
> `usable` is false while generating *and* when a required memo is missing.
> Rendering a half-loaded address or dropping a destination tag on XRP loses the
> user's deposit permanently.

When `requiresTag` is true, show the tag as prominently as the address, and make
copying both a single action if you can.

`confirmations` is how many blocks the deposit waits for. Show it as "credited
after N confirmations" so the wait is expected rather than alarming.

---

## Quotes and trading

This is the part with real timing rules.

```
POST /v1/quotes   { side: "buy"|"sell"|"swap", fromAsset, toAsset, amount }   TIER_1
```

```json
{ "quoteId": "…", "side": "BUY", "fromAsset": "ngn", "toAsset": "btc",
  "fromAmount": "97150.00", "toAmount": "0.00067342",
  "rate": "1450.0000", "fee": "0", "feeAsset": null,
  "minimum": "18.00", "maximum": "2000.00",
  "expiresAt": "2026-09-05T10:00:12.000Z", "ttlSeconds": 12,
  "availableBalance": "250000.00" }
```

`amount` is always in `fromAsset`. On a buy that is naira; on a sell or swap it
is the coin.

### The 12-second rule

```
 quote arrives ──▶ countdown 12s ──▶ expires ──▶ Continue FADES + disables
                        │                              ▲
                        │                              │
   user edits amount ───┴── debounce 400ms ────────────┘  requote
   user taps "Requote" ─────────────────────────────────┘
```

Three things the app must do:

1. **Fade and disable Continue on expiry.** Do not hide it, do not leave it live.
2. **Debounce the amount field ~400ms.** Typing "50000" is five keystrokes;
   without a debounce that is five quote calls and five countdown resets while
   they are still typing.
3. **Never auto-requote a live quote.** Let it visibly expire. Silently swapping
   the price under someone's finger as they reach for Continue is how a user buys
   at a number they never agreed to.

Drive the countdown from `ttlSeconds`, and treat `expiresAt` as the authority if
the two disagree — the device clock can be wrong. The server enforces expiry on
execution regardless, so a stale quote fails cleanly with *"The rate has expired.
Please refresh and try again."*

### Fees on a trade

`fee` is `"0"` on **buy** and **sell** — the margin lives inside `rate`, so
displaying a fee line would be double-counting. Show ₦0, or no fee line at all.

On a **swap** the fee is real, is charged in `feeAsset`, and must be shown.

`minimum` and `maximum` are **US dollars**, per coin, and move with the price.
**Bitcoin's minimum is visibly higher** (around $18 against $10) because of
Quidax's transfer floor. Convert it into the currency on screen — "Minimum for
Bitcoin: ₦26,100" — rather than letting someone type ₦15,000 and be rejected
after tapping Continue.

### Executing

```
POST /v1/trades
Idempotency-Key: <uuid v4, generated ONCE per attempt>
{ "quoteId": "…" }
```

Generate the key when the user taps, and **reuse it on every retry of that same
tap**. A new key on a retry is a new trade. Replaying the same key returns the
original result rather than trading twice. Sending a different body with a key
already used returns **409** — that is a client bug, not something to retry.

```json
{ "transactionId": "…", "status": "COMPLETED",
  "fromAsset": "ngn", "fromAmount": "97150.00",
  "toAsset": "btc",   "toAmount": "0.00067342", "rate": "1450.0000" }
```

| Status | Means | App shows |
| --- | --- | --- |
| `COMPLETED` | Final | Success |
| `PROCESSING` | Swap settling upstream | Progress; poll `GET /v1/trades/{id}` |
| `RECONCILING` | Outcome unknown, funds held | "Checking with our provider" — **never** "failed" |
| 400 error | Definitely failed, nothing deducted | The message verbatim |

`RECONCILING` is not an error state. Do not offer a retry and do not say the
money is gone — it is held deliberately while the backend confirms upstream. A
400, by contrast, is a guarantee that nothing moved, and the message says so.

```
GET /v1/trades?limit=50   history
GET /v1/trades/{id}       poll one — for a client that missed the push
```

---

## Withdrawals

### Crypto

```
GET  /v1/withdrawals/quote?asset=&amount=&network=
POST /v1/withdrawals/crypto     TIER_1, Idempotency-Key required
     { asset, network, amount, address, destinationTag? }
GET  /v1/withdrawals?limit=50
```

```jsonc
// GET /v1/withdrawals/quote?asset=btc&amount=0.01&network=btc
{ "asset": "btc", "network": "btc",
  "amount":        "0.01000000",   // what the user asked for
  "networkFee":    "0.00020000",   // the chain's, not ours
  "platformFee":   "0.00007766",   // ours, in the coin
  "platformFeeUsd": "8.00",        // ours, as the ladder actually sets it
  "totalFee":      "0.00027766",
  "totalDeducted": "0.01027766",   // amount + both fees
  "youReceive":    "0.01000000" }
```

**Implementation caveat:** the current quote reports network fee plus
platform fee in `totalDeducted`, but the withdrawal submit path locks only the
amount plus platform fee; if fee lookup fails, the quote currently reports a
zero network fee. The quote is not yet a reliable debit guarantee. Confirm the
fee/debit contract with the API owner before presenting this total as final;
track the fix in [Flutter API route gaps](FLUTTER_API_ROUTE_GAP_ANALYSIS.md).

> **Fees are added on top, not taken out.** `youReceive` equals `amount`, and
> the balance falls by `totalDeducted`. A UI that shows the fee as a deduction
> from the amount will be wrong by exactly the fee.

Show `networkFee` and `platformFee` as **separate lines** plus the total — never
one blended number. The chain fee is not ours and users know the difference.

`platformFeeUsd` is the same fee expressed in dollars, because the admin sets the
ladder in dollars. Use it if you want to explain the charge; use `platformFee`
for the arithmetic.

`destinationTag` is required on XRP, XLM and TON. The server rejects the call
without it, but validate client-side so the user finds out before they commit.
Check `requiresTag` on the network rather than hard-coding the three coins — the
list is data, and it grows.

### Naira

```
GET /v1/withdrawals/quote/ngn?amount=
GET /v1/withdrawals/ngn/banks
POST /v1/withdrawals/ngn/verify-account   TIER_1 { accountNumber, bankCode }
POST /v1/withdrawals/ngn                   TIER_1, Idempotency-Key
GET /v1/withdrawals?limit=50               poll/history
```

```json
{ "asset": "ngn",
  "amount": "50000.00", "feeNgn": "100.00",
  "totalDebited": "50100.00", "youReceive": "50000.00",
  "band": { "minAmount": "50000.00", "maxAmount": "500000.00" },
  "feeConfigured": true,
  "limit": { "allowed": false,
             "reason": "Your account cannot withdraw naira yet. Complete the next verification tier to unlock it.",
             "singleLimit": "0.00", "dailyLimit": "0.00",
             "usedToday": "0.00", "remainingToday": "0.00" },
  "payoutAvailable": false }
```

Same rule as crypto: **the fee is added on top.** `amount` reaches the bank,
`totalDebited` leaves the balance. Everything here is naira — there is no dollar
conversion anywhere in this flow, so the price of a ₦50,000 cash-out does not
change because the exchange rate moved.

`limit` is the tier check, run before the user types a single bank detail. When
`allowed` is false, show `reason` verbatim and disable the form — it already
says whether the problem is the tier, this transaction's size, or today's
running total.

The bank routes use the Quidax main account, not a user's Quidax sub-account.
The server verifies the account name again when submitting and only returns the
masked account number after that. Never submit a client-provided account name.

```jsonc
// GET /v1/withdrawals/ngn/banks
[{ "code": "100004", "name": "Paycom (Opay)" }]

// POST /v1/withdrawals/ngn/verify-account
{ "accountNumber": "0123456789", "bankCode": "100004" }
// → { "accountName": "TEST USER", "accountNumberLast4": "6789", "bankCode": "100004" }

// POST /v1/withdrawals/ngn
// Idempotency-Key: one UUID per submit tap, reused on retries
{ "amount": "50000.00", "accountNumber": "0123456789", "bankCode": "100004" }
// → { "transactionId": "…", "status": "PROCESSING", "asset": "ngn",
//     "amount": "50000.00", "feeNgn": "100.00", "totalDebited": "50100.00",
//     "bankName": "Paycom (Opay)", "accountNumberLast4": "6789" }
```

**Bank lookup, account verification, and payout submission are feature-gated and unavailable by default.**
`NGN_WITHDRAWALS_ENABLED` defaults to `false`; when it is off, keep the submit
button disabled because `payoutAvailable` will be false, and do not call the
bank lookup/verification routes. Operations must enable it only after the
Quidax main-account NGN reserve, webhook signature, and reconciliation have
been verified. Quidax's payout fee is reported after submission and is
currently a treasury cost; `feeNgn` is Davochain's fee.

After submission, poll `GET /v1/withdrawals` for `PROCESSING` or
`RECONCILING`. `RECONCILING` is not a failure; do not submit a new payout or
tell the user the balance is lost. A rejection unlocks the funds and appears as
`FAILED`; success is confirmed from Quidax's `withdraw.successful` event.

---

## Notifications

```
GET  /v1/notifications?limit=50   → { unread, items[] }
POST /v1/notifications/read       { ids?: [] }   omit ids to mark all
```

```json
{ "unread": 3,
  "items": [ { "id": "…", "type": "deposit.credited",
               "title": "Deposit credited", "body": "0.05 BTC is now available.",
               "transactionId": "…", "readAt": null,
               "createdAt": "2026-09-06T14:20:20.929Z" } ] }
```

Types: `address.ready`, `deposit.detected`, `deposit.credited`, `deposit.on_hold`,
`deposit.failed`, `trade.completed`, `trade.failed`, `withdrawal.sent`,
`withdrawal.rejected`, and `admin.broadcast.<id>` for a message an admin sent
from the dashboard.

`transactionId` is the deep link target. It is null on a broadcast, which has
nothing to open.

### Push

```
POST   /v1/devices   { token, platform: "IOS" | "ANDROID", appVersion? }
DELETE /v1/devices   { token }     → { unregistered: true }
GET    /v1/devices   → this user's registered devices
```

Register after sign-in **and on every `onTokenRefresh`** — the OS rotates tokens,
and a stale one stops receiving with no error. `POST` upserts, so calling it
repeatedly is safe. Unregister on sign-out, or the next person to use that phone
gets the previous user's alerts.

The feed is still the record. A push is only the delivery, so refresh
`GET /v1/notifications` on resume: a notification that never arrived is still
sitting there.

An `admin.broadcast.*` message should open as an **in-app popup**, not a tray
notification — that is what broadcasts are for. Everything else is a tray
notification that deep-links on `transactionId`.

Full Firebase setup, the Android `davochain` channel and the iOS APNs key are in
[PUSH.md](PUSH.md).

---

## Admin-managed content

The app should read the same public settings the website does, so the switches
in the dashboard reach the app without a release.

```
GET /v1/site      public, cached 60s
```

```json
{ "companyName": "Davochain",
  "supportEmail": "support@davochain.com",
  "phone": "+234 916 001 2046",
  "address": "Lagos, Nigeria",
  "apps": { "iosVersion": "1.0.0", "androidVersion": "1.0.0",
            "iosStoreUrl": "https://apps.apple.com/app/davochain",
            "androidStoreUrl": "https://play.google.com/store/apps/details?id=com.davochain" },
  "maintenance": { "active": false, "message": null },
  "socials": [ { "label": "Facebook", "url": "https://facebook.com/davochain",
                 "iconUrl": "https://api.davochain.com/v1/site/social/…/icon?v=…",
                 "glyph": "f" } ],
  "logoUrl": "/v1/site/logo?v=1788700000000" }
```

Three uses in the app:

**Maintenance.** Call it on launch and on resume. When `maintenance.active` is
true, show `maintenance.message` on a blocking screen instead of the app.

> Check `active`, and only `active`. **`message` keeps its last value after
> maintenance is switched off** — the admin turns the switch off without
> clearing the text. Reading `message != null` as "we are down" would leave the
> app stuck on a maintenance screen indefinitely.

**Update prompts.** Compare `apps.iosVersion` / `apps.androidVersion` against the
installed build. When the server's is newer, prompt, and send the user to
`iosStoreUrl` / `androidStoreUrl`. Both the version and the link are admin-set,
so a forced-update prompt needs no release of its own.

**Support and social.** `supportEmail` and `phone` drive the help screen. Any
field can be `null` — render nothing rather than an empty row.

`socials` is a list an admin arranges, in order, each with an optional
`iconUrl`. Where there is no icon, `glyph` is a one- or two-letter fallback the
email draws in a circle — do the same, or use your own asset keyed on `label`.

Cache it, and fall back to what you rendered last time. The app must still open
if this call fails.

### Legal pages

About us, Terms and the privacy policy are written in the dashboard, not shipped
in the build — so correcting them does not need a release.

```
GET /v1/content/pages          public; the index
GET /v1/content/pages/{slug}   public; one page
```

```jsonc
{
  "slug": "terms-and-conditions",
  "title": "Terms and conditions",
  "excerpt": "The agreement between you and us.",
  "html": "<h2>Terms</h2>\n<p>Use of Davochain…</p>",
  "text": "Terms\n\nUse of Davochain…",
  "updatedAt": "2026-09-06T20:15:16.158Z"
}
```

**Three slugs are guaranteed to exist and are guaranteed never to be renamed or
unpublished:** `about-us`, `terms-and-conditions`, `privacy-policy`. The API
refuses an admin who tries, precisely so a shipped build can link to them
without a fallback. Anything else in the index is the admin's to add or remove —
read the index rather than hard-coding it.

Which field to render:

| Field | Use it for |
| --- | --- |
| `html` | **Preferred.** Written in a rich-text editor, so the admin's headings, colours and fonts are in here |
| `text` | A share sheet, a search index, or a screen with no formatting |

```dart
// pubspec.yaml → flutter_widget_from_html_core: ^0.15.0
final page = await api.get('/v1/content/pages/terms-and-conditions');
return HtmlWidget(page['html'] as String);
```

`flutter_widget_from_html_core` builds real widgets rather than a `WebView`, so
the page scrolls natively and respects the device's text size. A `WebView` works
too if you would rather.

The HTML has already been through an allowlist sanitiser on the server — no
scripts, no iframes, no event handlers, only formatting. It is safe to render
directly.

Cache the body against `updatedAt` and show the cached copy while refreshing.
Terms should open instantly and must open offline — somebody reaching for it
mid-signup has no patience for a spinner, and a legal screen that fails to load
is worse than a slightly stale one.

**The FAQs are website-only.** `GET /v1/content/faqs` exists but the apps are
not expected to use it; they have their own help surface.

---

## Gift cards

Sell a gift card for naira. The user picks a brand, picks which kind of card it
is, enters what it is worth, sends photographs, and waits for a person to check
it.

```
GET  /v1/giftcards/catalogue                   public   everything tradeable
GET  /v1/giftcards/brands/{id}/image           public   the brand logo
POST /v1/giftcards/trades                      bearer   offer a card
GET  /v1/giftcards/trades                      bearer   your history
GET  /v1/giftcards/trades/{id}                 bearer   one of them
GET  /v1/giftcards/trades/{id}/images/{imgId}  bearer   your own photograph
```

No KYC tier is required to submit a card. The naira it pays lands in the
ordinary balance, where the usual tier rules govern spending it.

### The catalogue

Public, so rates can be shown before anybody signs in. Only live cards come
back — a deactivated brand or type is simply absent, so there is nothing to
filter and no way to quote a rate that will not be honoured.

```jsonc
GET /v1/giftcards/catalogue
[
  { "id": "c1", "name": "Shopping",
    "brands": [
      { "id": "b1", "name": "Amazon",
        "imageUrl": "https://api.davochain.com/v1/giftcards/brands/b1/image?v=1788969525859",
        "types": [
          { "id": "t1", "name": "E-code", "currency": "USD",
            "currencySymbol": "$", "currencySymbolFirst": true,
            "minAmount": "25.00", "maxAmount": "500.00", "rateNgn": "1000.00" },
          { "id": "t2", "name": "Physical", "currency": "GBP",
            "currencySymbol": "£", "currencySymbolFirst": true,
            "minAmount": "20.00", "maxAmount": "300.00", "rateNgn": "1250.00" }
        ]
      }
    ]
  }
]
```

**`imageUrl` is absolute**, public, and versioned. Load it with a plain
`Image.network` — no token, no header. It is served `immutable`, so cache it
hard: a new logo produces a new URL, so a cached one can never be stale.
`null` means no logo was uploaded — draw the brand name instead.

**Currency is not always USD.** An Amazon UK card is priced in pounds and a
Steam wallet code may be in yen. Twenty-four currencies are supported and the
list can grow, so never keep a code-to-symbol table in the app:

```dart
String money(GiftCardType t, String amount) => t.currencySymbolFirst
    ? '${t.currencySymbol}$amount'
    : '$amount ${t.currencySymbol}';
```

`currencySymbolFirst` is `true` for most and `false` for the Nordic krona and
the Polish złoty — "500 kr", not "kr 500".

**`rateNgn` is naira per ONE unit of `currency`.** Show it under the amount
field:

```
Amount to liquidate   [ $100        ]      ← currencySymbol
                      Rate: ₦1,000 per $1  ← rateNgn + currencySymbol
You will receive      ₦100,000             ← faceValue x rateNgn
```

Compute the equivalent live as they type, but the figure that binds is the one
the API returns on submission — not the one the app worked out.

**Validate before submitting**, so the user is not bounced by the server:
`faceValue` must be between `minAmount` and `maxAmount`, in the type's own
currency.

### Offering a card

```jsonc
POST /v1/giftcards/trades
{
  "typeId": "t1",
  "faceValue": "100",
  "code": "AMZN-XXXX-YYYY",                  // optional
  "images": ["data:image/jpeg;base64,…"]     // optional, up to 5
}
```

**At least one of `code` or `images` is required.** A physical card usually has
no code to type — send photographs of the front, the back and the scratched
panel. An e-code usually has no card to photograph. Sending neither is a 400.

#### Sizing the photographs — read this one

Images are data URLs, JPEG/PNG/WebP. The API refuses anything over **5 MB
each**, but that is a ceiling, not a target.

**Downscale on the device before sending. Aim for the longest edge at ~1600px
and JPEG quality ~80, which lands around 200–400 KB.** That is more than enough
to read a serial number, and it is the difference between a submission that
takes a second and one that takes a minute on Nigerian mobile data. Three raw
12-megapixel photos are ~15 MB and will simply fail on a poor connection.

**Current server limit caveat:** images are sent as data URLs inside JSON, but
the API JSON parser currently caps the entire request body at 1 MB. This is
stricter than the 5 MB per-image validation below, and three 200–400 KB images
can exceed the request limit after base64 encoding. Until the API adds a
private upload route or raises/isolates the body limit, keep the total encoded
request below 1 MB; do not promise that the per-image 5 MB limit is usable from
Flutter. See [Flutter API route gaps](FLUTTER_API_ROUTE_GAP_ANALYSIS.md).

```dart
// flutter_image_compress
final bytes = await FlutterImageCompress.compressWithFile(
  file.path, minWidth: 1600, minHeight: 1600, quality: 80,
);
final dataUrl = 'data:image/jpeg;base64,${base64Encode(bytes!)}';
```

Show upload progress. A three-photo submission is a real request with a real
body, not an instant one.

#### The voucher code

Sent once, encrypted at rest the moment it arrives, and **never returned to the
app afterwards** — not in the history, not on a single trade. If the user needs
to check what they typed, they have to look at the card. This is deliberate: a
code is money, and an endpoint that hands it back is an endpoint worth
attacking.

### The history

```jsonc
GET /v1/giftcards/trades
[
  { "id": "…", "brand": "Amazon", "type": "E-code",
    "currency": "USD", "currencySymbol": "$", "currencySymbolFirst": true,
    "faceValue": "100.00", "rateNgn": "1000.00", "expectedNgn": "100000.00",
    "status": "APPROVED",
    "creditedNgn": "100000.00", "approvedValue": "100.00",
    "reason": null,
    "images": ["/v1/giftcards/trades/…/images/…"],
    "createdAt": "2026-09-09T…", "reviewedAt": "2026-09-09T…" }
]
```

| `status` | What to show |
| --- | --- |
| `PENDING` | Being checked. Nothing has moved. Show `expectedNgn` as "you will receive", not "you received". |
| `APPROVED` | `creditedNgn` is in their naira balance. It equals `expectedNgn`. |
| `PARTIALLY_APPROVED` | `creditedNgn` is in their balance and is **less** than `expectedNgn`. `approvedValue` is what the card was really worth, and `reason` says why. **Show both** — a smaller number with no explanation is a support ticket. |
| `REJECTED` | Nothing moved. `reason` says why. |

`creditedNgn` is `null` while pending and `null` forever on a rejection — which
is how the row itself tells you whether money moved. Never fall back to
`expectedNgn` when it is null.

**The photographs on a trade need the bearer token.** Unlike the brand logo,
these are private and scoped to their owner:

```dart
Image.network(
  '$apiBase${trade.images.first}',
  headers: {'Authorization': 'Bearer $accessToken'},
);
```

> **There is no field for what we sold the card for, and there never will be.**
> The desk's clearing rate decides our margin and is returned on no user
> endpoint. If you find yourself looking for it, you are looking at the wrong
> side of the trade.

### When it lands

An approval credits naira and writes an ordinary transaction, so the money
appears in the wallet and the transaction history like any other credit — as a
`GIFT_CARD` type. There is nothing to poll:

- Refresh `GET /wallets` when the wallet screen opens.
- A push notification arrives on approval, partial approval and rejection.
- Refresh `GET /giftcards/trades` when the history screen opens or is pulled.

### Errors worth handling by hand

| | |
| --- | --- |
| `400 That card is not available to trade right now` | The type or brand was deactivated between loading the catalogue and submitting. Reload the catalogue. |
| `400 … takes between 25.00 and 500.00 USD` | Outside the type's limits. Catch this before submitting. |
| `400 Add a photo of the card, or type its code` | Neither was sent. |
| `400 Each image must be 5 MB or smaller` | Downscale — see above. |
| `400 Images must be JPEG, PNG or WebP` | Checked from the file's real bytes, not its name, so renaming a HEIC to `.jpg` will not pass. Convert it. |
| `400 Card codes cannot be accepted right now` | The server cannot encrypt right now. Tell them to send a photo instead; do not lose what they typed. |
| `404 No such card` | On `GET /giftcards/trades/{id}`. Somebody else’s trade and a trade that never existed give the same answer, on purpose. Show "not found", do not retry. |

---

## Referrals

Every user has a code from the moment they register. There is no step that
creates one and no state where somebody has nothing to share.

```
GET  /v1/referrals/me                     bearer   the whole screen
PUT  /v1/referrals/username               bearer   { username }  — once only
GET  /v1/referrals/code/{code}            public   whose code is this?
```

### Signing up with a code

Pass it to register. That is the only moment a referrer can be attached — there
is no endpoint that adds one later, deliberately.

```jsonc
POST /v1/auth/register
{ "email": "…", "password": "…", "firstName": "Chidi", "lastName": "Okoro",
  "referralCode": "ADA4K7" }
```

> **A code that matches nobody is IGNORED, not rejected.** Registration
> succeeds either way. A typo must never be the reason somebody cannot open an
> account, so do not block the signup button on validating one.

Check it first if you want to show who invited them. Case does not matter.

```jsonc
GET /v1/referrals/code/ada4k7            // public, no token
{ "valid": true, "referrerFirstName": "Adaobi", "bonusNgn": "500.00" }
```

Only a first name comes back. Guessing codes must not become a way to harvest
identities.

### The referral screen

```jsonc
GET /v1/referrals/me
{
  "code": "ADA4K7",
  "link": "https://davochain.com/r/ADA4K7",
  "username": null,
  "canSetUsername": true,

  "offer": {
    "isEnabled": true,
    "headline": "Invite friends, earn ₦1,000",
    "terms": null,
    "theyGetNgn": "500.00",       // what a friend gets for signing up
    "youGetNgn": "1000.00",       // what this user gets when that friend verifies
    "unlockTier": "TIER_1",
    "tradeVolumeNgn": "10000.00"
  },

  "totals": {
    "earnedNgn": "1000.00",       // already in their naira balance
    "pendingNgn": "500.00",       // promised, conditions unmet
    "referrals": 3,
    "completed": 1
  },

  // Their own signup bonus, if they arrived through somebody's code.
  "signupBonus": {
    "amountNgn": "500.00",
    "blockedReason": "Complete TIER 1 verification and trade ₦10,000.00 to unlock — ₦4,000.00 so far"
  },

  "referrals": [
    { "name": "Chidi Okoro", "joinedAt": "2026-09-09T…",
      "status": "completed", "amountNgn": "1000.00", "note": null },
    { "name": "Bola Ade", "joinedAt": "2026-09-09T…",
      "status": "pending",   "amountNgn": "1000.00",
      "note": "Waiting for them to reach TIER 1" }
  ]
}
```

**`status` is the badge.** `completed` means that referral has been paid;
`pending` means it has not, and `note` says what it is waiting for. Show the
note — "pending" on its own invites a support ticket.

### Pending money is not money

This is the rule that matters, and getting it wrong will produce a balance that
does not add up.

| | Where it appears |
| --- | --- |
| **Pending** reward | `GET /referrals/me` only |
| **Released** reward | the naira balance, and `GET /trades`-style history, as an ordinary naira deposit |

A pending reward is **not** in `GET /wallets`, **not** in any transaction
list, and **not** in any total the wallet screen shows. It is a promise with
conditions on it. The moment it is released it becomes ordinary naira and
appears everywhere naira appears — and never in both places at once.

So: never add `totals.pendingNgn` to a wallet balance. Show it on the referral
screen, labelled as pending, with its reason.

### What unlocks what

Both figures are admin-set and arrive in `offer`.

- **The referrer** is paid when the person they invited reaches
  `offer.unlockTier`. They never wait for that person's trading.
- **The new user** is paid when they reach `offer.unlockTier` **and** their
  own completed buys, sells and swaps add up to `offer.tradeVolumeNgn`.
  Deposits do not count.

Both are re-checked whenever `GET /referrals/me` is opened, so pulling the
screen is also what settles anything now due. There is nothing for the app to
poll and nothing to trigger.

### The username

A user may replace their generated code with one they choose.

```jsonc
PUT /v1/referrals/username   { "username": "adaobi" }   → { "code": "ADAOBI" }
```

3–7 characters, letters and numbers, stored upper-cased. **It replaces the
generated code, and it cannot be changed again** — `canSetUsername` is false
afterwards, and a second attempt is a 409. Say so before they commit: the old
code stops resolving the moment this succeeds, so a link already shared dies.

Every rejection comes back as a sentence you can show directly:

```
400  A username can be at most 7 characters.
400  Letters and numbers only — no spaces, accents or punctuation.
400  That one is reserved. Try another.
409  That username is taken. Try another.
409  Your username is already ADAOBI and cannot be changed — links you have shared point at it.
```

---

## Errors

Standard Nest envelope:

```json
{ "statusCode": 400,
  "message": "Minimum BTC trade is $18.00. This one is worth $12.00.",
  "error": "Bad Request" }
```

**Show `message` verbatim.** It is written for the user, not for a log — it says
what happened and what to do, including whether money moved. Replacing it with
"Something went wrong" throws away the only useful part.

`message` is sometimes an **array** of strings, when validation rejects several
fields at once. Handle both:

```dart
final raw = json['message'];
final text = raw is List ? raw.join('\n') : raw as String;
```

| Code | Meaning | Do |
| --- | --- | --- |
| 400 | Rejected; nothing moved | Show the message |
| 401 | Token expired | Refresh once, retry, else sign out |
| 403 | KYC, suspension, paused asset, or a limit | Read the body; route on `requiredTier` or `code` |
| 404 | Quote not found, or not yours | Requote |
| 409 | Idempotency key reused with a different body | Bug — regenerate the key |
| 429 | Rate limited | Back off and retry |

The API does not throttle requests itself today (it is an open decision — Q4 in
[Questions.md](Questions.md)), so a 429 currently only comes from a gateway in
front of it. Handle it anyway: the moment throttling is switched on, an app that
retries in a tight loop turns a slow minute into a locked-out user.

---

## Money in Dart

```dart
// pubspec.yaml → decimal: ^3.0.0
final available = Decimal.parse(json['available'] as String);

// Never: double.parse(json['available'])
// 0.1 + 0.2 != 0.3, and a BTC balance has 8 decimals.
```

Send amounts as strings too. `jsonEncode({'amount': 0.00067342})` can emit
scientific notation, which the server rejects — `amount` must match
`IsNumberString`.

Format for display using the coin's `displayScale` from `GET /v1/assets`. Naira
is 2, BTC is 8, USDT is 6. Never round for arithmetic, only for the label.

---

## Screens

| Screen | Calls |
| --- | --- |
| Launch | `GET /site` (maintenance, update) → `GET /me` (`walletReady`, `kycStatus`) |
| Sign up / in | `POST /auth/register` \| `/auth/login` → register the FCM token |
| Verify | `GET /kyc` → `POST /kyc/tier1` → re-login on approval |
| Crypto list | `GET /assets`, `GET /wallets` |
| Deposit | `GET /assets/{c}/networks?purpose=deposit` → `POST /deposits/address` → poll `usable` |
| Buy / Sell | `POST /quotes` (12s) → `POST /trades` |
| Swap | `POST /quotes` side=swap → `POST /trades` → poll while `PROCESSING` |
| Withdraw crypto | `GET /assets/{c}/networks?purpose=withdraw` → `GET /withdrawals/quote` → `POST /withdrawals/crypto` |
| Withdraw naira | `GET /withdrawals/quote/ngn` → banks → verify account → `POST /withdrawals/ngn` only when `payoutAvailable` is true |
| Limits | `GET /kyc` → `limits.current` and `limits.tiers` |
| Activity | `GET /trades`, `GET /deposits`, `GET /withdrawals` |
| Alerts | `GET /notifications`, `POST /notifications/read` |
| Legal | `GET /content/pages/{slug}` — about-us, terms-and-conditions, privacy-policy |
| Settings | `GET /site` for support details; `POST /auth/change-password` |
| Referrals | `GET /referrals/me` — code, link, badges. `PUT /referrals/username` once |
| Gift cards | `GET /giftcards/catalogue` → pick brand → pick type → downscale photos → `POST /giftcards/trades` |
| Card history | `GET /giftcards/trades` — status, `creditedNgn`, `reason` |

---

## Endpoint index

Everything the app can call. Anything not on this list is admin-only.

| | Auth | |
| --- | --- | --- |
| `POST /v1/auth/register` | public | Same shape as login, plus `userId` |
| `POST /v1/auth/login` | public | |
| `POST /v1/auth/refresh` | public | Rotates; one at a time |
| `POST /v1/auth/logout` | bearer | 204 |
| `POST /v1/auth/change-password` | bearer | 204 |
| `POST /v1/auth/reset/request` | public | Always 200, always the same answer |
| `POST /v1/auth/reset/confirm` | public | 204. Returns no session |
| `GET /v1/auth/me` | bearer | From the JWT |

| | User | |
| --- | --- | --- |
| `GET /v1/me` | bearer | Profile, `walletReady` |
| `GET /v1/wallets` | bearer | Every listed coin |
| `GET /v1/kyc` | bearer | Status + naira limits |
| `POST /v1/kyc/tier1` | bearer | |
| `POST /v1/kyc/documents` | bearer | |
| `GET /v1/referrals/me` | bearer | Code, link, badges, pending totals |
| `PUT /v1/referrals/username` | bearer | Once only. Retires the generated code |
| `GET /v1/referrals/code/{code}` | public | Whose code, and what the bonus is |
| `GET /v1/giftcards/catalogue` | public | Brands, types, rates and limits |
| `GET /v1/giftcards/brands/{id}/image` | public | Logo. Immutable, versioned |
| `POST /v1/giftcards/trades` | bearer | Photos and/or a code |
| `GET /v1/giftcards/trades` | bearer | Your own, never anybody else’s |
| `GET /v1/giftcards/trades/{id}` | bearer | One of them. Never the voucher code |
| `GET /v1/giftcards/trades/{id}/images/{id}` | bearer | Your own photograph |

| | Money | |
| --- | --- | --- |
| `POST /v1/deposits/address` | TIER_1 | Get-or-create, async |
| `GET /v1/deposits/addresses` | bearer | |
| `GET /v1/deposits` | bearer | |
| `POST /v1/quotes` | TIER_1 | 12 seconds |
| `POST /v1/trades` | TIER_1 | Idempotency-Key |
| `GET /v1/trades` · `GET /v1/trades/{id}` | bearer | |
| `GET /v1/withdrawals/quote` | bearer | Crypto fees |
| `GET /v1/withdrawals/quote/ngn` | bearer | Naira fee + limit |
| `GET /v1/withdrawals/ngn/banks` | bearer | Quidax-supported Nigerian NGN banks |
| `POST /v1/withdrawals/ngn/verify-account` | TIER_1 | `{ accountNumber, bankCode }`; returns account name and last four |
| `POST /v1/withdrawals/crypto` | TIER_1 | Idempotency-Key |
| `POST /v1/withdrawals/ngn` | TIER_1 | Idempotency-Key; disabled unless `payoutAvailable` is true |
| `GET /v1/withdrawals` | bearer | |

| | Messages and config | |
| --- | --- | --- |
| `GET /v1/notifications` · `POST /v1/notifications/read` | bearer | |
| `POST /v1/devices` · `DELETE /v1/devices` · `GET /v1/devices` | bearer | |
| `GET /v1/assets` · `GET /v1/assets/{code}/networks` | public | |
| `GET /v1/content/pages` · `GET /v1/content/pages/{slug}` | public | Legal copy, admin-managed |
| `GET /v1/site` · `GET /v1/site/logo` | public | Admin-managed |
| `GET /health` | public | |

Full request and response schemas are browsable at `/docs` while the API runs
outside production.
