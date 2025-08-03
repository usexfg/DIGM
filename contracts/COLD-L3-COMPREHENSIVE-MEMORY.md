# COLD L3 Comprehensive Memory

---

## 1. Overview
COLD L3 is a privacy-first, yield-enabled rollup protocol that bridges Fuego (XFG) L1, Arbitrum, and other chains. It features:
- Merge-mined consensus with Fuego L1
- Privacy-preserving transactions (CryptoNote, subaddresses, confidential txs)
- Cross-chain yield and HEAT/CD minting via standardized commitments
- Hybrid validator economics (democratic + guardian)
- Modular architecture for extensibility and future yield schemes

---

## 2. Economic Model

### XFG Yield Deposit System
- **Supply Ratio:** 1 XFG = 0.00001 CD (COLD token, formerly O token)
- **Term:** Fixed 3 months for all deposits
- **Interest:** Pure yield only (no principal CD payout)
- **Payout:** Immediate CD distribution on COLD L3

#### Yield Calculation
```
Base CD = XFG_amount ÷ 100,000
CD Yield = Base CD × yield_percentage
```
- **Example:** 800 XFG @ 80% yield = 0.0064 CD

#### Key Points
- XFG principal is locked for 3 months
- Only yield is distributed as CD
- Fixed ratio, extensible for future yield schemes (e.g., XFGyields_GeekToken)

---

## 3. Transaction Extra Commitment Model

### HEAT Commitment
- **Tag:** 0x08 (TX_EXTRA_HEAT_COMMITMENT)
- **Fields:** commitment hash, platform code (0x01=Arbitrum, 0x02=Solana), amount, metadata
- **Purpose:** Specifies which canonical chain HEAT is to be minted on

### Yield Commitment
- **Tag:** 0x07 (TX_EXTRA_YIELD_COMMITMENT)
- **Fields:** commitment hash, platform code (0x01=COLDL3, 0x02=Solana), amount, term_months, yield_scheme (e.g., "XFGyields_COLD"), metadata
- **Purpose:** Specifies platform and yield scheme for extensibility

#### Commitment Hash
- Double-hashed secret: `Poseidon(Poseidon(secret))` for privacy

---

## 4. Privacy Architecture

- **Subaddresses:**
  - Deterministically derived from wallet seed and index
  - Used for privacy and accounting
  - Wallets scan all possible indices on restore to find funds

- **Confidential Transactions:**
  - Pedersen commitments, range proofs (planned)
  - Amounts and recipients are hidden on-chain

- **Mixer Integration:**
  - Tornado-style mixer for withdrawals and LP privacy
  - Inclusion proofs for withdrawal privacy

---

## 5. Validator and Consensus Design

- **Hybrid Validator Model:**
  - 21 validators: 15 democratic (community-elected), 6 guardian (stake-based)
  - Democratic: modest bond, monthly rotation, 60% fee share
  - Guardian: high stake, quarterly rotation, 35% fee share, emergency powers
  - Protocol treasury: 5% fee share

- **Consensus:**
  - Merge-mined with Fuego L1 (PoW)
  - Tendermint-style BFT for L3 block finality
  - Fuego header relay for cross-chain proofs

---

## 6. Cross-Chain Bridge and Minting

- **HEAT Minting:**
  - XFG burned on Fuego L1, proof submitted to COLD L3/Arbitrum
  - Commitment-reveal system with platform code to prevent double-minting
  - Canonical minting on Arbitrum, privacy features on COLD L3

- **Yield Redemption:**
  - Yield commitments specify platform and scheme
  - Immediate CD payout on COLD L3

---

## 7. Wallet and Serialization

- **Wallet Serialization V3:**
  - Uses AEGIS-256X encryption (placeholder, upgrade to real cipher recommended)
  - Subaddress serialization included
  - Backward compatible with V1/V2

- **Subaddress Restore:**
  - Wallets scan all indices on restore from seed
  - No subaddress index is stored on-chain; all are re-derived

---

## 8. Node Client Design (Recommended)

- **Core Modules:**
  - P2P networking (peer discovery, block/tx propagation)
  - Blockchain sync and validation
  - Transaction pool and validation
  - Consensus engine (PoW/BFT hybrid)
  - State management (accounts, commitments, privacy)
  - RPC/REST API for wallets/dApps
  - Optional: miner/sequencer, bridge logic

- **Reference Projects:**
  - Monero daemon, Tendermint, Erigon, Geth

---

## 9. Extensibility and Future Features

- **Yield Schemes:**
  - "XFGyields_COLD" (CD yield, implemented)
  - "XFGyields_GeekToken", "XFGyields_LP", etc. (future)
- **Platform Codes:**
  - 0x01 = COLDL3, 0x02 = Solana, etc.
- **Privacy Upgrades:**
  - Confidential transactions, advanced mixers, LP privacy

---

## 10. Security and Best Practices

- **All wallet files are encrypted (AEGIS-256X, placeholder)**
- **No sensitive info is revealed from locked wallet files**
- **Subaddress scanning is deterministic and privacy-preserving**
- **Cross-chain minting uses platform code to prevent double-minting**
- **Validator rotation and treasury for protocol health**

---

## 11. References and Further Reading

- [COLDL3-COMP-MEM.md](./COLDL3-COMP-MEM.md)
- [XFG-DEPOSIT-COMMITMENT-IMPLEMENTATION.md](./XFG-DEPOSIT-COMMITMENT-IMPLEMENTATION.md)
- [HEAT-MINTING-COMMITMENT-IMPLEMENTATION.md](./HEAT-MINTING-COMMITMENT-IMPLEMENTATION.md)
- [AEGIS-256X-IMPLEMENTATION.md](./AEGIS-256X-IMPLEMENTATION.md)
- [PURE-POW-ROLLUP-DESIGN.md](./PURE-POW-ROLLUP-DESIGN.md)
- [MERGE-MINING-VALIDATOR-DESIGN.md](./MERGE-MINING-VALIDATOR-DESIGN.md)

---

**This document is a synthesized, up-to-date comprehensive memory for COLD L3, based on all available files, architecture notes, and your project’s design.** 