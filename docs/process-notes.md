
## 2026-06-28 — updateSocialLinks fix + API-sync audit
- **Done:** Fixed oc-update-social-links 400 (selection set queried id/nested socialLinks, but updateSocialLinks returns [SocialLink!]; now selects type/url) — 5f8131a, verified live. Filed #9 (sync MCP with OC API: drift audit + coverage + lockfile/tests/codegen). Used the fix to set the GitHub social link on My Community and de-em-dash 8 CIBC OC projects.
- **Decisions:** none.
- **State:** master clean + pushed; package-lock.json untracked (commit candidate per #9).
- **Next:** #9 audit (introspect all queries against the live schema, add a CI schema check).

## 2026-08-02 — SDK v2 and the session layer
- **Done:** #12 closed via PR #13 (SDK v2, 106 insertions / 288 deletions) and PR #14 (19 inputSchema wraps). Transport moved to createMcpHandler + createMcpExpressApp + serveStdio.
- **Decisions:** deleted the session map rather than keeping d5af93d's TTL+LRU fix — with no sessions there is nothing to bound. That fix had patched a 50MB→2.3GB leak three weeks earlier; the migration makes the bug class impossible and unpins the service from one replica.
- **State:** deployed, /health 200. Schema wrap verified by diffing emitted tools/list between builds — byte-identical, 19,390 bytes.
- **Next:** none. DNS-rebinding protection is off (0.0.0.0 + Bearer gate) and documented if it ever needs tightening.
