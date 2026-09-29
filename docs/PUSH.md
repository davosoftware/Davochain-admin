# Push notifications

In-app notifications work with no setup — every alert is written to the
database and readable at `GET /v1/notifications`. This document is about
getting them onto a **device**, which needs Firebase.

Without FCM credentials the API logs one warning at boot and carries on. Nothing
else changes, and no notification is lost.

---

## How it fits together

```
something happens  ──▶  notification row written  ──▶  queued  ──▶  FCM  ──▶  device
                              │                                              
                              └──▶  GET /v1/notifications  (always works)
```

**The row is the record; the push is only the delivery.** Delivery runs on a
worker so a slow or failing FCM can never hold up a trade settling, and a push
that never arrives still leaves the user a notification they can open the app
and read.

---

## Setting it up

### 1. Create the Firebase project

1. Go to **[console.firebase.google.com](https://console.firebase.google.com)** → **Add project**
2. Name it `davochain` (or anything — the id is what matters)
3. Google Analytics is optional and unrelated to messaging

### 2. Register the apps

Firebase needs one app entry per platform, and each produces a config file the
Flutter app ships.

| Platform | Where | Produces |
| --- | --- | --- |
| Android | Project settings → Your apps → Android | `google-services.json` |
| iOS | Project settings → Your apps → iOS | `GoogleService-Info.plist` |

The Android package name and iOS bundle id must match the Flutter app exactly.
A mismatch fails silently — messages are accepted and never delivered.

### 3. iOS only: the APNs key

Firebase cannot reach an iPhone on its own; Apple has to authorise it.

1. **[developer.apple.com](https://developer.apple.com)** → Certificates, Identifiers & Profiles → **Keys**
2. Create a key with **Apple Push Notifications service (APNs)** enabled
3. Download the `.p8` — **Apple lets you download it once**
4. Firebase → Project settings → **Cloud Messaging** → APNs Authentication Key → upload it with your Key ID and Team ID

Skip this and iOS push silently does nothing while Android works, which is a
confusing morning.

### 4. Create the service account (this is what the API uses)

1. Firebase → **Project settings** → **Service accounts**
2. **Generate new private key** → downloads a JSON file
3. Open it and copy three fields into `api/.env`:

```bash
FCM_PROJECT_ID=davochain-1a2b3
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@davochain-1a2b3.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
```

> **The private key is the part everyone gets wrong.** Environment variables
> cannot hold real newlines, so keep the `\n` sequences from the JSON exactly as
> they are and wrap the whole value in double quotes. The API converts them back
> at boot. If you paste a key with real line breaks, the file will not parse and
> the app will not start.

The API refuses to boot on **partial** credentials — all three or none. Two out
of three would look configured and silently send nothing, which is worse than
being switched off.

### 5. Restart and confirm

```
[PushService] Push enabled for Firebase project davochain-1a2b3
```

If you instead see `Push disabled — FCM credentials not set`, the values did not
load. Check the quoting on the private key first.

> Treat the service account JSON like the Quidax key: production secret store
> only, never committed. It can send a notification to every user you have.

---

## What the Flutter app does

### Register on sign-in

```dart
final token = await FirebaseMessaging.instance.getToken();

await api.post('/v1/devices', body: {
  'token': token,
  'platform': Platform.isIOS ? 'IOS' : 'ANDROID',
  'appVersion': packageInfo.version,
});
```

Also register on **every** `onTokenRefresh` — the OS rotates tokens, and a stale
one stops receiving silently:

```dart
FirebaseMessaging.instance.onTokenRefresh.listen((token) {
  api.post('/v1/devices', body: {'token': token, 'platform': ...});
});
```

### Unregister on sign-out

```dart
await api.delete('/v1/devices', body: {'token': token});
```

Skip this and the next person to use that phone gets the previous user's alerts.

### Handle the payload

Every message carries a `data` block the app routes on:

```json
{
  "type": "trade.completed",
  "notificationId": "…",
  "transactionId": "…",
  "broadcastId": "…"
}
```

`type` is one of `address.ready`, `deposit.detected`, `deposit.credited`,
`deposit.on_hold`, `deposit.failed`, `trade.completed`, `trade.failed`,
`withdrawal.sent`, `withdrawal.rejected`, or `admin.broadcast.<id>` for an
admin message.

**Admin broadcasts should appear as an in-app popup**, not just a tray
notification — that is what they are for:

```dart
FirebaseMessaging.onMessage.listen((message) {
  final type = message.data['type'] ?? '';
  if (type.startsWith('admin.broadcast')) {
    showDialog(...);           // in-app popup
  } else {
    showLocalNotification(...); // tray
  }
});
```

### Android channel

The API sends on channel id `davochain`. Create it, or Android 8+ drops the
notification without a word:

```dart
const channel = AndroidNotificationChannel(
  'davochain',
  'Davochain',
  importance: Importance.high,
);
```

---

## Endpoints

| | |
| --- | --- |
| `POST /v1/devices` | Register a token. Upserts, so it is safe to call repeatedly |
| `DELETE /v1/devices` | Unregister on sign-out |
| `GET /v1/devices` | This user's registered devices |
| `GET /v1/notifications` | The in-app feed — always works, push or not |
| `POST /v1/notifications/read` | Mark read |

Admin sends live at `POST /v1/admin/broadcasts`. See below for the screen.

---

## Sending one

**System → Notifications** (`notifications.send`).

Sending is a modal, not a panel that is always on the page. Reaching every user
at once is not something to stumble into by tabbing through an open form, so it
takes a deliberate click on **Send Notification** first.

| Field | |
| --- | --- |
| **Title** | Up to 200 characters. Shown as the notification's heading |
| **Send To** | **All Users** — every ACTIVE account. Suspended and closed ones are skipped, because they cannot act on it. **Specific Users** — pick them by name or email |
| **Notification Description** | Up to 350 characters. Shorter than the API allows on purpose: this is read on a lock screen, and a device truncates the rest anyway |

Nothing is sent until both fields have content and, for **Specific Users**, at
least one person is chosen.

### The history

Everything ever sent, newest first, numbered from 1. Each row carries who sent
it, when, whether it went to everyone or to a chosen few, and **how many opened
it** — deliveries are not a measure of anything; opens are.

Search by title, filter by recipients or by a date range, and sort on title or
sent date. All of it narrows in the browser: a broadcast is a rare, deliberate
act, so the whole history arrives with the page.

**View** shows the full message. There is deliberately no edit and no delete —
a notification that has already reached a device cannot be recalled, and a
button implying otherwise would be a lie. The record stays as evidence of what
users were told.

---

## Dead tokens

FCM reports a token as unregistered when the app is uninstalled or the token is
replaced. Those are marked `disabledAt` rather than deleted — a support question
about a missing notification can still be answered — and skipped on every
subsequent send, so one reinstall does not cost a failed delivery forever.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `Push disabled — FCM credentials not set` | The three env vars did not load. Check the quoting on `FCM_PRIVATE_KEY` |
| App refuses to start, complains about the PEM | Real newlines in the private key. It must use literal `\n` |
| Android works, iOS silent | The APNs key was never uploaded to Firebase |
| Nothing arrives, no error | Package name or bundle id does not match the Firebase app entry |
| Android delivers nothing on 8+ | The `davochain` notification channel was not created |
| Worked, then stopped for one user | Token rotated and `onTokenRefresh` is not wired |
