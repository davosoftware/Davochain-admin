# Architecture

How the pieces fit, and why each one is shaped the way it is.
Design guide: https://claude.ai/code/artifact/21298075-e0ed-4265-b05a-6adba34ee7ab

---

## The shape of it

```
  Flutter app ──▶ /v1/*  ──┐
                           ├──▶ NestJS ──▶ Postgres  (the ledger — source of truth)
  Admin panel ──▶ /admin/* ┘        │  └──▶ Redis     (BullMQ queues)
                                    │
  Quidax ──────▶ /webhooks/quidax ──┘──▶ Quidax Open API
```

**Davochain's ledger is the source of truth.** Quidax holds the coins; the ledger
decides who owns what. A user's balance is never read from Quidax — it is a
projection of `ledger_entries`, and every number the app shows comes from there.

Three accounts matter upstream:

| Where | Holds | Notes |
| --- | --- | --- |
| Main Quidax account | Coin inventory + naira fuel | The treasury desk |
| Per-user sub-accounts | That user's crypto, 1:1 with their ledger | Created on signup |
| Davochain's own bank | Customer naira reserve | Never touches Quidax |

Naira is a ledger asset with **no Quidax counterpart on the user side**. The only
naira Quidax ever sees is fuel for the fallback swap.

---

## Money flows

### Deposit

```
chain → user's sub-account → webhook → credit ledger → notify
```

Credited from a webhook, never from a balance reading. The `reference` is unique
per Quidax deposit id, so a re-delivered event finds the transaction already
`COMPLETED` and does nothing. Deposits are **not** swept to main — the coin has
to be in the sub-account, because that is what a sell spends.

### Buy — the settlement ladder

| Order | Condition | Action | Margin |
| --- | --- | --- | --- |
| 1 | Inventory covers it | transfer main → sub | gate + restock edge |
| 2 | Inventory short, fuel available | swap on main, then transfer | gate only |
| 3 | Fuel exhausted | refuse **at quote time** | — |
| 4 | Accepted, then failed | refund | — |
| — | Outcome unknown | `RECONCILING`, funds stay locked | — |

Rows 1–3 are all knowable before a single naira moves, which is why the
inventory read happens *before* the debit. A refund the user never needed is
still a notification and a moment of doubt about whether their money is safe.

The fallback is **not a loss** — the quote came from the same instant-swap rate,
so the gate survives intact. Inventory just earns Quidax's spread on top.

### Sell

```
lock coin → transfer sub → main → credit NGN ledger → complete
```

Strictly simpler than a buy: no fallback, no fuel dependency, no failure mode
beyond the transfer itself.

### Coin-to-coin swap

Runs **inside the user's own sub-account**, so nothing crosses accounts:

```
lock → swap in sub-account → (confirm returns "initiated") → webhook/poll → settle
```

Two consequences. No transfer minimum applies to the trade at all — the awkward
"$17 minimum to swap into Bitcoin" simply does not exist. And a failed swap
leaves the coin exactly where it started, with nothing to compensate.

The flat $2 fee is taken from the output and booked as a `fee_receivable` — it
is **not** collected at trade time, because it may be below the destination
coin's transfer minimum. An admin claim sweeps it later.

### Withdrawal

Crypto leaves from the user's **own sub-account**, so inventory is never touched
and a withdrawal can never compete with a buy. Naira payouts go through a
separate provider — still undecided, see `TODO.md`.

---

## The three states that matter

```
PENDING  ──▶ COMPLETED     final
   │
   ├──────▶ FAILED         final; refund already applied
   │
   └──────▶ RECONCILING    outcome UNKNOWN — funds stay locked
```

**A timeout is not a failure.** `QuidaxUnknownError` means the request may well
have landed. Retrying blind double-spends; refunding hands a user both the coin
and their money. The only correct response is to hold and poll upstream, which
`ReconciliationService.resolveStuckLegs()` does every 30 minutes.

Refund fires on `FAILED` and nowhere else.

