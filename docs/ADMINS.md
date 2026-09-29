# Admin accounts

Who can sign in to the dashboard, what they can reach, and how a session ends.

---

## Two kinds of account

| | **Owner** | **Sub-admin** |
| --- | --- | --- |
| Sees | everything | only what an owner granted |
| Can add and disable people | yes | only with `team.manage` |
| Can grant permissions | yes | **no** |
| Can promote or demote | yes | no |
| Can disable an owner | yes | no |

`npm run create-admin` always makes an **owner** — it exists to bootstrap the
account that can grant every other one, and a sub-admin with no permissions
could not unlock anything, including itself. Everyone after that is added from
**Settings → Team**, which invites them rather than issuing a password.

There is always at least one active owner. Demoting or deactivating the last one
is refused, because an install with no owner has nobody who can grant a
permission again and cannot be recovered without database access.

### Permissions

One key per thing a person actually does, split into seeing and doing wherever
the doing moves money or changes what users experience:

```
overview.view          inventory.view / inventory.manage
reconciliation.view    fees.view / fees.manage
claims.view / claims.manage                transactions.view
transactions.approve   earnings.view        referrals.view / referrals.manage
giftcards.view / giftcards.manage / giftcards.review
users.view / users.manage
kyc.view / kyc.review  notifications.send   audit.view
team.manage            settings.manage      kyc.limits
credentials.manage     content.view / content.manage
content.emails
```

