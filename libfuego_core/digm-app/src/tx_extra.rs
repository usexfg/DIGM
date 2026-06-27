use serde::{Serialize, Deserialize};

pub const TX_EXTRA_DIGM_ALBUM_RECORD: u8 = 0x0A;
pub const TX_EXTRA_ALBUM_LICENSE: u8 = 0x0B;
pub const TX_EXTRA_CURATION_TAG: u8 = 0x0C;
pub const TX_EXTRA_PARA_CLAIM: u8 = 0xAA;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PubKey(pub [u8; 32]);

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Signature(#[serde(with = "serde_bytes")] pub Vec<u8>);

impl Signature {
    pub fn from_bytes(bytes: [u8; 64]) -> Self {
        Signature(bytes.to_vec())
    }

    pub fn to_bytes(&self) -> [u8; 64] {
        let mut arr = [0u8; 64];
        let len = self.0.len().min(64);
        arr[..len].copy_from_slice(&self.0[..len]);
        arr
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Hash(pub [u8; 32]);

/// 0x0A — DIGM Album Record (required for posting releases).
/// Artist must hold DIGM coin to create this tag.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DigmAlbumRecord {
    pub album_id: String,
    pub content_hash: Hash,
    pub artist_key: PubKey,
    pub artist_sig: Signature,
    pub timestamp: u64,
    pub version: u32,
}

/// 0x0B — Album License (listener ownership / listening rights).
/// Pulled from the chain after purchase or staking.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlbumLicense {
    pub album_id: String,
    pub buyer_key: PubKey,
    pub purchase_amount: u64,
    pub timestamp: u64,
    pub artist_key: PubKey,
    pub artist_sig: Signature,
    pub version: u32,
}

/// 0x0C — CURA Curation Colored-Coin.
/// Curator signs curation data; ratio amounts TBD.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CuraColoredCoin {
    pub curation_data: String,
    pub curator_key: PubKey,
    pub curator_sig: Signature,
    pub timestamp: u64,
    pub version: u32,
}

/// 0xAA — PARA Claim (on-chain cash-out of off-chain paper PARA).
/// Submits a Merkle proof that the claimant had X PARA at a checkpoint
/// previously anchored to L1. If valid, PARA colored coin is minted on-chain.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParaClaim {
    pub claimant: PubKey,           // wallet pubkey claiming PARA
    pub amount: u128,               // PARA atomic units (18 decimal) to claim
    pub checkpoint_root: Hash,      // Merkle root anchored on-chain
    pub merkle_proof: Vec<Vec<u8>>, // siblings from leaf to root
    pub timestamp: u64,
    pub version: u32,
}

/// Parsed tx_extra field variants relevant to DIGM.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DigmTxExtra {
    AlbumRecord(DigmAlbumRecord),
    AlbumLicense(AlbumLicense),
    CuraColoredCoin(CuraColoredCoin),
    ParaClaim(ParaClaim),
}

/// Serialize a DigmAlbumRecord into tx_extra bytes (0x0A tag).
pub fn serialize_album_record(rec: &DigmAlbumRecord) -> Result<Vec<u8>, String> {
    let mut data = Vec::new();
    data.push(TX_EXTRA_DIGM_ALBUM_RECORD);
    bincode::serialize(&rec).map_err(|e| e.to_string()).map(|mut blob| {
        data.push(blob.len() as u8);
        data.append(&mut blob);
        data
    })
}

/// Serialize an AlbumLicense into tx_extra bytes (0x0B tag).
pub fn serialize_album_license(lic: &AlbumLicense) -> Result<Vec<u8>, String> {
    let mut data = Vec::new();
    data.push(TX_EXTRA_ALBUM_LICENSE);
    bincode::serialize(&lic).map_err(|e| e.to_string()).map(|mut blob| {
        data.push(blob.len() as u8);
        data.append(&mut blob);
        data
    })
}

/// Serialize a CuraColoredCoin into tx_extra bytes (0x0C tag).
pub fn serialize_cura_colored_coin(tag: &CuraColoredCoin) -> Result<Vec<u8>, String> {
    let mut data = Vec::new();
    data.push(TX_EXTRA_CURATION_TAG);
    bincode::serialize(&tag).map_err(|e| e.to_string()).map(|mut blob| {
        data.push(blob.len() as u8);
        data.append(&mut blob);
        data
    })
}

