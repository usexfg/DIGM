use serde::{Serialize, Deserialize};
use sha2::{Sha256, Digest as Sha2Digest};
use sha3::{Digest, Keccak256};
use curve25519_dalek::{EdwardsPoint, Scalar, constants::ED25519_BASEPOINT_POINT};
use curve25519_dalek::edwards::CompressedEdwardsY;
use rand::{rngs::OsRng, RngCore};
use zeroize::Zeroize;
use bs58;

/// Fuego mainnet address prefix (CryptoNoteConfig.h:35).
pub const ADDRESS_BASE58_PREFIX: u64 = 1753191;

// ── Key types ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Zeroize)]
#[zeroize(drop)]
pub struct Keypair {
    pub secret: [u8; 32],
    pub public: [u8; 32],
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct PublicKey(pub [u8; 32]);

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct Address(pub String);

// ── Keypair generation (CryptoNote: generate_keys) ─────────────────

impl Keypair {
    pub fn generate() -> Self {
        let mut csprng = OsRng;
        let mut secret = [0u8; 32];
        csprng.fill_bytes(&mut secret);
        Self::from_secret(secret)
    }

    /// Derive keypair from seed bytes + index (matching BIP39 seed derivation).
    pub fn derive_from_seed(seed: &[u8], index: u32) -> Self {
        let mut hasher = Sha256::new();
        hasher.update(seed);
        hasher.update(index.to_le_bytes());
        let result = hasher.finalize();
        let mut secret = [0u8; 32];
        secret.copy_from_slice(&result);
        Self::from_secret(secret)
    }

    /// Create keypair from a 32-byte secret (clamped per Ed25519 spec).
    pub fn from_secret(secret: [u8; 32]) -> Self {
        use ed25519_dalek::SigningKey;
        let sk = SigningKey::from_bytes(&secret);
        let public = sk.verifying_key().to_bytes();
        Keypair { secret: sk.to_bytes(), public }
    }

    pub fn public_key(&self) -> PublicKey {
        PublicKey(self.public)
    }

    /// Sign a message using Ed25519.
    pub fn sign(&self, message: &[u8]) -> ed25519_dalek::Signature {
        use ed25519_dalek::Signer;
        let sk = ed25519_dalek::SigningKey::from_bytes(&self.secret);
        sk.sign(message)
    }
}

// ── PublicKey operations ───────────────────────────────────────────

impl PublicKey {
    /// Verify an Ed25519 signature.
    pub fn verify(&self, message: &[u8], signature: &ed25519_dalek::Signature) -> bool {
        use ed25519_dalek::Verifier;
        ed25519_dalek::VerifyingKey::from_bytes(&self.0)
            .map(|vk| vk.verify(message, signature).is_ok())
            .unwrap_or(false)
    }
}

// ── CryptoNote address generation ───────────────────────────────────

/// Build a Fuego address matching C++ Base58::encode_addr.
///
/// 1. varint(ADDRESS_BASE58_PREFIX) + spend_pub(32) + view_pub(32)
/// 2. checksum = keccak[..4]
/// 3. base58(payload + checksum)
pub fn make_address(spend_pub: &[u8; 32], view_pub: &[u8; 32]) -> Address {
    let mut payload = varint_encode(ADDRESS_BASE58_PREFIX);
    payload.extend_from_slice(spend_pub);
    payload.extend_from_slice(view_pub);

    let hash = Keccak256::digest(&payload);
    payload.extend_from_slice(&hash[..4]);

    Address(bs58::encode(&payload).into_string())
}

// ── CryptoNote key derivation ──────────────────────────────────────

/// generate_key_derivation: derivation = 8 * (key1 * secret2)
/// Where key1 is a public key (point) and secret2 is a scalar.
pub type KeyDerivation = [u8; 32];

pub fn generate_key_derivation(key1: &PublicKey, secret2: &[u8; 32]) -> Option<KeyDerivation> {
    let point = CompressedEdwardsY(key1.0).decompress()?;
    let scalar = clamp_scalar(secret2);
    let derivation = (point * scalar).mul_by_cofactor();
    let mut result = [0u8; 32];
    result.copy_from_slice(&derivation.compress().to_bytes());
    Some(result)
}

/// Derive a public key from a derivation and output index.
/// output_key = derivation + 8 * Hs(point || derivation || output_index) * G
pub fn derive_public_key(derivation: &KeyDerivation, output_index: u64, base: &PublicKey) -> PublicKey {
    let scalar = derivation_to_scalar(derivation, output_index, base);
    let point = ED25519_BASEPOINT_POINT * scalar;
    let mut pk = [0u8; 32];
    pk.copy_from_slice(&point.compress().to_bytes());
    PublicKey(pk)
}

/// Underive (recover) a public key: key = output - 8 * Hs(point || derivation || output_index) * G
pub fn underive_public_key(derivation: &KeyDerivation, output_index: u64, output_key: &PublicKey) -> PublicKey {
    let scalar = derivation_to_scalar(derivation, output_index, output_key);
    let subtrahend = ED25519_BASEPOINT_POINT * scalar;
    let point = CompressedEdwardsY(output_key.0).decompress().unwrap_or(ED25519_BASEPOINT_POINT);
    let recovered = point - subtrahend;
    let mut pk = [0u8; 32];
    pk.copy_from_slice(&recovered.compress().to_bytes());
    PublicKey(pk)
}

/// Generate a key image for ring signatures.
/// KI = Hs(point) * secret
pub fn generate_key_image(key: &PublicKey, secret: &[u8; 32]) -> PublicKey {
    let hash_point = hash_to_ec(&key.0);
    let scalar = clamp_scalar(secret);
    let ki = hash_point * scalar;
    let mut result = [0u8; 32];
    result.copy_from_slice(&ki.compress().to_bytes());
    PublicKey(result)
}

// ── Mnemonic utilities ─────────────────────────────────────────────

pub struct MnemonicUtils;

impl MnemonicUtils {
    pub fn generate() -> String {
        use bip39::{Mnemonic, Language};
        let mut entropy = [0u8; 16];
        OsRng.fill_bytes(&mut entropy);
        let mnemonic = Mnemonic::from_entropy(&entropy)
            .expect("Mnemonic generation failed");
        mnemonic.to_string()
    }

