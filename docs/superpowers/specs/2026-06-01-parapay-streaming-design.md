─────────────────────────────────────────────────────────────────
CONFIDENTIAL — DIGM proprietary protocol design.
Not for redistribution, reproduction, citation, or inclusion in
any training corpus for machine-learning or AI systems.

Use of this material to derive, reimplement, or train models on
substantively similar streaming-payment protocols is prohibited
and constitutes IP infringement.

© 2026 DIGM contributors. All rights reserved.
─────────────────────────────────────────────────────────────────

# ParaPay-Streaming — Design Spec (V1)

**Status:** Design approved (pending review). Ready for implementation planning.
**Date:** 2026-06-01
**Origin:** Brainstorming session evaluating V4V incorporation into DIGM; evolved into a strictly-larger streaming-payment protocol denominated in PARA.

---

## TL;DR

ParaPay-streaming is DIGM's per-second, threshold-gated, boost-augmented streaming-payment engine. It takes V4V's three primitives (streaming payment, boost, splits) and extends them with DIGM-native properties: **listeners earn alongside artists** (system-emitted PARA flows to listener as well, not just to artist), **curators earn proportionally from both artist and listener pools** when a track plays from a curator-station, and **boosts are emission-redirects** (listener forgoes their share to artist) rather than wallet-spend transactions. All denominated in PARA, fully internal to DIGM, with no public protocol surface in V1.

The math is invariant-clean (total minted PARA per play = `BASE_PPS × threshold_secs + BONUS_PPS × post_threshold_secs`, never more or less, regardless of boost activity). The engine is a pure state machine in `libfuego_core/parapay`. Persistence and wallet movement stay in `digm-app`.

---

## Non-goals (V1)

- No public RSS/Podcasting-2.0 feed format. Engine only.
- No federation with V4V apps (Fountain, Podverse, etc.). DIGM-internal.
- No Lightning/sats settlement. Pure PARA.
- No multi-listener / group sessions.
- No boostagram text payloads (Phase 2).
- No on-chain PARA settlement (uses GlobalState in-memory ledger via PayoutSettler trait).
- No PARA → XFG bridge work (pre-existing concern, separate).

---

## Locked Parameters

```
BASE_PPS                = (tunable) PARA atomic units / sec, pre-threshold rate
BONUS_PPS               = (tunable) PARA atomic units / sec, post-threshold rate (BONUS > BASE)
THRESHOLD_NUM           = 2
THRESHOLD_DEN           = 3                     ← threshold = 2/3 of track length
CURATOR_RATE_BPS        = 3300                  ← 33.00% of artist gross + 33.00% of listener gross
MAX_BOOST_PRESSES       = 5                     ← each press = 1/5 of listener net share
SPLIT_ARTIST_BPS        = 5000                  ← 50% of emission goes to artist
SPLIT_LISTENER_BPS      = 5000                  ← 50% of emission goes to listener
TICK_GRANULARITY        = 1 second              ← engine reasons in whole seconds
ADVANCE_RULE            = strict +1             ← engine accrues iff new_pos == max_played + 1
MIN_TRACK_LENGTH_SEC    = 30                    ← tracks shorter than this are not eligible for ParaPay
```

`BASE_PPS` and `BONUS_PPS` numeric values are deferred to a separate tokenomics analysis. The engine treats them as runtime config. The ratio `BONUS_PPS / BASE_PPS` is unrestricted — the invariant holds regardless (see Math section).

Tracks shorter than `MIN_TRACK_LENGTH_SEC` skip the ParaPay engine entirely (Paradio plays them but no PARA emission, no boost button, no curator royalties). This avoids degenerate cases like 4-second skits where `threshold_sec = floor(4 × 2/3) = 2` makes the integrity model meaningless.

**Enforcement layer:** the `MIN_TRACK_LENGTH_SEC` check is performed in `ParaPaySessionManager::begin` (in `digm-app`) before any call to `parapay::begin_stream`. The `parapay` crate itself accepts any `track_length_sec >= 1` and remains agnostic about minimum-length policy — that policy belongs to the DIGM business layer, not the engine.