`earnings.view` opens the [earnings manager](#the-earnings-manager), which lists
every fee the platform has charged with the payer's name and email beside it. It
is off by default and separate from `transactions.view` for that reason.

`transactions.approve` is the only permission on this list that moves money on
its own: it releases a held naira deposit into somebody's balance. It is
separate from `transactions.view` so that reading the ledger and crediting an
account are two different grants. See
[the approval queue](#the-transactions-manager).

`content.manage` publishes straight to the website and the apps — there is no
review step — and `content.emails` changes the wording every user receives and
can switch an email off entirely. Both are separate from `content.view` for that
reason. See [CMS.md](CMS.md).

A new sub-admin starts read-only. An owner widens it deliberately, rather than
narrowing a default that was too generous.

Permissions are enforced **on the API**, not in the browser. The dashboard hides
what you cannot use — a link that always fails is worse than no link — but the
guard is the thing that stops you, and it names what is missing so you can ask
for it:

```
403  You do not have permission to do this. Missing: users.manage
```

An owner is never checked against the list. Storing an owner's permissions would
mean a stale list could lock them out of their own dashboard.

---

## Sessions

A session ends after **30 minutes of inactivity** — set with
`ADMIN_IDLE_TIMEOUT_MINUTES`. The risk being guarded is a dashboard left open on
an unlocked machine, so the clock runs on idleness rather than on the age of the
token.

The API is the authority. Each admin request checks that the account is still
active, that the password has not changed since the token was minted, and that
the session is live — then touches it. The dashboard shows a warning a minute
before the deadline and reports activity every five minutes, so somebody filling
in a long form is not timed out mid-sentence.

When a session does end, the next page load lands on the login screen **with the
reason**:

> Signed out after a period of inactivity. Please sign in again.

Sessions also end immediately when the password changes, when an owner
deactivates the account, or from **Settings → Sign out others**.

---

## Joining

**Settings → Team → Add sub-admin.** An owner enters a name, an email and what
the person may do; the account is created and an **invitation** is emailed to
them.

**No password is generated.** The account is created with a random hash nobody
holds and nobody can guess, so until the invitation is accepted there is no
credential to steal and nothing can sign in to it. The new admin follows the
link, chooses their own password, and that is the first credential the account
has ever had.

That is the whole reason for the design: a generated password has to travel to
its owner somehow, and every route it can take — an email, a chat message, a
note passed across a desk — leaves a live credential sitting somewhere readable.

The link **works once** and expires after 48 hours (`ADMIN_INVITE_TTL_HOURS`).
Sending a new one cancels any earlier link. An account that has never signed in
shows **Resend invite** on its row, which is the answer to "I never got the
email".

Checking a link never says *why* a bad one failed — expired, already used and
never existed are the same answer, because telling them apart confirms to
somebody holding a guessed token that they guessed a real one.

> **Needs SMTP.** Without it the invitation cannot be delivered and the screen
> says so plainly rather than claiming success. Outside production the API logs
> the link so the flow can still be tested.

---

## Passwords

Two ways to change one.

### With the current password

**Settings → Password.** Ends every other session; you keep the one you are
using, because being signed out by your own action reads as a bug.

### With a code, when you cannot sign in

**Login → Forgot password.** A six-digit code is emailed, good for ten minutes,
five attempts, one at a time.

**A sub-admin's code also goes to every owner.** Resetting the password on an
account that can move money is something the people responsible for it should
see happen, not read about afterwards.

The reset form never says whether an email matched an account — a different
answer for a real address is a way to enumerate admins — so the second step
appears either way and a wrong address simply never receives a code.

Codes are stored as a SHA-256 hash. A leaked database row is not a working
credential.

> **Needs SMTP.** Without `SMTP_HOST` no code can be delivered. Outside
> production the API logs the code so a reset can still be tested; in production
> it does not, and a request that cannot be delivered simply never arrives.
> See the SMTP block in `.env.example`.

---

## The transactions manager

**Records → Transactions** (`transactions.view`). Every movement, one tab per
kind, plus the few that are waiting on a person.

Each row states three money figures in **one** unit, and `unit` says which — a
transaction has two sides in two assets, so there is no single currency for a
row, but there is one for the fee, and that is the side the figures are given
in. `Amount + Fee = Total` on every row, always:

| Type | Stated in | Total | Fee |
| --- | --- | --- | --- |
| Buy | naira | what was paid | the rate fee, reconstructed from `usdValue × gateApplied` |
| Sell | naira | what was received, grossed back up | the rate fee |
| Swap | dollars | `usdValue` — two coins and a fee in a third have no other unit | `feeUsd` |
| Crypto withdrawal | the coin | the total debited | our share; the chain's `networkFee` is a cost and is shown apart |
| Naira withdrawal | naira | the total debited | the flat fee |
| Deposit | the asset | what arrived | nothing — money arriving is not charged |

**Mode of payment** is derived, not stored. Nothing records a payment method
because nothing chooses one: naira arrives by bank transfer because that is the
only way it can, and a coin leaves over its chain because there is no other
kind. Deriving it keeps the column honest; storing it would create a field that
can be wrong.

Clicking a row opens the settlement legs, what Quidax said, and why it stopped
where it did.

### The approval queue

A naira deposit that arrives over the depositor's tier limit is set `ON_HOLD`
rather than refused — the bank transfer already happened and there is nothing to
reject. The money sits with us and their balance does not move until somebody
says it may. **Needs approval** is that queue, and it needs
`transactions.approve`.

- **Release** credits the balance through the ledger, marks the deposit
  `COMPLETED`, clears the hold reason and emails them. It does exactly what the
  webhook would have done had the limit not caught it.
- **Reject** marks it `FAILED` with a reason the depositor is shown. No money
  moves — it never reached a balance, and it is not ours to send back from here.

### "Within limits now"

Every held deposit is re-checked on read against the depositor's tier and the
caps **as they stand**, and the row says which of two decisions you are making:

| The row says | What it means |
| --- | --- |
| **within limits now** | Their tier was raised, or the cap was. Releasing overrides nothing — the deposit has caught up with the limit. |
| **still over limit** | The cap that held it still stands, and the row says why. Releasing lets this deposit past a live control, and the confirmation says so. |

It is computed on read, not stamped on the row when a tier changes, because a
tier is not the only thing that can move: editing the KYC limits themselves can
bring a held deposit inside the cap without touching the depositor at all. A
stored flag would miss that and go quietly stale.

**It never releases anything.** A user who upgrades their tier still waits for
somebody to click — the flag only tells that person whether they are approving
a deposit or overriding a limit.

> The re-check leaves the deposit being asked about out of the day's total.
> Held deposits already count towards the daily cap, so without that its own
> amount would be counted twice — once in the total and once as the amount
> being tested — and a deposit well inside the cap would report as over it.

Both are audited, and the decision and who made it show on the row afterwards.
The status is re-read inside a serializable write and the update is conditional
on it, so two admins clicking Release at the same moment credit the balance
once; the others are told it was already dealt with rather than seeing an error.

> **`RECONCILING` is never actionable, and deliberately so.** Those transactions
> are stuck because the outcome is genuinely *unknown* — a worker is still
> polling Quidax — and resolving one by hand is how somebody gets paid twice.
> They are shown, and banner-flagged, and there is no button anywhere on this
> screen that would refund one.

---

## Gift cards

**Gift Card Manager** — four screens, and three permissions: `giftcards.view`
to look, `giftcards.manage` to set up cards and their rates, `giftcards.review`
to decide a trade. The last one credits real naira, which is why it is its own
grant.

### The catalogue, in three layers

```
Brand category      Shopping, Gaming, Streaming
  └ Brand           Amazon, Steam        — name and logo, what the user taps
      └ Card type   E-code, Physical     — currency, min, max, and the RATE
```

The rate lives on the **type**, not the brand, because an Amazon e-code and an
Amazon physical card are not worth the same — one clears faster and carries
less risk. Pricing them together means underpaying one or overpaying the other.

Each type carries its own **currency**. An Amazon UK card is priced in pounds,
and a rate of "naira per dollar" applied to it would underpay the seller by a
fifth.

**Deleting** works only on something nothing depends on. A category with
brands, a brand with types, or a type with trades is refused, and the message
says what is in the way. Deactivate instead: it disappears from the app, and
every past trade still names the card it was.

### The trade queue

A user submits a card with photographs, an optional code, and what they say it
is worth. The rate is **frozen at submission** — repricing the type afterwards
does not change what that person was promised, in either direction.

The voucher code is **encrypted at rest** under `CREDENTIALS_KEY`, the same
protection a partner API key gets. A gift card code is money: whoever reads it
can spend it, and a database dump should not hand out cards. It is decrypted in
exactly one place — opening a single trade — and reading one is audited.

Three decisions:

| | What it does |
| --- | --- |
| **Approve** | Enter what the desk actually cleared the card at. The user is paid `faceValue × quoted rate`; the margin is the difference. |
| **Partially approve** | For a card worth less than claimed. Enter what it is really worth, what to pay per unit, what you cleared it at, and why. The reason is shown to the user. |
| **Reject** | Enter a reason. Nothing moves. The reason is shown to the user. |

Worked through: a $100 card quoted at ₦1,000/$ and cleared at ₦1,120/$ pays the
user **₦100,000** and earns **₦12,000**.

> **The clearing rate is never returned on a user endpoint.** It is the buy side
> of our own trade; publishing it would publish our margin to the people we are
> quoting.

The margin can be **negative** — a card cleared below the rate quoted lost money
— and it is stored and reported as such. Clamping it to zero would hide exactly
the number that says a rate is set too generously.

Approving twice is impossible: the update is conditional on the trade still
being pending, inside a serializable write, so two admins clicking at once pay
once and the second is told.

### Where the money shows up

Gift card margin is the **fifth earnings ladder**, in naira, and appears on the
dashboard's Earnings card and as its own tab in the
[earnings manager](#the-earnings-manager). It is stored as `feeAmount` on the
`GIFT_CARD` transaction, which is where every other naira fee lives, so the two
screens read one number.

---

## Rewards and referrals

**Fees → Rewards & referrals** (`referrals.view`; `referrals.manage` to change
the offer). What each side is paid, what unlocks it, and everybody who has been
invited.

Every user gets a referral code at signup, built from their name plus four
random characters — no 0, O, 1, I or L, because a code gets read aloud and
mistyped. They may replace it with a **username** of 3–7 characters, once: the
generated code stops resolving the moment they do, so a link already shared
would break if it could be changed again.

### What the admin sets

| | |
| --- | --- |
| The referrer gets | Naira, paid when the person they invited verifies |
| The new user gets | Naira, shown at signup, paid once they verify **and** trade enough |
| Verification that unlocks | Which tier counts — TIER_1, 2 or 3 |
| …and the new user must trade | Cumulative buys, sells and swaps. Deposits do not count, or somebody could deposit and withdraw the same money to satisfy it. Zero means the tier alone is enough |
| Most paid referrals per person | 0 is unlimited |
| Most one person may earn | Naira, in total. 0 is unlimited |

**Changing an amount never reprices a reward already promised.** Both figures
are copied onto the reward row when it is created, so somebody promised ₦1,000
is owed ₦1,000 whatever the offer says next week. The two caps are the
deliberate exception — they are read at payout, so raising one releases rewards
that were paused under the old ceiling.

Both caps **pause** rather than end. Past a cap a person's referrals still list
and still show; they simply stop paying, and the reason is on the row.

### A pending reward is not money

Until its conditions are met a reward exists only as a row with an amount on
it. There is no ledger entry, no balance, and no transaction — the user sees it
on their referral screen labelled as pending, with what it is waiting for, and
nowhere else.

Releasing it writes one naira credit out of the **PROMOTION** ledger account,
which is its own account rather than a debit against REVENUE: a reward is a
cost of winning a customer, not a fee we failed to earn, and blending them
would make a month of heavy referral spend look like a month of weak margin.

Because nothing exists until it is earned, an abandoned signup costs nothing.

### Guards

- **No self-referral.** Checked when the code is used.
- **A referrer is attached at signup and never afterwards.** There is no
  endpoint that adds one to an existing account, which is the whole attack.
- **One referral per account, forever** — a unique index, so no retry or race
  can give somebody a second referrer.
- **A code that matches nobody is ignored, not refused.** A typo must not stop
  somebody registering.
- **Paying twice is impossible.** The release is conditional on the reward
  still being pending, inside a serializable write, so two evaluations racing
  each other pay once.

---

## The earnings manager

**Fees → Earning manager** (`earnings.view`). Every fee the platform has kept,
one row per transaction that produced one, with the person who paid it.

There is no earnings table. An earning is not a separate event — it is a column
on the trade that generated it — so the screen is a projection of `transactions`
and the dashboard's four Earnings figures are aggregates over the same columns.
The two therefore cannot disagree, and a fee that is missing here is missing from
the ledger, not from a copy of it. Only `COMPLETED` transactions count.

One tab per fee ladder, named after the ladder that charged it, so a figure that
looks wrong names the screen that sets it:

| Tab | Ladder | Charged in | Worked out from |
| --- | --- | --- | --- |
| Buy & sell | `RATE` | naira | `usdValue × gateApplied` — the fee is folded into the rate, so it is reconstructed |
| Swaps | `SWAP` | dollars | `feeUsd` |
| Crypto withdrawals | `WITHDRAWAL` | dollars | `feeUsd` — our share only; `networkFee` is what the chain took and is a cost, not revenue |
| Naira withdrawals | `NGN_WITHDRAWAL` | naira | `feeAmount` |

Every row states three figures that always add up: **Total** is what the trade
was worth gross, **Fee** is what was kept, and **Amount** is what reached the
user. Which stored column is which depends on the side the fee came off — a
buyer pays gross and receives net, a seller is credited net — so `Amount` is
derived from the other two rather than read from a fourth column that could
disagree with them.

**Naira and dollar earnings are never added together.** Doing so needs an
exchange rate, and picking one would let today's rate silently rewrite last
month's earnings on every page load. The header and the All tab show both
figures side by side; each ladder tab shows the one currency it charges in. For
the same reason the Fee column can only be sorted once a single currency is in
view.

Filters — search (name, email or transaction reference), transaction type, fee
currency, and a date range — all live in the URL, so a narrowed view is a link
somebody can send. **Export CSV** writes the whole filtered set (capped at
10,000 rows) with amounts as plain decimals and the currency in its own column,
so a spreadsheet can total it. The export is written to the audit log: it is a
bulk copy of who paid what, with names and email addresses attached.

> **Naira withdrawals will read zero** until there is a payout rail. The fee is
> priced and the ladder is live, but no naira withdrawal can complete yet, so
> none has ever earned anything. The tab says so rather than looking broken.

---

## The audit log

Every admin action is recorded against the account that took it: what, on which
entity, from which address, and when. Read it at **Records → Audit log**
(`audit.view`), filtered by person or by area.

It is **append-only**. There is deliberately no endpoint that edits or deletes an
entry, and admins are never deleted for the same reason — a log somebody can tidy
is not evidence. Removing someone means deactivating them.

What is never written to it: passwords, generated passwords, and reset codes.
The record says a password was changed, not what it was changed to.

---

## Endpoints

| | |
| --- | --- |
| `POST /v1/admin/auth/login` | Starts a session |
| `POST /v1/admin/auth/reset/request` | Sends a code. Unauthenticated |
| `POST /v1/admin/auth/reset/confirm` | Consumes it, returns a token |
| `GET /v1/admin/auth/invite?token=` | Is this link still good? Unauthenticated |
| `POST /v1/admin/auth/invite/accept` | Sets the password they chose, burns the link |
| `GET /v1/admin/me` | You, your permissions, your session clock |
| `GET /v1/admin/me/sessions` | Where you are signed in |
| `POST /v1/admin/me/sessions/end-others` | Sign out everywhere else |
| `GET /v1/admin/admins` | The team (`team.manage`) |
| `POST /v1/admin/admins` | Add one. Emails an invitation; returns no credential |
| `POST /v1/admin/admins/{id}/invite` | Send the invitation again |
| `PUT /v1/admin/admins/{id}/permissions` | Owners only |
| `PUT /v1/admin/admins/{id}/role` | Owners only |
| `POST /v1/admin/admins/{id}/deactivate` | Ends their sessions too |
| `GET /v1/admin/transactions/manager` | One page of transactions, the tab counts, and what is waiting (`transactions.view`) |
| `GET /v1/admin/transactions/manager/export` | Everything matching, for a CSV. Audited |
| `POST /v1/admin/transactions/{id}/release` | Credit a held naira deposit (`transactions.approve`) |
| `POST /v1/admin/transactions/{id}/reject` | Refuse one, with a reason the depositor is shown |
| `GET /v1/admin/giftcards/categories` | Brand categories (`giftcards.view`) |
| `PUT /v1/admin/giftcards/categories` | Create or edit (`giftcards.manage`) |
| `DELETE /v1/admin/giftcards/categories/{id}` | Refused while brands use it |
| `GET`, `PUT /v1/admin/giftcards/brands` | Name, category and logo |
| `GET`, `PUT /v1/admin/giftcards/types` | Currency, limits and the rate |
| `GET /v1/admin/giftcards/trades` | The queue, with what is waiting |
| `GET /v1/admin/giftcards/trades/{id}` | Decrypts the voucher code. Audited |
| `POST /v1/admin/giftcards/trades/{id}/approve` | Credits naira (`giftcards.review`) |
| `POST /v1/admin/giftcards/trades/{id}/partial` | Less than claimed, with a reason |
| `POST /v1/admin/giftcards/trades/{id}/reject` | Nothing moves |
| `GET /v1/admin/referrals/settings` | The offer (`referrals.view`) |
| `PUT /v1/admin/referrals/settings` | Change it (`referrals.manage`). Audited |
| `GET /v1/admin/referrals` | Every referral, with both rewards and their state |
| `GET /v1/admin/earnings` | One page of earnings, the filtered totals, and the per-ladder summary (`earnings.view`) |
| `GET /v1/admin/earnings/export` | Everything matching, for a CSV. Audited |
| `GET /v1/admin/audit` | The log (`audit.view`) |
