# DIGM Federation Scope — PARKED

**Status:** Parked. Design-only. Not approved for implementation.
**Date parked:** 2026-06-01
**Origin:** Brainstorm on connecting DIGM with SoulSeek and similar P2P music networks for "synergy."
**Owner of revisit decision:** DIGM founder

---

## TL;DR

If DIGM ever federates with external indie-music networks, this is what it would look like and what would have to be true first. Today, federation is **explicitly off the table** — the moat lives in DIGM's token economy and artist/curator relationships, and every published adapter is effectively a how-to-be-DIGM-lite guide for whoever's on the other end. This scope exists so future revisits don't have to redo the research and reasoning from scratch.

---

## Why this is parked (the strategic reasoning)

1. **Moat geometry.** DIGM's defensible value is one layer above the protocol: PARA/CURA/DIGM-coin token economics, artist sovereignty contracts, curator stations, listener-as-VOX-populi participation. The protocol itself (libp2p + I2P + chunk-store + encrypted-public-storage) is open-source by design. Federation adapters would publish the *operational* playbook (how to onboard artists, how to surface them, how to wire listener rewards to discovery) — which is the part that's not open-source by accident.
2. **Asymmetric copy risk.** Networks with the least to lose (no token economy to bootstrap, no artist relationships to nurture, no listener-economy story) can copy DIGM's moves cheapest. Audius in particular was called out as a likely-rival-once-DIGM-is-visible.
3. **SoulSeek-specific blocker.** Independent of the strategic concern, SoulSeek's Network Rules forbid the exact passive crawler/index pattern that would have been the cheapest discovery mechanism (see Appendix A). The compliant alternative — a fully-featured citizen peer that uploads, chats, honors privileges — is high-effort and narrow-yield.
4. **Timing.** DIGM is pre-establishment. Federating from weakness teaches competitors. Federating from strength is selective and cheap. The cost of waiting is small (no opportunity is on a clock); the cost of moving early is large (irreversible knowledge transfer).

---

## Activation triggers (conditions to exit "parked" status)

Federation should be re-opened **only if all of the following are true:**

- [ ] DIGM has launched publicly and has measurable artist/listener traction (suggested floor: 1,000+ active artists OR 100,000+ MAU on Paradio).
- [ ] DIGM's token economy is functioning end-to-end (PARA earned + spent, CURA stations live, DIGM-coin allocations active).
- [ ] A specific target network has been **individually** assessed against:
  - Does it share DIGM's creator-payment values? (Audius: no, despite crypto framing — competitor. Funkwhale: partial. Nostr: yes. Wavlake: ruled out — AI-slop catalog.)
  - Is the network strategically *complementary* (its users would not realistically build a DIGM competitor in response) or *substitutable* (they would)?
  - Is its ToS / Rules / API compatible with a read-only, identifiable adapter? (SoulSeek: no.)
- [ ] DIGM's founder has signed off on the specific adapter, not the federation concept in general.

**Default answer:** no. Federation is opt-in per-network, not on-by-default.

---

## What federation would actually mean (if activated)

### Goals

- **Discovery:** Surface indie artists who are not yet on DIGM but who would be a fit, so DIGM A&R can reach out.
- **Catalog richness:** Optionally let DIGM listeners find external indie tracks from inside the DIGM app (with clear "not on DIGM" labeling) to drive return visits.
- **Listener-driven flagging:** Listeners who discover a non-DIGM artist they want on the platform can flag them, earn PARA on successful onboarding.

### Non-goals / hard constraints

These are bright lines, not preferences. Crossing any of them re-opens the parked decision from scratch.