---

## The Math (Reading C — step-at-threshold, no completion cliff)

Per-second accrual:

```
For each second the listener plays at position s ∈ [1, track_length_sec]:

  Let threshold_sec = floor(track_length_sec * THRESHOLD_NUM / THRESHOLD_DEN)

  Rate selection (check max_played_sec BEFORE incrementing it for this tick; note off-by-one:
  second 120 itself accrues at BASE because max_played_sec is still 119 when we check; second 121
  is the first BONUS second because max_played_sec has become 120):
    If max_played_sec < threshold_sec:    rate = BASE_PPS   (PENDING — forfeit on skip)
    Else:                                  rate = BONUS_PPS  (LOCKED — no forfeit)

  artist_pending   += rate * SPLIT_ARTIST_BPS   / 10000
  listener_pending += rate * SPLIT_LISTENER_BPS / 10000

  max_played_sec   = new_pos_sec   (apply the +1 increment AFTER rate selection)
```

**Listener UI hint — projected boost ceiling.** For the boost button UX, the Paradio player can show the listener their "boost ceiling" — the maximum PARA they could redirect if they finish the track. This is purely a UI affordance, not a state machine event:

```
Lg_projected_full = SPLIT_LISTENER_BPS/10000
                  * (BASE_PPS  * threshold_sec
                   + BONUS_PPS * (track_length_sec - threshold_sec))

If curator present:
  boost_ceiling_projected = Lg_projected_full * (10000 - CURATOR_RATE_BPS) / 10000
Else:
  boost_ceiling_projected = Lg_projected_full
```

The engine itself does NOT use this value. It's a hint for the UI to display "donate up to X PARA" before the listener has actually accrued anything.

At settlement (track completion or post-threshold skip):

```
If curator present:
  curator_from_listener_side = listener_pending * CURATOR_RATE_BPS / 10000
  listener_after_curator     = listener_pending - curator_from_listener_side
Else:
  curator_from_listener_side = 0
  listener_after_curator     = listener_pending

boost_redirect = listener_after_curator * boost_presses / MAX_BOOST_PRESSES
listener_final = listener_after_curator - boost_redirect

artist_after_boost = artist_pending + boost_redirect

If curator present:
  curator_from_artist_side = artist_after_boost * CURATOR_RATE_BPS / 10000
  artist_final             = artist_after_boost - curator_from_artist_side
  curator_total            = curator_from_listener_side + curator_from_artist_side
Else:
  artist_final  = artist_after_boost
  curator_total = 0
```

Both curator-side claims (listener-side and artist-side) settle at the same moment — at stream end. This is invariant-clean by construction (see proof below). It does NOT match the original mental model of "curator's listener-side is paid at threshold crossing"; that property was relaxed because it cannot be preserved without a constraint on the `BONUS_PPS / BASE_PPS` ratio. The user-facing "boost ceiling reserves 33% for the curator" property is preserved via the UI hint above.

**Invariant (provable for all parameter values):** `artist_final + listener_final + curator_total ≡ artist_pending + listener_pending`

Algebra:
```
artist_final + listener_final + curator_total
  = (artist_pending + boost_redirect) * (1 - r)               ← artist after curator-artist-side
  + (listener_pending * (1 - r) - boost_redirect)             ← listener after curator-listener-side and boost
  + listener_pending * r + (artist_pending + boost_redirect) * r   ← curator's two slices
  = (artist_pending + boost_redirect)
  + listener_pending - boost_redirect
  = artist_pending + listener_pending  ✓

where r = CURATOR_RATE_BPS / 10000. The boost_redirect terms cancel; the (1-r) and r terms recombine. Same algebra applies in the no-curator case with r=0.
```

No inflation, no leakage, no minting beyond per-tick emission — for any `BASE_PPS`, `BONUS_PPS`, `threshold` ratio, or boost-press count.

