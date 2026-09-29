# Content

What the website and the apps display, and what the system emails, held as data
rather than as strings compiled into three codebases. An admin edits it once and
every surface changes.

Four screens under **CMS** in the dashboard:

| | | |
| --- | --- | --- |
| **Static content** | About us, Terms, Privacy — and anything else you add | Website **and** apps |
| **Email templates** | Every email the system sends automatically | Inboxes |
| **FAQs** | Questions and answers | Website only |
| **Social links** | The icon row, with your own icons | Emails **and** website |

---

## The editor

Every body — a page, an FAQ answer, an email — is written in a rich-text editor
and stored as **HTML**. Fonts, sizes, colours, alignment, lists, links and
tables, with a toolbar rather than a syntax to learn.

It is **TinyMCE 6, self-hosted**. Two things about that are deliberate:

- **Version 6, not 7 or 8**, because six is MIT. Everything after it is
  GPL-2.0-or-later unless you buy a commercial licence, and GPL is the wrong
  licence to pull into a proprietary dashboard.
- **Self-hosted rather than TinyMCE Cloud**, which needs an account, an API key
  and a request to their CDN on every page load. `npm run sync-tinymce` copies
  the assets out of `node_modules` into `public/tinymce`; it runs automatically
  before `dev` and `build`, and the copy is gitignored because it is build
  output.

The font list is deliberately short and web-safe. A typeface nobody's mail
client has falls back to something arbitrary, so offering one would be offering
something that mostly does not arrive.

### What stops a pasted script

This content renders on the public website, in the apps and inside email
clients — all of which will happily execute what they are given. So everything
the editor produces goes through an **allowlist sanitiser on write**
(`api/src/cms/sanitise.ts`, built on `sanitize-html`). What is stored is already
safe; a value read back out needs no further cleaning.

| | |
| --- | --- |
| Kept | Text, headings, lists, tables, links, images, and inline `style` for colour, font, size, alignment and spacing |
| Dropped | `script`, `style`, `iframe`, `form`, every `on*` handler, and any style property outside the allowlist — `position` among them |
| Rewritten | `javascript:`, `data:` and `vbscript:` links lose their target. Every outbound link gets `rel="noopener noreferrer"` |

An unknown tag loses the tag and keeps its words, so removing a stray `font`
element never silently deletes a paragraph somebody wrote.

Placeholders are substituted **before** that pass runs, not after — a suspension
reason is typed by an admin and a coin symbol comes off a webhook, so neither is
trusted either.

> `data:` images are refused on purpose. A pasted screenshot as base64 makes an
> email several megabytes, which most providers then treat as spam. Pictures
> have their own upload, below.

### Upgrading from Markdown

The CMS used to store Markdown. If you have rows written before that change,
convert them once:

```bash
cd api
npm run cms:to-html -- --dry   # show what would change
npm run cms:to-html            # apply it
```

Safe to run twice — a body that already contains HTML is left alone.

### Placeholders

`{{firstName}}` and friends are filled in at send time. **An unknown placeholder
is left standing rather than blanked** — "Hi ," in a live email is a bug that
reads as one, while a visible `{{firstNmae}}` says exactly what went wrong. The
editor lists the placeholders each email may use and warns about any it does not
recognise.

---

## Static content

**CMS → Static content** (`content.view` to read, `content.manage` to change).

Saving publishes. There is no draft-and-approve step, which is why the two
permissions are separate.

### The three pages that always exist

`about-us`, `terms-and-conditions` and `privacy-policy` are created on API
startup if they are missing, and marked **system**:

- They **cannot be deleted, renamed or unpublished** — the apps request them by
  slug, and a 404 on a legal screen in a shipped build is not something an admin
  can undo from here.
- Their **title and wording can** be changed freely.

They ship as **placeholders that say so**. Empty pages would look finished and
ship as blank screens; text that admits it is a draft gets replaced. The legal
wording is not ours to write.

> Terms and a privacy policy need a lawyer, and Nigeria's NDPR has specific
> requirements. Replace all three before launch.

Anything else you add is an ordinary page: renameable, unpublishable, deletable,
and created as a **draft** so a half-written one is never live.

---

## FAQs

**CMS → FAQs**. Website only — the apps have their own help surface and do not
read these.

