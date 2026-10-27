# TODO

Ordered by the build sequence in the design guide. The ledger before the trading —
it is the only part that cannot be retrofitted for correctness.

---

## Blocked on a decision

### Naira funding — how money enters a user's NGN balance

**Status:** undecided. This remains the blocker for end-to-end NGN buys.

Users hold an NGN balance in Davochain's ledger; it is not a user Quidax wallet.
Nothing currently funds it, so **buys cannot be tested end to end** until an
inbound funding provider is selected and implemented.

Whatever the funding provider is, it sets these requirements:

| Needed | For |
| --- | --- |
| Inbound funding | Virtual account, card, or bank transfer to credit a balance |
| Webhook contract | Confirming or failing inbound deposits |

Candidates include Paystack, Flutterwave, Monnify, or Quidax Ramp. Evaluate
settlement finality, chargebacks, reconciliation, fees, and compliance before
choosing.

**When it lands, build:**
- [ ] `src/funding/` — provider client behind an interface, so the provider can change
- [ ] Virtual-account issuance per user (if the provider supports it)
- [ ] Inbound webhook → credit NGN ledger → notify
- [ ] Deposit history metadata that identifies funding method/provider reference
- [ ] Reconcile duplicate, delayed, and missing provider notifications

### NGN bank payout — Quidax adapter wired, rollout gated

**Status:** the Quidax docs confirm `GET /banks`, `POST /banks/verify_account`,
and `POST /users/{user_id}/withdraws` for NGN bank payouts. The API now has
`GET /v1/withdrawals/ngn/banks`, `POST /v1/withdrawals/ngn/verify-account`,
and an idempotent `POST /v1/withdrawals/ngn`. Submission is disabled by default
with `NGN_WITHDRAWALS_ENABLED=false` until operational verification is complete.

The payout is sent from the Quidax main account (`user_id=me`), not the user's
sub-account. Customer NGN is held in Davochain's ledger, so the platform's main
Quidax NGN balance funds the bank transfer. Quidax returns its fee and stamp
duty after withdrawal creation; Davochain's user quote currently includes only
the configured platform fee, so provider charges are a treasury cost.

**Before enabling the flag:**
- [ ] Test bank list and account-name resolution on the live merchant account.
- [ ] Confirm exact Quidax fee/stamp-duty behavior, payout finality, and that
      the main NGN wallet has dedicated liquidity that does not consume buy fuel.
- [ ] Establish a minimum main-account reserve and monitor it; do not enable
      payouts while buy liquidity and payout liquidity are unmanaged together.
- [ ] Verify signed `withdraw.successful` and `withdraw.rejected` callbacks,
      including the documented NGN success payload whose `status` may still be
      `Processing`.
- [ ] Exercise reference-based polling, duplicate webhook delivery, timeout,
      process restart, and rejection/refund in an isolated low-value account.
- [ ] Confirm finance agrees that Quidax payout fees are platform expense and
      decide how they should appear in margin/reconciliation reporting.
- [ ] Keep `NGN_WITHDRAWALS_ENABLED=false` in developer/staging environments;
      use the mock for API development.

---

## Open with Quidax

- [ ] **Is the internal-transfer maximum per transaction or per day?** BTC at 2 per
      transaction is ~$200k and never binds. Per *day* is a platform-wide ceiling on
      Bitcoin volume and needs a different design at scale.
- [ ] **Transfer limits for the seven unpublished coins** — BCH, DOGE, TRX, POL, LINK,
      ADA, SUI. They transfer internally (confirmed), but the numbers are unknown.
      Seeded as null; trade minimum currently falls back to the commercial floor.
- [ ] **Can a second merchant account be issued for staging?** There is one webhook URL
      per account, so dev/staging/prod cannot all receive events. A second account is
      the only clean fix.

## Measure on the first live calls

- [ ] **Transfer step per coin.** Send an amount with more decimals than expected and
      record whether Quidax errors, rounds, or accepts. **BTC and ETH first** — step
      size is in dollars, so expensive coins have the coarsest steps. Write into
      `assets.transferStep`.