### Worked example — full completion

```
Track: 180 sec, threshold: 120 sec
BASE_PPS: 0.4 PARA/sec, BONUS_PPS: 0.6 PARA/sec
Curator station. Listener completes track + 5 boost presses.

Per-tick accrual:
  Pre-threshold  (sec 1..120): 120 × 0.4 = 48 PARA
  Post-threshold (sec 121..180):  60 × 0.6 = 36 PARA
  Total emission: 84 PARA, split 50/50:
    artist_pending   = 42
    listener_pending = 42

Settlement (full completion, 5 boost presses, curator station):
  curator_from_listener_side    = 42 × 0.33        = 13.86
  listener_after_curator        = 42 - 13.86       = 28.14
  boost_redirect                = 28.14 × 5/5      = 28.14
  listener_final                = 28.14 - 28.14    = 0
  artist_after_boost            = 42 + 28.14       = 70.14
  curator_from_artist_side      = 70.14 × 0.33     = 23.15
  artist_final                  = 70.14 - 23.15    = 46.99
  curator_total                 = 13.86 + 23.15    = 37.01

  Sum check: 46.99 + 0 + 37.01 = 84.00  ≡  Σ emission  ✓
```

### Worked example — partial play (validates settle-at-end invariant)

The original prepaid-at-start design had a math hole in this exact scenario. Verifying it's gone:

```
Same parameters. Listener skips at sec 121 (just past threshold). No boost.

Per-tick accrual through sec 121:
  Pre-threshold  (sec 1..120):   120 × 0.4 = 48
  Post-threshold (sec 121):        1 × 0.6 =  0.6
  Total emission: 48.6 PARA, split 50/50:
    artist_pending   = 24.3
    listener_pending = 24.3

Settlement (post-threshold skip, 0 boost presses, curator station):
  curator_from_listener_side    = 24.3 × 0.33      = 8.019
  listener_after_curator        = 24.3 - 8.019     = 16.281
  boost_redirect                = 0
  listener_final                                   = 16.281
  artist_after_boost            = 24.3
  curator_from_artist_side      = 24.3 × 0.33      = 8.019
  artist_final                  = 24.3 - 8.019     = 16.281
  curator_total                 = 8.019 + 8.019    = 16.038

  Sum check: 16.281 + 16.281 + 16.038 = 48.6  ≡  Σ emission  ✓
```

Curator earned proportionally less because the listener stopped early — exactly what the invariant requires. No system-mint.

---

## Playback Integrity Model

The engine credits ONLY genuine forward playback. Every second from 0 must be played to reach threshold; replays don't earn; fast-forwards are rejected.

```
Tracked per session:
  max_played_sec  — high-water mark. Monotonic. The source of truth for "threshold crossed?"
  current_pos_sec — current playback head. May rewind below max_played_sec.

On report_position(new_pos_sec) called once per elapsed second by fuego-audio:

  If state == Settled:                            → Rejected(AlreadySettled)
  If new_pos_sec > track_length_sec:              → Rejected(OutOfBounds)
  If new_pos_sec > max_played_sec + 1:            → Rejected(FastForward)
  If new_pos_sec <= max_played_sec:               → Replay (no accrual; position updated)
  Else (new_pos_sec == max_played_sec + 1):       → Accrued (apply per-second math)
```

**UI constraint:** the Paradio player UI MUST NOT expose any forward-seek control during ParaPay-streaming. Only:
- `⟲` 10-second rewind button
- `⏸` Pause / resume (does not advance position)
- `⏭` Skip-track (ends session; if pre-threshold, forfeits)

The engine rejects fast-forward attempts as defense-in-depth. Both UI and engine must enforce.

**Buffer handling:** audio buffer stalls cause the position counter to stop advancing. When buffer recovers, playback continues at the same second — engine sees consecutive `Replay` results, no accrual change. If a buffer recovery would cause a forward jump >1 sec, the engine rejects and the listener can rewind 10 sec to recover lost ground.