Each question has an optional **group**; anything left blank lands under
"General". The website renders them grouped, in the order set with the up and
down arrows. Hiding one takes it off the site without losing the writing.

---

## Email templates

**CMS → Email templates** (`content.view` to read, `content.emails` to change).

**Which emails exist is decided by the code** — a template appears here because
something in the API sends it. The catalogue lives in
`api/src/cms/email-templates.ts`; the database holds only the wording. Adding a
key without a caller would put a switch in the dashboard that does nothing.

### What each one does

| Group | Template | Sent when |
| --- | --- | --- |
| Account | Welcome | Somebody registers |
| | **Password reset code** | **Forgot password. The six-digit code** |
| | Password changed | After a password changes, by either route |
| | Account suspended | An admin suspends them. Carries the reason they typed |
| | Account reinstated | A suspension is lifted |
| Verification | Verification submitted | A BVN or NIN is submitted |
| | Verification approved | An admin approves it |
| | Verification rejected | An admin rejects it. Carries the reason |
| Deposits | **Deposit address ready** | **A coin address finishes generating** |
| | Crypto deposit credited | A coin deposit clears |
| | Deposit under review | A deposit is held for a check |
| | Deposit failed | A deposit is rejected |
| | Naira deposit credited | *Not sending yet — no funding provider* |
| Withdrawals | **Withdrawal requested** | **The moment one is requested, before it leaves** |
| | Crypto withdrawal sent | A coin withdrawal leaves |
| | Crypto withdrawal rejected | It is refused and the amount returns |
| | Naira withdrawal sent | *Not sending yet — no payout provider* |
| Trading | Crypto buy | A purchase with naira completes |
| | Crypto sell | A sale to naira completes |
| | Coin swap | A swap settles |
| | Trade failed | A trade could not complete |
| Admin team | Admin invitation | An owner adds somebody |
| | Admin reset code | Forgot password |
| | Admin reset — owner copy | A sub-admin resets; every owner is copied |
| | Admin password changed | Either route |

Three of these are worth a note.

**Password reset code** is the whole of the Forgot-password flow for a user, and
it is the only way back into an account nobody can sign in to — so like the
admin reset code and the admin invitation, it **sends even when switched off**.
A dashboard toggle should not be able to lock every customer out.

**Withdrawal requested** goes out *before* the coins move, not after. It is the
email somebody reads when a withdrawal they did not make appears in their inbox,
and the only moment at which it can still be stopped. Sending only on success
would mean the first warning arrives after the money is on a chain.

**Deposit address ready** exists because address generation is asynchronous and
can take a minute. A user who requested one and then closed the app has no other
way of finding out it arrived.

The two marked *not sending yet* have their code path but no rail behind it. You
can write them now; they start sending the day a provider is connected. The
screen says so on those two.

### What an email looks like

```
┌──────────────────────────────────────┐
│  ██ Davochain                        │  ← brand band: logo + name
│  ┌────────────────────────────────┐  │
│  │        your picture            │  │  ← optional, per template
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│  Hi Ada,                             │
│                                      │  ← white card: what you wrote
│  Your Davochain account is ready.    │
├──────────────────────────────────────┤
│      (f) (ig) (in) (𝕏)               │  ← brand band: social + footer
│  © 2026 …  ·  address  ·  opt-in     │
│  … please feel free to unsubscribe.  │
└──────────────────────────────────────┘
```

**The frame is not editable.** You write a subject, a message and optionally a
picture; everything around them is added at send time. One change to the layout
fixes every email at once, and twenty-two copies of a header is twenty-two
chances to be inconsistent.

Blue and white, taken from the dashboard's own brand token rather than picked
again by eye: `oklch(0.52 0.19 259)` converted to sRGB is `#1062d3`, and the
bands are that hue at lower lightness. Email needs hex — `oklch` is supported
nowhere that matters.

| | |
| --- | --- |
| `#102c58` | Header and footer bands |
| `#0b2142` | The panel behind the picture |
| `#1062d3` | Brand blue |
| `#1d6bde` | Links, a touch brighter to hold up on white |
| `#ffffff` | The message card |

The markup is nested tables with inline styles, which is not nostalgia: Outlook
renders with Microsoft Word, Gmail strips `<style>` blocks on forwarded mail,
and flexbox collapses in most clients. Every email goes out as **HTML and plain
text** — some clients refuse HTML, some people turn it off, and a spam filter is
more suspicious of an HTML-only message.