---

## Pricing

```
        ┌─ 3s coalescing cache ─┐
quote ──┤  (SingleFlight)       ├──▶ temporary_swap_quotation (non-binding)
        └───────────────────────┘
             │
             ▼
   R_buy  = R_qx + gate      12s TTL, hard expiry at 30s
   R_sell = R_qx − gate
```

Rates come from a **quotation on the pair we would actually trade**, not the
ticker — the ticker is last-traded on the order book, and a swap executes
against the instant-swap book. Those are not the same number.

One quote is one Quidax call against a shared 300/min budget. A user requoting
every 12 seconds is 5 calls a minute by themselves; fifty such users would eat
the whole allowance. The 3-second coalescing window collapses a thousand users
watching BTC into ~20 calls a minute, and each still gets a fresh countdown.

**The gate is the entire margin and the app shows a ₦0 fee** — so the rate on
screen must be exactly the rate that settles. There is no fee line for a
discrepancy to hide in.

### The three fees

Three different charges on three different actions, and three separate ladders
— not columns of one table. A coin can charge a tight rate fee and a generous
swap fee, and none of the boundaries need line up.

| | **Rate fee** | **Swap fee** | **Crypto withdrawal** | **Naira withdrawal** |
| --- | --- | --- | --- | --- |
| Charged on | buying and selling for naira | coin → coin | sending a coin out | cashing out to a bank |
| Shape | ₦ per dollar, folded into the rate | flat USD | flat USD | flat ₦ |
| Ladder | `kind = RATE` | `kind = SWAP` | `kind = WITHDRAWAL` | `kind = NGN_WITHDRAWAL` |
| Priced on | the coin being traded | the coin being sold | the coin being sent | the naira leaving |
| Visible to the user | no — the rate *is* the price | no — taken from the amount | **yes**, its own line | **yes**, its own line |
| Bands in | dollars | dollars | dollars | **naira** |
| Admin screen | Fees → Buy & sell rate | Fees → Swap fee | Fees → Withdrawal fee | Fees → Naira withdrawal fee |

**Each ladder bands in its own currency.** The three that price a coin band on
the dollar value, because a `$100` step has to mean the same thing whether the
coin is bitcoin or dogecoin. The naira cash-out ladder bands in **naira**, for
the opposite reason: nothing about that transaction is denominated in dollars,
and pegging its rungs to a dollar amount would mean a ₦50,000 withdrawal costs
something different tomorrow because the exchange rate moved — a change nobody
made and no customer agreed to.

`FeeBand.minAmount`/`maxAmount` are therefore in the ladder's own currency, and
`bandUnitOf(kind)` says which. Resolving with the wrong one silently prices
against the wrong rung, so it is the one thing every caller has to get right.

### KYC limits

Naira only, per tier, per transaction and per day.

A tier caps the leg that touches a bank, because that is what verifying an
identity is for. A coin moving between two wallets we control moves no real
money, so it is governed by the trade limits instead.

The two directions fail differently, and they have to:

- **A withdrawal over the limit is refused** before anything moves.
- **A deposit over the limit is HELD.** The bank transfer already happened;
  there is nothing to reject. Crediting it anyway would defeat the limit, so it
  waits at `ON_HOLD` for an admin — which is what that status is for.

The day runs midnight to midnight in Lagos (UTC+1, no daylight saving). A
rolling 24 hours would be easier to implement and would surprise somebody who
moved ₦400,000 at 11pm and cannot move ₦200,000 the next morning.

The daily total counts everything in flight as well as everything settled. A
pending withdrawal has not landed but the money is committed, and letting a
second one through because the first has not settled is how a cap is walked
past.

### Why the naira fee is earnings

A naira balance is a virtual number: it is what the platform owes a user after
they sold a coin, not money sitting anywhere. Cashing out is what turns it into
real money.

    withdrawal amount + fee = total debited from the balance

