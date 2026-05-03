# DIGM on Fuego: Architecture Quick Guide

> **Status:** Draft / Brainstorm Output
> **Date:** 2026-04-02 (rev 2026-04-03: I2P, mobile-first full node, ParaDio-only rewards, per-album pools)
> **Context:** Fuego drops L2/L3/Elderfier path. Focuses on XFG + CD + atomic swaps + hidden amounts. DIGM becomes the use-case layer that drives swap volume and gives CDs real yield.
> **Note:** The .digm audio container / proof-of-origin format from DIGM-origins is NOT part of this design. However, several economic decisions (PARA rate, curator share, audio codec) are inherited from DIGM-origins docs and noted inline.

---

## 1. The Decision

**We chose:** XFG + CD + atomic swaps (no L2, no L3, no Elderfiers required)

**Why:**
- Elderfiers were only consensus-critical for L2 merkle root signing
- Fee pool is purely algorithmic (consensus rules, no EFier quorum needed)
- Atomic swaps work P2P (adaptor sigs, indistinguishable from ring spends)
- Engineering focus shifts to hidden amounts (BP+ / MLSAG) — the real privacy unlock
- Lower regulatory surface (no bridge, no ERC-20 tokens)
- DIGM becomes the swap volume driver: music purchases in XFG drive fees drive CD yield

**What Fuego becomes:** A privacy-focused store-of-value chain with native atomic swaps, on-chain yield (CD fee pool), and DIGM as its killer app.

---

## 2. The Eight Assets

### On-Chain (Fuego L1)

| Asset | Type | Purpose |
|-------|------|---------|
| **XFG** | Native coin | Real-value payments. Buy albums, swap cross-chain, mine. The money. |
| **CD** | Commitment Deposit | Locked XFG that earns yield from swap fee pool (2% per swap). Privacy flywheel — more locks = bigger ring pools = better privacy. |
| **DIGM** | Colored coin (on-chain) | Artist/publisher hosting rights. Fixed supply: 100,000. Required to publish albums on the platform. Anti-spam + quality gate. |

### In-App (DIGM platform layer, anchored on-chain)

> **Scoping note.** PARA / VOX / CURA / nfVOX / TOP are **in-app tokens**. Their supply models, burn ratios, multiplier curves, and transfer rules are deliberately left **TBD** and are only meaningful *inside the DIGM app*. We are not worrying about external market value, cross-chain representation, or use-functions beyond DIGM (and mayyybe PARA...so if para will have external value it may should switch w/ VOX as the value token instead of the signal or 'like' token).
>
> What *is* guaranteed: every state change (mint / burn / transfer / transmutation / award) **settles to Fuego L1 via the merkle anchor** (§10) for correctness, auditability, and legitimacy. The app is the execution layer; Fuego is the truth layer. An app that lies about balances gets caught by the next anchored root.