The social icons are letterforms in outlined circles rather than brand logos.
Gmail and Outlook do not render SVG in `<img>`, so real marks would have to be
PNGs attached to every message, and a blocked or broken image in a footer looks
worse than no icon. These are drawn with borders and text, so they survive even
with images switched off. An icon only appears when that network has a link in
**System → General settings**.

### The picture

Per template, not global — a welcome email and a failed-withdrawal email want
very different pictures, and one banner for both would be wrong for at least
one of them.

> **1200 × 400 pixels.** The message card is 600 points wide, so 1200 covers a
> 2× screen and nothing beyond that is ever visible. 400 tall gives 3:1 — wide
> enough to read as a masthead, short enough that the greeting is still above
> the fold on a phone. Anything is accepted and scaled to fit the width; a
> picture taller than it is wide is saved with a warning, because it pushes the
> message off the first screen.

PNG, JPEG or GIF up to 2 MB, checked by its first bytes rather than what it
claims to be, and downscaled in the browser before it is sent. **SVG is
refused**: no mail client renders it, so it would be a blank space in every
inbox.

Write the description. Most inboxes block images by default, so for a lot of
people it is the only version they see.

### The footer

**CMS → Email templates → Footer and branding.** One row, shared by every
email: the legal entity in the copyright line, the registered address, why they
are receiving it, and where "unsubscribe" points.

Leave a field blank and the shipped default applies, so an empty field never
produces an empty line. The unsubscribe target takes an `https` link or a
`mailto:` address — until there is a preference centre, an address that reaches
a person beats a link to a page that does not exist.

The logo and the company name come from **System → General settings**. The
icons come from **CMS → Social links**.

---

## Social links

**CMS → Social links.** The icon row in every email footer, and the same list
the website reads.

A table rather than a column per network: adding one used to be a schema change,
a migration and a deploy. Each row carries its own icon, so a network added at
four in the afternoon is in the five o'clock email.

| | |
| --- | --- |
| **Name** | Facebook, Instagram, X… free text, so a network nobody listed still works |
| **Your profile** | The full link. `http` and `https` only — it is echoed into every email we send |
| **Icon** | **128 × 128px** PNG, JPEG or GIF. Drawn at 32 points, so 128 stays crisp on a 3× screen |
| **Show** | Off keeps the row and its icon but takes it out of emails and off the site |

Drag order is by the up and down arrows, and it is the order they appear in.

### Without an icon

The footer draws a **letterform in an outlined circle** — `f`, `ig`, `in`, `𝕏`,
or the first two letters of anything else. That is not a placeholder waiting for
something better:

- SVG does not render in Gmail or Outlook, so real brand marks have to be raster
  images, and a blocked or broken image in a footer looks worse than a letter.
- A great many inboxes block images by default. The letterform arrives intact
  in all of them.

Upload an icon where you want the real mark; leave it where you do not. A row is
never a hole in the footer either way.

> Names are unique. Two rows called the same thing would render as two identical
> icons side by side, which reads as a bug.

The six links that used to live on **System → General settings** were carried
over automatically the first time the API started after this change; that card
now points here.

### Preview and test

**Preview email** renders what is *in the editor*, not what is saved, with
sample values — the only way to catch a mangled placeholder before every user
sees it. It is shown in a sandboxed iframe so the dashboard's own styles cannot
make it look right here and wrong in a real inbox.

**Send test** posts a real copy to an address you type, prefixed `[Test]`. It
ignores the on/off switch, because testing a switched-off template before
turning it on is exactly when a test is useful.

Without SMTP configured nothing is delivered and the screen says so rather than
claiming success.

### Switching one off

The checkbox stops that email being sent. **The in-app notification and the push
are separate channels and are unaffected** — a user still sees their deposit
credited in the feed.

Two are exempt and send from the shipped wording even when switched off: the
**admin reset code** and the **admin invitation**. Both are the only way into an
account, and a dashboard toggle should not be able to lock everyone out.

**Reset** discards your edits and returns to the wording this install shipped
with.

---

## What the website and the apps read

Public, unauthenticated, cached for five minutes and served stale for a day. A
privacy policy is published to the world by definition, and requiring a key to
read one would mean the marketing site needs a secret to render its own footer.