The payout is the withdrawal amount; the fee stays behind. That is naira the
platform no longer owes anybody — either money it does not pay out, or float it
uses to buy the next coin. It is revenue, which is why it lands on the Earnings
card rather than being treated as a transfer.

The naira ladder prices a rail that does not exist yet — Davochain has no naira
payout provider (see TODO.md). `GET /v1/withdrawals/quote/ngn` returns the fee
and `payoutAvailable: false`, so the price can be agreed before the provider is
chosen rather than invented on the day it arrives.

The withdrawal fee is the only one the user is shown, because it is only half
of what they pay: the chain takes its own cut, quoted by Quidax at send time
and set by nobody here. The two are never blended into one number — a merged
figure would make our fee appear to move on its own every time gas did.

Only our half is revenue. `feeUsd` holds it; `networkFee` holds the chain's,
and adding that to earnings would report a cost we paid out as a profit.

Both are **banded by trade size**, because a flat charge is regressive in one
direction and free money in the other: `$2` is 10% of a $20 swap and 0.04% of a
$5,000 one. Both resolve on half-open `[min, max)` intervals, so a trade of
exactly $100 lands on exactly one rung. Both fall back to a global default when
a coin has no ladder of its own, and to the flat value on `RateConfig` when
there is no ladder at all.

A buy resolves its ladder **twice** — once on the naira amount divided by the
raw rate to guess the size, then again on the settled dollar value, because
applying the gate can move a trade across a boundary. The second answer wins.

**Every coin can carry its own ladder, on either fee.** BTC can charge ₦12 per
dollar while DOGE charges ₦35, and their swap fees can differ again — a coin's
two ladders are set independently of each other and of every other coin. A coin
with none follows the global default, which is what most of them do.

Putting a coin back on the default writes an *inherit marker* — a schedule with
no rungs — rather than deleting its old ones. Deleting would be simpler and
wrong: a trade from last month still has to be explainable with the ladder that
was live when it happened.

Saving writes a new schedule rather than editing rungs in place, for the same
reason.

### Rounding

```
✗ take ₦X → compute coin → round down          → the difference vanishes
✓ compute coin → round down to the step
                → recompute the naira cost      → nothing evaporates
```

Always round the user's entitlement **down**, then re-price from the rounded
amount. Round up and you pay the difference on every trade, fifteen coins wide,
forever.

### Minimums

Three constraints, highest wins, **computed per quote**:

```
min_trade_usd = max( floor_usd,               $10, or $5 on stablecoins
                     100 × step_usd,          keeps rounding under 1%
                     1.2 × transfer_min_usd )  Quidax's floor, plus headroom
```

The third is denominated in **coin**, so its dollar value moves with the price.
BTC's `0.00015` is ~$18 at $100k and ~$36 at $200k. Never cache it.

---

## Queues

Separate, so a backlog in one cannot delay another.

| Queue | Carries | Concurrency |
| --- | --- | --- |
| `provisioning` | Quidax sub-account creation | 2 |
| `webhooks` | Inbound event processing | 5 |
| `addresses` | Poll backstop for async generation | 3 |
| `settlement` | Reversals, stuck-leg resolution | — |
| `fee-claims` | Admin claim runs | **1**, background lane |
| `notifications` / `email` | Fan-out | — |
| `reconciliation` | Invariants, gap sweeps | — |
| `sync` | Chain list + limits | 1 |

Fee claims run at ~30 req/min on their own rate-limit lane. Every receivable
lives in a different sub-account and there is no bulk sweep, so 400 fees is 400+
calls — run flat out it would starve live trading; run throttled it finishes in
half an hour and nobody notices.

---

## Rate limiting

Three token buckets, because 300/min is **one budget** shared across production,
staging, the admin panel and any dev process pointed at the live key:

| Lane | Limit | For |
| --- | --- | --- |
| `default` | 240/min | User-facing requests |
| `address` | 15/sec | Address creation (upstream caps at 20/sec) |
| `background` | 30/min | Claims, syncs — can never starve trading |

