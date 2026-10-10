# Product requirements summary

The Personal Recommendation Network is private by default. Users keep personal recommendations for books, movies, and restaurants, discover recommendations from trusted people, and can later use LLM clients through the same authorization model as the app.

V1 requires accounts and profiles; private/public profile visibility; subscription request, approve, reject, revoke, and unsubscribe; recommendation CRUD with optional metadata, tags, and optional 1–5 rating; re-recommendation; comments and ratings from authorized viewers; chronological feed and authorized search; notifications; a public API; and an LLM-native interface.

The governing rules are: private recommendations are visible only to their owner or approved subscribers; public-profile recommendations are visible to authenticated users; pending, rejected, revoked, and unsubscribed relationships grant no access; child tables cannot leak private recommendation data; and LLMs never bypass the normal user authorization model.

Source: `C:\Users\seeckerstein\Downloads\recommendation_network_prd (1).docx`.

## Push notifications (delivery layer)

Recommendly notifications remain application events; push, email, and future
native channels are delivery mechanisms layered on top of them.

- V1 adds Web Push for the four existing Activity types:
  `subscription_request`, `subscription_approved`, `subscription_rejected`,
  and `access_revoked`.
- Recipients register per browser/device subscriptions through an
  authenticated API; ownership always comes from the verified token, never
  from the request body.
- `push_subscriptions` is the only Web Push storage table and is scoped by
  RLS to each user's own rows.
- Push delivery is best-effort and asynchronous. Notification creation never
  depends on push succeeding, and one failed device must not block others.
- Email behaviour (Resend, `email_contact_requests`) is unchanged and
  independent of push preferences.
- Private VAPID keys and the dispatcher secret stay server-side.
- Push payloads contain only what is needed for display and click handling;
  no private recommendation content is included.
- Browser-tab and app-icon badges derive from `notifications.read_at`.
- Dismissing an OS notification does not mark the Activity notification read.
- Permission denial leaves Activity, email, and push registration cleanly
  separated, with no nagging or broken UI.
