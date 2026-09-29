# Partner API keys

The Quidax key, the webhook secret, the SMTP password and the Firebase key are
set from **System → API keys** instead of a deployment. Rotating one is a form
submission, not a release.

That is a real change in blast radius, so it is worth being precise about what
protects it.

---

## What is stored, and how

The value is encrypted with **AES-256-GCM** before it is written. The key that
encrypts it lives in `CREDENTIALS_KEY` on the server and **never in the database
it protects** — so a stolen dump is ciphertext rather than a Quidax key that can
move money.

```bash
# 32 bytes of randomness. Any length works; it is hashed to 32.
openssl rand -base64 48
```

Put it in the API's environment and restart:

```bash
CREDENTIALS_KEY=…
```

Without it the screen says so plainly and refuses to store anything. The
environment variables keep working, so nothing breaks — the keys simply cannot
be changed from the admin until it is set.

> **Losing `CREDENTIALS_KEY` means losing every stored credential.** They become
> unreadable and each one has to be pasted again. That is the correct trade: the
> alternative is a database backup that is itself the keys to the business.

## What is never stored, returned or logged

- The API has no endpoint that returns a stored secret. Not to the admin, not to
  anyone.
- The screen shows the **last four characters** and when it changed. Enough to
  tell which key is loaded, useless in a screenshot.
- The audit log records `credential.set` with the credential's *name* and
  nothing else. A log is the last place a secret should end up.
- Nothing is written to the application log but the name.

## Who can change one

**Owners only** — enforced in the API, not just hidden in the UI. A sub-admin
granted `credentials.manage` can see which keys are set and cannot touch them:

```
403  Only an owner can change a partner API key
```

The permission exists so somebody can *check* the configuration without holding
the treasury.

---

## Where a value comes from

Each credential resolves in one order, and the screen says which applied:

| Source | Meaning |
| --- | --- |
| **set here** | Stored, encrypted, in the database. This wins. |
| **from the server** | Nothing stored; the environment variable is in use. |
| **not set** | Neither. The integration that needs it will not work. |

**Clear** removes the stored value and hands control back to the environment
variable. That is the escape hatch if a pasted key turns out to be wrong.

A change takes effect on the **next request** — no restart. The decrypted value
is cached in the process and the cache is dropped on write.

| Credential | Falls back to |
| --- | --- |
| Quidax secret key | `QUIDAX_SECRET_KEY` |
| Quidax webhook secret | `QUIDAX_WEBHOOK_SECRET` |
| SMTP password | `SMTP_PASSWORD` |
| Firebase private key | `FCM_PRIVATE_KEY` |

Only secrets moved here. Hosts, ports, usernames and base URLs stay in the
environment, because they are configuration rather than credentials and there is
nothing to protect.

---

## Rotating the Quidax key

1. Issue a new key in the Quidax dashboard.
2. Paste it into **System → API keys → Secret key** and save.
3. The next API call uses it. Watch the inventory screen load to confirm.
4. Revoke the old key at Quidax.

If step 3 fails, **Clear** returns to the environment variable while you work out
why — the old key stays valid until you revoke it, which is the whole reason for
that ordering.
