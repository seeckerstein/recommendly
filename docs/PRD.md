# Product requirements summary

The Personal Recommendation Network is private by default. Users keep personal recommendations for books, movies, and restaurants, discover recommendations from trusted people, and can later use LLM clients through the same authorization model as the app.

V1 requires accounts and profiles; private/public profile visibility; subscription request, approve, reject, revoke, and unsubscribe; recommendation CRUD with optional metadata, tags, and optional 1–5 rating; re-recommendation; comments and ratings from authorized viewers; chronological feed and authorized search; notifications; a public API; and an LLM-native interface.

The governing rules are: private recommendations are visible only to their owner or approved subscribers; public-profile recommendations are visible to authenticated users; pending, rejected, revoked, and unsubscribed relationships grant no access; child tables cannot leak private recommendation data; and LLMs never bypass the normal user authorization model.

Source: `C:\Users\seeckerstein\Downloads\recommendation_network_prd (1).docx`.
