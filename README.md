# DavoChain Admin Dashboard

The website DavoChain's staff use to run the exchange: watch the money, review identity checks and gift cards, set fees and limits, manage content, and change settings.

**Stack:** Next.js 16 (App Router, server components), React 19, Tailwind, TypeScript.
**Repository:** `davosoftware/Davochain-admin`; the API it talks to is `davosoftware/davochain-api`.

**Last updated:** 27 October 2026.

---

## How it works

- **The dashboard never touches the database.** Every screen calls the DavoChain API (`/v1/admin/...`) from the **server side** (`src/lib/api.ts`), with the admin's token in an httpOnly cookie. The browser never holds the token.
- **The API decides who may do what.** The dashboard hides screens an admin has no permission for (`src/components/nav.tsx`), but the API checks every request again.
- **Owners** can do everything. **Sub-admins** get only the permissions an owner gives them. Some screens are **owners only**: API keys, Server settings and parts of Treasury.

---

## Quick start (development)

```bash
npm install
npm run dev          # http://localhost:3100
```

- The API must be running (default `http://localhost:3000`). To point elsewhere, set `API_URL`, for example `API_URL=http://127.0.0.1:3000`.
- Sign in with an admin created by the API's `npm run create-admin -- --email you@example.com`.

| Command | Does |
|---|---|
| `npm run dev` | Development server on port 3100 |
| `npm run build` / `npm start` | Production build / serve it (on 127.0.0.1:3100; Nginx puts it on the internet) |
| `npm test` | Unit tests for the helpers (68 on 27 Oct) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |

**Deploying:** PM2 runs it with `ecosystem.config.js` (`davochain-admin`, port 3100, `API_URL` = the API on the same server). The API repo's `deploy/deploy.sh` builds and restarts both. Guide: `PM2_VPS_GUIDE.md` in the project's Reports folder.

---

## The screens

| Menu | Screens |
|---|---|
| **Watch** | Overview, **Treasury** (our naira at Payrep and Quidax against what customers are owed), Inventory desk, **Reconciliation** |
| **Fees** | Buy margin, Sell margin, Swap fee, Withdrawal fee, Naira withdrawal fee, Fee claims, Earning manager, Rewards & referrals |
| **Gift cards** | Brand categories, Brands, Card categories, **Card trades** (review customers' cards) |
| **People** | Users, **KYC review** (Basic + Advanced checks), **Compliance review** (sanctions/PEP), **Crypto addresses** |
| **CMS** | Static content, Email templates, FAQs, Social links |
| **Records** | Transactions (including held naira deposits: release or send back), Audit log |
| **Account** | Settings (profile, password, two-step sign-in, sessions, team) |
| **System** | General settings (maintenance mode, logo, email footer), Withdrawals (naira payouts switch), Verification levels (limits per level), Notifications, Alert recipients, Dojah, API keys, **Server settings** (owners; also the emergency "Sign out all customers") |

A plain guide to every screen and button for staff: `ADMIN_DASHBOARD_GUIDE.md` in the project's Reports folder.

---

## Code layout

```
src/app/(dashboard)/   one folder per screen (server components)
src/app/actions/       server actions: the buttons that change something
src/app/login, invite  sign-in (with two-step) and accepting an invitation
src/components/        screens' interactive parts and the UI kit (components/ui)
src/lib/               API client, session, small helpers (each with a *.test.ts)
docs/                  older design notes from September–October (see docs/STATUS.md for which are current)
```
