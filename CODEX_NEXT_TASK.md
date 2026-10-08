# Recommendly — Background Notifications & Push Delivery

## 1. Product goal

Extend the existing Recommendly Activity notification system so that eligible users can receive **real-time browser/PWA push notifications even when Recommendly is not open**.

V1 targets **Chrome**.

The feature must support:

- Desktop Chrome push notifications.
- Installed Android PWA push notifications.
- Android PWA app-icon badge where supported.
- Browser-tab/favicon unread indicator while Recommendly is open.
- Multiple browsers/devices per account.
- Notification click → `/notifications`.
- Existing Activity/unread behaviour unchanged.
- Existing email notification behaviour unchanged.
- Graceful operation when notification permission is denied.
- Future native iOS/Android push without redesigning the notification domain model.

---

# 2. Core architecture

The central rule is:

> **A Recommendly notification is an application event. Push and email are delivery channels.**

The existing `notifications` table remains the **single source of truth**.

```text
Application event
      │
      ▼
notifications row
      │
      ▼
delivery fan-out
   ┌──┴────┐
   ▼       ▼
 Push    Email
   │       │
   ▼       ▼
Web/PWA  Resend
```

Future:

```text
notifications
      │
      ├── Web Push
      ├── Email
      ├── APNs / iOS
      └── FCM / Android
```

Do **not** introduce a platform-specific notification domain model.

---

# 3. Existing notification events

V1 push delivery applies to the existing four Activity notification types:

| Type | Push |
|---|---|
| `subscription_request` | Yes |
| `subscription_approved` | Yes |
| `subscription_rejected` | Yes |
| `access_revoked` | Yes |

Future notification types can be added without redesigning the delivery architecture.

No per-event push preferences are required in V1.

---

# 4. Existing email behaviour is a compatibility requirement

This is especially important.

The current email behaviour must continue to work exactly as it does today.

Currently:

- `subscription_request` can trigger an email through Resend.
- It respects `user_settings.email_contact_requests`.
- The other existing Activity events do not currently trigger email.

**Do not change those semantics.**

The refactor must not accidentally turn every Activity notification into an email.

The implementation should preserve:

- recipient selection
- email preference logic
- Resend integration
- sender address
- current email content/behaviour
- existing failure handling

Push permission/preferences must be completely independent from email preferences.

For example:

```text
Push denied
    Activity: YES
    Email: existing preference
    Push: NO
```

---

# 5. Push subscriptions

Add a new migration creating a table along the lines of:

```text
push_subscriptions

id
user_id
endpoint
p256dh
auth
created_at
updated_at
```

The exact schema should follow the project's existing conventions and the Web Push subscription format.

Requirements:

- `user_id` references the authenticated profile/user.
- Multiple subscriptions per user.
- One subscription represents one browser/device installation.
- Endpoint uniqueness must prevent duplicate registrations.
- Appropriate indexes.
- RLS enabled.
- A user may only read/manage their own subscriptions.
- No user may inspect another user's push endpoints.
- The browser must never be allowed to specify another user's ownership.
- Ownership comes from the verified authentication context.

Device/user-agent metadata may be added if it is genuinely useful for debugging/management, but don't overbuild V1.

---

# 6. Registration API

Add authenticated application/API support for:

### Register/upsert subscription

The client sends the Web Push subscription.

The server derives the user from the authenticated token.

Never accept:

```json
{
  "user_id": "..."
}
```

as the authority for ownership.

### Remove subscription

Support removing the current browser/device subscription.

This is important for:

- logout
- permission changes
- browser cleanup
- account switching

The implementation must ensure a subscription belonging to Account A cannot accidentally remain associated with Account B after the browser is reused.

---

# 7. VAPID

Use standard Web Push/VAPID credentials.

The architecture should be:

```text
Public VAPID key
        ↓
browser/client

Private VAPID key
        ↓
Supabase secret
        ↓
push dispatcher
```

Never expose the private VAPID key to the browser or commit it to Git.

The exact library/protocol implementation should be chosen based on what works cleanly in the current Supabase Edge Function/Deno environment rather than introducing unnecessary infrastructure.

---

# 8. Push dispatcher

Use Supabase as the primary push infrastructure.

The preferred architecture is:

```text
notifications INSERT
        ↓
Supabase asynchronous delivery trigger
        ↓
push dispatcher Edge Function
        ↓
all subscriptions belonging to recipient
```

Supabase Database Webhooks / `pg_net` should be evaluated and used if appropriate for the existing project/runtime.

