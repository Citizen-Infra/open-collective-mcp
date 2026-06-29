
## 2026-06-28 — updateSocialLinks fix + API-sync audit
- **Done:** Fixed oc-update-social-links 400 (selection set queried id/nested socialLinks, but updateSocialLinks returns [SocialLink!]; now selects type/url) — 5f8131a, verified live. Filed #9 (sync MCP with OC API: drift audit + coverage + lockfile/tests/codegen). Used the fix to set the GitHub social link on My Community and de-em-dash 8 CIBC OC projects.
- **Decisions:** none.
- **State:** master clean + pushed; package-lock.json untracked (commit candidate per #9).
- **Next:** #9 audit (introspect all queries against the live schema, add a CI schema check).
