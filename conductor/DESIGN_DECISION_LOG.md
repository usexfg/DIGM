# DIGM Platform Design Decision Log

## Project: DIGM (Sovereign Lite)
**Current Version:** 1.0 (Initial Plan)
**Date:** 2026-05-07

## 1. Understanding Lock
**Goal:** Implement a decentralized music platform using a Rust core and Flutter shell.
**Key Constraints:**
- Mobile-first (iOS/Android).
- Trustless verification via "Sovereign Lite" pruned nodes.
- Private P2P distribution via I2P/$\mu$TP.
- Sunk-cost identity model (wallet-bound).
- High-performance audio streaming via Rust $\rightarrow$ FFI $\rightarrow$ Flutter.

**Confirmed.**

---

## 2. Initial Design Decisions

### D1: Tech Stack
- **Decision:** Rust Core $\rightarrow$ UniFFI $\rightarrow$ Flutter.
- **Rationale:** Rust for performance/safety/P2P; Flutter for rapid multi-platform UI; UniFFI for type-safe bindings.
- **Alternatives:** Tauri (rejected: poorer mobile support), React Native (rejected: Dart/Flutter ecosystem better for this UI).

### D2: Node Model
- **Decision:** Sovereign Lite (Pruned Node).
- **Rationale:** Full nodes are too heavy for mobile; SPV is too trusting. Pruning UTXOs + headers provides the best balance.
- **Alternatives:** Full Node (too heavy), SPV (too trust-dependent).

### D3: Network Layer
- **Decision:** I2P/$\mu$TP.
- **Rationale:** Native P2P support, garlic routing for privacy, no exit nodes.
- **Alternatives:** Tor (not P2P optimized), Libp2p (complex integration with I2P requirements).

### D4: Identity Model
- **Decision:** Wallet = User (Soulbound).
- **Rationale:** Prevents sybils via sunk-cost (wallet-age, streaks, trophies).
- **Alternatives:** Separate alias accounts (too easy to farm).

### D5: Asset Flow
- **Decision:** PARA $\rightarrow$ VOX $\rightarrow$ CURA / DIGM.
- **Rationale:** Rewards discovery (PARA), status/cosmetics (VOX), and governance/hosting (CURA/DIGM).
- **Alternatives:** Direct XFG for everything (loses the "game" of discovery).

---

## 3. Review History

### Review 1: Skeptic / Challenger
**Status:** Pending Resolution
**Key Objections:**
- **Resource Exhaustion:** Mobile node + I2P = battery/thermal death.
- **OS Suspension:** I2P/Node will be killed by iOS/Android background limits.
- **Listen-Proof Emulation:** Client-side signals are easily faked by bots.
- **Sybil Gate cost:** $\geq 0.0008$ XFG is too cheap to stop bot farms.
- **I2P Latency:** Audio jitter and "Ghost Artist" availability issues.
- **Identity Loss:** No recovery mechanism for soulbound state.
- **Anchoring Ambiguity:** Unclear how the Merkle root is agreed upon P2P before publishing.
- **Economic Cliff:** "Ride the Wave" creates panic-selling volatility.

**Designer's Responses & Mitigations:**
- **Resource/Backgrounding:** Introduce "Sovereign" vs "Client" modes. Use native Foreground Services (Android) and prioritized Background Tasks (iOS).
- **Listen-Proofs:** Add "Hardware Attestation" (TEE) opt-in for higher rewards. Implement a-periodic "Listen Challenges" to increase botting cost.
- **I2P Performance:** Implement aggressive predictive buffering and "Pinned Seeders" for niche content.
- **Identity Recovery:** Research "Guardian-based" social recovery for soulbound state.
- **Anchoring:** The root is deterministic. Any node can compute the same root from the tx log. The Fuego L1 tx is just the "official" timestamp.

### Review 2: Constraint Guardian
**Status:** Pending Resolution
**Key Objections:**
- **Mobile Resource Exhaustion:** I2P + Node = Battery/CPU death.
- **Background Execution:** OS kills daemon, breaking P2P availability.
- **Data Consumption:** Background seeding on mobile data.
- **Streaming Latency:** I2P garlic routing variance causes buffering.
- **P2P Stability:** Mobile churn threatens content availability.
- **Sybil Defense:** UX-based deterrent is not a technical constraint.

**Designer's Responses & Mitigations:**
- **Operational Modes:** Introduce **"Sovereign Mode"** (Full Node/Router/Seeding - WiFi/Power only) and **"Client Mode"** (SPV-like/Tunnels-only/No Seeding - Mobile Data/Battery).
- **Data Caps:** Implement a "Seed on Mobile Data" user toggle (default OFF).
- **Backgrounding:** Use Android Foreground Services (with notification) and iOS Audio/VOIP background modes to maintain I2P tunnel persistence.
- **Latency:** Implement a larger look-ahead buffer (adaptive window) and separate "Fast-Path" for metadata.
- **Sybil Defense:** Layer the XFG gate with hardware attestation (TEE) and periodic "Listen Challenges" (Proof-of-Work) to raise the technical cost of farming.