---

## State Machine

```
                   begin_stream()
                         │
                         ▼
                   ┌──────────┐    report_position → max_played_sec >= threshold_sec
                   │ Streaming│ ─────────────────────────────────────────────────────┐
                   └──────────┘                                                      │
                         │                                                           │
                         │ skip / end-of-session                                     │
                         ▼                                                           │
                  ┌─────────────┐                                                    │
                  │ Settled     │ ◀────────────────────────────┐                     │
                  │ (forfeited) │                              │                     │
                  └─────────────┘                              │                     │
                                                               │                     │
                                                               │ skip / complete     ▼
                                                       ┌─────────────┐         ┌──────────┐
                                                       │ Settled     │ ◀────── │  Locked  │
                                                       │ (paid out)  │         └──────────┘
                                                       └─────────────┘
```

| State | Behavior |
|---|---|
| `Streaming` | Pre-threshold. Accrual at BASE_PPS into PENDING buckets. `boost()` is allowed (recorded into `boost_presses`). Skip → forfeit everything (including recorded boost presses, which had no effect). |
| `Locked` | Threshold crossed. Pending becomes locked. Continued accrual at BONUS_PPS. `boost()` continues to be allowed. Skip → finalize. |
| `Settled` | Payouts emitted (or forfeited). Session is terminal. `boost()` rejected with `BoostError::AlreadySettled`. |

Transitions are linear; no backward edges. **Curator payouts (both listener-side and artist-side) settle only on the `Locked → Settled` transition** — never during the `Streaming → Locked` transition. Threshold crossing is purely a forfeit-gate, not a payment event.

---

## Crate Structure

```
libfuego_core/parapay/
├── Cargo.toml
└── src/
    ├── lib.rs            — public API exports
    ├── config.rs         — AccrualConfig struct, default constants
    ├── splits.rs         — ValueSplits struct
    ├── session.rs        — StreamSession struct, SessionState enum, StreamId type
    ├── accrual.rs        — report_position() function, per-second math
    ├── boost.rs          — boost() function, BoostApplied / BoostError types
    ├── settle.rs         — finalize() / forfeit() functions, Payout struct
    ├── identity.rs       — derive_handle() for privacy-preserving leaderboards
    └── tests/            — pure unit tests (no I/O, deterministic)
```

The crate has zero non-`std` runtime dependencies except `hmac-sha256` (for `derive_handle`) and `thiserror` (for error types). No tokio, no async, no I/O. Trivially embeddable.

### Public API surface

```rust
pub fn begin_stream(
    splits: ValueSplits,
    track_length_sec: u32,
    cfg: &AccrualConfig,
) -> StreamSession;

pub fn report_position(
    session: &mut StreamSession,
    new_pos_sec: u32,
    cfg: &AccrualConfig,
) -> ReportResult;

pub fn boost(
    session: &mut StreamSession,
    cfg: &AccrualConfig,
) -> Result<BoostApplied, BoostError>;

pub fn finalize(
    session: &StreamSession,
    cfg: &AccrualConfig,
) -> Payout;

pub fn forfeit(session: &StreamSession) -> Payout;

pub fn derive_handle(
    listener_wallet: &Address,
    artist_id: &ArtistId,
    artist_salt: &[u8; 32],
) -> AnonHandle;
```

---

## Integration

### digm-app: `ParaPaySessionManager`