The important behaviour is:

**The creation of the Activity notification must not depend on successful push delivery.**

If push is unavailable:

```text
notification row = successfully created
push = failed
```

The user still sees the Activity notification when they open Recommendly.

---

# 9. Delivery to multiple devices

If a user has:

```text
Chrome desktop
Chrome laptop
Android PWA
```

all valid subscriptions should receive the event.

The dispatcher should:

1. load all subscriptions for the recipient
2. construct the notification payload
3. send to each subscription
4. identify invalid/expired subscriptions
5. remove invalid subscriptions
6. log useful failures without exposing sensitive notification content

A failure for one device must not prevent delivery to the others.

---

# 10. Notification content

Push notifications should be concise and consistent with the existing Activity event.

Examples:

```text
YOU'D LIKE
Alice asked to connect with you.
```

```text
YOU'D LIKE
Alice approved your connection request.
```

```text
YOU'D LIKE
Alice declined your connection request.
```

```text
YOU'D LIKE
Alice removed your access.
```

The server should construct the appropriate display content.

Do not put unnecessary private recommendation data into push payloads.

The payload should contain only what is necessary for:

- displaying the notification
- identifying the notification
- handling the click
- maintaining the badge state if required

---

# 11. Service worker

Implement the minimum service-worker functionality required for background push.

It must:

### Receive push

When a push arrives while the app is closed:

- display an OS/browser notification
- update the app badge where supported

### Handle notification click

On click:

```text
notification click
       ↓
open/focus Recommendly
       ↓
/notifications
```

If an existing Recommendly window exists, prefer focusing/navigating it rather than opening unnecessary duplicate windows.

V1 does **not** need deep linking to a specific notification.

---

# 12. Badge behaviour

We should distinguish three things.

### Activity navigation

Leave the current Recommendly Activity indicator alone.

**Do not redesign the navigation.**

### Browser tab

While Recommendly is open, dynamically update the favicon/tab indicator to show that there are unread Activity notifications.

If the browser/tab does not exist, this mechanism obviously cannot operate.

### Installed PWA

When a push arrives while the PWA is closed, use the supported Badging API/service-worker mechanism to show an app icon badge.

The badge represents unread Activity.

When the user eventually reads all notifications, clear the badge.

If a platform doesn't support app badging, the push notification itself remains the fallback.

---

# 13. Badge source of truth

`notifications.read_at` remains authoritative.

Do **not** introduce a separate "badge read state."

The lifecycle is:

```text
notification created
       ↓
unread
       ↓
push delivered
       ↓
still unread
       ↓
user opens Activity
       ↓
read_at populated
       ↓
badge cleared
```

Dismissing the OS notification must **not** mark the Activity notification as read.

That is important.

---

# 14. Exact unread count vs indicator

For V1:

- Recommendly's existing Activity indicator remains unchanged.
- The external app badge should preferably represent unread Activity.
- Where a numeric badge is supported reliably, use the unread count.
- Where only a generic badge is supported, use an indicator.

The implementation should not make the feature dependent on numeric badge support.

---

# 15. Permission UX

Do **not** immediately request notification permission on every page load.

There should be an explicit user-driven mechanism for enabling notifications.

For example, an appropriate place could be Settings or Activity.

The exact UX should fit the existing Recommendly design rather than introducing a large notification-settings system.

V1 does **not** need per-event notification preferences.

If permission is denied:

```text
No error state
No repeated nagging
No broken Activity
No email changes
```

Recommendly continues normally.

---

# 16. Login/logout/account switching

This needs explicit handling.

On login:

```text
authenticated user
       ↓
register current push subscription
```

On logout:

```text
remove/disassociate current subscription
       ↓
logout
```

This prevents:

```text
Account A
   ↓
browser subscription
   ↓
logout
   ↓
Account B
```

from accidentally receiving Account A's future notifications.

---

# 17. Native-app compatibility

This is an architectural acceptance criterion.

Do **not** name the core model `web_push_notification`.

Use concepts such as:

```text
notification
delivery
subscription
channel
```

The V1 implementation should be Web Push-specific only at the delivery layer.

Later:

```text
                    notification
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          Web Push     APNs         FCM
             │           │           │
           PWA         iOS       Android
```

The Activity UI and notification event creation should not need redesign when native apps are introduced.

---

# 18. Security requirements

The implementation must follow the existing Recommendly authorization model.

Particularly:

