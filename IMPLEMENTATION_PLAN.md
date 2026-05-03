# DIGM Implementation Plan

## 1. Project Vision
DIGM is a decentralized music marketplace built as a use-case layer on top of the Fuego network. It empowers artists to maintain 100% ownership and earnings while rewarding listeners and curators through a gamified discovery economy.

## 2. Architectural Foundation
The project follows the guidelines detailed in `DIGM_FUEGO_ARCHITECTURE_GUIDE.md`.

### Core Decisions
- **L1 Base**: Built on Fuego L1 (XFG + CD + Atomic Swaps). No L2/L3 rollups.
- **Full Node Mobile**: Every client runs a full Fuego node and an I2P router. No centralized gateways or SPV trust assumptions.
- **P2P Distribution**: I2P/$\mu$TP for invisible, garlic-routed audio chunk distribution.
- **Hybrid Anchoring**: App-layer state (PARA, VOX, CURA) is tracked off-chain and periodically anchored to Fuego L1 via Merkle roots.
- **Sunk-Cost Identity**: Wallet = User. Sybil resistance is achieved via soulbound state accrual (wallet-age, streaks, reputation) and a minimal XFG/HEAT gate.

---

## 3. Repository State & Cleanup
The repository has been pruned to remove legacy experiments and non-core components:
- **Removed**: `device-proof-recorder-android/`, `device-proof-recorder-ios/`, `P2P-Radio/` (prototype), and `contracts/COLD-L3-COMPREHENSIVE-MEMORY.md`.
- **Retained**: `fuego-core/` (source of truth for blockchain logic), `sdks/`, and `frontend/` (for reference/future shells).

---

## 4. Development Strategy: The Unified Core

To support Desktop, iOS, and Android with a single source of truth, the project will implement a **Unified Rust Core** (`libfuego_core`).

### The Rust Workspace Structure
The core will be divided into modular crates:
- **`fuego-crypto`**: Low-level primitives (Ed25519, Curve25519, BIP39). Repurposed from `fuego-wallet` native crypto.
- **`fuego-node`**: Full validator, mempool, and chain sync logic (ported from `fuego-core`).
- **`fuego-vault`**: Key management, CD deposits, and atomic swap state machine.
- **`i2p-net`**: I2P router and $\mu$TP transport for private audio streaming.
- **`chunk-store`**: SQLite-backed content-addressed store for encrypted audio chunks.
- **`digm-app`**: High-level business logic for PARA rewards, staking pools, and Merkle anchoring.
- **`ffi-bridge`**: UniFFI/cbindgen bindings for native shell integration.

### The Platform Shells (UI)
Instead of a web MVP, the project will use the Rust core to power three native shells:
1.  **Desktop (Tauri)**: The primary MVP target. Combines a Rust backend with a Web frontend for rapid iteration while maintaining full-node capabilities.
2.  **iOS (Swift)**: Native app calling the Rust core via FFI.
3.  **Android (Kotlin/Compose)**: Native app calling the Rust core via FFI.

---

## 5. Implementation Roadmap

### Phase A: The Rust Foundation
1.  **Initialize `libfuego_core` workspace**.
2.  **Port Fuego Vault**: Establish key management and ring signature logic.
3.  **Implement I2P/$\mu$TP Bridge**: Enable basic P2P connectivity.
4.  **Build Chunk Store**: Implement the SQLite-backed content-addressed system.
5.  **Develop Merkle Anchoring**: Create the mechanism to publish state roots to Fuego L1.

### Phase B: Platform Integration
1.  **Desktop MVP (Tauri)**: Connect the Rust core to a Tauri shell to validate the end-to-end flow (Wallet $\rightarrow$ Node $\rightarrow$ I2P $\rightarrow$ Audio).
2.  **Mobile FFI**: Implement the `ffi-bridge` for Swift and Kotlin.
3.  **Mobile Shells**: Build out the native iOS and Android UIs.
4.  **Optimization**: Implement pruning modes and background refresh strategies for mobile nodes.

---

## 6. Key Variables for Resolution
The following design gaps are to be resolved during the implementation of the `digm-app` crate:
- **Merkle Root Auth**: Defining the publisher transaction type and authentication method.
- **Streaming Proofs**: Calibrating the PCM amplitude thresholds and not-a-bot scoring.
- **Economic Tuning**: Finalizing the VOX transmutation curves and CURA burn ratios.
- **Sunk-Cost Parameters**: Defining the wallet-age ramp length and streak multipliers.
