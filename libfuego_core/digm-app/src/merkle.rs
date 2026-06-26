use sha3::{Digest, Keccak256};
use serde::{Serialize, Deserialize};

/// Binary Merkle tree with keccak256 — port of PoolMerkleTree from SwapDaemon/PoolAttestation.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MerkleTree {
    leaves: Vec<[u8; 32]>,
}

impl MerkleTree {
    pub fn new() -> Self {
        MerkleTree { leaves: Vec::new() }
    }

    pub fn with_capacity(cap: usize) -> Self {
        MerkleTree { leaves: Vec::with_capacity(cap) }
    }

    pub fn add_leaf(&mut self, leaf: [u8; 32]) {
        self.leaves.push(leaf);
    }

    pub fn add_leaf_bytes(&mut self, data: &[u8]) {
        let mut hasher = Keccak256::new();
        hasher.update(data);
        let hash = hasher.finalize();
        let mut leaf = [0u8; 32];
        leaf.copy_from_slice(&hash);
        self.leaves.push(leaf);
    }

    pub fn leaves(&self) -> &[[u8; 32]] {
        &self.leaves
    }

    pub fn len(&self) -> usize {
        self.leaves.len()
    }

    pub fn is_empty(&self) -> bool {
        self.leaves.is_empty()
    }

    /// Compute the Merkle root from all leaves.
    pub fn root(&self) -> [u8; 32] {
        if self.leaves.is_empty() {
            return [0u8; 32];
        }
        if self.leaves.len() == 1 {
            return self.leaves[0];
        }

        let mut level: Vec<[u8; 32]> = self.leaves.clone();

        while level.len() > 1 {
            let mut next = Vec::with_capacity((level.len() + 1) / 2);
            for i in (0..level.len()).step_by(2) {
                let left = &level[i];
                let right = if i + 1 < level.len() { &level[i + 1] } else { left };
                next.push(hash_pair(left, right));
            }
            level = next;
        }

        level[0]
    }

    /// Get Merkle proof for a leaf at the given index.
    /// Returns vector of sibling hashes from leaf to root.
    pub fn get_proof(&self, leaf_index: usize) -> Vec<[u8; 32]> {
        let mut proof = Vec::new();

        if leaf_index >= self.leaves.len() {
            return proof;
        }

        let mut level: Vec<[u8; 32]> = self.leaves.clone();
        let mut index = leaf_index;

        while level.len() > 1 {
            let mut next = Vec::with_capacity((level.len() + 1) / 2);

            for i in (0..level.len()).step_by(2) {
                if i + 1 < level.len() {
                    next.push(hash_pair(&level[i], &level[i + 1]));
                    if i == index || i + 1 == index {
                        let sibling_idx = if i == index { i + 1 } else { i };
                        proof.push(level[sibling_idx]);
                    }
                } else {
                    next.push(hash_pair(&level[i], &level[i]));
                }
            }

            level = next;
            index /= 2;
        }

        proof
    }

    /// Verify a Merkle proof.
    pub fn verify_proof(leaf: &[u8; 32], proof: &[[u8; 32]], leaf_index: usize, root: &[u8; 32]) -> bool {
        let mut current = *leaf;
        let mut index = leaf_index;

        for sibling in proof {
            if index % 2 == 0 {
                current = hash_pair(&current, sibling);
            } else {
                current = hash_pair(sibling, &current);
            }
            index /= 2;
        }

        current == *root
    }

    pub fn clear(&mut self) {
        self.leaves.clear();
    }
}

fn hash_pair(left: &[u8; 32], right: &[u8; 32]) -> [u8; 32] {
    let mut hasher = Keccak256::new();
    hasher.update(left);
    hasher.update(right);
    let result = hasher.finalize();
    let mut hash = [0u8; 32];
    hash.copy_from_slice(&result);
    hash
}

/// Compute a checkpoint hash from app state, Merkle trees, and metadata.
/// Mirrors PoolAttestation::computeCheckpointHash:
///   keccak256(prev_checkpoint || app_merkle_root || epoch || block_height || timestamp)
pub fn compute_checkpoint(
    prev_checkpoint: &[u8; 32],
    app_tree: &MerkleTree,
    epoch: u64,
    block_height: u64,
    timestamp: u64,
) -> [u8; 32] {
    let mut hasher = Keccak256::new();
    hasher.update(prev_checkpoint);
    hasher.update(app_tree.root());
    hasher.update(epoch.to_le_bytes());
    hasher.update(block_height.to_le_bytes());
    hasher.update(timestamp.to_le_bytes());
    let result = hasher.finalize();
    let mut hash = [0u8; 32];
    hash.copy_from_slice(&result);
    hash
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_tree() {
        let tree = MerkleTree::new();
        assert_eq!(tree.root(), [0u8; 32]);
    }

    #[test]
    fn test_single_leaf() {
        let mut tree = MerkleTree::new();
        let leaf = [1u8; 32];
        tree.add_leaf(leaf);
        assert_eq!(tree.root(), leaf);
    }

    #[test]
    fn test_two_leaves() {
        let mut tree = MerkleTree::new();
        tree.add_leaf([1u8; 32]);
        tree.add_leaf([2u8; 32]);
        let root = tree.root();
        assert_ne!(root, [0u8; 32]);
    }

    #[test]
    fn test_proof_and_verify() {
        let mut tree = MerkleTree::new();
        for i in 0u8..4 {
            tree.add_leaf([i; 32]);
        }
        let root = tree.root();

        for i in 0..4 {
            let proof = tree.get_proof(i);
            assert!(!proof.is_empty());
            assert!(MerkleTree::verify_proof(&[i as u8; 32], &proof, i, &root));
        }
    }

    #[test]
    fn test_checkpoint() {
        let mut tree = MerkleTree::new();
        tree.add_leaf_bytes(b"state_data_1");
        tree.add_leaf_bytes(b"state_data_2");

        let prev = [0u8; 32];
        let cp = compute_checkpoint(&prev, &tree, 1, 100, 1234567890);
        assert_ne!(cp, [0u8; 32]);
    }
}
