# Backend acceptance gate

Before the mobile client begins, demonstrate in the local Supabase stack that:

- a private recommendation is hidden from unapproved, pending, rejected, revoked, unsubscribed, and anonymous viewers;
- an approved subscriber and the owner can see it;
- a public profile makes its recommendations visible;
- revocation immediately removes access;
- comments and ratings obey the same visibility boundary;
- re-recommendation creates an independent record; and
- API/domain and RLS privacy tests pass.

- push subscription registration/removal obeys RLS and cannot cross accounts;
- push delivery failures do not block Activity notifications or email;
- email preferences (`email_contact_requests`) remain independent of push.
