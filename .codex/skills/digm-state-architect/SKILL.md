# Skill: digm-state-architect

## Purpose
This skill ensures the integrity and determinism of the DIGM "Sovereign Lite" state, including la-weighted reward calculations and Merkle anchoring to the Fuego L1.

## When to Use
Use this skill when:
- Modifying the reward curves or multipliers in `digm-app`.
- Changing the structure of `GlobalState` or `UserAccount`.
- Implementing new state transition rules for PARA, VOX, or CURA.
- Debugging Merkle root mismatches between the node and the anchor.

## Workflow

### 1. State Transition Mapping
Map every proposed change in `digm-app` to its impact on the final serialized state. Ensure that the transition is deterministic across all "Sovereign Lite" nodes.

### 2. Reward Simulation
Simulate a full epoch closure using the la-weighted curve. Verify that the VOX distribution matches the expected outcome based on stake age and amount.
`// Use mock accounts to verify: (amount * (1.0 + age_days * multiplier))`

### 3. Pruning Constraint Verification
Verify that the state change does not require archival data that would violate the "Sovereign Lite" pruning rules on mobile devices.

### 4. Merkle Root Validation
Calculate the resulting state root using `compute_state_root()` and verify it matches the expected hash for the given set of transitions.

## Guardrails
- **Precision Drift**: Avoid using floating point numbers for final balance updates; use fixed-point math or integer scaling to prevent state divergence.
- **Sunk-Cost Integrity**: Ensure that soulbound state (like wallet age) cannot be reset or manipulated during state transitions.
- **L1 Alignment**: Any change to the state root calculation must be coordinated with the L1 anchoring logic to avoid rejecting valid blocks.
