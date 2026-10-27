# Wiring the website

> **Status 27 Oct 2026:** still accurate. If the website calls the API from a browser, its address must be listed in the API's `CORS_ORIGINS` (e.g. `https://davochain.com,https://www.davochain.com`).

The landing page does not hard-code the company's contact details, store links
or social handles. It reads them from the API, so an admin changing a phone
number in **System → General settings** changes it on the site — no deploy, no
second copy to keep in step.

Two public endpoints do all of it, plus one more if you want to list the coins.

---

## One endpoint

```
GET /v1/site
```

**Unauthenticated.** Everything it returns is already printed on the page, so a
key would protect nothing while meaning the website needs a secret to render its
own footer. Nothing private is served here.

```json
{
  "companyName": "Davochain",
  "supportEmail": "support@davochain.com",
  "phone": "+234 916 001 2046",
  "address": "Lagos, Nigeria",
  "apps": {
    "iosVersion": "1.0.0",
    "androidVersion": "1.0.0",
    "iosStoreUrl": "https://apps.apple.com/app/davochain",
    "androidStoreUrl": "https://play.google.com/store/apps/details?id=com.davochain"
  },
  "maintenance": { "active": false, "message": null },
  "socials": [
    { "label": "Facebook", "url": "https://facebook.com/davochain",
      "iconUrl": "https://api.davochain.com/v1/site/social/…/icon?v=…", "glyph": "f" },
    { "label": "Instagram", "url": "https://instagram.com/davochain",
      "iconUrl": null, "glyph": "ig" }
  ],
  "logoUrl": "/v1/site/logo?v=1788700000000"
}
```

**Any field can be `null`**, including `logoUrl`, and it means nobody has filled
it in. **Render nothing rather than an empty link**: a footer icon pointing at
`null` is worse than a footer with one fewer icon.

`logoUrl` is a **path, not an absolute URL** — prefix it with the API origin.

### Fetch it on the server, not in the browser

```ts
// app/lib/site.ts
export type Site = {
  companyName: string | null;
  supportEmail: string | null;
  phone: string | null;
  address: string | null;
  apps: {
    iosVersion: string | null;
    androidVersion: string | null;
    iosStoreUrl: string | null;
    androidStoreUrl: string | null;
  };
  maintenance: { active: boolean; message: string | null };
  socials: { label: string; url: string; iconUrl: string | null; glyph: string }[];
  logoUrl: string | null;
};

const API = process.env.API_URL!; // https://api.davochain.com

export async function getSite(): Promise<Site | null> {
  // The site must still render if the API is unreachable.
  return fetch(`${API}/v1/site`, { next: { revalidate: 60 } })
    .then((r) => (r.ok ? (r.json() as Promise<Site>) : null))
    .catch(() => null);
}
```

A browser `fetch` does work today — CORS currently reflects whatever origin
asks. **Do not rely on it.** That permissiveness is an open decision (Q5 in
[Questions.md](Questions.md)) and the plan is to narrow it to an allow-list.
Server-side fetching is unaffected by CORS, is faster for the visitor, and keeps
the API origin out of the page. Every example here assumes it.

### Caching

The endpoint sets its own:

```
cache-control: public, max-age=60, stale-while-revalidate=3600
```

A minute of freshness, and an hour of serving the last known good copy while it
revalidates. A landing page should not go blank because the API is briefly
unwell, and a phone number sixty seconds out of date has never hurt anyone.

`{ next: { revalidate: 60 } }` mirrors that in Next.js. Always give it a
fallback:

```tsx
const site = await getSite();
const company = site?.companyName ?? 'Davochain';
```

---

## The logo

```
GET /v1/site/logo        200 with the image, or 404 when none is set
```

Immutable for a year and keyed by a version, so uploading a new logo produces a
new URL and a cached one is never stale.

You can point an `<img>` straight at it:

```tsx
{site?.logoUrl ? <img src={`${API}${site.logoUrl}`} alt={company} /> : <WordMark />}
```

> **This route carries `Cross-Origin-Resource-Policy: cross-origin`**, which
> overrides the API's global `same-origin` default. Under that default a browser
> on `davochain.com` silently refuses to render an image served from
> `api.davochain.com`, and the same email header that now carries this logo
> would show a broken image in every inbox. The carve-out is for this route and
> the email-picture route only: both are public brand assets served to anyone
> who asks, by design, so there is nothing for the policy to protect.