- **No surrender of token economics.** DIGM stays in control of PARA, CURA, DIGM-coin issuance and rules.
- **No bidirectional content sync.** DIGM does not push its catalog onto external networks. Federation is *read-only* from DIGM's side — we look out, we don't broadcast in.
- **No unencrypted DIGM content leaking.** Encrypted-blob seeding to dumb-storage networks (IPFS, BitTorrent DHT, etc.) is a separate decision and is *not* federation; it doesn't share metadata.
- **No identity/wallet federation.** DIGM identity (Fuego wallet, VOX/CURA/PARA balances) stays sovereign. No SSO into external networks, no external SSO into DIGM.
- **No federation with strategic rivals.** Audius is excluded by name. Any future network with overlapping token-economy ambitions is also excluded.
- **No major-label-content network bridging.** Anything that would put unlicensed catalog within DIGM's UX is excluded for legal-exposure reasons.
- **No covert presence.** Every DIGM-operated peer on a foreign network identifies itself in the user-agent / version string and honors the host network's stated Rules.

### Architecture: the Federation Adapter Interface

The durable abstraction is a single trait in `libfuego_core`. Each external network is a separate crate implementing it. Core never depends on a specific network.

```rust
// libfuego_core/federation/src/lib.rs (hypothetical)

#[async_trait]
pub trait FederationAdapter: Send + Sync {
    /// Stable identifier for this network: "bandcamp", "nostr", "funkwhale", etc.
    fn network_id(&self) -> &'static str;

    /// Search for an artist or track by free-text query.
    async fn search(&self, q: &str, limit: usize) -> Result<Vec<FederatedItem>>;

    /// Fetch metadata about an artist (bio, links, catalog count).
    async fn fetch_artist(&self, artist_id: &str) -> Result<FederatedArtist>;

    /// Fetch a 30-second preview sample (for fingerprinting / listener preview only).
    /// Returns None if the adapter doesn't support previews.
    async fn fetch_sample(&self, track_id: &str) -> Result<Option<AudioPreview>>;

    /// List recent uploaders/active artists — for A&R discovery.
    /// Returns None if the adapter has no equivalent concept.
    async fn list_recent_active(&self, since: Timestamp) -> Result<Option<Vec<FederatedArtist>>>;

    /// Per-adapter rate limit, in requests-per-minute. Core respects this.
    fn rate_limit_rpm(&self) -> u32;

    /// Kill switch. Set externally; adapter must check on every call.
    fn is_enabled(&self) -> bool;
}
```

Key properties:

- **Read-only by default.** No `upload`, no `post`, no `dm`. If we ever want outreach automation, it goes through a separate `FederationOutreach` trait with stricter controls.
- **One crate per network.** No "kitchen sink" adapter. Each can be activated, deactivated, or deleted independently.
- **Rate-limit and kill-switch at the trait level.** Not optional. Adapters that don't expose these can't be merged.
- **Identifiable.** User-agent string is `digm-federation/<version> (<network_id>; contact: ops@digm.io)` always.
- **Audit log.** Every federation request is logged with adapter, query, response size, timestamp. Reviewable.

### Candidate network assessment (snapshot, 2026-06-01)

| Network | Aligned with DIGM values? | ToS-compatible? | Strategic risk if federated | Verdict |
|---|---|---|---|---|
| **SoulSeek** | Indie-friendly culture; no creator payments | **No** — Rules ban bots, require full-feature peers | Low (not a token rival) | **Excluded** by ToS; revisit only with Nir Arbel's explicit permission |
| **Audius** | Crypto-native, decentralized, but competing for the same artist + token-economy slot | Yes (open API) | **High** — direct rival | **Excluded by strategy.** Do not federate. |
| **Nostr (music NIPs)** | Yes — creator-payment ethos, Lightning-native, open relays | Yes (open protocol) | Low — complementary, not competitive | **Strongest candidate** when activation triggers met |
| **Wavlake** | ~~Crypto-native, V4V-styled~~ | n/a | n/a | **Excluded** — catalog is increasingly AI-generated slop; brand pollution risk for DIGM |
| **Funkwhale** | Partial — federated music via ActivityPub, no token economy | Yes (open federation protocol) | Low-medium | Good candidate, second priority after Nostr |
| **Bandcamp** | Aligned in spirit (creator-paid), but proprietary platform | Public pages scrape-friendly; no official API | Low (not a P2P network, not a token rival) | Useful as a **discovery surface, not a federation peer.** Different shape. |
| **SoundCloud** | Partial; major-label catalog exists | Has official API + dev terms | Low | Useful for discovery; not federation |
| **Last.fm** | Aligned (taste-graph) | Official API | Low | Discovery signal source only |
| **Internet Archive (netlabel)** | Yes — public domain / CC | Yes (Wayback / IA APIs) | None | Adapter is trivial, safe, low-yield |