- RLS on push subscription data.
- No client-supplied recipient authority.
- No service-role shortcut in the browser.
- Private VAPID key server-side only.
- Push payloads contain only recipient-appropriate information.
- No leakage of private recommendations.
- Invalid subscriptions cleaned up.
- Notification ownership remains governed by existing notification policies.
- Push delivery must never create a new authorization path.

The push system is a **delivery mechanism**, not an authorization mechanism.

---

# 19. Testing

Codex must add/modify automated tests for:

### Database

- push subscription RLS
- user cannot read another user's subscription
- user cannot modify another user's subscription
- duplicate endpoint handling
- authenticated ownership

### API

- registration
- upsert
- removal
- unauthenticated rejection
- account ownership

### Notification dispatch

Test all four notification types.

Verify:

```text
notification type
→ correct push title/body
→ correct recipient
```

Test multiple subscriptions.

Test invalid subscription cleanup.

### Email regression

Explicitly test that the existing email behaviour remains unchanged.

At minimum:

```text
subscription_request
    → Activity notification
    → email according to email_contact_requests
    → push according to push availability
```

and:

```text
subscription_approved/rejected/revoked
    → Activity notification
    → existing email behaviour unchanged
    → push
```

### Web client

Test:

- permission granted
- permission denied
- registration
- unregister
- unread state
- badge synchronisation
- notification click behaviour where practical

---

# 20. Manual acceptance testing

Codex should provide a concise manual test checklist.

At minimum:

### Desktop Chrome

1. Login.
2. Enable browser notifications.
3. Close Recommendly tab.
4. From another account, trigger a connection request.
5. Verify notification appears.
6. Click notification.
7. Verify Recommendly opens at `/notifications`.
8. Verify notification remains/gets marked read according to Activity behaviour.
9. Verify unread indicator clears.

### Android PWA

1. Install Recommendly to Home Screen.
2. Enable notifications.
3. Close the PWA.
4. Trigger a notification from another account.
5. Verify:
   - OS notification
   - app icon badge
6. Tap notification.
7. Verify Activity opens.
8. Verify badge clears once unread notifications are actually read.

### Multiple devices

Register two browsers/devices for the same account.

Trigger one notification.

Verify both receive it.

### Permission denied

Deny permission.

Verify Recommendly continues operating normally and Activity still works.

### Email

Verify the existing email preference continues working independently.

---

# 21. Git/deployment requirements

This must follow the existing `AGENTS.md` rules.

Codex must:

1. Start from clean/known Git state.
2. Create a feature branch.
3. Inspect existing code before modifying.
4. Make schema changes through a migration.
5. Do not directly edit production Supabase schema.
6. Do not directly edit production Vercel configuration as a shortcut.
7. Do not introduce a "patch" workflow outside normal Git changes.
8. Run the appropriate test scripts.
9. Inspect `git diff`.
10. Commit changes with a meaningful commit.
11. Push the feature branch.
12. Report exactly what was tested.
13. Do not claim deployment succeeded unless it actually did.
14. Follow the project's established deployment/migration process.

In particular, **Supabase production must remain a consequence of the Git/migration workflow, not a second source of truth.**

---

# 22. Documentation

Update the appropriate project documentation to reflect:

- push notifications
- subscription storage
- delivery architecture
- permission behaviour
- Chrome/PWA support
- email separation
- future native delivery architecture
- testing/acceptance criteria

Do not create contradictory documentation that says notifications are email-only.

---

# 23. Definition of done

I would consider this feature complete only when all of these are true:

- [ ] Existing Activity notifications still work.
- [ ] Existing email notifications still work exactly as before.
- [ ] Push subscription can be registered securely.
- [ ] Multiple devices are supported.
- [ ] Push works when Recommendly is closed.
- [ ] Chrome desktop push works.
- [ ] Installed Android PWA push works.
- [ ] Android PWA badge works where supported.
- [ ] Browser-tab indicator works while app is open.
- [ ] Notification click opens Activity.
- [ ] Push dismissal does not mark Activity read.
- [ ] Reading Activity clears the unread/badge state.
- [ ] Permission denial is graceful.
- [ ] Invalid subscriptions are cleaned up.
- [ ] Account switching cannot leak notifications.
- [ ] RLS/security tests pass.
- [ ] Email regression tests pass.
- [ ] Push tests pass.
- [ ] Existing project tests pass.
- [ ] Migration is in Git.
- [ ] No production-only schema/code changes were made outside Git.
- [ ] Feature branch is committed and pushed.
- [ ] Documentation is updated.
- [ ] Architecture remains suitable for future native iOS/Android push.