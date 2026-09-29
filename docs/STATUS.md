# Status

The API and admin surface are built, wired and booting. `tsc` and `nest build`
are clean, all 38 modules resolve their dependencies, and 24 tests pass. The only
thing it cannot do on this machine is reach Postgres, because Docker is not
installed here.

## Documents

| | |
| --- | --- |
| [README.md](README.md) | Setup, the Quidax key, environment reference |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the pieces fit, the money flows, their failure modes |
| [FLUTTER.md](FLUTTER.md) | Endpoints, auth and refresh rules, the 12-second quote contract |
| [CMS.md](CMS.md) | Pages, FAQs and email templates: what an admin edits and what reads it |
| [TODO.md](TODO.md) | Running work list, open questions, what to measure live |
| [Design guide](https://claude.ai/code/artifact/21298075-e0ed-4265-b05a-6adba34ee7ab) | The reasoning behind every decision |

## API surface

### App

```
POST   /v1/auth/register | login | refresh | logout | change-password
POST   /v1/auth/reset/request          emailed six-digit code, unauthenticated
POST   /v1/auth/reset/confirm          consumes it; returns NO session
GET    /v1/auth/me
GET    /v1/me                          profile, KYC state, walletReady
GET    /v1/wallets                     balances, from our ledger

GET    /v1/kyc
POST   /v1/kyc/tier1                   BVN or NIN — stored as hash + last4 only
POST   /v1/kyc/documents

GET    /v1/assets                      public
GET    /v1/assets/{code}/networks

POST   /v1/deposits/address            get-or-create; async, poll until usable
GET    /v1/deposits/addresses
GET    /v1/deposits

POST   /v1/quotes                      12s TTL
POST   /v1/trades                      Idempotency-Key required
GET    /v1/trades
GET    /v1/trades/{id}

GET    /v1/withdrawals/quote
POST   /v1/withdrawals/crypto          Idempotency-Key required
GET    /v1/withdrawals

GET    /v1/giftcards/catalogue         public: brands, types, rates, limits
GET    /v1/giftcards/brands/{id}/image public: the logo, immutable
POST   /v1/giftcards/trades            photos and/or a code; rate frozen here
GET    /v1/giftcards/trades            your own history

GET    /v1/referrals/me                code, link, badges, pending totals
PUT    /v1/referrals/username          once only; retires the generated code
GET    /v1/referrals/code/{code}       public: whose code, and the bonus

GET    /v1/notifications
POST   /v1/notifications/read
POST   /v1/devices | DELETE | GET      FCM token registration

GET    /v1/withdrawals/quote/ngn       naira cash-out fee (no rail yet)

GET    /v1/site                        public: what the landing page renders
GET    /v1/site/logo                   public: the brand mark
GET    /v1/content/pages               public: About us, Terms, Privacy, + any
GET    /v1/content/pages/{slug}        public: html, text and markdown
GET    /v1/content/faqs                public: grouped, website only
GET    /v1/site/email-image/{key}      public: an email banner
GET    /v1/site/social/{id}/icon       public: a social icon

POST   /webhooks/quidax                signature-gated, unauthenticated
GET    /health
```

### Admin

```
POST   /admin/auth/login               separate secret and token type

GET    /admin/rate-configs
PUT    /admin/rate-configs/{asset}     writes a NEW version, never an update

GET    /admin/inventory                the alert table on screen
GET    /admin/inventory/fuel           naira fuel and days of cover
PUT    /admin/inventory/targets
POST   /admin/inventory/refill         record a restock made elsewhere

GET    /admin/fees/claimable           grouped by coin, with drift
POST   /admin/fees/claim               enqueues; never blocks
GET    /admin/fees/claims/{id}         live progress

GET    /admin/margin                   realised vs expected per coin
GET    /admin/reconciliation           the ledger invariants
GET    /admin/transactions             with legs and raw upstream status
GET    /admin/transactions/manager     paged, searchable, with the approval queue
GET    /admin/transactions/manager/export      the whole filtered set. Audited
POST   /admin/transactions/{id}/release        credits a held naira deposit
POST   /admin/transactions/{id}/reject         refuses one, with a reason

GET    /admin/giftcards/categories | brands | types
PUT    /admin/giftcards/categories | brands | types
DELETE /admin/giftcards/{kind}/{id}    refused while anything depends on it
GET    /admin/giftcards/trades         the queue
GET    /admin/giftcards/trades/{id}    decrypts the voucher code. Audited
POST   /admin/giftcards/trades/{id}/approve | partial | reject

GET    /admin/referrals/settings       the offer
PUT    /admin/referrals/settings       never reprices a reward already promised
GET    /admin/referrals                every referral, both rewards, their state

GET    /admin/earnings                 every fee kept, per ladder, with the payer
GET    /admin/earnings/export          the whole filtered set, for a CSV. Audited

POST   /admin/assets/sync-networks
POST   /admin/pause | /admin/resume    kill switches

GET    /admin/kyc/pending
POST   /admin/kyc/{userId}/review      approval revokes the user's sessions

GET    /admin/fee-ladders/{rate|swap}  one fee, per coin and global
PUT    /admin/fee-ladders              writes a NEW schedule, never an update
GET    /admin/fee-ladders-preview      what a trade of size X pays on BOTH
GET    /admin/fee-ladders/{kind}/history

GET    /admin/users | /admin/users/{id} | /admin/users/stats
POST   /admin/users/{id}/suspend       revokes their refresh tokens too
POST   /admin/users/{id}/reinstate
GET    /admin/broadcasts               with sender name and opens per send
POST   /admin/broadcasts               skips suspended accounts; queues push

GET    /admin/me                       your own account
PATCH  /admin/me                       email change costs your password
POST   /admin/me/password              returns a replacement token
PUT    /admin/me/avatar | DELETE       512 KB, checked by magic bytes
GET    /admin/me/activity              your own audit trail
GET    /admin/me/sessions              where you are signed in
POST   /admin/me/sessions/end-others   sign out everywhere else
GET    /admin/admins                   the team
POST   /admin/admins                   emails an invitation; no credential returned
POST   /admin/admins/{id}/invite       send the invitation again
PUT    /admin/admins/{id}/permissions  owners only
PUT    /admin/admins/{id}/role         owners only
POST   /admin/admins/{id}/deactivate | /reactivate
GET    /admin/admins/{id}/avatar
GET    /admin/audit                    every admin action, filterable

GET    /admin/kyc-limits               what each tier may move, in naira
PUT    /admin/kyc-limits               per tier; raising one is audited

GET    /admin/credentials              which partner keys are set — never a value
PUT    /admin/credentials              owners only; encrypted before it is stored
DELETE /admin/credentials/{name}       back to the environment variable

GET    /admin/site-settings            what the public website reads
PUT    /admin/site-settings            contact, apps, social, maintenance
PUT    /admin/site-settings/logo | DELETE

GET    /admin/cms/pages                drafts included    (content.view)
POST   /admin/cms/pages | PUT {id} | DELETE {id}          (content.manage)
GET    /admin/cms/faqs
POST   /admin/cms/faqs | PUT {id} | DELETE {id}
PUT    /admin/cms/faqs-order           the whole arrangement, one call
GET    /admin/cms/email-templates      wording + defaults (content.view)
PUT    /admin/cms/email-templates/{key}   wording and the switch (content.emails)
DELETE /admin/cms/email-templates/{key}   back to the shipped wording
POST   /admin/cms/email-templates/{key}/preview   renders; optionally test-sends
PUT    /admin/cms/email-templates/{key}/image | DELETE   the banner, 1200x400
GET    /admin/cms/socials              every network, hidden ones included
GET    /admin/cms/socials/known        suggested networks + the icon size
POST   /admin/cms/socials | PUT {id} | DELETE {id}
PUT    /admin/cms/socials-order        the whole arrangement, one call
PUT    /admin/cms/socials/{id}/icon | DELETE   128x128 PNG/JPEG/GIF

POST   /admin/auth/reset/request       emailed six-digit code, unauthenticated
POST   /admin/auth/reset/confirm       consumes it, returns a token
GET    /admin/auth/invite?token=       is this invitation still good?
POST   /admin/auth/invite/accept       sets the password they chose, burns the link
```

## What is not built yet

Three things still depend on something outside this repo:

- **Naira funding.** Users hold an NGN balance and buys draw from it, but nothing
  funds it yet — so buys cannot be tested end to end. This is the one real gap.
- **Push credentials.** Delivery is built and queued end to end; it stays switched
  off until a Firebase service account is configured. See [PUSH.md](PUSH.md).
- **KYC verification and document storage.** `submitTier1` records the submission
  and marks it `PENDING`; approval is a manual admin review until a provider and
  an object store are chosen.

Everything else in the design guide is implemented.
