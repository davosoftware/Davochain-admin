# Open questions

> **Status 27 Oct 2026:** **mostly answered.** Naira provider: **Payrep MFB**. Identity checks: **Dojah** (Basic + Advanced). File storage: **Cloudflare R2**. Email verification: built. Open decisions now live in `Reports/OPEN_ISSUES.md` section B. Kept for history.

Things that need a decision or an answer from someone outside the codebase.
Nothing here is a bug — it is work that was deliberately not done, because doing
it would have meant guessing.

Each question says what we do today, what breaks if we guess wrong, and what an
answer would let us do.

**Two of these must be settled before real money moves** — Q1 and Q2. The rest
are improvements that can be scheduled.

---

## Q1. Which webhook signature type is our Quidax account configured for?

**Ask:** Quidax support, or check the webhook settings page on the Quidax
dashboard.

### What a webhook is, and why this matters

Quidax tells us about events — a deposit landed, a withdrawal completed, a swap
finished — by making an HTTP request to our server. That request is how a user's
balance gets credited. Anyone who can forge one of those requests can credit
themselves money, so every request carries a **signature**: a fingerprint
computed from the message body and a shared secret, which only Quidax and we
know. We recompute the fingerprint and reject anything that does not match.

### What we do today

Our verifier expects a header shaped like this:

```
quidax-signature: timestamp=1788700000, v1=<hex>
```

and recomputes it as `HMAC-SHA256(secret, "<timestamp>.<raw body>")`.

### The problem

Quidax's setup documentation says you *"select the **Signature Type**"* and
*"provide the **Signature Secret**"* when configuring a webhook — but it does
not publish what the available types are or how each is computed. Our format
came from an earlier reading and has never been checked against a live event,
because there is no sandbox.

### What breaks if it is wrong

**Every webhook is rejected, silently.** Deposits would never credit. Users
would send money in and see nothing arrive. The failure looks like Quidax not
sending anything, so it is easy to misdiagnose.

Quidax retries a failed webhook five times — immediately, then after 1 minute,
30 minutes, 1 hour and 24 hours — and then **stops sending it forever**. So the
window to notice and fix it is about a day per event, after which that deposit's
notification is gone for good and has to be recovered by hand.

### What we need

One of:

- The signature type selected on our account, and the exact algorithm for it
  (header name, what string is signed, hashing method), **or**
- A single captured example: the full header and the exact raw body of one real
  webhook. That is enough to work the format out and verify against it.

---

## Q2. What decimal precision does Quidax accept per coin on instant swap?

**Ask:** Quidax support.

### What "precision" means here

Every coin has a smallest amount it can be moved in. Bitcoin can be split to 8
decimal places on the blockchain, but an exchange usually accepts fewer — it
might only take 5. If we ask to move `0.00123456` BTC and Quidax only accepts 5
decimals, it either rejects the request or quietly moves `0.00123` instead.

### What we do today

Nothing. Every coin's `transferStep` is unset, so amounts are sent at whatever
precision the calculation produced — up to 18 decimal places.

### What we know

Quidax publishes precision for **order book trading pairs**:

| Pair | First currency | Second currency | Price |
| --- | --- | --- | --- |
| BTC/USDT | 5 decimals | 2 | 2 |
| ETH/USDT | 4 decimals | 2 | 2 |
| NGN pairs | typically 0 decimals for the naira amount | | |

They also state minimum order sizes: **₦1,000** and **$0.90**. Our own $10 floor
is comfortably above both, so minimums are not a concern.

### The problem

We do not use the order book. We use **instant swap**, which is a different
product and may have different rules. Applying the order-book table to instant
swap would be a guess.

### What breaks if we guess wrong

Two ways, both bad and both quiet:

- **If we send more precision than allowed and Quidax truncates**, we credit the
  user the amount we asked for while a smaller amount actually moved. The
  difference is real money, it never comes back, and it accumulates as
  reconciliation drift — which the dashboard reports but cannot undo.
- **If we round too aggressively**, we short-change users on every trade by a
  tiny amount. Less dangerous, but it is still taking money that is not ours.

### What we need

The accepted decimal places per currency **for instant swap and for
withdrawals** — those may differ from each other too. With that, one line per
coin in the seed data closes it.

If Quidax cannot say, the safe fallback is to adopt the published order-book
precision, which is more conservative than sending 18 decimals. That is still a
guess and should be a deliberate one.

---

## Q3. Should admin login get brute-force protection?

**Decision:** yours. No external answer needed.

### Where we stand

A **user** who gets their password wrong repeatedly is locked out for a period.
An **admin** is not — there is no limit on how many times an admin password can
be guessed.

That is backwards. One admin account can change every fee on the platform,
suspend any user, and rotate the Quidax key.

### Options

1. **Reuse the user lockout** — the same "too many attempts, try again after X"
   the user path already has. Simple, and consistent with what exists.
2. **Per-IP throttling** on the admin login route — slows an attacker without
   ever locking out a real admin.
3. **Both** — lockout protects the account, throttling protects the endpoint.

Option 3 is what most systems settle on. Option 1 alone has a drawback worth
knowing: an attacker who knows an admin's email can lock them out on purpose.

### What we need

Which of the three, and if a lockout: how many attempts, and for how long.

---

## Q4. Should the API rate-limit incoming requests?

**Decision:** yours.

### Where we stand

We carefully rate-limit the calls **we make to Quidax**, so we stay inside their
300-per-minute budget. Nothing limits what the outside world sends **to us**.

Anyone can call our login endpoint, the password-reset endpoint, or the quote
endpoint as fast as their connection allows. Quotes are the expensive one: each
one can trigger a call to Quidax, so hammering it burns the shared Quidax budget
that real trades depend on.

