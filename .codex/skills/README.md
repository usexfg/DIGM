# DIGM Project Skills

These specialized skills are designed to optimize the development of the DIGM decentralized music platform.

## Available Skills

### `digm-core-verifier`
**Purpose**: Automates the Rust $\rightarrow$ FFI $\rightarrow$ Flutter build and test loop.
**Use when**: You change any code in `libfuego_core` or `ffi-bridge`.
**Key Workflow**: `cargo build` $\rightarrow$ FFI check $\rightarrow$ unit tests.

### `digm-audio-pipeline`
**Purpose**: Debugs the path from I2P chunks to PCM audio.
**Use when**: Fixing buffering, audio glitches, or pre-fetching logic.
**Key Workflow**: I2P Trace $\rightarrow$ Chunk Offset Check $\rightarrow$ Decoder State $\rightarrow$ PCM Validation.

### `digm-state-architect`
**Purpose**: Ensures deterministic "Sovereign Lite" state and rewards.
**Use when**: Modifying la-weighted rewards or Merkle state anchoring.
**Key Workflow**: State Mapping $\rightarrow$ Reward Simulation $\rightarrow$ Pruning Check $\rightarrow$ Root Validation.

## Installation
These skills are located in `.codex/skills/` and are automatically available when working in this repository.