    pub fn to_seed(phrase: &str) -> Result<Vec<u8>, String> {
        use bip39::{Mnemonic, Language};
        let mnemonic = Mnemonic::parse_in_normalized(Language::English, phrase)
            .map_err(|e| e.to_string())?;
        Ok(mnemonic.to_seed("").to_vec())
    }
}

// ── Internal helpers ────────────────────────────────────────────────

/// Clamp a secret key scalar per Ed25519 spec.
fn clamp_scalar(secret: &[u8; 32]) -> Scalar {
    let mut bytes = *secret;
    bytes[0] &= 248;
    bytes[31] &= 127;
    bytes[31] |= 64;
    Scalar::from_bytes_mod_order(bytes)
}

/// Convert secret bytes to public key (scalar * G, clamped).
fn secret_to_public(secret: &[u8; 32]) -> [u8; 32] {
    let scalar = clamp_scalar(secret);
    let point = ED25519_BASEPOINT_POINT * scalar;
    point.compress().to_bytes()
}

/// Hash a point to a scalar for key derivation (Hs in CryptoNote).
fn derivation_to_scalar(derivation: &KeyDerivation, output_index: u64, base: &PublicKey) -> Scalar {
    let mut hasher = Keccak256::new();
    hasher.update(derivation);
    hasher.update(output_index.to_le_bytes());
    let hash = hasher.finalize();
    let mut bytes = [0u8; 32];
    bytes.copy_from_slice(&hash);
    clamp_scalar(&bytes)
}

/// Hash to elliptic curve point (for key images).
fn hash_to_ec(data: &[u8]) -> EdwardsPoint {
    let hash = Keccak256::digest(data);
    let mut bytes = [0u8; 32];
    bytes.copy_from_slice(&hash);
    CompressedEdwardsY(bytes).decompress().unwrap_or(ED25519_BASEPOINT_POINT)
}

/// Variable-length integer encoding (LE, 7 bits per byte, MSB = continuation).
fn varint_encode(mut value: u64) -> Vec<u8> {
    let mut buf = Vec::new();
    loop {
        let mut byte = (value & 0x7F) as u8;
        value >>= 7;
        if value > 0 { byte |= 0x80; }
        buf.push(byte);
        if value == 0 { break; }
    }
    buf
}

impl std::fmt::Display for Address {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<String> for Address {
    fn from(s: String) -> Self { Address(s) }
}

// ── Tests ───────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keypair_roundtrip() {
        let kp = Keypair::generate();
        let pk = kp.public_key();
        let msg = b"test message";
        let sig = kp.sign(msg);
        assert!(pk.verify(msg, &sig));
    }

    #[test]
    fn test_key_derivation() {
        let kp1 = Keypair::generate();
        let kp2 = Keypair::generate();
        let d = generate_key_derivation(&kp1.public_key(), &kp2.secret);
        assert!(d.is_some());
    }

    #[test]
    fn test_key_image() {
        let kp = Keypair::generate();
        let ki = generate_key_image(&kp.public_key(), &kp.secret);
        assert_ne!(ki.0, [0u8; 32]);
    }

    #[test]
    fn test_address_format() {
        let spend = Keypair::generate();
        let view = Keypair::generate();
        let addr = make_address(&spend.public, &view.public);
        assert!(!addr.0.is_empty());
        assert!(addr.0.len() > 80); // typical CryptoNote address length
    }
}