/// Serialize a ParaClaim into tx_extra bytes (0xAA tag).
pub fn serialize_para_claim(claim: &ParaClaim) -> Result<Vec<u8>, String> {
    let mut data = Vec::new();
    data.push(TX_EXTRA_PARA_CLAIM);
    bincode::serialize(&claim).map_err(|e| e.to_string()).map(|mut blob| {
        data.push(blob.len() as u8);
        data.append(&mut blob);
        data
    })
}

/// Parse raw tx_extra bytes and extract DIGM-specific fields.
pub fn parse_digm_extra(extra: &[u8]) -> Vec<DigmTxExtra> {
    let mut results = Vec::new();
    let mut i = 0;
    while i < extra.len() {
        let tag = extra[i];
        i += 1;
        if i >= extra.len() {
            break;
        }
        let len = extra[i] as usize;
        i += 1;
        if i + len > extra.len() {
            break;
        }
        let blob = &extra[i..i + len];
        i += len;
        match tag {
            TX_EXTRA_DIGM_ALBUM_RECORD => {
                if let Ok(rec) = bincode::deserialize::<DigmAlbumRecord>(blob) {
                    results.push(DigmTxExtra::AlbumRecord(rec));
                }
            }
            TX_EXTRA_ALBUM_LICENSE => {
                if let Ok(lic) = bincode::deserialize::<AlbumLicense>(blob) {
                    results.push(DigmTxExtra::AlbumLicense(lic));
                }
            }
            TX_EXTRA_CURATION_TAG => {
                if let Ok(tag) = bincode::deserialize::<CuraColoredCoin>(blob) {
                    results.push(DigmTxExtra::CuraColoredCoin(tag));
                }
            }
            TX_EXTRA_PARA_CLAIM => {
                if let Ok(claim) = bincode::deserialize::<ParaClaim>(blob) {
                    results.push(DigmTxExtra::ParaClaim(claim));
                }
            }
            _ => {}
        }
    }
    results
}

/// Verify that an album record's signature matches the artist key.
pub fn verify_album_record(rec: &DigmAlbumRecord) -> bool {
    use ed25519_dalek::{Verifier, VerifyingKey};
    let msg = format!("{}{}", rec.album_id, hex::encode(rec.content_hash.0));
    let vk = VerifyingKey::from_bytes(&rec.artist_key.0);
    match vk {
        Ok(vk) => {
            let sig_bytes = rec.artist_sig.to_bytes();
            let sig = ed25519_dalek::Signature::from_bytes(&sig_bytes);
            vk.verify(msg.as_bytes(), &sig).is_ok()
        }
        Err(_) => false,
    }
}

/// Verify that a license signature matches the artist key.
pub fn verify_license(lic: &AlbumLicense) -> bool {
    use ed25519_dalek::{Verifier, VerifyingKey};
    let msg = format!("{}:{}:{}", lic.album_id, hex::encode(lic.buyer_key.0), lic.purchase_amount);
    let vk = VerifyingKey::from_bytes(&lic.artist_key.0);
    match vk {
        Ok(vk) => {
            let sig_bytes = lic.artist_sig.to_bytes();
            let sig = ed25519_dalek::Signature::from_bytes(&sig_bytes);
            vk.verify(msg.as_bytes(), &sig).is_ok()
        }
        Err(_) => false,
    }
}

/// Verify a PARA claim's Merkle proof against a known checkpoint root.
/// The leaf is: keccak256(claimant_pubkey || amount_le_u128)
pub fn verify_para_claim(claim: &ParaClaim, checkpoint_root: &[u8; 32]) -> bool {
    use sha3::{Digest, Keccak256};
    let mut hasher = Keccak256::new();
    hasher.update(&claim.claimant.0);
    hasher.update(claim.amount.to_le_bytes());
    let leaf = hasher.finalize();
    let mut leaf_arr = [0u8; 32];
    leaf_arr.copy_from_slice(&leaf);

    let proof_bytes: Vec<[u8; 32]> = claim.merkle_proof.iter().map(|v| {
        let mut a = [0u8; 32];
        let len = v.len().min(32);
        a[..len].copy_from_slice(&v[..len]);
        a
    }).collect();

    crate::merkle::MerkleTree::verify_proof(&leaf_arr, &proof_bytes, 0, &claim.checkpoint_root.0)
}
