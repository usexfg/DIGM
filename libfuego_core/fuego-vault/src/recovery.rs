use serde::{Serialize, Deserialize};
use fuego_crypto::Address;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryRequest {
    pub old_identity_root: [u8; 32],
    pub new_public_key: [u8; 32],
    pub signatures: Vec<RecoverySignature>,
    pub threshold: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoverySignature {
    pub guardian_address: Address,
    pub signature: Vec<u8>,
}

impl RecoveryRequest {
    pub fn new(old_root: [u8; 32], new_pk: [u8; 32], threshold: u8) -> Self {
        Self {
            old_identity_root: old_root,
            new_public_key: new_pk,
            signatures: Vec::new(),
            threshold,
        }
    }

    pub fn add_signature(&mut self, guardian: Address, sig: Vec<u8>) -> Result<(), String> {
        if self.signatures.iter().any(|s| s.guardian_address == guardian) {
            return Err("Guardian already signed".to_string());
        }
        self.signatures.push(RecoverySignature {
            guardian_address: guardian,
            signature: sig,
        });
        Ok(())
    }

    pub fn is_complete(&self) -> bool {
        self.signatures.len() >= self.threshold as usize
    }
}
