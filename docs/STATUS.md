# Status

**Updated 27 October 2026.** This page replaces the September status notes.

## Where things stand

- **Everything planned for launch is built, tested and on `main`**, in both repositories: API `davosoftware/davochain-api` and this dashboard, `davosoftware/Davochain-admin`.
- **Tests on 27 Oct:**
  - API: 2,022 unit tests and 194 end-to-end tests, all passing;
  - dashboard: 68 tests, with a clean type check and lint.
- **Providers:**
  - **Quidax** (crypto);
  - **Payrep MFB** (naira): tested on its real sandbox;
  - **Dojah** (identity: Basic and Advanced);
  - **Cloudflare R2** (files): checked against the real bucket;
  - SMTP (email) and Firebase (push).
- **Not live yet.** Left before launch:
  - setting up the Contabo VPS with PM2;
  - the providers' live keys;
  - business settings;
  - a real ₦100 test.

## Which documents to read

The up-to-date documents are in the project workspace's **`Reports/`** folder, plus the API repository's `docs/`:

| For | Read |
|---|---|
| The whole picture, in one page | `Reports/HANDOVER.md` |
| How every flow works, in plain words | `Reports/HOW_DAVOCHAIN_WORKS.md` |
| Using this dashboard, screen by screen | `Reports/ADMIN_DASHBOARD_GUIDE.md` |
| What's left, and who does it | `Reports/OPEN_ISSUES.md`, `Reports/PRODUCTION_READINESS_AUDIT.md` |
| Going live, step by step | `Reports/LAUNCH_CHECKLIST.md`, `Reports/PM2_VPS_GUIDE.md` |
| The mobile app | `api/docs/FLUTTER_API.md`, `Reports/FLUTTER_WIRING_GUIDE.md` |

## The files in this folder

| File | State |
|---|---|
| `ADMINS.md`, `CREDENTIALS.md`, `CMS.md`, `PUSH.md`, `WEBSITE.md`, `ARCHITECTURE.md` | Topic references; still accurate, with notes where things changed |
| `TODO.md`, `Questions.md`, `securityfeatures.md`, `AUDIT.md`, `FLUTTER_API_ROUTE_GAP_ANALYSIS.md` | September–October planning notes, **superseded**; each says what replaces it |
| `FLUTTER.md` | Out of date; points to the API's own app guides |
