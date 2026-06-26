use crate::tx_extra::{self, DigmAlbumRecord, CuraColoredCoin, DigmTxExtra, ParaClaim};
#[cfg(test)]
use crate::tx_extra::AlbumLicense;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};
use serde::{Serialize, Deserialize};
use sha2::Digest;

/// A scanned result from a single block/transaction.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanEvent {
    pub tx_hash: [u8; 32],
    pub block_height: u64,
    pub timestamp: u64,
    pub extra: DigmTxExtra,
}

/// Tracks 0x0B license ownership per address. Port of DIGMWalletScanner pattern.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LicenseIndex {
    /// address -> set of album_ids they hold a license for
    pub licenses: HashMap<String, HashSet<String>>,
}

impl LicenseIndex {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn has_license(&self, address: &str, album_id: &str) -> bool {
        self.licenses
            .get(address)
            .map(|ids| ids.contains(album_id))
            .unwrap_or(false)
    }

    pub fn get_licenses(&self, address: &str) -> Vec<String> {
        self.licenses
            .get(address)
            .map(|ids| ids.iter().cloned().collect())
            .unwrap_or_default()
    }

    fn add_license(&mut self, address: String, album_id: String) {
        self.licenses
            .entry(address)
            .or_insert_with(HashSet::new)
            .insert(album_id);
    }
}

/// Tracks 0x0A album records — artist -> album_id -> record.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AlbumRegistry {
    pub records: HashMap<String, DigmAlbumRecord>,
}

impl AlbumRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get(&self, album_id: &str) -> Option<&DigmAlbumRecord> {
        self.records.get(album_id)
    }

    pub fn has(&self, album_id: &str) -> bool {
        self.records.contains_key(album_id)
    }

    pub fn by_artist(&self, artist_key_hex: &str) -> Vec<&DigmAlbumRecord> {
        self.records
            .values()
            .filter(|r| hex::encode(r.artist_key.0) == artist_key_hex)
            .collect()
    }
}

/// Tracks 0x0C CURA curation events.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CuraLog {
    pub entries: Vec<CuraColoredCoin>,
}

impl CuraLog {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn by_curator(&self, curator_key_hex: &str) -> Vec<&CuraColoredCoin> {
        self.entries
            .iter()
            .filter(|c| hex::encode(c.curator_key.0) == curator_key_hex)
            .collect()
    }
}

/// Main DIGM chain scanner that processes blocks/transactions and extracts
/// 0x0A (album records), 0x0B (listener licenses), and 0x0C (CURA curation).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DigmChainScanner {
    pub license_index: LicenseIndex,
    pub album_registry: AlbumRegistry,
    pub cura_log: CuraLog,
    pub processed_txs: HashSet<[u8; 32]>,
    pub last_scanned_height: u64,
}

impl DigmChainScanner {
    pub fn new() -> Self {
        Self::default()
    }

    /// Process a single transaction's tx_extra bytes.
    /// Returns the ScanEvent if a DIGM tag was found.
    pub fn scan_transaction(
        &mut self,
        tx_hash: [u8; 32],
        block_height: u64,
        timestamp: u64,
        extra_bytes: &[u8],
    ) -> Vec<ScanEvent> {
        if self.processed_txs.contains(&tx_hash) {
            return vec![];
        }

        let digm_extras = tx_extra::parse_digm_extra(extra_bytes);
        let mut events = Vec::new();

        for extra in &digm_extras {
            match extra {
                DigmTxExtra::AlbumLicense(lic) => {
                    // Track license ownership
                    let buyer_addr = lic.buyer_key.0.to_vec();
                    let addr_hex = hex::encode(&buyer_addr);
                    self.license_index.add_license(addr_hex, lic.album_id.clone());
                }
                DigmTxExtra::AlbumRecord(rec) => {
                    if tx_extra::verify_album_record(rec) {
                        self.album_registry
                            .records
                            .insert(rec.album_id.clone(), rec.clone());
                    }
                }
                DigmTxExtra::CuraColoredCoin(cura) => {
                    self.cura_log.entries.push(cura.clone());
                }
                DigmTxExtra::ParaClaim(_claim) => {
                    // PARA claim logged — validation against anchored checkpoint done by node
                }
            }

            events.push(ScanEvent {
                tx_hash,
                block_height,
                timestamp,
                extra: extra.clone(),
            });
        }

        self.processed_txs.insert(tx_hash);
        self.last_scanned_height = self.last_scanned_height.max(block_height);

        events
    }

    /// Check if an address holds a license for a given album.
    /// Uses hex-encoded public key bytes as the address lookup key.
    pub fn has_license_for(&self, address_key_hex: &str, album_id: &str) -> bool {
        self.license_index.has_license(address_key_hex, album_id)
    }