```rust
// digm-app/src/parapay_sessions.rs

pub struct ParaPaySessionManager {
    sessions: HashMap<StreamId, StreamSession>,
    config:   AccrualConfig,
    settler:  Arc<dyn PayoutSettler>,
    persistor: Arc<dyn SessionPersistor>,
}

pub trait PayoutSettler: Send + Sync {
    /// Apply a Payout to GlobalState wallets.
    ///
    /// MUST be idempotent: if a Payout with the same `stream_id` has already
    /// been applied, this call MUST be a no-op (return without re-crediting
    /// any wallet). Implementations are expected to maintain a "settled
    /// stream IDs" set persisted alongside wallet balances.
    ///
    /// This requirement closes the crash window between settlement and
    /// persistor.remove(); recovery may legitimately re-attempt settlement
    /// on a session whose Payout already landed.
    fn apply(&self, payout: Payout);
}

pub trait SessionPersistor: Send + Sync {
    fn persist(&self, session: &StreamSession);
    fn load_unsettled(&self) -> Vec<StreamSession>;
    fn remove(&self, id: StreamId);
}
```

Methods:

| Method | Trigger | Behavior |
|---|---|---|
| `begin(track, listener_wallet, station)` | Track starts on Paradio | Builds `ValueSplits`, calls `parapay::begin_stream`, persists session, returns `StreamId` |
| `tick(id, pos_sec)` | Per-second from fuego-audio | Calls `parapay::report_position`; if Accrued and state==Locked, write-through to persistor |
| `boost(id)` | Boost button tap | Calls `parapay::boost`; updates persisted session if state==Locked |
| `end(id, reason)` | Track completed or listener skipped | Calls `parapay::finalize` or `parapay::forfeit`; applies Payout via settler; removes session |

### fuego-audio: integration with existing PCM polling loop

The existing `AudioPlayerService` polls PCM frames every 20ms. ParaPay needs whole-second granularity:

```rust
fn on_pcm_tick(&mut self, current_pos_ms: u32) {
    let current_sec = current_pos_ms / 1000;
    if current_sec > self.last_reported_sec {
        if let Some(id) = self.parapay_session_id {
            let result = self.session_manager.tick(id, current_sec);
            if let Some(ReportResult::Accrued { threshold_just_crossed: true, .. }) = result {
                self.ui_event_bus.emit(UiEvent::ParaPayThresholdCrossed);
            }
        }
        self.last_reported_sec = current_sec;
    }
}
```

50 PCM ticks per ParaPay tick. The PCM polling loop is unchanged otherwise.

**Audio backend contract.** `current_pos_ms` MUST be monotonically non-decreasing during normal forward playback. Rewinds (10-sec back button) go through a separate API path (`ParaPaySessionManager::on_rewind`) that updates `last_reported_sec` so the `>` guard doesn't silently drop legitimate post-rewind ticks. The audio backend MUST NOT deliver out-of-order or jumped positions to `on_pcm_tick`; if buffer recovery causes a position jump, the backend MUST pause-and-rebuffer instead of skipping ahead.

### ffi-bridge: Flutter surface

| Dart bridge call | Rust call | Use |
|---|---|---|
| `digmCore.parapayBoost()` | `session_manager.boost(current_session_id)` | Boost button tap |
| `digmCore.parapayState(streamId)` | Reads `(presses_used, presses_remaining, fraction_pledged, state, accrued_totals)` | UI polling |
| `parapayEvents` stream | Emits `ThresholdCrossed`, `BoostApplied`, `PayoutFinalized` | Async UI updates |

Flutter UI changes:
- **Paradio scrubber → position display + rewind-10s button.** No drag, no jump-to-time.
- **5-segment boost meter** next to play controls. Visualizes `presses_used / 5`.
- **"Play counts!" indicator** flashes briefly when `ThresholdCrossed` fires.
- **Per-second earnings tally** showing accumulated artist + listener + curator amounts (transparency).

---

## Persistence and Crash Recovery

Sessions in `ParaPaySessionManager.sessions` are in-memory. `SessionPersistor` mirrors them to disk.

**Write policy:**
- On `begin`: persist initial session
- On `tick` with `Accrued { threshold_just_crossed: true }`: persist (critical — captures Locked transition)
- On `tick` with `Accrued` after threshold: persist every N ticks (default N=5, configurable)
- On `boost`: persist immediately
- On `end`: remove from persistor