### What we would add

A standard throttler, with tighter limits on the sensitive routes:

| Route | Suggested |
| --- | --- |
| Login (user and admin) | 5 per minute per IP |
| Password reset request | 3 per hour per IP |
| Quotes | 30 per minute per user |
| Everything else | 100 per minute per IP |

### What we need

Whether to add it, and whether those numbers suit the traffic you expect. They
are a starting point, not a recommendation with data behind it.

---

## Q5. Should CORS be restricted to known origins?

**Decision:** yours.

### What CORS is

A browser rule. When a web page at `site-a.com` tries to call an API at
`api.site-b.com`, the browser first asks the API whether that is allowed. CORS
is the API's answer.

### Where we stand

```ts
app.enableCors({ origin: true, credentials: true });
```

`origin: true` means "allow whoever is asking". Combined with `credentials`, any
website a user visits could make authenticated calls to our API from that user's
browser.

**Nothing depends on this today.** The admin dashboard talks to the API from its
own server with a bearer token, never from the browser. So this is not currently
exploitable — which is exactly why it is cheap to fix now rather than after
something does depend on it.

### What we need

The list of front-end origins that will legitimately call the API from a
browser. Likely:

- the admin dashboard's URL
- the public website's URL
- `http://localhost:3100` and similar for development

The mobile app is unaffected — CORS is a browser rule and does not apply to it.

---

## Q6. Should the API refuse to start in production with the mock enabled?

**Decision:** yours. Strongly recommended.

### The situation

`QUIDAX_USE_MOCK=true` swaps the real Quidax client for a fake one, so the
system can be developed without touching real money. It also means the webhook
endpoint **accepts unsigned requests** — because in mock mode there is no
upstream signing anything, and rejecting everything would make local development
impossible.

That is correct for a laptop. In production it is an open endpoint that anybody
who finds the URL can use to credit balances.

### What we would add

A check at startup: if `NODE_ENV=production` and the mock is on, refuse to boot
with a clear message. The same check could warn when `CREDENTIALS_KEY` is
missing.

The effect is that a misconfigured deploy fails loudly instead of coming up
looking healthy with a hole in it.

### What we need

Confirmation to add it, and whether a missing `CREDENTIALS_KEY` should also be a
refusal or just a warning. (Warning is the safer default — it is how an existing
install keeps working while the key is being set up.)

---

## Q7. Two-factor authentication for admins

**Decision:** yours. This is the largest single security improvement available.

### Where we stand

An admin account is protected by a password, plus an emailed code if they forget
it. That is all. Whoever has the password has the dashboard, and the dashboard
can move the treasury.

### What we would add

TOTP — the six-digit rotating code from an app like Google Authenticator or
1Password. Set up once per admin, entered at login alongside the password.

Roughly: a secret per admin, a QR code to scan during setup, a code check at
login, and a set of one-time recovery codes for a lost phone.

### What we need

- Whether to require it for all admins or only owners.
- Whether to enforce it immediately or allow a grace period for existing admins
  to enrol.

---

## Q8. Smaller items

These need a yes or no, and little else.

**Content Security Policy.** It is switched off globally so the API
documentation page can load. That page is already disabled in production, so CSP
can simply be switched on there. — *Add it?*

**IP allow-listing per admin.** The admin surface has few users and they are all
known. An optional allow-list per account would make a stolen password
insufficient on its own. Useful, not urgent. — *Worth doing?*

**Unused queues.** `SETTLEMENT` and `EMAIL` are declared but nothing sends to
them and nothing consumes them — settlement runs inline with the reconciler as
its backstop, and email goes out directly. They are dead constants, not a bug. —
*Remove them, or keep them for planned work?*

**Register and login return different shapes.** `POST /v1/auth/register` returns
`{ userId, tokens: { … } }`; `POST /v1/auth/login` and `/refresh` return the
token object flat. Both are documented in [FLUTTER.md](FLUTTER.md) and the app
can handle it with one line, so nothing is broken — but it is a trap every new
client falls into once. — *Normalise register to the flat shape, or leave it and
rely on the doc?* Changing it is a breaking change for anything already built.

---

## Q9. ~~Should the logo be readable from an <img> tag?~~ — settled

**Answered by building the email templates.** No decision left.

Helmet sets `Cross-Origin-Resource-Policy: same-origin` on every response. That
was a convenience problem while only the website wanted the logo — it could
proxy the image through its own origin in ten lines.

It stopped being optional when the logo went into the header of every email and
a picture went into the body. A mail client is a different origin by definition,
and there is no proxy to write: the message is already sent.

So `GET /v1/site/logo` and `GET /v1/site/email-image/{key}` now send
`Cross-Origin-Resource-Policy: cross-origin`. **The carve-out is those two
routes only** — every other response keeps the strict default. Both are public
brand assets, served to anyone who asks, by design; the policy was protecting
nothing on them.

[WEBSITE.md](WEBSITE.md) and [CMS.md](CMS.md) are updated to match.

---

## Still blocked on a provider

Recorded here for completeness; these are in `TODO.md` and unchanged by the
audit.

- **Naira payout provider.** Users can hold naira and buy with it, but there is
  no way to cash out to a bank. The fee ladder for it is built and priced; the
  rail is not. Quidax's bank-withdrawal endpoints are deliberately unused
  pending this decision.
- **Naira funding provider.** The mirror of the above — nothing tops a naira
  balance up.
- **KYC verification provider.** A BVN or NIN submission is recorded and marked
  pending; approval is a manual admin review until a provider is chosen.
- **Object store for KYC documents.** `KycDocument.storageKey` has no uploader
  behind it yet.