```
GET /v1/content/pages          every published page: slug, title, excerpt
GET /v1/content/pages/{slug}   one page, as html and plain text
GET /v1/content/faqs           published FAQs, grouped by category
```

Only published rows are served. A draft is not reachable at any URL, so
"unpublish" is a real control rather than a hidden link.

```jsonc
// GET /v1/content/pages/terms-and-conditions
{
  "slug": "terms-and-conditions",
  "title": "Terms and conditions",
  "excerpt": "The agreement between you and us.",
  "html": "<h2>Terms</h2>\n<p>Use of Davochain…</p>",
  "text": "Terms\n\nUse of Davochain…",
  "updatedAt": "2026-09-06T20:15:16.158Z"
}
```

Two forms of the same content: `html` for the website and for an app that
renders markup, `text` for anything that cannot — a share sheet, a search index,
a screen with no formatting. The HTML has already been through the sanitiser, so
it is safe to render as-is.

```jsonc
// GET /v1/content/faqs
{
  "total": 2,
  "groups": [
    { "category": "Deposits",
      "items": [ { "id": "…", "question": "How long does a deposit take?",
                   "answerHtml": "<p>Usually minutes…</p>",
                   "answerText": "Usually minutes…" } ] }
  ]
}
```

Wiring these into the site is in [WEBSITE.md](WEBSITE.md); into the apps, in
[FLUTTER.md](FLUTTER.md).

---

## Endpoints the admin uses

| | |
| --- | --- |
| `GET /v1/admin/cms/pages` | Every page, drafts included (`content.view`) |
| `POST /v1/admin/cms/pages` | Create one (`content.manage`) |
| `PUT /v1/admin/cms/pages/{id}` | Edit it |
| `DELETE /v1/admin/cms/pages/{id}` | Refused on a system page |
| `GET /v1/admin/cms/faqs` | Every question, hidden ones included |
| `POST` · `PUT` · `DELETE /v1/admin/cms/faqs[/{id}]` | Manage them |
| `PUT /v1/admin/cms/faqs-order` | The whole arrangement in one call |
| `GET /v1/admin/cms/email-templates` | All of them, with defaults (`content.view`) |
| `PUT /v1/admin/cms/email-templates/{key}` | Wording and the switch (`content.emails`) |
| `DELETE /v1/admin/cms/email-templates/{key}` | Back to the shipped wording. Keeps the picture |
| `POST /v1/admin/cms/email-templates/{key}/preview` | Render, and optionally send a test |
| `PUT /v1/admin/cms/email-templates/{key}/image` | The picture, as a data URL, plus its description |
| `DELETE /v1/admin/cms/email-templates/{key}/image` | Remove it |
| `PUT /v1/admin/site-settings` | The footer wording (`settings.manage`) |
| `GET /v1/admin/cms/socials` | Every network, hidden ones included (`content.view`) |
| `GET /v1/admin/cms/socials/known` | The suggested networks and the icon size |
| `POST` · `PUT` · `DELETE /v1/admin/cms/socials[/{id}]` | Manage them (`content.manage`) |
| `PUT /v1/admin/cms/socials-order` | The whole arrangement in one call |
| `PUT` · `DELETE /v1/admin/cms/socials/{id}/icon` | The icon |
| `GET /v1/site/email-image/{key}` | **Public** — what a mail client fetches |
| `GET /v1/site/social/{id}/icon` | **Public** — same |

Every change is written to the audit log — `cms.page.update`, `cms.faq.create`,
`cms.email.update` and so on. The **wording is not** in the record: a policy is
long, and the log is for who changed what and when, not a diff of a legal
document. Switching an email off *is* recorded, because that stops every user
receiving it and somebody will later want to find out when it happened.

Reordering FAQs is deliberately not audited. Dragging a question up the list is
arrangement, not a change to what anybody is told, and logging it would bury the
edits that matter.

---

## Delivery

Emails are **queued, never sent inline**. A deposit crediting, a trade settling
or an account being suspended must not fail — or even slow down — because SMTP
was unreachable. The caller hands the message to the `email` queue and returns;
delivery, retries and the record are the worker's problem.

Every attempt is written to `EmailLog` with its template key, so "did the
deposit email go out?" is a query rather than a guess from a subject line.

Sends are **deduplicated per event**, because Quidax re-sends webhooks and a
user who gets "deposit successful" three times stops trusting the product.