Proxying it through your own origin is still reasonable if you want the image on
your own CDN — a Next.js route handler that fetches and re-serves it is about
ten lines — but nothing requires it any more.

Keep `logoUrl` as the *test* for whether a logo exists — it is `null` when none
is set, and `/v1/site/logo` 404s in that case. Render your word mark instead.

**Never inline the file into the page.** An SVG is a document a browser will
execute scripts inside; that is why the API sandboxes it, and inlining throws
that protection away.

---

## Maintenance mode

```json
"maintenance": { "active": true, "message": "Back at 6pm WAT." }
```

When `active` is true, show the message instead of the site.

```tsx
if (site?.maintenance.active) {
  return <Maintenance message={site.maintenance.message} />;
}
```

> **Branch on `active` alone.** `message` keeps its last value after maintenance
> is switched off — the admin flips the switch without clearing the text, and the
> API returns the leftover string alongside `active: false`. This is live
> behaviour today, not a hypothetical. Treating a non-null `message` as "we are
> down" would strand the site on a maintenance page.

The API refuses to turn maintenance **on** without a message, so `message` is
never null while `active` is true — you can render it without a fallback.

Note what this switch does **not** do: it does not stop the API, the apps or the
admin dashboard. It is a flag the website chooses to honour. Locking yourself out
of the switch that caused the outage is not a recovery plan.

Because the response is cached for a minute, turning maintenance on takes up to
60 seconds to reach visitors. If you need it faster, drop `revalidate` on that
one call.

---

## Pages and FAQs

About us, Terms, Privacy and the FAQ list are written in the dashboard and read
from here. Public, cached five minutes, served stale for a day — legal copy
changes far less often than a phone number, and an API hiccup must not take the
Terms page down.

```
GET /v1/content/pages          the index: slug, title, excerpt
GET /v1/content/pages/{slug}   one page, as html and plain text
GET /v1/content/faqs           published FAQs, grouped
```

Only published rows are served, so a draft is not reachable at any URL.

### The pages

```ts
// app/[slug]/page.tsx — one route serves every page an admin adds.
export const revalidate = 300;

export async function generateStaticParams() {
  const pages: { slug: string }[] = await fetch(`${API}/v1/content/pages`)
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);
  return pages.map((p) => ({ slug: p.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await fetch(`${API}/v1/content/pages/${slug}`, { next: { revalidate: 300 } });
  if (!res.ok) notFound();
  const page = await res.json();

  return (
    <article>
      <h1>{page.title}</h1>
      {/* Safe: the API runs every body through an allowlist sanitiser before
          it is stored — no scripts, no iframes, no event handlers, only
          formatting. Nothing an admin types can run on this page. */}
      <div className="prose" dangerouslySetInnerHTML={{ __html: page.html }} />
    </article>
  );
}
```

Build the footer's legal links from `GET /v1/content/pages` rather than hard-
coding three of them, and a page an admin adds appears there on its own.

`about-us`, `terms-and-conditions` and `privacy-policy` always exist and can
never be unpublished or renamed, so those three slugs are safe to link directly.
Everything else is the admin's to add and remove — read the index.

### The FAQs

```tsx
const { groups } = await fetch(`${API}/v1/content/faqs`, { next: { revalidate: 300 } })
  .then((r) => (r.ok ? r.json() : { groups: [] }))
  .catch(() => ({ groups: [] }));

{groups.map((group) => (
  <section key={group.category}>
    <h2>{group.category}</h2>
    {group.items.map((item) => (
      <details key={item.id}>
        <summary>{item.question}</summary>
        <div dangerouslySetInnerHTML={{ __html: item.answerHtml }} />
      </details>
    ))}
  </section>
))}
```

Grouping and ordering are done by the API, in the arrangement the admin set — so
the site does not re-derive headings and cannot disagree with the dashboard.

**Render nothing when `total` is 0.** An FAQ heading over an empty list looks
broken; no section at all looks deliberate.

`answerText` comes along too, for a plain-text context — a search index, or a
summary where markup would be noise.

---

## Supported coins, if you want them

