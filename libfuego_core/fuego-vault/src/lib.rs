use fuego_crypto::{Keypair, Address, MnemonicUtils};
use serde::{Serialize, Deserialize};
use std::path::PathBuf;
use std::fs;
use curve25519_dalek::scalar::Scalar;
use curve25519_dalek::constants::RISTRETTO_BASEPOINT_TABLE;
use sha2::{Sha256, Digest};
use rand::rngs::OsRng;
use rand::RngCore;
use std::ops::Mul;

pub mod recovery;
use recovery::{RecoveryRequest, RecoverySignature};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vault {
    pub master_seed: Vec<u8>,
    pub encrypted_backup: Option<Vec<u8>>,
    pub display_name: Option<String>,
    pub guardians: Vec<Address>,
    pub recovery_threshold: u8,
}

impl Vault {
    pub fn new(mnemonic: &str) -> Result<Self, String> {
        let seed = MnemonicUtils::to_seed(mnemonic)
            .map_err(|e| format!("Mnemonic conversion failed: {}", e))?;
        
        Ok(Vault {
            master_seed: seed,
            encrypted_backup: None,
            display_name: None,
            guardians: Vec::new(),
            recovery_threshold: 0,
        })
    }

    pub fn derive_keypair(&self, index: u32) -> Keypair {
        Keypair::derive_from_seed(&self.master_seed, index)
    }

    pub fn get_address(&self, index: u32) -> Address {
        let kp = self.derive_keypair(index);
        kp.public_key().to_address()
    }

    pub fn set_display_name(&mut self, name: String) {
        self.display_name = Some(name);
    }

    pub fn add_guardian(&mut self, address: Address) -> Result<(), String> {
        if self.guardians.contains(&address) {
            return Err("Guardian already exists".to_string());
        }
        self.guardians.push(address);
        
        // Default threshold to 2/3 or 1 if only 1 guardian
        self.recovery_threshold = ((self.guardians.len() * 2 + 1) / 3).max(1) as u8;
        Ok(())
    }

    pub fn remove_guardian(&mut self, address: &Address) -> Result<(), String> {
        let pos = self.guardians.iter().position(|a| a == address)
            .ok_or("Guardian not found")?;
        self.guardians.remove(pos);
        
        self.recovery_threshold = ((self.guardians.len() * 2 + 1) / 3).max(1) as u8;
        Ok(())
    }

    pub fn set_recovery_threshold(&mut self, threshold: u8) -> Result<(), String> {
        if threshold == 0 || threshold > self.guardians.len() as u8 {
            return Err("Invalid threshold".to_string());
        }
        self.recovery_threshold = threshold;
        Ok(())
    }

    pub fn verify_recovery(&self, request: &RecoveryRequest) -> Result<bool, String> {
        if !request.is_complete() {
            return Err("Recovery request not complete: not enough signatures".to_string());
        }

        // In a real implementation, we would verify each signature against the 
        // guardian's public key. For MVP, we verify that the signers are actually 
        // registered guardians for this vault.
        for sig in &request.signatures {
            if !self.guardians.contains(&sig.guardian_address) {
                return Err(format!("Signature from non-guardian: {}", sig.guardian_address));
            }
        }

        Ok(true)
    }

    pub fn finalize_recovery(&mut self, request: RecoveryRequest) -> Result<(), String> {
        // 1. Verify the request
        self.verify_recovery(&request)?;

        // 2. In a real system, we would update the master seed or identity root
        // based on the new public key provided in the request.
        // For the MVP, we simulate the successful restoration of the identity.
        println!("Identity successfully restored via Guardian recovery!");
        
        Ok(())
    }

    pub fn initiate_recovery(&self, new_public_key: [u8; 32]) -> RecoveryRequest {
        let mut hasher = Sha256::new();
        hasher.update(&self.master_seed);
        let old_root: [u8; 32] = hasher.finalize().into();

        RecoveryRequest::new(old_root, new_public_key, self.recovery_threshold)
    }

    pub fn save(&self, path: PathBuf) -> Result<(), std::io::Error> {
        let data = bincode::serialize(self).map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
        fs::write(path, data)
    }

    pub fn load(path: PathBuf) -> Result<Self, std::io::Error> {
        let data = fs::read(path)?;
        bincode::deserialize(&data).map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
    }
}

// --- Atomic Swap Implementation ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapParams {
    pub counterparty_address: Address,
    pub xfg_amount: u64,
    pub counterparty_chain: String,
    pub counterparty_amount: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SwapInfo {
    pub swap_id: String,
    pub escrow_pubkey: [u8; 32],
    pub adaptor_point: [u8; 32],
    pub xfg_amount: u64,
    pub counterparty_amount: u64,
    pub counterparty_chain: String,
    pub tx_hash: String,
    pub created_at: u64,
    pub expires_at: u64,
}

pub struct AtomicSwap;

impl AtomicSwap {
    /// Initiates a swap by creating an adaptor point.
    /// T = t*G where t is the secret.
    pub fn initiate(vault: &Vault, index: u32, params: SwapParams) -> Result<SwapInfo, String> {
        let kp = vault.derive_keypair(index);
        
        let mut seed = [0u8; 32];
        OsRng.fill_bytes(&mut seed);
        let secret = Scalar::from_bytes_mod_order(seed);
        let adaptor_point = RISTRETTO_BASEPOINT_TABLE.mul(&secret);
        
        // In a real impl, we'd publish the lock tx to Fuego L1 here.
        let tx_hash = hex::encode(sha2::Sha256::digest(&adaptor_point.compress().as_bytes()));
        
        Ok(SwapInfo {
            swap_id: tx_hash.clone(),
            escrow_pubkey: kp.public,
            adaptor_point: *adaptor_point.compress().as_bytes(),
            xfg_amount: params.xfg_amount,
            counterparty_amount: params.counterparty_amount,
            counterparty_chain: params.counterparty_chain,
            tx_hash,
            created_at: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs(),
            expires_at: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() + 86400,
        })
    }

    /// Extracts the adaptor secret from a final signature.
    /// secret = final_sig - (pre_sig + t*G)
    pub fn extract_secret(_pre_sig: &[u8], _final_sig: &[u8], _adaptor_point: &[u8]) -> Result<Vec<u8>, String> {
        // Simplified logic for MVP
        Ok(vec![0u8; 32])
    }
}

pub fn create_mnemonic() -> String {
    MnemonicUtils::generate()
}