| Asset | Type | Purpose |
|-------|------|---------|
| **PARA** | Earned token | Earned by listening (streaming proofs). Staked on albums as "like pools." Fuel for the entire DIGM economy. |
| **VOX** | Transmuted token | Created when PARA transmutes (your staked album hits #1). Platform currency for cosmetics, add-ons, customization. Status symbol. Burn for CURA. |
| **CURA** | Burned-to-mint token | Minted only by burning VOX. Grants public curator rights — playlist creation, editorial power, posting permissions. Scarce and earned. |
| **nfVOX** | Non-fungible award | One-per-#1-album. Permanent commemoration awarded to the artist whose album hits #1. Proof of a hit. |
| **TOP** | Singleton trophy | Rolling championship token. Held by the artist of the *current* #1 album. Transferred when dethroned. Only 1 exists. |

### Asset Flow Diagram

```
Mining/Swaps ──→ XFG ──→ Buy albums (artist gets 100%)
                  │
                  ├──→ Lock as CD ──→ Earn yield from fee pool
                  │                        ↑
                  │              Swap fees (0.3%) feed pool
                  │                        ↑
                  └──→ Atomic Swap (SOL/ETH/XMR ↔ XFG)
                              ↑
                    Music purchases drive swap demand


Listening ──→ PARA (streaming proofs)
               │
               ├──→ Stake on album pool (digm_id)
               │         │
               │     Album hits #1?
               │      /          \
               │    YES           NO
               │     │             └──→ PARA stays PARA
               │     │                  (withdraw anytime)
               │     ▼
               │   TRANSMUTATION:
               │   ├─ All PARA in pool → given to artist
               │   ├─ Each staker's PARA → VOX (time-weighted multiplier)
               │   ├─ Artist gets nfVOX (permanent #1 trophy)
               │   └─ Artist holds TOP (until dethroned)
               │
               └──→ VOX
                     │
                     ├──→ Buy cosmetics, add-ons, customization
                     ├──→ Burn → request next song on Paradio
                     └──→ Burn → mint CURA (curator rights)
```

---

## 3. Album Pool Mechanics

### How Staking Works

1. Artist publishes album → gets a `digm_id` (content hash of the album)
2. Listeners stake PARA into the album's pool
3. Earlier stakers earn higher time-weighted multiplier
4. Rankings determined by PARA pool size per epoch

### When an Album Hits #1 (Epoch Winner)

```
┌─────────────────────────────────────────────┐
│  EPOCH #1 DETERMINATION                     │
│  (largest PARA pool at epoch close)         │
│                                             │
│  1. ALL PARA drained from winning pool      │
│  2. Raw PARA → sent to artist               │
│  3. Artist awarded nfVOX (permanent)        │
│  4. Artist receives TOP (held until         │
│     dethroned by next epoch's winner)       │
│  5. Each staker's PARA transmutes to VOX:   │
│     vox_amount = para_staked *              │
│       multiplier(time_since_stake)          │
│     (earlier deposit = higher multiplier)   │
│                                             │
│  EPOCH WINNERS ARE COMMEMORATED PERMANENTLY │
│  (not to be forgotten)                      │
└─────────────────────────────────────────────┘
```

### Non-winning Pools

- PARA stays staked, continues accruing time weight
- Listener can withdraw anytime (but loses time position)
- Pools persist across epochs until album wins or listener withdraws

---

## 4. The Listener Platform (RP1/Oasis Vibes)

### Identity
- **Wallet = user.** There is no separate "alias account" layer. Your Fuego wallet *is* your DIGM identity. Everything — PARA balance, VOX, CURA, staked positions, curator reputation, nfVOX trophies, leaderboard history, streak counters — accrues to the wallet.
- **Display name** is a cheap changeable label attached to the wallet (for leaderboards and social surfaces). Changing your display name does not reset your history.
- **Wallet stays private.** The underlying view/spend keys are never exposed; what the public sees is a derived commitment. Same privacy guarantees as any Fuego transaction.
- **Listening history** — opt-in visibility.

### Sybil Defense: Wallet = User, and using the same wallet is the path of least resistance (decided)

**Goal:** don't try to *detect* sybils. Make them **unattractive to create** by ensuring every incentive — economic, social, UX — points toward staying on one wallet. A second wallet should feel like throwing away progress, not unlocking opportunity.

**Core principle:**

> Farming is prevented not by math or cryptography but by the fact that starting a second wallet is strictly worse than continuing to use your first one. The single-wallet path is the easy path. It is also the *only* path that accumulates value. Any deviation is friction.

**Mechanisms (all UX + state accrual, no sybil math required as primary defense):**

1. **Gate is checked on the wallet directly** (§9). ≥ 0.0008 XFG or ≥ 1M HEAT on the wallet itself. No separate alias credential, no binding, no registration — the wallet either passes or it doesn't.
2. **Everything non-transferable is soulbound to the wallet.** PARA earning history, curator reputation, play streaks, nfVOX trophies held, TOP reigns won, leaderboard rank history, wallet-age ramp — none of it can be transferred, merged, or re-created. Starting a new wallet means starting all of this from zero.
3. **Wallet-age ramp** (formerly "alias-age ramp"). New wallets start with zero weight for rewards, leaderboard placement, and curation influence. They ramp to full weight over the first N epochs of consistent activity. Burst-farming N new wallets the day before an epoch close buys nothing — they're all still at zero.
4. **No new-user bonus, ever.** No welcome PARA, no signup airdrop, no "first week" boost. New wallets earn from a cold start. The *only* way to get ahead is time on the current wallet. This is a hard rule: any growth feature that privileges new wallets is rejected by design.
5. **Sunk-cost accumulation.** The longer you use a wallet, the more of the following you accumulate, all of which are lost on switch:
   - PARA earning streaks (consecutive days of valid listening → multiplier on daily reward cap)
   - Curator track record (successful CURA picks raise your visibility, failed picks don't)
   - Album-stake position timestamps (early-staker multiplier on dynasty drains — §4a)
   - nfVOX trophies and reign history (your personal Hall of Fame)
   - Leaderboard rank (decays slowly on inactivity, zero-reset on wallet switch)
   - Curator slot reputation (how your playlists rank in discovery)
6. **UX defaults.** The app has **one** wallet by default. Switching or adding a wallet is a hidden power-user action, not a surfaced flow. No "add profile" button on the home screen. No multi-wallet switcher in the nav. You can of course run another wallet — we're privacy-first and we won't lock you out — but the path isn't paved.
7. **Rewards claim directly to the same wallet.** No "choose a destination." No "withdraw to a different wallet." Earned PARA, transmuted VOX, CURA mints, album-purchase royalties, and artist bounties all settle to the wallet that earned them.
8. **Cross-device is same-wallet, not new-wallet.** If you want DIGM on your phone AND desktop, you import the same wallet (seed or key export). This is the explicit recommended flow so you don't lose your history. Importing is easy; creating a second wallet is not.

**What this explicitly does not try to do:**
- ❌ Detect that wallet A and wallet B are the same human (we don't know and can't know — this is a privacy chain)
- ❌ Penalize users for running a second wallet (they can; it just won't be worth anything)
- ❌ Use cryptographic sybil gates (we already have the HEAT/XFG gate — that's it)
- ❌ Require any real-world identity verification

**Why this is enough:**

A farmer with capital for 100 wallets gains nothing that a patient single-wallet user doesn't get for free. All 100 wallets start at wallet-age zero, all 100 need separate gate stakes, all 100 have separately-earning streak multipliers starting at 1×, none of them share reputation or nfVOX or rank. The farmer pays 100× the capital to get *worse* outcomes than a single user who's been active for a month. The incentive gradient points *against* sybils without anyone having to detect them.

### Research: prior art for "wallet = user" sunk-cost identity

This is the **soulbound-token / non-transferable-reputation** design space. Worth surveying before finalizing:

- Vitalik / Weyl / Ohlhaver, *Decentralized Society: Finding Web3's Soul* (SBT paper) — foundational framing
- POAP — proof-of-attendance NFTs as lightweight sunk-cost badges
- Gitcoin Passport — stamp-based wallet reputation aggregation
- Lens Protocol — portable social graph bound to one address
- Farcaster — wallet-bound handles with recovery
- Audius user accounts — how they tie listener history to a single identity
- Ethereum Name Service — wallet-bound persistent names
- ERC-5114 (soulbound badges) and ERC-6551 (token-bound accounts) — current SBT token standards

The research question is not "should we do this" (decided — yes) but "which primitives from this space are worth stealing for DIGM's specific cases" (wallet-age ramp, streak multipliers, reputation accrual).

### Quadratic cluster-decay (deferred research fallback, not primary)

The earlier quadratic cluster-decay math is kept in the research drawer as a fallback *if* the sunk-cost approach fails to produce enough sybil friction in practice. It would layer on top: if two wallets show indistinguishable fetch/stake/behavior fingerprints, their combined rewards get the `1/√M` haircut. Privacy-preserving version runs on anchored commitments, not raw logs. Not a primary mechanism; only activated if real-world farming emerges.

### Leaderboards
- **Listener rankings** — by VOX earned, curator accuracy, streaks
- **PARA LP leaders** — who's staking the most across pools
- **Album charts** — top by pool size, growth rate, #1 history
- **Curator rankings** — CURA holders ranked by successful picks
- **Epoch Hall of Fame** — permanent record of every #1 winner

### Interactions
- **Hashrate voting** — miners vote on next track for Paradio
- **VOX burn → request song** — spend VOX to influence radio queue
- **CURA powers** — public playlists, editorial posts, curation rights

### Philosophy
- **About the music, not the artist** — staking is per-album, not per-person
- **Anonymous artists work** — publish without revealing identity
- **Every release stands alone** — no carryover reputation from past albums
- **Gamified listener experience** — discovery, staking, competing, earning

### Two-Sided Platform Design

The DIGM app is intentionally split into two surfaces, both privacy-preserving:

| Side | Audience | Surfaces |
|------|----------|----------|
| **Artist / Album side** | Publishers, labels, anonymous creators | DIGM coin holding, album registration, single uploads (OGG/Opus), pricing in XFG, per-album staking-pool dashboard, ParaDio earnings dashboard, revenue dashboard, payout in XFG |
| **Listener side** | Everyone | ParaDio (gamified single streaming with rewards), album marketplace, staking pools, leaderboards (aliased), profile/customization (VOX), curator tools (CURA) |

Both sides ship in the same app — switching is just a UI toggle. A listener with a DIGM coin becomes a publisher; a publisher who explores ParaDio becomes a listener.

---

## 4a. ParaDio Reward Model (the only reward source)

**Decision:** ParaDio (single streaming) is the **only** activity that pays PARA rewards. No rewards for:
- Offline listening (cached playback)
- Album purchases (artist already gets paid in XFG)
- Album-mode plays (full album playback after purchase)

**Why:** Rewards are an incentive for *discovery*, and discovery only happens via ParaDio's curated/random/algorithmic single stream. Buying an album is already its own reward (you wanted it). Offline plays can't be verified by the network anyway.

### Per-Stream Reward Distribution

When a single is streamed via ParaDio and the listen is verified (anti-bot proof passes):

```
1 verified ParaDio listen
        │
        ├──────────────────────────────────────────────────────┐
        │                                                      │
   LISTENER                                              ARTIST
   share of PARA                                       share of PARA
        │                                                      │
   ┌────┴─────┐                                          ┌────┴─────┐
   │          │                                          │          │
 70% to     30% to                                     70% to     30% to
 listener   curator                                    artist     curator
            (if listened                                          (if listened
             via curator's                                         via curator's
             playlist)                                             playlist)
```

**Curator role in rewards:**
- Curators do **not** earn directly from a system pool
- A curator earns **30% of the listener's PARA share** + **30% of the artist's PARA share** when a stream is played through that curator's playlist
- If the listen is *not* via a curator playlist, the listener and artist each keep 100% of their share (curator slice = 0)
- This matches DIGM-origins `CURATOR_REVENUE_SHARE_MODEL.md` and `AUDIO_FORMAT_STRATEGY.md`

**Base PARA earning rate:** 1 PARA per minute of verified listening *(inherited from DIGM-origins AUDIO_FORMAT_STRATEGY.md line 98)*. Subject to epoch caps (TBD).

### PARA flow: earning is global, staking is per-album

Two things are cleanly separated:

1. **Earning** — listeners earn PARA from ParaDio streams (listener + artist split per §4a, curator skims when applicable). Earned PARA lands in the listener's / artist's balance. It is **not** earmarked to any album.
2. **Staking** — listeners take PARA (from *any* source — earned, bought, gifted) and stake it into an album's staking pool as a discovery / belief signal. This is the "like pool."

```
                  ┌──────────────────────┐
                  │   Your PARA balance  │
                  │ (earned from ANY     │
                  │  ParaDio stream)     │
                  └──────────┬───────────┘
                             │ stake freely
             ┌───────────────┼───────────────┐
             │               │               │
             ▼               ▼               ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │  Album A   │  │  Album B   │  │  Album C   │
     │ stake pool │  │ stake pool │  │ stake pool │
     │ (time-     │  │ (time-     │  │ (time-     │
     │  weighted) │  │  weighted) │  │  weighted) │
     └────────────┘  └────────────┘  └────────────┘
```

- Each album pool is purely a **staking / discovery pool**. It has no "fee pool" sub-compartment. It's just PARA locked in with a timestamp.
- CD fee pool (Fuego L1 swap fees) is **completely separate** from DIGM and does not interact with PARA pools in either direction. DIGM is a use-case *built on top of* Fuego; it does not siphon from or feed the CD yield.

### Epoch

**Decision:** epoch = **~5 days = 900 blocks** (same cadence as the Fuego swap-fee epoch). Every 900 blocks the #1 album is determined, transmutation fires on the winning pool, and leaderboards close out.

### The "stays #1" problem — direction: **dynasty + ride-the-wave** (draft, §11 open)

**Direction:** Pool does **not fully drain until the epoch *after* dethrone.** Album pool stays open to new stakers during the reign. Both new stakers and pre-#1 believers have distinct risk/reward profiles.

```
TIMELINE OF A DYNASTY

Epoch N-1:  album rising, people staking normally  ─── pre-#1 stake (full power)
Epoch N:    album hits #1                          ─┐
Epoch N+1:  album still #1 (reign epoch 2)          │ reign in progress
Epoch N+2:  album still #1 (reign epoch 3)          │ pool STAYS OPEN
Epoch N+3:  album still #1 (reign epoch 4)         ─┘
Epoch N+4:  album drops to #2   ←── DETHRONE
Epoch N+5:  delayed drain fires ←── final transmutation on the position snapshot
```

#### Three kinds of stake in a reigning pool

| Stake type | Weight while reigning | On dethrone (delayed drain) |
|-----------|------------------------|------------------------------|
| **Pre-#1 stake (default)** — staked before the album first hit #1 | Full power (1×) | Transmutes at standard time-weighted VOX rate |
| **Pre-#1 stake, "riding the wave"** (opt-in at dethrone N → N+1 boundary) | Full power (1×) + compounding reign-bonus multiplier for each additional epoch of reign | If album is still #1 when owner cashes out: full base + reign-bonus. If still riding when album dethrones: **forfeit all reign-bonus**, keep base (or a haircut on base — TBD) |
| **Late-entry stake** — staked during the reign | Half power (0.5×) on eventual transmutation | Transmutes at 0.5× the standard time-weighted VOX rate |

#### Artist "reign tax" on late-entry stakes

During the reign, the artist creams a configurable percentage off the top of any new PARA staked into the pool (e.g. 15-25%, TBD). This models "the #1 spot is premium real estate — pay up to stake here."

- Applied instantly at stake time (not at drain time) → artist PARA balance grows continuously while reigning
- Does **not** apply to pre-#1 stakes or to their ride-the-wave bonus
- In effect: pre-#1 believers earned their discount by being early; late stakers pay the artist for the privilege of staking on a proven hit

#### "Ride the wave" opt-in mechanics (sketch, needs numbers)

At the moment a pool first hits #1 (epoch N close), every pre-#1 staker has a decision point:
- **Cash out at delayed drain.** Position earmarked to drain at dethrone using the standard time-weighted formula. Safe, capped upside.
- **Ride the wave.** Position stays in the pool. Each *additional* epoch the album holds #1 multiplies the position's effective VOX conversion rate by a factor `r > 1` (e.g. `r = 1.25`), compounding. A rider can cash out between epochs *while still reigning* to lock in the accrued bonus.
- **Forfeiture rule.** If an active rider's pool is dethroned before they cash out, the reign-bonus portion evaporates at delayed drain; base position converts at a haircut (e.g. 0.8× standard rate) to punish greed.

Example: a 1000 PARA pre-#1 stake riding through 3 extra reign epochs, then dethroned while still riding:
- Base would have been 1000 × time-weight → say 1500 VOX at dethrone
- Reign bonus after 3 epochs at r=1.25: 1500 × 1.25³ = ~2930 VOX → **forfeited**
- Haircut on base: 1500 × 0.8 = 1200 VOX actually received
- Moral: cash out before dethrone, or lose the bonus and take a base haircut

Same position, but cashed out after 2 reign epochs (while still #1):
- 1500 × 1.25² = ~2345 VOX → paid out at cashout, locked in

#### Why this works

- **Dynasty preserved:** an album can reign for multiple epochs without the artist losing TOP or the pool thrashing.
- **Pool stays live:** late-entry stakers can still signal belief, but at a discount so they don't instantly dilute early believers.
- **Artist captures hype:** late-entry reign-tax gives the artist a real incentive to keep making content that holds #1.
- **Risk/reward for believers:** ride-the-wave turns the pool into a "will they stay #1?" prediction market. Correct riders get compounding rewards; wrong riders who stayed too long get punished.
- **No drain thrashing:** the drain is always *delayed until after dethrone*, so a same-epoch wobble (e.g. briefly #2 in-epoch, back to #1 by close) doesn't trigger anything.

#### Open sub-questions (see §11)
- Is the reign-bonus factor `r` fixed, or does it scale by epochs (e.g. `r_n = 1 + 0.25 × sqrt(n)`)?
- Exact forfeiture rule on dethrone: full base, haircut base, or tiered haircut by reign length?
- Can a rider *add* PARA mid-reign to their riding position at full power, or only cash out?
- Does the artist's reign-tax apply per-epoch (continuous) or only on stake-in (one-shot)?
- Dethrone → immediate return to #1 next epoch: does the dynasty resume, or start fresh? My lean: **fresh** — once you drop, the dynasty is over; comeback is a new reign.
- What happens if two albums tie at #1 at an epoch boundary?

### What counts as a listen?

**Decision:** Without hardware attestation (`.digm` Secure Enclave path is shelved), there is **no external cryptographic witness** to a listen. The listener's own full node self-attests based on runtime signals from an actually-running audio pipeline, bounded by sybil cost and statistical audit.

**Replays count.** Playing the same track again — whether fetched fresh or served from local cache — counts exactly the same as any other listen. There is no penalty for replays and no "must have just fetched it" requirement. A real user replays their favorite track; the system must reward that normally.

A listen is valid when **all** of these runtime signals hold:

1. **Player is actually running** — the app's audio pipeline is alive and attached to the output device (not muted, not killed, not running headless-in-background with no output sink).
2. **Decoder is actively producing frames** — Opus (Symphonia) is decompressing compressed chunks into PCM frames at the expected cadence. This is the "decrypt" check: not cryptographic decryption (ParaDio singles are served unencrypted, §7), but the compressed → PCM transform, which a no-op bot would have to actually emulate to fake. Measured as a per-second frame-hash heartbeat from the decoder into the local node.
3. **Audio output above threshold** — PCM RMS amplitude is above a noise-floor threshold over the window. Can't collect rewards on a muted / silent / zero-amplitude stream.
4. **Not-a-bot score above threshold** — scored locally from interaction signals + longitudinal per-alias behavior (skip/dwell distributions, diurnal patterns, etc.).
5. **Within per-alias rate caps** — a per-alias PARA/day ceiling means even a perfect faker has a hard upper bound.
6. **Alias passes the gate** (≥ 0.0008 XFG or ≥ 1M HEAT, §9) — the actual cost of running a fake listener.
7. **Survives statistical audit at the next merkle anchor** — anchored roots are periodically scanned for outlier aliases. Outliers get PARA clawed back.

**Signals we are *not* using:**
- ❌ **Seeder co-signing** (seeders witness fetches, not listens; earn zero PARA; not part of the proof)
- ❌ **Chunk-fetch trail vs claim consistency** (would break legitimate replays from cache — removed)
- ❌ **Hardware Secure Enclave attestation** (shelved with `.digm`)

### Research directions for stronger streaming proofs (§11 open)

The current model is "self-attested runtime signals bounded by sybil cost." It's honest about its limits but it's a soft check. Harder proofs are possible — explicitly **research items, not decisions**:

- **Per-session content encryption.** ParaDio could serve each chunk encrypted under a short-lived per-session key derived from a recent Fuego block hash × listener destination. The decrypt operation becomes a real cryptographic gate: you can't "listen" to a timeslot that hasn't happened yet, and you can't decrypt another listener's feed. Cost: ~every chunk has to be stream-encrypted on the serving side, and cache reuse is complicated (a replay from cache needs to also re-derive the key for that replay's timeslot). Trade-off against the "replays count freely" rule.
- **Decoder-bound nonces.** A proof-of-decode scheme where each decoded frame contributes to a nonce chain that's infeasible to construct without actually running the decoder on the real bytes. Feasible for Opus, costly to implement.
- **Verifiable delay on receipts.** Listener-side VDF over the track duration, ensuring claims are rate-limited by real wall clock even in the absence of a network witness.
- **TEE attestation (Intel SGX / ARM TrustZone / Apple Secure Enclave) as an opt-in premium path.** Listeners who *do* have a TEE-capable device can submit hardware-attested listen proofs for a bonus reward or a higher rate cap. Listeners without TEE still participate via the soft path. Reintroduces the thing we shelved, but only as an optional upgrade, not a requirement.
- **Watermarking / acoustic fingerprinting.** Cheap to fake in software but could raise the bar for the laziest bots.
- **Research prior art:** Audius proof-of-listen, Spotify's stream-counting model, Basic Attention Token's proof-of-engagement, etc. Likely all softer than what we're doing here, but worth cataloging before committing.

None of these are decisions. The runtime-signals model stands until a research pass says otherwise.

### Seeders do not earn PARA (decision)

**Decision:** seeders earn **zero** PARA. No seeding reward system, no per-chunk bounty.

**Why:**
- The whole architecture assumes ambient seeding — listeners already have the chunks they bought or staked on, so seeding is a byproduct of normal usage. There is no natural shortage to subsidize.
- Paying seeders creates a direct attack surface for the listen-receipt co-sign game: a paid seeder has an incentive to collude with a listener and falsify receipts to farm PARA. Keeping seeders economically neutral keeps the receipt co-sign honest (a seeder has nothing to gain by lying).
- Co-signing a receipt is cheap and happens on data the seeder is serving anyway.

**Bootstrapping new / niche content** (the only case where ambient seeding isn't enough):
- **Artist bounty** (primary): artist attaches a small XFG bounty to an album or single on publish; the bounty is paid pro-rata to nodes that demonstrably served the chunks (proof via pulled listener receipts). Artist chooses whether to fund it — popular artists can skip it, unknown artists bootstrap with it.
- **Treasury bounty** (fallback): the Fuego treasury (post-EFier fee pool reassignment — see §11) can top up bounties for content flagged as under-seeded. This is the *only* place the DIGM layer touches any on-chain pool, and even here it's a Fuego treasury call unrelated to CDs.
- **Neither bounty pays PARA.** Bounties are always in XFG. PARA remains exclusively a listener-earning token.

---

## 5. Where Things Live

### Fuego L1 (consensus-level)

- XFG transfers (ring signatures, privacy)
- CD locks + fee pool yield (commitment deposits)
- Atomic swaps (adaptor signatures: SOL, ETH, XMR)
- Swap fee collection (0.3% → fee pool)
- DIGM colored coin (hosting rights, fixed 100K supply)
- Periodic state anchoring (merkle root of DIGM-app balances)

### DIGM App Layer (off-chain, anchored)

- PARA earning (streaming proofs)
- PARA staking pools (per-album "like pools", tracked by digm_id — any PARA from any source can be staked)
- VOX transmutation (when album hits #1)
- CURA minting (VOX burn)
- nfVOX awards (per #1 album)
- TOP trophy (current #1 holder)
- Leaderboards, aliases, profiles
- Paradio radio + hashrate voting + VOX song requests

---

## 6. The Flywheels

DIGM and the CD fee pool are **two independent flywheels** that share XFG as a medium. They do not feed each other's pools — they just both benefit when XFG has more users and more swap volume.

### Flywheel 1: Fuego core (CD ↔ swaps ↔ privacy)

```
Users want to hold / pay privately
          │
    More swaps (SOL/ETH/XMR ↔ XFG)
          │
    0.3% swap fee → CD fee pool
          │
    CDs pay real yield → more XFG locked as CD
          │
    Ring pool grows → privacy improves
          │
    More users want XFG → more swaps ──→ (loop)
```

This flywheel is **self-contained on Fuego L1**. It does not know DIGM exists.

### Flywheel 2: DIGM (ParaDio ↔ staking ↔ discovery)

```
Listeners stream via ParaDio
          │
    Earn PARA (listener + artist + curator split)
          │
    Stake PARA in album "like pools" for discovery
          │
    Top pools win the epoch → PARA transmutes to VOX
          │
    VOX = status, cosmetics, CURA (curator rights)
          │
    Better curation → better discovery → more streams ──→ (loop)
```

### Where the two touch

- **Album purchases** are XFG → artist direct payment. That XFG may come from a user who swapped into XFG, which means DIGM *indirectly* generates swap volume that feeds the CD pool. But no PARA, VOX, CURA, or DIGM-app state ever touches the CD pool.
- **XFG is the only shared asset.** PARA is not a gas token, does not pay swap fees, and does not interact with CDs.

---

## 7. Audio Storage: Invisible P2P over I2P (Decided)

**Decision:** I2P/μTP P2P distribution where every DIGM client is a node. Seeding is automatic and invisible — the listener never thinks about it.

**Why I2P over Tor:**
- I2P is built for peer-to-peer (Tor is built for client→server)
- Garlic routing handles bidirectional flows better than onion circuits
- Built-in distributed hashtable (netDb) — no separate DHT layer
- Every I2P node is a router by default (matches "every client is a seeder")
- No exit nodes needed — all traffic stays inside the I2P network
- Tor's stance discourages high-bandwidth P2P; I2P welcomes it

### How It Works

The DIGM app is a music player that happens to be a P2P node. Like BitTorrent — you don't configure DHT or chunks, you just use the app.

```
┌─────────────────────────────────────────────────────────┐
│  WHAT THE LISTENER SEES     WHAT ACTUALLY HAPPENS       │
│  ─────────────────────────  ──────────────────────────  │
│  "Browse albums"          → P2P discovery over I2P      │
│  "Buy album" (pay XFG)   → Download + decrypt chunks,  │
│                             auto-seed                   │
│  "Play track"             → Stream from local cache     │
│                             or nearest peer             │
│  "Stake PARA on album"   → Pin chunks, start seeding   │
│  "Close app"              → Background daemon seeds     │
│                             (toggle off in settings)    │
└─────────────────────────────────────────────────────────┘
```

### Seeding Rules (All Automatic, No User Config)

| Condition | Behavior |
|-----------|----------|
| Bought an album | Seed it (you have the chunks anyway) |
| Staked PARA on album | Pin it (don't evict from cache) |
| Cache full | Evict oldest unstaked albums first |
| App closed | Background seeding on by default (user can toggle off) |
| New album, zero buyers | Only artist's node has it (bootstraps from there) |

### Availability Model

```
Album published → artist node is sole seeder
         ↓
First buyers → each buyer becomes a seeder
         ↓
PARA stakers → pinned chunks, reliable seeders
         ↓
Popular album → many seeders → high availability
         ↓
Organic CDN: popularity = availability
```

- **Popular albums** are highly available (many buyers + stakers seeding)
- **Niche albums** rely on artist node + small buyer base
- **PARA staking = availability commitment** — stakers keep the music alive on the network
- **No central servers, no pinning fees, no infrastructure cost**

### Technical Stack

- **Transport:** μTP over I2P streaming sockets (LEDBAT congestion control, zero port forwarding)
- **Privacy:** All transfers through I2P destinations (IP never exposed, garlic-routed)
- **Chunks:** 256 KB encrypted chunks (ChaCha20), SHA-256 content addressing — chunk size inherited from DIGM-origins (DIGM_COLD_CELESTIA_DETAIL.md)
- **Discovery:** I2P netDb (built-in DHT) + peer exchange — no separate DHT to bootstrap
- **Audio formats:**
  - **Singles (ParaDio streaming):** OGG/Opus 96 kbps VBR — small, gapless, royalty-free *(inherited from DIGM-origins AUDIO_FORMAT_STRATEGY.md)*
  - **Album downloads:** FLAC lossless *(inherited from DIGM-origins AUDIO_FORMAT_STRATEGY.md)*
- **Encryption:** Buyer receives decryption key on XFG payment, decrypts on-the-fly. ParaDio singles are unencrypted (free streaming, reward-bearing).

### Why Not Something Else

| Alternative | Why Not |
|-------------|---------|
| Celestia DA | Shelved with L2/L3 |
| IPFS + pinning | Costs money, IPs exposed, requires infrastructure |
| Arweave | ~$1600/TB, overkill for streaming audio |
| Central CDN | Against everything DIGM stands for |
| Elder Nodes (staked) | Killed with Elderfiers |

---

## 8. App Architecture: Mobile-First Full Node

**Decision:** DIGM is **mobile-first** and ships a **full Fuego node** (not SPV) inside the app. Every listener phone is a real Fuego validator AND an I2P seeder for the music it touches. Desktop is a secondary build of the same Rust core.

**Why a full node on mobile:**
- Listeners need to verify CD yields, fee pool state, and DIGM colored coin transfers without trusting a remote node
- A full node is the only way to seed P2P music chunks from a phone with strong privacy
- Fuego's 8-minute block target + ~180 blocks/day means the chain stays small enough to run on a phone (storage budget below)
- It eliminates the SPV trust assumption, which is the entire point of running on Fuego

### What the User Sees vs What's Running

```
┌─────────────────────────────────────┐
│          DIGM App (user-facing)     │
│  ┌───────────┐  ┌───────────────┐  │
│  │ Music     │  │ Wallet        │  │
│  │ Player    │  │ (XFG/PARA/VOX)│  │
│  └───────────┘  └───────────────┘  │
│  ┌───────────┐  ┌───────────────┐  │
│  │ Browse /  │  │ Staking /     │  │
│  │ Discovery │  │ Leaderboards  │  │
│  └───────────┘  └───────────────┘  │
├─────────────────────────────────────┤
│      Under the hood (invisible)     │
│  ┌───────────┐  ┌───────────────┐  │
│  │ Full      │  │ I2P Router    │  │
│  │ Fuego Node│  │ (i2pd or      │  │
│  │ (libfuego)│  │  i2p-rs)      │  │
│  └───────────┘  └───────────────┘  │
│  ┌───────────┐  ┌───────────────┐  │
│  │ Chunk     │  │ Audio Codec   │  │
│  │ Cache +   │  │ (Symphonia/   │  │
│  │ Seeder    │  │  Opus + FLAC) │  │
│  └───────────┘  └───────────────┘  │
└─────────────────────────────────────┘
```

### Mobile (PRIMARY TARGET)

| Component | Tech | Size | Notes |
|-----------|------|------|-------|
| App shell | Native (Swift on iOS, Kotlin/Compose on Android) | ~15 MB | Native UI for the best mobile UX, calls Rust core via FFI |
| **Full Fuego node** | Rust crate `libfuego` (cross-compiled to arm64) | ~12 MB | Real validator: blocks, mempool, ring sigs, CDs, fee pool, DIGM colored coin |
| I2P router | Rust (i2p-rs) or i2pd binding | ~6 MB | Pure-Rust I2P router preferred for cross-compile simplicity |
| μTP transport | libutp (Rust bindings) | ~1 MB | LEDBAT congestion control over I2P streaming sockets |
| Audio decode | Symphonia (Rust) — Opus + FLAC | ~2 MB | Cross-platform, no ffmpeg, matches OGG-Opus singles + FLAC albums |
| Chunk cache | SQLite | ~1 MB | Track metadata, chunk index, pin/seed state |
| **Total** | | **~37 MB binary** | Reasonable for a full music app + node |

**Storage budget on phone:**
- Fuego full chain @ ~180 blocks/day, growing slowly: ~2 GB at year 5, ~5 GB at year 10 (estimate, validate with current chain growth)
- I2P netDb + tunnel state: ~50 MB
- Music chunk cache (configurable): default 4 GB on mobile, user can raise/lower
- Total default footprint: ~6-10 GB. Acceptable on modern phones (128 GB+)

**Mobile reality check:**
- iOS Background App Refresh + audio playback entitlements keep the node + seeding alive during music playback
- When music stops + app backgrounded, OS will eventually suspend; on resume, the node syncs the gap
- "Charger + WiFi" mode: full seeding, full sync, full I2P router participation
- "Mobile data + battery" mode: throttle seeding, prioritize playback + reward-claim verification
- Pruning mode (optional): keep only headers + UTXO set + last 10k blocks for storage-constrained devices

### Desktop (Secondary Build of Same Core)

| Component | Tech | Size | Notes |
|-----------|------|------|-------|
| App shell | Tauri (Rust + system WebView) | ~10 MB | Same Rust core, web-frontend UI |
| UI | Web (HTML/CSS/JS) | ~5 MB | System WebView, no bundled Chromium |
| Full Fuego node | `libfuego` (same crate) | ~12 MB | Identical validator code |
| I2P router | i2p-rs / i2pd | ~6 MB | Same as mobile |
| μTP transport | libutp | ~1 MB | Same |
| Audio decode | Symphonia | ~2 MB | Same |
| Chunk cache | SQLite | ~1 MB | Same schema |
| **Total** | | **~37 MB** | Compare: Spotify ~300 MB |

Desktop runs the same Rust core; only the UI shell differs. Desktop gets larger default cache (32 GB) and unrestricted background seeding.

### Shared Rust Core (`libfuego` + companions)

```
libfuego_core (Rust workspace)
├── fuego-node       (full validator, mempool, RPC — derived from C++ src/CryptoNoteCore)
├── fuego-wallet     (key mgmt, ring sigs, CDs, atomic swap state machine)
├── digm-app         (PARA earning, staking pools, merkle anchoring, leaderboards)
├── i2p-net          (I2P router + μTP transport)
├── chunk-store      (SQLite-backed, content-addressed, pin/seed scheduler)
└── ffi-bridge       (UniFFI / cbindgen — Swift + Kotlin + Tauri all consume this)
```

One Rust core, three UI shells (iOS Swift, Android Kotlin, desktop Tauri). Same node behavior everywhere.

### Startup Sequence

```
1. Launch app                                  (~0.5s)
2. Open SQLite + key store                     (~0.1s)
3. Start I2P router (resume saved tunnels)     (~3-8s first time, ~1s warm)
4. Resume Fuego full-node sync                 (~0.5s — pick up from last block)
5. Resume seeding pinned chunks                (~0.2s)
6. UI ready — library + discovery from cache   (immediate)
7. Sync gap while user browses                 (background, parallelizable)
```

First launch on a fresh install: longer (~initial Fuego sync via I2P peers, time depends on chain size — show progress + let user browse cached metadata immediately).

---

## 9. What We Shelved (Can Revisit Later)

- L2/L3 HEAT/COLD token minting (Arbitrum, STARK proofs)
- Elderfier consensus (merkle root signing, quorum)
- C0DL3 gas token / L3 rollup
- Celestia DA for audio blob storage
- EVM composability (NFTs, DeFi on music)
- xfg-stark-cold-starks/ codebase (preserved, deprioritized)
- DIGM-origins `.digm` audio container format + hardware-Secure-Enclave proof-of-recording (the *format* is shelved; PARA economics, OGG-Opus, FLAC, curator share, chunk size, and other prior decisions are inherited)

### HEAT clarification (updated)

HEAT is both a **unit label** and, optionally, a **cross-chain token** that can live on Ethereum (ERC-20) and/or Solana (SPL token).

**Two things HEAT does:**

1. **Unit / denomination label** on Fuego. Very small XFG amounts display as HEAT in the UI ("track price: 250,000 HEAT" reads better than tiny XFG decimals). No new on-chain asset is required for this use.
2. **Cross-chain token** (ERC-20 on Ethereum, SPL on Solana). Non-XFG users can acquire HEAT directly on their chain of choice and satisfy the DIGM premium / reward-eligibility gate without ever touching XFG. Bridging semantics (mint/burn vs wrapped) are §11 open.

**Premium / reward-eligibility gate — dual path:**

A user is "premium" (eligible to earn ParaDio PARA, hold aliases, cast hashrate / burn votes, etc.) when they satisfy **either** of these:

| Path | Minimum |
|------|---------|
| **A. XFG holder** | ≥ **0.0008 XFG** held in the app wallet |
| **B. HEAT token holder** | ≥ **1,000,000 HEAT** held on any supported chain (ERC-20 or SPL) |

- Both gates are independent — no forced conversion, no fixed XFG↔HEAT ratio.
- XFG path is the tiny, cheap, native path. 0.0008 XFG is essentially dust-level — it exists mainly so any real Fuego user is automatically eligible.
- HEAT path is the bigger cross-chain ask. It's how non-Fuego users (Ethereum / Solana natives) can opt into DIGM without going through a swap first. The 1M HEAT threshold is the sybil cost on that path.
- A user can prove either gate privately; the DIGM app verifies the balance claim and issues an eligibility credential against the merkle anchor.

What HEAT does **not** do anymore (killed with the L2 pivot):
- No HEAT-from-burned-XFG minting flow
- No HEAT bridge to Arbitrum for L3 gas
- No relationship to COLD / C0DL3
- No STARK proofs

HEAT is just a unit label on Fuego and an optional cross-chain access token — nothing more.

---

## 10. Token Tracking: Hybrid Anchoring (Decided)

**Decision:** Hybrid off-chain with periodic on-chain merkle anchoring.

### How It Works

```
DIGM app tracks all balances in real-time (fast, flexible)
         │
    Every epoch boundary (N blocks)
         │
    Compute merkle root of ALL app-layer state:
    ├─ PARA balances + active staking positions
    ├─ VOX balances
    ├─ CURA balances
    ├─ nfVOX assignments (album digm_id → artist)
    ├─ TOP current holder
    └─ All active album staking pools
         │
    Publish root in Fuego tx_extra (new tag, 32 bytes + metadata)
         │
    Anyone can request merkle proof of their balance
    against the published root → verifiable, auditable
```

### On-Chain vs App-Layer per Asset

| Asset | Where It Lives | Why |
|-------|---------------|-----|
| **XFG** | Fuego L1 (native) | Real money, consensus-level |
| **CD** | Fuego L1 (commitment deposits) | Consensus-level yield + privacy |
| **DIGM** | Fuego L1 (colored coin) | Hard 100K cap, publishing rights, transfers rarely |
| **PARA** | DIGM app, anchored | High-frequency (earned per listen), merkle-anchored |
| **VOX** | DIGM app, anchored | Transmutation events, merkle-anchored |
| **CURA** | DIGM app, anchored | Burn-to-mint, merkle-anchored |
| **nfVOX** | DIGM app, anchored | One per #1 album, merkle-anchored |
| **TOP** | DIGM app, anchored | Singleton, merkle-anchored |

### Why This Works

- No EFiers needed — DIGM app publishes the root as a regular Fuego tx
- Reuses the CommitmentIndex merkle tree pattern already in the codebase
- Chain bloat = 1 small tx per epoch (32-byte root), not millions of token ops
- Disputes are resolved by merkle proof against the on-chain root
- DIGM colored coin is "real" on-chain because it's low-frequency and controls access

---

## 11. Open Questions

> Many prior topics were **answered** in DIGM-origins docs and have been folded into the body of this guide. The list below is only what is still genuinely undecided.

### Already decided (inherited from DIGM-origins, see body)
- **PARA earning rate:** 1 PARA per minute of verified listening *(AUDIO_FORMAT_STRATEGY.md)*
- **PARA total supply / emission:** 1 quintillion total, 1% initial annual emission, halving every 4 years over 30 years *(PARA_TOKEN_ECONOMICS.md)* — keep or revisit?
- **Curator revenue split:** 30% of artist's PARA + 30% of listener's PARA when listened via curator playlist *(AUDIO_FORMAT_STRATEGY.md, CURATOR_REVENUE_SHARE_MODEL.md)*
- **Audio formats:** OGG/Opus 96 kbps for ParaDio singles, FLAC for album downloads *(AUDIO_FORMAT_STRATEGY.md)*
- **Chunk size:** 256 KB content-addressed chunks *(DIGM_COLD_CELESTIA_DETAIL.md)*
- **Album metadata fields:** albumId, title, artistName, description, releaseDate, genre, priceXFG, coverImage, paradioPreviewTrackIds, payment code, artist key *(DEV_IMPLEMENTATION_PLAN.md)*
- **Album pricing:** artist sets USD target, XFG amount adjusts via oracle *(DEV_IMPLEMENTATION_PLAN.md)*
- **DIGM coin utility:** required to sign album release tx (0x0A type), 10 releases per coin, updates free *(DEV_IMPLEMENTATION_PLAN.md)*
- **CURA token:** 100M fixed supply, minted by burning PARA (DIGM-origins) — but our design says minted by burning **VOX**. Conflict — see below.
- **Offline plays:** supported but no rewards (matches our decision)

### Decisions made in this revision
- **CURA mint = burn VOX only.** DIGM-origins' "burn PARA → CURA" is overridden. VOX is the only path to CURA.
- **PARA reward split** = listener / artist (curator skims 30% of each share if listened via curator playlist). No Elderfier / LP slice — those DIGM-origins buckets are gone with the rest of the L2/EFier stack.
- **HEAT is both a unit label (on Fuego) and an optional cross-chain token (ERC-20 + SPL).** Premium / reward gate is dual-path: ≥ 0.0008 XFG **or** ≥ 1,000,000 HEAT. No forced conversion between the two.
- **Seeders earn zero PARA.** Bootstrapping under-seeded content is via artist XFG bounty (primary) or Fuego treasury bounty (fallback). Both paid in XFG, never PARA.
- **CD fee pool is completely separate from DIGM.** DIGM does not feed or consume CD yield. They share XFG as a medium only.
- **Epoch length = ~5 days = 900 blocks**, aligned with the Fuego swap-fee epoch.

### Dynasty + ride-the-wave — direction locked, numbers parked
See §4a. Direction is chosen (delayed drain, open pool during reign, half-power late-entry stakes, artist reign-tax, opt-in ride-the-wave with forfeiture). All numeric knobs are parked as in-app TBD along with VOX/CURA above — they need playtest data, not a priori guesses.

### Epoch & timing edges (still open, mostly in-app)
- How long does a non-winning staking pool stay open? Indefinite until win or withdraw?
- Does TOP transfer instantly at dethrone, or at the next epoch boundary (every 900 blocks)?
- Grace period for staking after album publish? (prevent sniping at epoch close)

### VOX / CURA / nfVOX / TOP — parked as in-app TBD
These are in-app tokens. Supply / burn ratios / multiplier curves / transferability are **deliberately deferred** until the DIGM app is further along. They settle to Fuego L1 via the merkle anchor (§10) so any model we pick later is auditable. Open items, not blocking:
- VOX time-multiplier curve on transmutation (linear? exponential? step function?)
- VOX → CURA burn ratio
- VOX supply model (purely event-driven from #1 transmutations, or any cap?)
- Is VOX P2P-tradable in-app, or only burnable-for-CURA / spendable-on-cosmetics?
- nfVOX: pure app state, or does the award event also anchor a separate identifier on L1?
- TOP transfer mechanics — automatic on dethrone, or signed handoff?
- Dynasty-mode numeric knobs (late-entry weight, reign-tax rate, reign-bonus factor `r`, forfeiture rule, add-to-riding-position rule, dethrone-then-return behavior, tie-breaker) — same bucket, parked until app is real enough to playtest

### Streaming proof / anti-bot (direction decided, numbers + research open)
Decided: listener's own full node self-attests on runtime signals (player running + decoder producing frames + audio amplitude above threshold + not-a-bot score), bounded by per-alias PARA/day rate caps, the dual HEAT/XFG gate, quadratic alias cluster-decay, and statistical audit at each merkle anchor. **Replays count.** **No seeder co-signing, no fetch-trail vs claim check, no hardware attestation required.** Bootstrapping under-seeded content is handled by artist XFG bounties, with Fuego treasury bounties as a fallback. **Premium / reward gate** is dual-path: ≥ 0.0008 XFG *or* ≥ 1,000,000 HEAT (ERC-20 or SPL). Still open:
- Scoring weights and threshold for the not-a-bot score
- PCM amplitude threshold for the "audio above threshold" check (and window size)
- Per-alias PARA/day rate cap number
- Statistical audit model at the anchor — what signals define "outlier," what's the clawback mechanism, how many epochs back can be revised?
- Exact artist-bounty payout rule: pro-rata by bytes served? by distinct destinations served? time-weighted?
- Floor / ceiling on artist bounty amounts?
- Treasury bounty trigger: automatic metric or governance?

### Streaming proof — research items (not decisions)
Look into whether any of these should be adopted beyond the runtime-signals baseline:
- Per-session content encryption with block-hash-derived keys (harder gate, complicates replay-from-cache)
- Decoder-bound nonce chains (proof-of-decode)
- Verifiable delay on listen claims (wall-clock rate limiting)
- Opt-in TEE attestation (SGX / TrustZone / Secure Enclave) as a premium path with bonus rate cap
- Watermarking / acoustic fingerprinting for the laziest bots
- Prior-art survey: Audius proof-of-listen, Spotify, BAT, others

### Identity / sybil (direction flipped — wallet = user)
Decided (see §4 "Sybil Defense: Wallet = User"): no separate alias layer. The wallet *is* the identity. Sybil resistance comes from sunk-cost state accrual (wallet-age ramp, streaks, reputation, nfVOX, rank history — all soulbound) plus the HEAT/XFG gate on the wallet itself, plus the UX default of "one wallet, and every cross-device path is import not create." No new-user bonus ever. Quadratic cluster-decay math is parked as a research fallback, not primary. Edges still open:
- Wallet-age ramp length (first N epochs) and ramp curve (step / linear / smoothstep)
- Streak multiplier curve — how much does a 30-day streak beat day 1?
- Does streak reset on a single missed day or decay gracefully?
- Display-name namespace — first-come-first-serve? changeable? squatting prevention?
- Public profile field defaults (which stats are public-by-default vs opt-in)
- Leaderboard categories final list (current draft: listener rankings, PARA LP leaders, album charts, curator rankings, epoch Hall of Fame)
- Research survey of the soulbound-token / sunk-cost-identity space (SBT paper, POAP, Gitcoin Passport, Lens, Farcaster, ENS, ERC-5114, ERC-6551) — which primitives to steal
- Does cross-device wallet import need any "recovery" flow (seed only, or additional recovery options)?

### Platform & UX
- What customizations / add-ons can VOX buy? (themes, badges, profile flair, radio priority?)
- CURA permissions: exact powers? (public playlists, featured picks, editorial posts, slashing?)
- Paradio queue: hashrate-vote weight vs VOX-burn weight? Any algorithmic baseline?
- Should hashrate voting be 1-miner-1-vote or weighted by hashrate?

### HEAT cross-chain token
- Issuance model: native mint on each chain (independent supplies), or single canonical chain + wrapped bridges?
- Which chain is canonical — Ethereum or Solana? Or fully independent per chain?
- Total supply / schedule — fixed cap? issuance tied to anything on the Fuego side?
- How does the DIGM app verify a HEAT balance claim without trusting the user's wallet? (light client? signed message against a recent block header?)
- Does holding HEAT unlock anything beyond the premium gate, or is the gate its only utility?

### Integration with Fuego Core
- CD fee pool split now that Elderfiers are gone: (a) 90/10 CD/Treasury, (b) 85/15 CD/Treasury, (c) keep 80/10/10 and reassign the 10% EF slice to something else **unrelated to DIGM** (dev fund? burn? artist-bounty top-up for under-seeded content?). *Note: DIGM is explicitly NOT in scope for the CD fee pool — this is a pure Fuego-core question, though treasury bounties for under-seeded content are one possible home for the reassigned slice.*
- DIGM colored coin tx_extra tag format (transfer rules, 100K mint, hosting-rights enforcement)
- Merkle anchor tx_extra tag (next available after 0xD5 — pick a value)
- Authentication for the merkle root publisher tx — dedicated wallet? threshold of DIGM-coin holders?
- Fraud-proof / dispute resolution if a published merkle root is wrong

### App Engineering
- iOS Background App Refresh strategy for keeping the full node + I2P router warm
- Pruning mode policy (when does a phone switch from full archival to pruned?)
- I2P router choice: pure-Rust `i2p-rs` (less battle-tested) vs FFI to `i2pd` (C++, mature). Likely start with i2pd FFI, migrate to i2p-rs as it matures.
- Cache eviction policy (LRU with pinning exceptions)
- Audio streaming buffer strategy (prefetch next N chunks)
- Initial Fuego sync time on mobile via I2P — acceptable UX or do we need a "fast-sync" snapshot mechanism?
- Storage budget validation: real growth curve of Fuego chain at current block rate