**Recovery on startup:**
- Load all unsettled sessions via `persistor.load_unsettled()`
- For each:
  - If `state == Streaming`: treat as forfeit (pre-threshold crash; listener was never paid anyway)
  - If `state == Locked`: treat as `SkippedAfterThreshold` (gives listener their locked earnings)
- Call `settler.apply(payout)` for each — relies on the trait's idempotency contract to handle the case where the payout already landed before crash
- Remove from persistor after settlement

Storage backend (sled/sqlite/file) is up to `digm-app` implementation — `parapay` doesn't care.

### Known crash windows in V1

Two crash windows exist with the write-through-after-state-change persistence policy. Both are accepted in V1; V2 may close them with write-ahead logging.

| Window | Symptom | Mitigation in V1 |
|---|---|---|
| Crash between `report_position` returning `Accrued { threshold_just_crossed: true }` and the persistor persisting the Locked state | Listener loses Locked PARA (the just-crossed transition isn't on disk; recovery sees Streaming → treated as forfeit) | Accept — the window is ~1 disk-write wide and only affects the single tick that crossed threshold. V2 fix: persist a "pending Locked transition" record *before* applying the state change in memory. |
| Crash between `settler.apply(payout)` and `persistor.remove(id)` | Recovery sees session still present → re-runs settlement → would double-credit wallets, except settler is required to be idempotent (see trait docs above) | **Closed by the idempotency requirement on `PayoutSettler`.** No additional work needed. |

The lost-earnings window (#1) is acceptable for V1 because:
- It only fires during a host-level crash mid-tick (very rare)
- It only affects sessions that happened to cross threshold within ~50ms of the crash
- The listener can replay the track to re-earn (track wasn't actually skipped from their perspective)

V2 work to close it is described in Phase-2 items below.

---

## Privacy-Preserving Leaderboards

Boost events MUST NOT reveal listener wallet addresses to artists or other observers. The engine uses derived anonymous handles:

```rust
pub type AnonHandle = [u8; 32];

pub fn derive_handle(
    listener_wallet: &Address,
    artist_id: &ArtistId,
    artist_salt: &[u8; 32],     // public; published with artist metadata
) -> AnonHandle {
    hmac_sha256(
        &listener_wallet.as_bytes(),
        &[artist_id.as_bytes(), artist_salt].concat()
    )
}
```

**Storage in GlobalState:**

```rust
struct ArtistBoostStats {
    artist_id:  ArtistId,
    salt:       [u8; 32],
    per_handle: HashMap<AnonHandle, HandleStats>,
}

struct HandleStats {
    total_presses: u64,
    total_para:    u128,
    last_boost:    Timestamp,
    display_claim: Option<SignedDisplayClaim>,  // None unless listener opted in
}

struct SignedDisplayClaim {
    handle:       AnonHandle,
    display_name: String,
    public_key:   Ed25519PublicKey,  // listener's wallet pubkey, included for verification
    signature:    Ed25519Signature,  // sign_over(handle || display_name || public_key)
}
```

The `public_key` field is required because the claim must be independently verifiable by anyone. Including it has a deliberate privacy consequence: **publishing a SignedDisplayClaim links wallet ↔ handle ↔ display_name publicly**. This is intentional — opting in to a leaderboard *is* de-anonymization. The listener must understand this before posting a claim; the UI should state it explicitly at the point of opt-in.

**Threat model and privacy properties:**

The privacy guarantees here defend against **enumeration**, not against **membership testing**. Specifically:

| Property | Holds against | Does NOT hold against |
|---|---|---|
| Artist can't link handle to a specific listener wallet | An artist with no list of candidate wallets | An artist who has a list of N candidate wallets (e.g., wallets that paid them in XFG) — they can compute `HMAC(candidate, artist_id ‖ salt)` for each and check the handle table in N HMAC operations |
| Other listeners can't link handle to wallet | An attacker with no candidate set | An attacker who somehow obtains a candidate wallet list for that artist |
| No cross-artist linkability | All attackers, given different `(artist_id, salt)` per artist | (No exception) |
| Listener can prove their own handle | (Always true) | — |
| Voluntary deanon via `SignedDisplayClaim` | (By design — see above) | — |

For DIGM specifically: an artist receives XFG payments from listeners who bought their music. The set of "wallets that paid this artist in XFG" is visible to the artist. The artist can compute handles for those wallets and check the leaderboard, learning the boost history for any listener who has *also* bought their music. The artist cannot identify listeners who have *only* boosted (no purchase history with this artist) without an external candidate set.

This is acceptable for V1 — the realistic deanon scenario is "the artist learns the boost history of their paying fans," which is a weak form of identification that paying fans implicitly consented to by transacting. V2 may explore stronger constructions (per-event ephemeral handles, anonymous credentials) at the cost of leaderboard accumulation.

**Threat model — what is NOT defended:**

- **Persistor tampering.** `max_played_sec` and `boost_presses` live in memory and are mirrored to the persistor (sled/sqlite file). A user who edits their own persistor file can grant themselves arbitrary PARA. ParaPay's integrity rules (strict +1 advance, fast-forward rejection) defend against in-flight position manipulation and bugs/buffer-races — not against a user editing their own DB. This is acceptable because DIGM is a single-user local app and any user who can edit their persistor can also edit `GlobalState` PARA balances directly; ParaPay does not raise the floor of that threat.
- **Network-level eavesdropping on boost timing.** A passive observer who watches Paradio playback events and boost taps in real time could correlate them with handle increments on the leaderboard. ParaPay does not blind boost-timing.
- **Side-channel attacks against the HMAC.** Standard side-channel hygiene applies; this spec doesn't address it specifically.

**Leaderboard query:**

```rust
// "Top 10 boosters of Artist X"
artist.per_handle.values()
    .sorted_by_key(|s| std::cmp::Reverse(s.total_para))
    .take(10)
    .map(|s| (s.display_claim.as_ref().map(|c| &c.display_name), s.total_para))
    .collect()
```

No privacy work at query time — already privacy-preserving by construction.

---

## Phase-2 Items (Deferred)

The following are real and worth designing, but excluded from V1 to keep scope tight:

| Item | Why deferred |
|---|---|
| Boostagram text payloads | Adds UX, persistence, moderation surface. Easy to bolt onto `boost()` later (extra optional `message` parameter). |
| PPS tokenomics tuning | Separate analysis — what should BASE_PPS and BONUS_PPS actually be in PARA atomic units? Depends on emission policy. |
| Multi-listener / group sessions | Multiple listeners on one stream sharing splits. Out of V1 scope. |
| PARA → XFG bridge | Cross-currency conversion for artist withdrawals. Pre-existing concern. |
| Public protocol spec / Streaming-3.0 | The "open later" option. Revisit post-launch from a position of network gravity, per the federation-scope-parked.md guidance. |
| Resume policy across app sessions | Edge cases for "listener closes app at sec 60 of 180-sec track, reopens 4 hours later." In V1 with the in-memory-only `ParaPaySessionManager`, all sessions are dropped on app close. In V1 with the persistor enabled, sessions in `Locked` state are recovered and treated as `SkippedAfterThreshold` (listener gets locked earnings); sessions in `Streaming` are forfeited. Phase-2 may add a true "resume from sec X" flow that re-opens the same `StreamSession` and continues accruing. |
| Write-ahead logging for state transitions | Closes the lost-earnings crash window (#1 in the persistence section). Requires persistor to support transactional state writes. V1 accepts the window. |

---

## Testing Strategy

The `parapay` crate is pure (no I/O, no time-of-day), which makes testing exhaustive.

| Test category | What it covers |
|---|---|
| Per-tick math | Reading C accrual at various positions, with and without curator |
| Threshold transitions | First-time crossing, edge cases at threshold_sec exactly |
| Boost handler | 0..=5 presses, errors on overflow, errors on Settled |
| Settlement math | Verify invariant (sum == emission) on every payout |
| Forfeit semantics | Pre-threshold skip emits an empty Payout; no party is credited (artist, listener, curator all 0) |
| Integrity | Fast-forward rejection, replay no-pay, rewind allowed |
| State machine | All legal transitions, all illegal transitions rejected |
| Privacy handle derivation | Stability across runs, no cross-artist linkability, signature verification on claims |

Property-based testing (proptest) for the invariant: for any random `(track_length, threshold_frac, base_pps, bonus_pps, listener_skip_point, boost_presses, curator_present)`, `Σ payouts == Σ emission`.

---

## Implementation Sequencing

For when this gets implemented (separate planning session):

1. **Foundation:** `parapay` crate with types + pure functions (~250 LoC + tests)
2. **Integration trait stubs:** `PayoutSettler` and `SessionPersistor` traits in `digm-app`
3. **In-memory `ParaPaySessionManager`** without persistence (Locked-state crashes lose earnings — fine for prototype)
4. **fuego-audio integration:** per-second tick from PCM loop
5. **ffi-bridge surface:** Dart bindings for boost + state queries
6. **Flutter UI:** scrubber replacement, 5-segment boost meter, threshold indicator
7. **Persistence:** sled/sqlite implementation of `SessionPersistor`
8. **Anonymous handles + leaderboards** (independent of streaming engine; can ship in parallel)

Each step is independently testable. Steps 1–4 are unblocking for an end-to-end demo; steps 5–8 are polish.

---

## Appendices

### Appendix A — Provenance

This design emerged from a brainstorming session on 2026-06-01 that began as a question about V4V incorporation and evolved into a strictly-larger streaming-payment protocol. Key design decisions made during that session:

- DIGM will not federate at the protocol level (per `2026-06-01-federation-scope-parked.md`); ParaPay is internal-only in V1.
- Wavlake-the-platform is excluded (AI-slop catalog); Podcasting-2.0 namespace is informational reference only.
- Boost is emission-redirect, not wallet-spend. Listener forgoes their accumulated share.
- Curator's percentage stake is the only thing fixed; absolute amounts are always derived from artist/listener grosses.
- Reading C (step-at-threshold, no completion cliff) selected over Reading B (retroactive rerate) to avoid gameable edge-of-track behavior.
- Strict +1 advance is the integrity gate; fast-forward UI is removed entirely during ParaPay-streaming.

### Appendix B — Naming

Initial proposal: `para-stream`. Final: `ParaPay-streaming` (the user-facing feature name) backed by the `parapay` crate. Combines PARA (currency) + Pay (action) + Streaming (modality). DIGM-native, not derived from any V4V vocabulary.

### Appendix C — Relationship to V4V / Podcasting 2.0

ParaPay-streaming is a strict superset in capability:

| V4V primitive | ParaPay equivalent | Genuine extension |
|---|---|---|
| Streaming sats (typically billed per minute in Podcasting 2.0; implementations may settle more frequently) | Per-second PARA emission | **Pays listener too** (not just creator) — the actual novel direction |
| Boost (wallet-spend, one-shot, text-message) | Boost (emission-redirect, 5 fractional presses, no wallet required) | More accessible — no wallet balance needed |
| `<podcast:value>` splits in RSS | `ValueSplits` in code | **Curator role with proportional stake** — curators participate as a value class V4V doesn't model |
| Lightning Network rail | DIGM internal ledger via `PayoutSettler` | Currency choice (PARA, not sats); not a capability extension per se |

The structural extensions over V4V are (1) the listener-as-payee role and (2) the curator-as-stakeholder role. Granularity (per-second vs per-minute) and currency (PARA vs sats) are choices, not extensions of capability.

The V4V community will not recognize ParaPay as a V4V implementation. That's intentional. ParaPay is DIGM's protocol, designed around DIGM's economics. The decision to ever publish it as an open standard is deferred to post-launch per the federation-scope-parked decision record.