The pattern: the *federation* (peer-protocol) candidates are Nostr and Funkwhale. The rest are *discovery-source* candidates that don't actually federate — they're just APIs we'd query. Worth keeping that distinction sharp in any future revisit.

**Separate from federation entirely:** there's a *publishing* angle worth its own brainstorm — DIGM Paradio stations could expose Podcasting 2.0 RSS feeds with `<podcast:value>` blocks pointing to artist Lightning addresses. Any V4V-enabled podcast app (Fountain, Podverse, Castamatic, etc.) becomes a DIGM listening client with no adapter and no model leak, because the standard is already standardized and open. This is *not* federation (one-way publish in a public format), so the strategic-copy concern that parked federation doesn't apply. Parked separately, pending its own brainstorming session.

### Listener-flagging layer (the B → C path from the brainstorm)

This sits *on top of* the adapter interface, not next to it. Same component regardless of which adapter is active.

```
┌─────────────────────────────────────────────────────────┐
│  DIGM listener uses federated search inside DIGM app     │
└────────────────────────────┬─────────────────────────────┘
                             │ "I like this artist, invite to DIGM"
                             ▼
┌─────────────────────────────────────────────────────────┐
│  Outreach queue (Rust): artist_id, source_network,       │
│  flagger_wallet, timestamp, dedup hash                   │
└────────────────────────────┬─────────────────────────────┘
                             │ Aggregated, ranked by flag count + signals
                             ▼
┌─────────────────────────────────────────────────────────┐
│  A&R dashboard: human reviewer picks candidates,         │
│  initiates outreach via human channel (email, DM)        │
└────────────────────────────┬─────────────────────────────┘
                             │ Artist onboards onto DIGM
                             ▼
┌─────────────────────────────────────────────────────────┐
│  PARA reward distributed to flagger(s) who surfaced them │
└─────────────────────────────────────────────────────────┘
```

Anti-spam:

- Per-flagger rate limit (e.g., 5 invites/week)
- Reputation weight: flaggers whose past invites converted get higher signal weight
- Dedup: multiple flags for same artist roll up into one candidate with stacked weight
- Manual review gate before any actual outreach — no automated DMs to artists, ever

### A&R discovery dashboard

A simple Flutter screen in the DIGM admin/artist app (token-gated, only visible to authorized A&R operators), surfacing:

- Candidate artist
- Source network(s)
- Aggregated flag count + flagger reputation
- Catalog snapshot (track count, sample preview)
- "Reach out" action that opens prefilled email/DM template — *the human sends it*, not the system

### Risk controls (mandatory before any adapter ships)

1. **Per-adapter legal review.** Document outcome in the adapter's crate README.
2. **Per-adapter kill switch.** Single config flag, single redeploy disables it network-wide.
3. **Per-IP and per-adapter rate limits.** Lower than the host network's stated tolerance.
4. **Identifiable peer ID and user-agent.** Always. No covert participation.
5. **Audit log retention** for at least 12 months. Reviewable on subpoena.
6. **No PII leaving DIGM.** Listener flags are anonymized to source network — adapter knows "an anonymous DIGM listener flagged this artist," not who.

---

## What we will NOT do under the current parked decision

Until activation triggers are met:

- ❌ Write any of the trait, adapter crates, or listener-flag UI
- ❌ Send the drafted email to Nir Arbel (preserved in Appendix B as a reference, *do not send*)
- ❌ Reach out to Nostr relay operators, Funkwhale, or any other network operator about federation
- ❌ Publish any architecture document that describes DIGM's federation strategy publicly (this doc is internal)
- ❌ Allow federation language to appear in DIGM marketing — DIGM is positioned as standalone