```
GET /v1/assets      public
```

The same list the app's crypto page uses — every listed coin, its display scale,
and its networks with `depositsEnabled` / `withdrawsEnabled` per network. It is
public and needs no key, so a "coins we support" section can come from the same
place the product does rather than from a hand-kept array that goes stale.

```jsonc
[ { "code": "btc", "name": "Bitcoin", "displayScale": 8,
    "networks": [ { "id": "btc", "label": "Bitcoin Network",
                    "depositsEnabled": true, "withdrawsEnabled": true,
                    "requiresTag": false, "isDefault": true } ] } ]
```

Cache it hard — it changes when an admin lists a coin, which is rare. Shapes and
the rest of the public surface are in [FLUTTER.md](FLUTTER.md).

---

## What the admin controls

**System → General settings**, gated on the `settings.manage` permission.

| Card | Fields | Where it lands |
| --- | --- | --- |
| Contact information | Company name, support email, phone, address | Header, footer, contact page |
| System | Maintenance mode and its message | The blocking screen |
| The apps | iOS and Android versions, App Store and Play Store URLs | Download buttons; the app's own update prompt |
| Branding | The logo — PNG, JPEG, WebP or SVG, up to 1 MB | `logoUrl` |
| Social media links | Facebook, X, Instagram, LinkedIn, YouTube, TikTok | Footer icons |

Every URL is validated on the way in: full `http`/`https` links only. A
`javascript:` link is refused, because these are echoed to every visitor.

**CMS → Static content** and **CMS → FAQs** feed the pages and the FAQ section
above. See [CMS.md](CMS.md) for what an admin can and cannot change there — in
particular, the three legal pages can be rewritten but never renamed or
unpublished, so the site can link to those slugs without a guard.

**CMS → Social links** feeds `socials`. Render it as a list, not as six named
networks:

```tsx
{site?.socials.map((s) => (
  <a key={s.label} href={s.url} title={s.label} target="_blank" rel="noopener noreferrer">
    {s.iconUrl ? (
      <img src={s.iconUrl} alt={s.label} width={32} height={32} />
    ) : (
      // Same fallback the email uses, so the two agree.
      <span className="glyph" dangerouslySetInnerHTML={{ __html: s.glyph }} />
    )}
  </a>
))}
```

`iconUrl` is absolute and carries a cross-origin resource policy, so an `<img>`
works directly. It is `null` until somebody uploads an icon — `glyph` is a one-
or two-letter fallback for that case, or use your own asset keyed on `label`.
The list is already filtered to the enabled ones and is in the admin's order.

The app reads the same endpoint — see the *Admin-managed content* section of
[FLUTTER.md](FLUTTER.md). One edit reaches the website and both apps.

---

## Checklist before launch

- [ ] `API_URL` set in the website's environment, server-side only.
- [ ] Every read of `site` goes through a null-tolerant helper. The page renders
      with the API down.
- [ ] `maintenance.active` gates the site; `message` is never used as the test.
- [ ] The logo renders. It is served with a cross-origin resource policy, so a
      direct <img> works; a proxy through your own origin is optional.
- [ ] The footer maps over `socials` rather than naming networks — the list is
      admin-managed and a seventh one should appear on its own.
- [ ] Footer legal links are built from `/v1/content/pages`, not hard-coded.
- [ ] The FAQ section renders nothing when `total` is 0.
- [ ] Terms and the privacy policy have been written by a lawyer and replace the
      placeholders — they ship saying they are placeholders for exactly this
      reason.
- [ ] The API origin is on the CORS allow-list **if** anything on the site calls
      it from a browser. Nothing here needs to (Q5, [Questions.md](Questions.md)).

---

## Endpoints the admin uses

Listed so the wiring can be traced end to end; the website never calls these.

| | |
| --- | --- |
| `GET /v1/admin/site-settings` | The same row, plus who last changed it |
| `PUT /v1/admin/site-settings` | Update any subset of the fields |
| `PUT /v1/admin/site-settings/logo` | A data URL, same shape as an avatar |
| `DELETE /v1/admin/site-settings/logo` | Back to the word mark |

Every change is written to the audit log as `site.settings.update`, so a footer
that suddenly points somewhere odd can be traced to who pointed it there.
