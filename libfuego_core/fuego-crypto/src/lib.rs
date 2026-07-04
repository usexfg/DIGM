use ed25519_dalek::{SigningKey, Signature, Signer};
use sha2::{Sha256, Digest};
use rand::{rngs::OsRng, RngCore};
use bip39::{Mnemonic, Language};
use bs58;
use zeroize::Zeroize;
use serde::{Serialize, Deserialize};

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
        hasher.update(index.to_le_bytes());
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

/// Fuego mainnet address prefix (CryptoNoteConfig.h:35).
pub const ADDRESS_BASE58_PREFIX: u64 = 1753191;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PublicKey(pub [u8; 32]);

impl PublicKey {
    /// Build a Fuego address matching the C++ Base58::encode_addr algorithm.
    ///
    /// 1. Serialize AccountPublicAddress: spend_pub(32) + view_pub(32)
    /// 2. Payload = varint(prefix 1753191) + raw_data
    /// 3. Checksum = keccak(payload)[..4]
    /// 4. Base58 encode
    ///
    /// Produces "fire..." prefixed addresses.
    pub fn to_address(&self, view_key: &PublicKey) -> Address {
        use sha3::{Digest, Keccak256};

        let mut raw_data = Vec::with_capacity(64);
        raw_data.extend_from_slice(&self.0);
        raw_data.extend_from_slice(&view_key.0);

        let mut payload = varint_encode(ADDRESS_BASE58_PREFIX);
        payload.extend_from_slice(&raw_data);

        let hash = Keccak256::digest(&payload);
        payload.extend_from_slice(&hash[..4]);

        Address(bs58::encode(&payload).into_string())
    }
}

/// Encode a u64 as a variable-length integer (LE, 7 bits per byte, MSB = continuation).
fn varint_encode(mut value: u64) -> Vec<u8> {
    let mut buf = Vec::new();
    loop {
        let mut byte = (value & 0x7F) as u8;
        value >>= 7;
        if value > 0 {
            byte |= 0x80;
        }
        buf.push(byte);
        if value == 0 {
            break;
        }
    }
    buf
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