- [ ] **Confirm → complete latency on a swap.** `confirmSwap` returns `initiated`. The
      documented examples suggest completion lands the same second. Instrument before
      designing a progress flow around it.
- [ ] **Does the quoted rate move with size?** Quote the same pair at $10 and $10,000
      and compare. If they differ, the 3s quote cache needs an amount bucket in its key.
- [ ] **Verify every `{coin}→usdt` swap pair works on instant swap.** All 14 exist as
      order-book markets, but instant swap is a different engine.

---

## Build queue

### Done
- [x] Scaffold, env validation that refuses to boot on a bad config
- [x] Prisma data model (31 models)
- [x] Quidax client — envelope parsing, typed errors, retry, rate-limit lanes, pagination
- [x] Mock client (no sandbox exists)
- [x] Money helpers — Decimal, round-down, per-coin minimums
- [x] Ledger — double-entry, append-only, row-locked
- [x] Auth — email + password, scrypt, JWT with refresh-token rotation
- [x] KYC data model + tier gating guard
- [x] Seed — 15 assets, gates, tier limits, kill switches

### Also done
- [x] Idempotency interceptor — same key + different body is rejected, not replayed
- [x] Users — sub-account provisioning on a worker, alias-email scheme
- [x] KYC submission + document records + admin review (revokes sessions on approval)
- [x] Assets — nightly chain sync from `wallets/{currency}.networks[]`
- [x] Address service — async create, webhook, poll backstop, `usable` gating
- [x] Webhook receiver — HMAC over raw bytes, dedup, queue, gap sweeper
- [x] Deposits end to end + notifications
- [x] Quote service — 12s TTL, 3s coalescing cache, hard expiry at execution
- [x] Buy / sell with the settlement ladder
- [x] Coin-to-coin swap in the sub-account, fee accrued as a receivable
- [x] Crypto withdrawals
- [x] Inventory desk — snapshot, drift, SMTP alerts, daily digest as health check
- [x] Admin — gates, inventory, margin, reconciliation, fee claim runs, kill switches
- [x] Reconciliation worker — invariants, stuck legs, webhook gaps, every 30 min
- [x] `ARCHITECTURE.md` and `FLUTTER.md`

### Next
- [x] **Push provider (FCM)** — `PushService` delivers every notification row to
      registered devices, prunes dead tokens, and stays switched off with no
      credentials. Setup in [PUSH.md](PUSH.md). APNs rides on FCM via the `.p8` key
- [ ] **Apple: upload the APNs key to Firebase** before the first iOS build, or
      Android delivers and iOS is silent with no error anywhere
- [ ] **Object store for KYC documents** — `KycDocument.storageKey` has no uploader
- [ ] **KYC verification provider** — `submitTier1` records and marks PENDING;
      the actual check is a manual admin review until a provider is wired
- [ ] Integration tests against the mock, end to end per flow
- [x] ~~Seed an initial admin user~~ — `npm run create-admin`
- [ ] Webhook fan-out to non-prod endpoints (one URL per merchant account)

---

## Audit

A full scan against the Quidax reference on 5 September 2026 found and fixed
eight bugs. See [AUDIT.md](AUDIT.md) for the detail. The headline: no chains
were seeded at all, so deposits were impossible on a fresh install and
stablecoins showed none.

---

## Housekeeping

- [ ] `npm install` blocks Prisma's postinstall on this machine — run
      `npx prisma generate` after installing, or
      `npm install-scripts approve @prisma/client`
- [ ] Docker CLI not on PATH here; `docker-compose.yml` is provided but Postgres and
      Redis may need pointing elsewhere via `DATABASE_URL` / `REDIS_*`
- [x] ~~`npm run build` needs a clean `dist/`~~ — fixed: `tsBuildInfoFile` now lives
      inside `dist/`, so nest's `deleteOutDir` clears it with the output. Previously
      the cache survived the wipe, told tsc everything was emitted, and left
      `dist/main.js` missing.