What we **may** do in the meantime:

- ✅ DIGM team members participate on SoulSeek/Bandcamp/Mastodon as private humans, organically
- ✅ Continue to refine DIGM's standalone product (Paradio, Marketplace, Curator stations, etc.)
- ✅ Update this scope doc when new information arrives (e.g., a target network materially changes its API or policy)

---

## Revisit protocol

When someone (founder or future contributor) believes federation should be re-opened:

1. Pull this doc up.
2. Check each activation trigger box. Are they all true?
3. If yes, identify the **specific target network** and run it through the candidate-assessment table.
4. Brainstorm only that one adapter, in its own brainstorming session, producing its own design spec.
5. Do **not** open multiple adapters at once. One at a time, with separate gating.

---

## Appendix A — SoulSeek findings (2026-06-01)

Pulled from `slsknet.org/news/node/682` (ToS) and `slsknet.org/news/node/681` (Rules):

> "Spammers, automated clients (robot/bot), combinations of such, or scripts otherwise failing to implement the full range of Soulseek® features are not allowed to connect."

> "Alternative clients … that implement the full range of features of the Soulseek Network (including chat, search, wishlist, download, **upload**, and respect / recognition of privileges) are tolerated."

> "Users are allowed to connect up to a maximum 5 clients from the same IP."

> "Server or chatroom abuse will result in your connection being closed and your ISP notified."

Implications: A passive crawler/index is explicitly forbidden. A compliant "citizen peer" is permitted but must implement the full feature set including upload + chat + privilege recognition, with a 5-IP cap. No official API. Protocol is reverse-engineered (Nicotine+ is the reference open client).

Historical: 2008 French music-industry lawsuit prompted disclaimer + blacklists. Still operated by Nir Arbel. Network is U.S./California-jurisdictioned.

## Appendix B — Drafted email to Nir Arbel (NOT SENT, do not send under current parked decision)

> **Subject:** Permission to query the Soulseek network — building a creator-payment platform for indie artists
>
> Hi Nir,
>
> I'm building DIGM (digm.io) — a peer-to-peer music platform where indie artists keep 100% of sales, listeners earn tokens for tuning in, and there are no major-label gatekeepers. It's open-source, runs over libp2p + I2P, and is pointed squarely at the audience that Soulseek has been a home for since 2002.
>
> Soulseek is where a lot of those artists already live, and I don't want to design around your network, scrape it, or build something your Rules don't allow. So I'm asking before I build:
>
> Would you grant DIGM a narrowly-scoped, identifiable, rate-limited *read* permission on the network — specifically to (a) browse public shares of users who opt in, and (b) surface those artists as onboarding candidates for DIGM, so we can reach out and offer them direct artist payments? We'd run as fully-featured peers (not bots), honor privileges, share a legitimate CC-licensed catalog back, and identify ourselves clearly in the version string.
>
> If yes, I'd love a 20-minute call to make sure whatever we build matches what you'd actually be comfortable with. If no, totally understood — we'll respect that and route around your network.
>
> Either way, thanks for keeping Soulseek alive for as long as you have. It's been a quiet rebellion the whole industry should have learned from.
>
> — [your name]
> DIGM / [contact]

---

## Appendix C — Conversation provenance

This scope emerged from a brainstorming session on 2026-06-01, originating from the question: *"is it possible to somehow connect DIGM's network with SoulSeek's p2p file sharing network of independent music? or similar networks? so we can share in the other's synergy somehow?"*

Decisions made during that session:
- Reverse-direction audience funnel preferred (SoulSeek → DIGM, not DIGM → SoulSeek)
- Generic adapter interface preferred over SoulSeek-specific code
- SoulSeek crawler ruled out after Rules review
- Federation as a whole ruled out for moat-protection reasons
- Decision parked, this scope created as the revisit artifact