    /// Get all album IDs licensed to an address.
    pub fn licensed_albums(&self, address_key_hex: &str) -> Vec<String> {
        self.license_index.get_licenses(address_key_hex)
    }

    /// Check if an album exists in the registry (has a valid 0x0A record).
    pub fn album_exists(&self, album_id: &str) -> bool {
        self.album_registry.has(album_id)
    }

    pub fn clear(&mut self) {
        self.license_index = LicenseIndex::new();
        self.album_registry = AlbumRegistry::new();
        self.cura_log = CuraLog::new();
        self.processed_txs.clear();
    }
}

/// Bridges fuego-node's BlockObserver trait to the DIGM chain scanner.
/// This is how the node feeds block data into the scanner during sync.
pub struct ScannerBlockObserver {
    pub scanner: Arc<RwLock<DigmChainScanner>>,
}

impl fuego_node::BlockObserver for ScannerBlockObserver {
    fn on_block(&self, height: u64, timestamp: u64, tx_extras: Vec<String>) {
        let mut scanner = self.scanner.write().unwrap();
        for (i, extra_hex) in tx_extras.iter().enumerate() {
            if extra_hex.is_empty() {
                continue;
            }
            if let Ok(extra_bytes) = hex::decode(extra_hex) {
                let mut tx_hash = [0u8; 32];
                // Derive a unique hash from height + index
                let seed = format!("{}:{}", height, i);
                let digest = sha2::Sha256::digest(seed.as_bytes());
                tx_hash.copy_from_slice(&digest);
                scanner.scan_transaction(tx_hash, height, timestamp, &extra_bytes);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tx_extra::*;
    use ed25519_dalek::SigningKey;
    use ed25519_dalek::Signer;

    fn make_album_record(album_id: &str) -> DigmAlbumRecord {
        let signing_key = SigningKey::generate(&mut rand_core::OsRng);
        let verifying_key = signing_key.verifying_key();
        let pub_bytes = verifying_key.to_bytes();
        let hash = [1u8; 32];
        let msg = format!("{}{}", album_id, hex::encode(hash));
        let sig = signing_key.sign(msg.as_bytes());
        DigmAlbumRecord {
            album_id: album_id.to_string(),
            content_hash: Hash(hash),
            artist_key: PubKey(pub_bytes),
            artist_sig: Signature(sig.to_bytes().to_vec()),
            timestamp: 1000,
            version: 1,
        }
    }

    fn make_license(album_id: &str, buyer_bytes: u8) -> AlbumLicense {
        let signing_key = SigningKey::generate(&mut rand_core::OsRng);
        let verifying_key = signing_key.verifying_key();
        let pub_bytes = verifying_key.to_bytes();
        let buyer_key = PubKey([buyer_bytes; 32]);
        let msg = format!("{}:{}:{}", album_id, hex::encode(buyer_key.0), 1000u64);
        let sig = signing_key.sign(msg.as_bytes());
        AlbumLicense {
            album_id: album_id.to_string(),
            buyer_key,
            purchase_amount: 1000,
            timestamp: 2000,
            artist_key: PubKey(pub_bytes),
            artist_sig: Signature(sig.to_bytes().to_vec()),
            version: 1,
        }
    }

    #[test]
    fn test_license_tracking() {
        let mut scanner = DigmChainScanner::new();
        let license = make_license("album-1", 5);
        let extra = tx_extra::serialize_album_license(&license).unwrap();

        let events = scanner.scan_transaction([0u8; 32], 100, 2000, &extra);
        assert_eq!(events.len(), 1);

        let buyer_hex = hex::encode(&[5u8; 32]);
        assert!(scanner.has_license_for(&buyer_hex, "album-1"));
        assert!(!scanner.has_license_for(&buyer_hex, "album-2"));
    }

    #[test]
    fn test_album_registry() {
        let mut scanner = DigmChainScanner::new();
        let rec = make_album_record("album-x");
        let extra = tx_extra::serialize_album_record(&rec).unwrap();

        scanner.scan_transaction([1u8; 32], 100, 1000, &extra);
        assert!(scanner.album_exists("album-x"));
        assert!(!scanner.album_exists("nope"));
    }

    #[test]
    fn test_deduplication() {
        let mut scanner = DigmChainScanner::new();
        let rec = make_album_record("dup");
        let extra = tx_extra::serialize_album_record(&rec).unwrap();

        let events1 = scanner.scan_transaction([0u8; 32], 100, 1000, &extra);
        assert_eq!(events1.len(), 1);

        let events2 = scanner.scan_transaction([0u8; 32], 100, 1000, &extra);
        assert_eq!(events2.len(), 0);
    }
}
