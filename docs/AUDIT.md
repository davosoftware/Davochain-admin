# Audit — 5 September 2026

Full scan of the codebase against the Quidax reference. **Eight bugs found and
fixed.** Endpoint paths, the response envelope, header pagination and the
429/444 split were already correct.

---

## 1. No chains were seeded at all — the big one

`asset_networks` started **empty**. `POST /v1/deposits/address` rejected every
request with "not available on that network", and it stayed that way until
someone ran a live sync against the production key. Stablecoins in particular
showed no chains whatsoever — which is exactly what you asked about.

**Fixed** with `src/assets/chain-catalogue.ts`, a shared source both the seed and
the mock read from so they cannot drift apart:

| Coin | Chains | Notes |
| --- | --- | --- |
| **USDT** | **10** | bep20, trc20, erc20, polygon, solana, ton, celo, optimism, arbitrum, lisk |
| **USDC** | **7** | erc20, bep20, polygon, solana, arbitrum, base, lisk |
| ETH | 2 | erc20, bep20 |
| POL | 3 | polygon, bep20, erc20 |
| SOL, LINK | 2 each | native + bep20 |
| BTC, LTC, BCH, DOGE, ADA, SUI, TRX, XRP, BNB | 1 each | native |

**Arbitrum on USDT is marked deposit-enabled, withdraw-disabled** — that is true
today and *nothing in the documentation says so*, only the API.

Seeded rows carry `syncedAt: null`, so a provisional chain is distinguishable at
a glance from one the live sync has confirmed. `POST /admin/assets/sync-networks`
overwrites all of it from the API, which stays the only authority.

## 2. The mock invented one fake chain per coin

Every non-USDT coin came back on a single network *named after the coin* — USDC
on a chain called `usdc`, XRP on `xrp` instead of `ripple`. Anything keyed on a
real chain id, the destination-tag rule included, was being exercised against
fiction. The mock now serves the same catalogue production will see.

## 3. `fetchWithdrawalByReference` hardcoded `me`

A sell settles by transferring **sub → main**, so its withdrawal record lives
under the *sub-account*. Asking for it under `me` returns 404, so the reconciler
could never resolve a stuck sell leg — defeating it in precisely the case it
exists for. It now takes the sending account, and the reconciler derives it from
the leg kind.

## 4. `recordSale()` was never called

Nothing wrote to the open refill period, so `soldQty` and the weighted average
received stayed at **zero forever**. That made `vsAvgPct` always 0, and the dip
watch filters on `soldSinceRefill > 0` — so **the dip alert could never fire**.
The desk's one actionable signal was dead code. Now recorded on every completed
buy, with the USD price derived from the settled rate.

## 5. Dip alerts ignored their own cooldown

`dips.filter((d) => d)` is a no-op — it kept everything, including coins the
cooldown had just suppressed, re-sending every 15 minutes. Fixed to collect only
the ones outside their cooldown, and to send them as one email rather than five.

## 6. Internal transfer limits applied to on-chain withdrawals

`assertTransferable()` enforces Quidax's published **internal** sub ↔ main
minimums. Those have nothing to do with an external chain send, so it would have
rejected valid withdrawals and accepted invalid ones. Removed from that path;
Quidax enforces the chain minimum and we surface its rejection rather than
guessing the number.

## 7. Temporary quotations were treated as non-retryable

They are non-binding and consume nothing upstream, so a transient network blip
was surfacing as `QuidaxUnknownError` — poisoning a harmless quote with an
"outcome unknown" state. Now retried like a GET. Every other POST stays
single-attempt, because a repeat there could double-execute.

## 8. The destination-tag rule lived in two places

`AssetsService` had its own copy of the tag set and had already drifted from the
catalogue. One shared `requiresTag(assetCode, networkId)` now, matched against
**both** the coin and the chain — Quidax names them inconsistently, so XRP's
network is `ripple` and only a two-sided match catches it.

---

## Verified correct, no change needed

- `GET /users/{id}/deposits/{id}` — path confirmed against the reference
- `/users/{id}/withdraws/reference/{ref}` — shape confirmed (only the account was wrong)
- Response envelope parsed on `status`, not the HTTP code
- Header-based pagination (`x-next-page`), not body-based
- Both throttle codes handled — 429 from the errors page, 444 from the security page
- Address creation on its own 20/sec lane
- Webhook signature over raw bytes, with `rawBody: true` set at bootstrap
- `user.id: null` fallback to `sn` in webhook routing

## Result

```
82 tests passing   (58 new — chain coverage, tag rules, id correctness)
tsc                clean
nest build         clean
38 modules         all resolve; boots to the DB connection
```

Wiring inventory into the trade path created a legitimate `TradesModule` ↔
`InventoryModule` cycle, resolved with `forwardRef` on both sides.
