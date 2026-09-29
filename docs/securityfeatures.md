# Security features

What is in place today, and what is worth adding before real money moves.

Written after a full audit of the API against the Quidax documentation. It is a
record, not a wish list: everything under **In place** was verified by reading
the code and exercising the running system, and everything under **Worth adding**
is there because something specific would go wrong without it.

---

## In place

### Authentication

**Fail closed.** `JwtAuthGuard` is registered as an `APP_GUARD`, so every route
is authenticated unless it opts out with `@Public()`. A new controller is
protected by default rather than by remembering to protect it. Exactly three
routes are public — `/health`, `/v1/site`, `/v1/assets` — plus register, login
and refresh.

**Separate secrets for users and admins.** A leaked user token cannot be
replayed against `/v1/admin`; the guard checks both the signature and a `typ`
claim.

**Refresh-token rotation with reuse detection.** Presenting a refresh token that
has already been used revokes the entire family, on the assumption it was
stolen.

**Passwords under scrypt**, with a dummy verify on the unknown-email path so the
response time does not reveal whether an account exists.

**Account lockout** on repeated failed user logins.

### Admin sessions

- **30 minutes of inactivity** ends a session, tracked server-side rather than
  trusted to the token's expiry.
- Every admin request re-checks that the account is **still active** and that
  the **password has not changed** since the token was minted. A deactivated
  admin stops working immediately rather than at the end of their eight hours.
- Changing a password **ends every other session**; the admin doing it keeps
  theirs.
- Sessions are listed and revocable from **Settings**.

### Authorisation

**Owners and sub-admins**, with 18 permissions enforced **in the API** — the
dashboard hides what you cannot use, but the guard is what stops you, and it
names the missing permission rather than returning a bare 403.

Four escalation paths are closed explicitly, each verified: a sub-admin holding
`team.manage` cannot grant a permission, change a role, create an owner, or
deactivate one. The last active owner cannot be demoted or deactivated, because
an install with no owner cannot grant a permission again.

Two actions require **owner** regardless of permissions: rotating a partner API
key, and granting permissions.

### Secrets

**Partner keys are encrypted at rest** with AES-256-GCM, under a key held in
`CREDENTIALS_KEY` on the server and never in the table it protects — so a stolen
database dump is ciphertext rather than a Quidax key. No endpoint returns a
stored secret; the screen sees the last four characters. See
[CREDENTIALS.md](CREDENTIALS.md).

Nothing logs a secret value. The audit log records `credential.set` with the
credential's *name* only. Verified by reading every logging call that mentions a
key, token or password.

### Money

**Decimal everywhere.** No float arithmetic exists in any production money path
— the only `Number()` calls on amounts are in the Quidax mock, which is a test
double. Every mutation runs in a serializable transaction with
`SELECT … FOR UPDATE` on the balance row.

**Never refund from an unknown outcome.** When Quidax's answer is ambiguous the
transaction goes to `RECONCILING` with the funds still locked. Refunding an
unknown is how a user ends up with both the coin and the money back.

**Idempotency** on every state-changing user action, and a unique `reference`
sent upstream so a retry cannot double-spend.

**Reconciliation** compares the ledger against sub-account balances per asset
and reports drift. It is currently reporting drift on five assets in this
development database — correctly, because `dev-credit` writes to the ledger with
no matching upstream balance and the mock's wallets reset on restart.

### Webhooks

Signature verified over the **raw bytes** (Nest's parser would re-serialise and
break the HMAC), constant-time comparison, and a **timestamp tolerance** that
closes the replay window. The handler stores and returns 200, then processes on
a queue, so a slow consumer cannot cause Quidax to retry.

### Admin-authored content

The CMS lets an admin write rich text that renders on the public website, in
the apps and inside email clients. Every body goes through an **allowlist
sanitiser on write** — `sanitize-html`, not a hand-rolled one, because a
sanitiser has to be right about every tag, attribute, protocol and encoding
trick and being wrong once is stored XSS on the marketing site.

Script, style, iframe and form elements are dropped, every `on*` handler is
stripped, and `javascript:`, `data:` and `vbscript:` links lose their target.
Inline styles survive only for an allowlist of properties, so a font or a
colour works and `position` does not. Placeholders are substituted **before**
that pass, so a value off a webhook cannot smuggle a tag into an email either.
Verified live by saving hostile markup and reading back what was stored.

Two public brand routes — the site logo and an email picture — carry
`Cross-Origin-Resource-Policy: cross-origin`, because a mail client fetching an
image is a different origin by definition. Those two only; everything else
keeps the strict default.

### Input and transport

`ValidationPipe` with `whitelist` and `forbidNonWhitelisted` — an unexpected
field is rejected rather than ignored. Helmet is on. Swagger is **disabled in
production** by default, since it enumerates every route and schema.

**KYC limits** cap naira in and out per tier, per transaction and per day, with
the daily total counting in-flight movements so a cap cannot be walked past by
firing a second request before the first settles.

---

## Worth adding

Ordered by what would actually bite first.

### 1. Brute-force protection on admin login

**There is none.** A user who fails repeatedly is locked out; an admin is not,
and the admin login is the higher-value target — one account can move the
treasury.

Add the same lockout the user path already has, or a per-IP throttle on
`POST /v1/admin/auth/login`. The building blocks exist; the admin path simply
never got them.

### 2. HTTP rate limiting

There is no request throttling anywhere in the API. The Quidax *client* is rate
limited so we stay inside their budget, but nothing limits what the world sends
*us*. That leaves login, the password-reset request, and the quote endpoint open
to being hammered.

`@nestjs/throttler` with tighter limits on the auth routes than the rest would
cover it.

### 3. Tighten CORS

```ts
app.enableCors({ origin: true, credentials: true });
```

`origin: true` reflects whatever origin asked, and with `credentials: true` that
means any website can make credentialed requests from a visitor's browser. The
admin dashboard talks to the API server-side with a bearer token, so nothing
depends on this being permissive today — which is exactly why it is cheap to
replace with an allow-list of the real front-end origins.

### 4. Two-factor authentication for admins

An admin password plus an emailed reset code is the whole of the account
security on a dashboard that can change fee ladders, suspend users and rotate
the Quidax key. TOTP on admin login would be the single largest improvement per
hour of work.

### 5. Content Security Policy

CSP is disabled globally so the Swagger page can load its inline scripts. Since
Swagger is already off in production, CSP can be switched on there.

### 6. Deployment guards

Two configurations are safe in development and dangerous if they ever ship:

- **`QUIDAX_USE_MOCK=true`** makes the webhook endpoint accept unsigned
  payloads, because there is no upstream signing anything. In production that is
  an open endpoint that can credit balances.
- **`CREDENTIALS_KEY` unset** silently falls back to environment variables. That
  is the correct behaviour, but it should be loud.

A startup check that refuses to boot in production with the mock enabled — and
warns on a missing credentials key — turns both into a failed deploy rather than
a quiet hole.

### 7. Per-admin IP allow-listing

Not urgent, but the admin surface is small and its users are few and known. An
optional allow-list per admin account would make a stolen password insufficient
on its own.

---

## Open questions

Every question raised by this audit — the two that need Quidax and the decisions
that are yours — is written up in [Questions.md](Questions.md), each with what
we do today, what breaks if it is guessed wrong, and what an answer would let us
do.