---

## Webhooks

```
POST /webhooks/quidax
  → verify HMAC over RAW BYTES
  → store row (dedup hash)
  → return 200                    ← fast; everything else is a worker
```

The signature is computed over the raw request bytes. Nest's body parser
re-serialises JSON and re-stringifying does not reproduce them, so `main.ts`
creates the app with `rawBody: true`. Without it, every event fails silently.

Anything other than 200 — **including a 3xx** — counts as a failure upstream,
and the retry ladder is immediate / 1m / 30m / 1h / 24h and then it stops
**forever**. That is why `sweepWebhookGaps()` exists: it is the only thing
between a dropped event and a deposit the user never received.

**Routing gotcha:** the documented `swap_transaction.complete` payload ships
`user.id` as `null` with only `sn` populated. Resolution order is stored
reference → `user.id` → `user.sn`.

`wallet.updated` is a reconciliation signal only. Never credit from it — it
carries a balance, not a transaction, and crediting from a balance double-counts
the moment two events arrive out of order.

---

## The inventory desk

The platform **does not trade its own book.** Auto-rebalancing through instant
swap would convert a price risk into a guaranteed cost on every refill, so it
watches, calculates, and emails you — you restock wherever the price is good and
record it with `POST /admin/inventory/refill`.

Inventory is a **margin** choice, not a service requirement. With the fallback
on, an empty coin still trades, just at the gate alone. What must never run out
is **naira in the Quidax wallet**, because that is what the fallback runs on.

| Runs low | Consequence | Urgency |
| --- | --- | --- |
| Coin inventory | Buys work, margin drops | Restock when the price suits |
| **NGN fuel** | **Buys fail** | Wake someone up |

Alerts follow three rules: the digest is the default destination; only naira
running out and the books disagreeing interrupt you; escalate on **worsening**,
not on persisting. On a normal day that is one email. The daily digest doubles
as the mailer health check — no digest at 7am means the channel is down, and
"no alerts" otherwise looks exactly like "nothing is wrong".

---

## Reconciliation

Every 30 minutes:

1. **The invariant**, per asset:
   `Σ(user ledger) + Σ(locked) + Σ(fee receivables) == sub-accounts + main`
2. **Stuck legs** — anything `UNKNOWN` or `SENT` for over a minute is resolved by
   asking Quidax what happened.
3. **Webhook gaps** — list deposits since the last checkpoint, fill anything the
   webhooks missed.

---

## Security

| | |
| --- | --- |
| User auth | scrypt + JWT (15m) + opaque refresh token, hash-stored, rotated |
| Token reuse | Revokes the whole family — reuse means it leaked |
| Admin auth | **Separate secret and token type**; a user token cannot be used |
| Guards | Global and fail-closed — a route opts out with `@Public()` |
| KYC | Tier in the JWT; approval revokes sessions so it takes effect at once |
| BVN / NIN | Hash + last 4 only. The provider holds the real value |
| Idempotency | Client key → stored response; a different body on the same key is rejected |
| Kill switches | `system_flags`, checked per request — a pause is immediate, not a deploy |

---

## Where things live

```
src/
  quidax/        the ONLY thing that talks to Quidax (+ the mock, + rate lanes)
  ledger/        the ONLY thing that writes to `balances`
  rates/         pricing, the gate, snapshots
  quotes/        quote lifecycle, TTL, consumption
  trades/        settlement ladder, compensations  (settlement.service.ts)
  fees/          receivables + admin claim runs
  inventory/     the desk, drift, SMTP alerts
  reconciliation/invariants, stuck legs, webhook gaps
  admin/         gates, oversight, KYC review, kill switches,
                 the admin's own account and who else holds one
```

Two rules that keep it honest: **nothing but `QuidaxClient` calls Quidax**, and
**nothing but `LedgerService` writes balances**. Both are chokepoints on purpose —
they are where the money invariants are enforced, and a second writer would make
them unenforceable.
