use ed25519_dalek::{SigningKey, VerifyingKey, Signature, Signer};
use curve25519_dalek::scalar::Scalar;
use sha2::{Sha256, Digest};
use rand::{rngs::OsRng, RngCore};
use bip39::{Mnemonic, Language};
use bs58::encode;
use zeroize::Zeroize;
use serde::{Serialize, Deserialize};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize, Zeroize)]
#[zeroize(drop)]
pub struct Keypair {
    pub secret: [u8; 32],
    pub public: [u8; 32],
}

impl Keypair {
    pub fn generate() -> Self {
        let mut csprng = OsRng;
        let signing_key = SigningKey::generate(&mut csprng);
        let public = signing_key.verifying_key().to_bytes();
        
        Keypair {
            secret: signing_key.to_bytes(),
            public,
        }
    }

    pub fn derive_from_seed(seed: &[u8], index: u32) -> Self {
        let mut hasher = Sha256::new();
        hasher.update(seed);
        hasher.update(&index.to_le_bytes());
        let result = hasher.finalize();
        
        let mut secret = [0u8; 32];
        secret.copy_from_slice(&result);
        
        let signing_key = SigningKey::from_bytes(&secret);
        let public = signing_key.verifying_key().to_bytes();
        
        Keypair {
            secret,
            public,
        }
    }

    pub fn public_key(&self) -> PublicKey {
        PublicKey(self.public)
    }

    pub fn sign(&self, message: &[u8]) -> Signature {
        let signing_key = SigningKey::from_bytes(&self.secret);
        signing_key.sign(message)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PublicKey(pub [u8; 32]);

impl PublicKey {
    pub fn to_address(&self) -> Address {
        let mut hasher = Sha256::new();
        hasher.update(&self.0);
        let hash = hasher.finalize();
        
        Address(encode(hash.as_slice()).into_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct Address(pub String);

impl std::fmt::Display for Address {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<String> for Address {
    fn from(s: String) -> Self {
        Address(s)
    }
}

pub struct MnemonicUtils;

impl MnemonicUtils {
    pub fn generate() -> String {
        let mut entropy = [0u8; 16]; 
        OsRng.fill_bytes(&mut entropy);
        let mnemonic = Mnemonic::from_entropy(&entropy)
            .expect("Mnemonic generation failed");
        mnemonic.to_string()
    }

    pub fn to_seed(phrase: &str) -> Result<Vec<u8>, String> {
        let mnemonic = Mnemonic::parse_in_normalized(Language::English, phrase)
            .map_err(|e| e.to_string())?;
        Ok(mnemonic.to_seed("").to_vec())
    }
}
