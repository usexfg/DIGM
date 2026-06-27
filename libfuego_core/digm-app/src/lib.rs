use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use fuego_crypto::Address;
use sha2::{Sha256, Digest};
use scanner::DigmChainScanner;
use merkle::MerkleTree;
use parapay::AccrualConfig;

pub mod tx_extra;
pub mod merkle;
pub mod scanner;
pub mod parapay_sessions;
pub mod persistor;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserAccount {
    pub address: Address,
    pub para_balance: u128,
    pub vox_balance: u64,
    pub cura_balance: u64,
    pub digm_tokens_held: u64,
    pub digm_tokens_consumed: u64,
    pub digm_token_acquired_at: Vec<DigmTokenEntry>,
    pub display_name: Option<String>,
    pub wallet_age_epochs: u64,
    pub stations_created: u64,
    pub curator_playlist: Vec<String>,
    pub curator_vibe: Option<String>,
}

/// Track when and from which pool a DIGM token was acquired.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DigmTokenEntry {
    pub acquired_at: u64,
    pub source: DigmPoolSource,
    pub consumed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakePosition {
    pub amount: u64,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Single {
    pub track_id: String,
    pub album_id: String,
    pub total_para_staked: u64,
    pub stakers: HashMap<Address, Vec<StakePosition>>,
    pub listener_votes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Album {
    pub album_id: String,
    pub title: String,
    pub total_sales_value: u64,
    pub total_copies_sold: u64,
    pub price: u64,
    pub preview_singles: Vec<String>, // 1 to 3 tracks
    pub total_para_staked: u64,
    pub stakers: HashMap<Address, Vec<StakePosition>>,
    pub has_been_number_one: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Station {
    pub station_id: String,
    pub curator: Address,
    pub name: String,
    pub description: String,
    pub tracks: Vec<String>,
    pub created_at: u64,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StationSummary {
    pub station_id: String,
    pub name: String,
    pub description: String,
    pub num_tracks: usize,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GlobalState {
    pub accounts: HashMap<Address, UserAccount>,
    pub singles: HashMap<String, Single>,
    pub albums: HashMap<String, Album>,
    pub stations: HashMap<String, Station>,
    pub current_epoch: u64,
    pub top_holder: Option<Address>,
    pub total_singles_posted: u64,
    pub max_singles: u64,
    /// DIGM pool tracking
    pub digm_heat_pool_remaining: u64,
    pub digm_xfg_pool_remaining: u64,
    pub digm_heat_pool_sold: u64,
    pub digm_xfg_pool_sold: u64,
    /// Cumulative para burned (boost redirect burn + purchase burn)
    pub total_para_burned: u128,
}

/// DIGM token supply model — two pools, anti-spam single-release gate.
pub const MAX_SINGLE_SLOTS: u64 = 10_000;
pub const DIGM_HEAT_POOL_SIZE: u64 = 5_000;
pub const DIGM_XFG_POOL_SIZE: u64 = 5_000;
pub const DIGM_HEAT_FIXED_PRICE: u64 = 10_000_000;
/// Fraction of purchase amount burned (10% = 1000 bps).
pub const PURCHASE_BURN_BPS: u64 = 1000;
pub const DIGM_COIN_NAME: &str = "DIGM";
/// Hard deadline for v0 cycle — all DIGM must be used by this timestamp.
/// Set to end of 2026 (1735689600 = Dec 31 2026 00:00 UTC).
pub const DIGM_V0_DEADLINE: u64 = 1735689600;
/// DIGM acquired from XFG pool must be consumed within this many seconds.
pub const DIGM_XFG_HOLD_LIMIT_SECS: u64 = 90 * 24 * 3600; // 90 days

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DigmPoolSource {
    /// HEAT pool: fixed 0.1 HEAT, immediate-use only (buy & publish now)
    Heat,
    /// XFG pool: bancor curve pricing, can hold (speculators)
    Xfg,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SingleSummary {
    pub track_id: String,
    pub album_id: String,
    pub total_para: u64,
    pub votes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlbumRanking {
    pub album_id: String,
    pub title: String,
    pub total_sales: u64,
    pub rank: usize,
}

#[derive(Default)]
pub struct DigmApp {
    state: Arc<RwLock<GlobalState>>,
    pub scanner: Arc<RwLock<DigmChainScanner>>,
    pub state_tree: Arc<RwLock<MerkleTree>>,
    pub parapay_sessions: Arc<RwLock<Option<parapay_sessions::ParaPaySessionManager>>>,
    pub data_dir: std::path::PathBuf,
}

impl DigmApp {
    pub fn new() -> Self {
        DigmApp {
            state: Arc::new(RwLock::new(GlobalState::default())),
            scanner: Arc::new(RwLock::new(DigmChainScanner::new())),
            state_tree: Arc::new(RwLock::new(MerkleTree::new())),
            parapay_sessions: Arc::new(RwLock::new(None)),
            data_dir: std::path::PathBuf::from("./digm_data"),
        }
    }

    /// Initialize the ParaPay session manager (requires data_dir for persistence).
    pub fn init_parapay(&self) -> Result<(), String> {
        let disk_persistor = Arc::new(persistor::SledPersistor::new(
            &self.data_dir.join("parapay_sessions")
        )?);

        struct DigmSettler {
            app: Arc<RwLock<GlobalState>>,
        }
         impl parapay_sessions::PayoutSettler for DigmSettler {
            fn apply(
                &self,
                payout: &parapay::Payout,
                artist: &Address,
                listener: &Address,
                curator: Option<&Address>,
            ) {
                let mut state = self.app.write().unwrap();
                credit_account(&mut state, artist, payout.artist_amount);
                credit_account(&mut state, listener, payout.listener_amount);
                if let Some(c) = curator {
                    credit_account(&mut state, c, payout.curator_amount);
                }
                // Boost burn — 10% of redirect destroyed
                state.total_para_burned += payout.burn_amount;
            }
        }

        fn credit_account(state: &mut GlobalState, addr: &Address, amount: u128) {
            let acct = state.accounts.entry(addr.clone()).or_insert(UserAccount {
                address: addr.clone(),
                para_balance: 0,
                vox_balance: 0,
                cura_balance: 0,
            digm_tokens_held: 0,
            digm_tokens_consumed: 0,
            digm_token_acquired_at: Vec::new(),
                display_name: None,
                wallet_age_epochs: 0,
                stations_created: 0,
                curator_playlist: Vec::new(),
                curator_vibe: None,
            });
            acct.para_balance += amount;
        }

        let settler = Arc::new(DigmSettler { app: self.state.clone() });
        let config = AccrualConfig::default();

        let mgr = parapay_sessions::ParaPaySessionManager::new(config, settler, disk_persistor);
        *self.parapay_sessions.write().unwrap() = Some(mgr);
        Ok(())
    }

    pub fn get_account(&self, address: &Address) -> Option<UserAccount> {
        let state = self.state.read().unwrap();
        state.accounts.get(address).cloned()
    }

    pub fn get_current_earnings(&self, address: &Address) -> u64 {
        let state = self.state.read().unwrap();
        state.accounts.get(address).map(|a| a.para_balance as u64).unwrap_or(0)
    }

    pub fn get_para_balance(&self, address: &Address) -> u128 {
        let state = self.state.read().unwrap();
        state.accounts.get(address).map(|a| a.para_balance).unwrap_or(0)
    }

    pub fn get_total_para_burned(&self) -> u128 {
        let state = self.state.read().unwrap();
        state.total_para_burned
    }

    pub fn earn_para(&self, address: &Address, amount: u128) {
        let mut state = self.state.write().unwrap();
        let account = state.accounts.entry(address.clone()).or_insert(UserAccount {
            address: address.clone(),
            para_balance: 0,
            vox_balance: 0,
            cura_balance: 0,
            digm_tokens_held: 0,
            digm_tokens_consumed: 0,
            digm_token_acquired_at: Vec::new(),
            display_name: None,
            wallet_age_epochs: 0,
            stations_created: 0,
            curator_playlist: Vec::new(),
            curator_vibe: None,
        });
        account.para_balance += amount as u128;
    }

    pub fn stream_payment(&self, from_address: &Address, to_address: &Address, amount: u128) -> Result<(), String> {
        let mut state = self.state.write().unwrap();
        
        let sender = state.accounts.get_mut(from_address).ok_or("Sender account not found")?;
        if sender.para_balance < amount {
            return Err("Insufficient PARA for streaming payment".to_string());
        }
        
        sender.para_balance -= amount;
        
        let receiver = state.accounts.entry(to_address.clone()).or_insert(UserAccount {
            address: to_address.clone(),
            para_balance: 0,
            vox_balance: 0,
            cura_balance: 0,
            digm_tokens_held: 0,
            digm_tokens_consumed: 0,
            digm_token_acquired_at: Vec::new(),
            display_name: None,
            wallet_age_epochs: 0,
            stations_created: 0,
            curator_playlist: Vec::new(),
            curator_vibe: None,
        });
        receiver.para_balance += amount;
        
        Ok(())
    }

    pub fn create_album(&self, album_id: String, title: String, price: u64, preview_singles: Vec<String>) -> Result<(), String> {
        let mut state = self.state.write().unwrap();
        let id = album_id.clone();
        if state.albums.contains_key(&id) {
            return Err("Album already exists".to_string());
        }
        state.albums.insert(album_id, Album {
            album_id: id,
            title,
            total_sales_value: 0,
            total_copies_sold: 0,
            price,
            preview_singles,
            total_para_staked: 0,
            stakers: HashMap::new(),
            has_been_number_one: false,
        });
        Ok(())
    }

    pub fn stake_single(&self, address: &Address, track_id: &str, album_id: &str, amount: u64) -> Result<(), String> {
        let mut state = self.state.write().unwrap();
        
        let account = state.accounts.get_mut(address).ok_or("Account not found")?;
        if account.para_balance < amount as u128 {
            return Err("Insufficient PARA balance".to_string());
        }
        
        account.para_balance -= amount as u128;
        
        let single = state.singles.entry(track_id.to_string()).or_insert(Single {
            track_id: track_id.to_string(),
            album_id: album_id.to_string(),
            total_para_staked: 0,
            stakers: HashMap::new(),
            listener_votes: 0,
        });
        
        single.total_para_staked += amount;
        let positions = single.stakers.entry(address.clone()).or_default();
        positions.push(StakePosition {
            amount,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        });
        
        Ok(())
    }

    pub fn stake_album(&self, address: &Address, album_id: &str, amount: u64) -> Result<(), String> {
        let mut state = self.state.write().unwrap();
        
        let account = state.accounts.get_mut(address).ok_or("Account not found")?;
        if account.para_balance < amount as u128 {
            return Err("Insufficient PARA balance".to_string());
        }
        
        account.para_balance -= amount as u128;
        
        let album = state.albums.get_mut(album_id).ok_or("Album not found")?;
        album.total_para_staked += amount;
        let positions = album.stakers.entry(address.clone()).or_insert(Vec::new());
        positions.push(StakePosition {
            amount,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        });
        
        Ok(())
    }

    pub fn unstake_single(&self, address: &Address, track_id: &str) -> Result<u64, String> {
        let total_returned;
        {
            let mut state = self.state.write().unwrap();
            let single = state.singles.get_mut(track_id).ok_or("Single not found")?;
            let positions = single.stakers.remove(address)
                .ok_or("No stake found for this single")?;
            total_returned = positions.iter().map(|p| p.amount).sum();
            single.total_para_staked -= total_returned;
        }
        {
            let mut state = self.state.write().unwrap();
            let account = state.accounts.get_mut(address)
                .ok_or("Account not found")?;
            account.para_balance += total_returned as u128;
        }
        Ok(total_returned)
    }

    pub fn unstake_album(&self, address: &Address, album_id: &str) -> Result<u64, String> {
        let total_returned;
        {
            let mut state = self.state.write().unwrap();
            let album = state.albums.get_mut(album_id).ok_or("Album not found")?;
            let positions = album.stakers.remove(address)
                .ok_or("No stake found for this album")?;
            total_returned = positions.iter().map(|p| p.amount).sum();
            album.total_para_staked -= total_returned;
        }
        {
            let mut state = self.state.write().unwrap();
            let account = state.accounts.get_mut(address)
                .ok_or("Account not found")?;
            account.para_balance += total_returned as u128;
        }
        Ok(total_returned)
    }

    pub fn purchase_album(&self, address: &Address, album_id: &str, amount: u64) -> Result<(), String> {
        let mut state = self.state.write().unwrap();
        
        let _album_price = {
            let album = state.albums.get(album_id).ok_or("Album not found")?;
            if amount < album.price {
                return Err("Insufficient payment for album".to_string());
            }
            album.price
        };
        
        let account = state.accounts.get_mut(address).ok_or("Account not found")?;
        if account.para_balance < amount as u128 {
            return Err("Insufficient PARA balance".to_string());
        }
        
        account.para_balance -= amount as u128;
        
        // 10% purchase burn
        let burn = (amount as u128) * PURCHASE_BURN_BPS as u128 / 10000;
        state.total_para_burned += burn;
        
        let album = state.albums.get_mut(album_id).unwrap();
        album.total_sales_value += amount;
        album.total_copies_sold += 1;
        
        Ok(())
    }

    pub fn can_browse_album(&self, address: &Address, album_id: &str) -> bool {
        let state = self.state.read().unwrap();

        // Check if user has staked in ANY single belonging to this album
        for single in state.singles.values() {
            if single.album_id == album_id && single.stakers.contains_key(address) {
                return true;
            }
        }

        // Check 0x0B AlbumLicense via chain scanner
        let scanner = self.scanner.read().unwrap();
        let addr_hex = hex::encode(address.0.as_bytes());
        if scanner.has_license_for(&addr_hex, album_id) {
            return true;
        }

        false
    }

    /// Scan a raw transaction's tx_extra for DIGM tags (0x0A, 0x0B, 0x0C).
    /// Call this when processing incoming blocks from the node.
    pub fn scan_tx_extra(
        &self,
        tx_hash: [u8; 32],
        block_height: u64,
        timestamp: u64,
        extra: &[u8],
    ) -> Vec<scanner::ScanEvent> {
        self.scanner
            .write()
            .unwrap()
            .scan_transaction(tx_hash, block_height, timestamp, extra)
    }

    /// Compute a Merkle checkpoint of current DIGM app state.
    /// Returns (root, epoch, height, timestamp).
    pub fn compute_state_checkpoint(&self) -> ([u8; 32], u64, u64, u64) {
        let mut tree = self.state_tree.write().unwrap();
        tree.clear();

        let state = self.state.read().unwrap();

        // Add accounts as leaves
        for (addr, acct) in &state.accounts {
            tree.add_leaf_bytes(
                format!("account:{addr}:p{}:v{}:c{}", acct.para_balance, acct.vox_balance, acct.cura_balance)
                    .as_bytes(),
            );
        }

        // Add albums as leaves
        for (id, album) in &state.albums {
            tree.add_leaf_bytes(
                format!("album:{id}:t{}:s{}", album.total_sales_value, album.total_para_staked)
                    .as_bytes(),
            );
        }

        // Add singles as leaves
        for (id, single) in &state.singles {
            tree.add_leaf_bytes(
                format!("single:{id}:p{}:v{}", single.total_para_staked, single.listener_votes)
                    .as_bytes(),
            );
        }

        // Add stations as leaves
        for (id, station) in &state.stations {
            tree.add_leaf_bytes(
                format!("station:{id}:t{}:a{}", station.tracks.len(), station.is_active)
                    .as_bytes(),
            );
        }

        let root = tree.root();
        let epoch = state.current_epoch;

        (root, epoch, 0, 0) // height/timestamp filled by caller
    }

    /// Compute a Merkle-anchored checkpoint for the state (new Merkle system).
    pub fn compute_merkle_anchor(
        &self,
        prev_root: &[u8; 32],
        block_height: u64,
        timestamp: u64,
    ) -> [u8; 32] {
        let (_, epoch, _, _) = self.compute_state_checkpoint();
        let tree = self.state_tree.read().unwrap();
        merkle::compute_checkpoint(prev_root, &tree, epoch, block_height, timestamp)
    }

    pub fn charge_browsing_play(&self, address: &Address, track_duration_secs: u64, played_secs: u64) -> Result<u64, String> {
        let mut state = self.state.write().unwrap();
        
        let account = state.accounts.get_mut(address).ok_or("Account not found")?;
        
        let cost = if played_secs >= track_duration_secs * 5 / 8 {
            // Full play: 1 PARA = 10_000_000 micro-PARA
            10_000_000u64
        } else {
            // Partial play: micro-para per second (1 PARA / 60 sec = ~166,667 micro-PARA per sec)
            played_secs * 166_667
        };
        
        if account.para_balance < cost as u128 {
            return Err("Insufficient PARA for browsing".to_string());
        }
        
        account.para_balance -= cost as u128;
        Ok(cost)
    }

    pub fn vote_for_single(&self, _address: &Address, track_id: &str) -> Result<(), String> {
        let mut state = self.state.write().unwrap();
        let single = state.singles.get_mut(track_id).ok_or("Single not found")?;
        single.listener_votes += 1;
        Ok(())
    }

    pub fn compute_state_root(&self) -> String {
        let (root, _, _, _) = self.compute_state_checkpoint();
        hex::encode(root)
    }

    pub fn anchor_state(&self) -> Result<String, String> {
        let root = self.compute_state_root();
        println!("Anchoring state root to Fuego L1: {}", root);
        let tx_hash = hex::encode(Sha256::digest(root.as_bytes()));
        Ok(tx_hash)
    }

    pub fn get_single_pools(&self) -> Vec<SingleSummary> {
        let state = self.state.read().unwrap();
        state.singles.values().map(|s| SingleSummary {
            track_id: s.track_id.clone(),
            album_id: s.album_id.clone(),
            total_para: s.total_para_staked,
            votes: s.listener_votes,
        }).collect()
    }

    pub fn get_album_rankings(&self) -> Vec<AlbumRanking> {
        let state = self.state.read().unwrap();
        let mut rankings: Vec<_> = state.albums.values().map(|a| {
            (a.album_id.clone(), a.title.clone(), a.total_sales_value)
        }).collect();
        
        rankings.sort_by(|a, b| b.2.cmp(&a.2));
        
        rankings.into_iter().enumerate().map(|(i, (id, title, sales))| {
            AlbumRanking {
                album_id: id,
                title,
                total_sales: sales,
                rank: i + 1,
            }
        }).collect()
    }

    pub const MAX_STATIONS: u64 = 10;

    pub fn create_station(&self, curator: &Address, station_id: String, name: String, description: String, tracks: Vec<String>) -> Result<(), String> {
        let mut state = self.state.write().unwrap();
        if state.stations.contains_key(&station_id) {
            return Err("Station already exists".to_string());
        }
        let account = state.accounts.get_mut(curator).ok_or("Curator account not found")?;
        if account.stations_created >= Self::MAX_STATIONS {
            return Err(format!("CURA station limit reached (max {})", Self::MAX_STATIONS));
        }
        account.stations_created += 1;
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        state.stations.insert(station_id.clone(), Station {
            station_id,
            curator: curator.clone(),
            name,
            description,
            tracks,
            created_at: now,
            is_active: true,
        });
        Ok(())
    }

    pub fn get_curator_stations(&self, curator: &Address) -> Vec<StationSummary> {
        let state = self.state.read().unwrap();
        state.stations.values()
            .filter(|s| s.curator == *curator)
            .map(|s| StationSummary {
                station_id: s.station_id.clone(),
                name: s.name.clone(),
                description: s.description.clone(),
                num_tracks: s.tracks.len(),
                is_active: s.is_active,
            })
            .collect()
    }

    pub fn curator_stations_remaining(&self, curator: &Address) -> u64 {
        let state = self.state.read().unwrap();
        let created = state.accounts.get(curator)
            .map(|a| a.stations_created)
            .unwrap_or(0);
        Self::MAX_STATIONS.saturating_sub(created)
    }

    pub fn update_curator_vibe(&self, curator: &Address, vibe: String) -> Result<(), String> {
        let mut state = self.state.write().unwrap();
        let account = state.accounts.get_mut(curator).ok_or("Curator account not found")?;
        account.curator_vibe = Some(vibe);
        Ok(())
    }

    pub fn get_curator_vibe(&self, curator: &Address) -> Option<String> {
        let state = self.state.read().unwrap();
        state.accounts.get(curator).and_then(|a| a.curator_vibe.clone())
    }

    pub fn set_curator_playlist(&self, curator: &Address, tracks: Vec<String>) -> Result<(), String> {
        let mut state = self.state.write().unwrap();
        let account = state.accounts.get_mut(curator).ok_or("Curator account not found")?;
        account.curator_playlist = tracks;
        Ok(())
    }

    pub fn get_curator_playlist(&self, curator: &Address) -> Vec<String> {
        let state = self.state.read().unwrap();
        state.accounts.get(curator).map(|a| a.curator_playlist.clone()).unwrap_or_default()
    }

    pub fn calculate_airtime_weight(&self, track_id: &str) -> f64 {
        let state = self.state.read().unwrap();
        let single = match state.singles.get(track_id) {
            Some(s) => s,
            None => return 0.0,
        };
        
        // Fair Airtime Algo: 
        // Weight = (Hashrate Influence * 0.7) + (Listener Influence * 0.3)
        // Hashrate Influence = log2(1 + total_para_staked)
        // Listener Influence = log2(1 + listener_votes)
        
        let hashrate_influence = (1.0 + single.total_para_staked as f64).log2();
        let listener_influence = (1.0 + single.listener_votes as f64).log2();
        
        (hashrate_influence * 0.7) + (listener_influence * 0.3)
    }

    pub fn close_epoch(&self) {
        let mut state = self.state.write().unwrap();
        
        // Find the #1 album by sales that hasn't claimed its reward yet
        let winner = state.albums.iter()
            .filter(|(_, album)| !album.has_been_number_one)
            .max_by_key(|(_, album)| album.total_sales_value)
            .map(|(id, _)| id.clone());
        
        if let Some(winning_album_id) = winner {
            // Mark as claimed
            if let Some(album) = state.albums.get_mut(&winning_album_id) {
                album.has_been_number_one = true;
            }
            
            // Collect stakers and their la-weighted VOX amounts
            let mut rewards = Vec::new();
            if let Some(album) = state.albums.get(&winning_album_id) {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs();
                
                for (address, positions) in &album.stakers {
                    let mut total_vox = 0;
                    for pos in positions {
                        // la-weighted multiplier: Non-linear growth favoring longevity
                        // Earlier stakes earn more - weighted by days since staking
                        let age_days = (now - pos.timestamp) / 86400;
                        let multiplier = 1.0 + (1.0 + (age_days as f64 / 7.0)).log2() * 0.5;
                        total_vox += (pos.amount as f64 * multiplier) as u64;
                    }
                    rewards.push((address.clone(), total_vox));
                }
            }
            
            // Apply rewards to accounts
            for (address, vox) in rewards {
                if let Some(account) = state.accounts.get_mut(&address) {
                    account.vox_balance += vox;
                }
            }
            
            // Drain winning album pool
            if let Some(album) = state.albums.get_mut(&winning_album_id) {
                album.total_para_staked = 0;
                album.stakers.clear();
            }
            
            println!("Album #1 hit! Rewards distributed for: {}", winning_album_id);
        }
        
        // Increment all active account ages
        for account in state.accounts.values_mut() {
            if account.para_balance > 0 || account.vox_balance > 0 {
                account.wallet_age_epochs += 1;
            }
        }
        
        state.current_epoch += 1;
    }

    /// Apply a ParaPay payout directly to account balances.
    pub fn execute_payout(
        &self,
        artist_amount: u128,
        listener_amount: u128,
        curator_amount: u128,
        artist: &Address,
        listener: &Address,
        curator: Option<&Address>,
    ) {
        let mut state = self.state.write().unwrap();

        let artist_acct = state.accounts.entry(artist.clone()).or_insert(UserAccount {
            address: artist.clone(),
            para_balance: 0,
            vox_balance: 0,
            cura_balance: 0,
            digm_tokens_held: 0,
            digm_tokens_consumed: 0,
            digm_token_acquired_at: Vec::new(),
            display_name: None,
            wallet_age_epochs: 0,
            stations_created: 0,
            curator_playlist: Vec::new(),
            curator_vibe: None,
        });
        artist_acct.para_balance += artist_amount;

        let listener_acct = state.accounts.entry(listener.clone()).or_insert(UserAccount {
            address: listener.clone(),
            para_balance: 0,
            vox_balance: 0,
            cura_balance: 0,
            digm_tokens_held: 0,
            digm_tokens_consumed: 0,
            digm_token_acquired_at: Vec::new(),
            display_name: None,
            wallet_age_epochs: 0,
            stations_created: 0,
            curator_playlist: Vec::new(),
            curator_vibe: None,
        });
        listener_acct.para_balance += listener_amount;

        if let Some(c) = curator {
            let curator_acct = state.accounts.entry(c.clone()).or_insert(UserAccount {
                address: c.clone(),
                para_balance: 0,
                vox_balance: 0,
                cura_balance: 0,
            digm_tokens_held: 0,
            digm_tokens_consumed: 0,
            digm_token_acquired_at: Vec::new(),
                display_name: None,
                wallet_age_epochs: 0,
                stations_created: 0,
                curator_playlist: Vec::new(),
                curator_vibe: None,
            });
            curator_acct.para_balance += curator_amount;
        }
    }

    /// Begin a ParaPay streaming session. Returns stream_id as hex.
    pub fn parapay_begin(
        &self,
        track_length_sec: u32,
        curator_present: bool,
        artist: &str,
        listener: &str,
        curator: Option<&str>,
    ) -> Result<String, String> {
        let mut guard = self.parapay_sessions.write().unwrap();
        let mgr = guard.as_mut().ok_or("ParaPay not initialized")?;

        let mut hasher = Sha256::new();
        hasher.update(listener.as_bytes());
        hasher.update(artist.as_bytes());
        hasher.update(track_length_sec.to_le_bytes());
        let digest = hasher.finalize();
        let mut sid = [0u8; 32];
        sid.copy_from_slice(&digest);

        let artist_addr = Address(artist.to_string());
        let listener_addr = Address(listener.to_string());
        let curator_addr = curator.map(|c| Address(c.to_string()));

        mgr.begin(sid, track_length_sec, curator_present, artist_addr, listener_addr, curator_addr)?;
        Ok(hex::encode(sid))
    }

    /// Report a playback position tick (per-second from fuego-audio).
    pub fn parapay_tick(&self, stream_id_hex: &str, new_pos_sec: u32) -> Result<(), String> {
        let sid = decode_stream_id(stream_id_hex)?;
        let mut guard = self.parapay_sessions.write().unwrap();
        let mgr = guard.as_mut().ok_or("ParaPay not initialized")?;
        let artist = Address("artist".into());
        let listener = Address("listener".into());
        mgr.tick(sid, new_pos_sec, &artist, &listener, None)
            .map(|_| ())
            .map_err(|e| format!("{e:?}"))
    }

    /// Apply a boost press. Returns total presses used.
    pub fn parapay_boost(&self, stream_id_hex: &str) -> Result<u32, String> {
        let sid = decode_stream_id(stream_id_hex)?;
        let mut guard = self.parapay_sessions.write().unwrap();
        let mgr = guard.as_mut().ok_or("ParaPay not initialized")?;
        let result = mgr.boost(sid).map_err(|e| format!("{e:?}"))?;
        Ok(result.presses_used)
    }

    /// End a ParaPay session (skip or complete).
    pub fn parapay_end(&self, stream_id_hex: &str, skipped: bool) -> Result<(), String> {
        let sid = decode_stream_id(stream_id_hex)?;
        let mut guard = self.parapay_sessions.write().unwrap();
        let mgr = guard.as_mut().ok_or("ParaPay not initialized")?;
        let artist = Address("artist".into());
        let listener = Address("listener".into());
        let reason = if skipped {
            parapay_sessions::EndReason::Skipped
        } else {
            parapay_sessions::EndReason::Completed
        };
        mgr.end(sid, reason, &artist, &listener, None);
        Ok(())
    }

}

fn decode_stream_id(hex_str: &str) -> Result<[u8; 32], String> {
    let bytes = hex::decode(hex_str).map_err(|e| e.to_string())?;
    if bytes.len() != 32 {
        return Err("invalid stream_id length".into());
    }
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&bytes);
    Ok(arr)
}

// --- DIGM Token / Anti-Spam Gate ---
// Two pools, fixed-price HEAT + bancor-curve XFG, hard v0 deadline.

impl DigmApp {
    fn ensure_digm_account<'a>(state: &'a mut GlobalState, address: &Address) -> &'a mut UserAccount {
        state.accounts.entry(address.clone()).or_insert(UserAccount {
            address: address.clone(),
            para_balance: 0,
            vox_balance: 0,
            cura_balance: 0,
            digm_tokens_held: 0,
            digm_tokens_consumed: 0,
            digm_token_acquired_at: Vec::new(),
            display_name: None,
            wallet_age_epochs: 0,
            stations_created: 0,
            curator_playlist: Vec::new(),
            curator_vibe: None,
        })
    }

    fn now_secs() -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    }

    /// HEAT pool: fixed 0.1 HEAT, immediate-use only (buy & publish now).
    /// Token is acquired AND consumed atomically. Returns catalogue slot number.
    pub fn acquire_digm_heat(&self, address: &Address) -> Result<u64, String> {
        let mut state = self.state.write().unwrap();

        if state.digm_heat_pool_sold >= DIGM_HEAT_POOL_SIZE {
            return Err("HEAT pool exhausted".into());
        }

        let now = Self::now_secs();
        if now >= DIGM_V0_DEADLINE {
            return Err("DIGM v0 cycle has ended.".into());
        }

        if state.total_singles_posted >= MAX_SINGLE_SLOTS {
            return Err("0P Singles Catalogue full. DIGM now gates albums only.".into());
        }

        // Use entry API, drop borrow before accessing state again
        {
            let acct = state.accounts.entry(address.clone()).or_insert(
                Self::make_default_account(address)
            );
            acct.digm_token_acquired_at.push(DigmTokenEntry {
                acquired_at: now,
                source: DigmPoolSource::Heat,
                consumed: true,
            });
            acct.digm_tokens_held += 1;
            acct.digm_tokens_consumed += 1;
        }
        state.digm_heat_pool_sold += 1;
        state.total_singles_posted += 1;
        Ok(state.total_singles_posted)
    }

    /// XFG pool: bancor curve pricing, tokens can be held (speculators).
    pub fn acquire_digm_xfg(&self, address: &Address) -> Result<u64, String> {
        let mut state = self.state.write().unwrap();

        if state.digm_xfg_pool_sold >= DIGM_XFG_POOL_SIZE {
            return Err("XFG pool exhausted".into());
        }

        let now = Self::now_secs();
        if now >= DIGM_V0_DEADLINE {
            return Err("DIGM v0 cycle has ended.".into());
        }

        let held;
        {
            let acct = state.accounts.entry(address.clone()).or_insert(
                Self::make_default_account(address)
            );
            acct.digm_token_acquired_at.push(DigmTokenEntry {
                acquired_at: now,
                source: DigmPoolSource::Xfg,
                consumed: false,
            });
            acct.digm_tokens_held += 1;
            held = acct.digm_tokens_held;
        }
        state.digm_xfg_pool_sold += 1;
        Ok(held)
    }

    fn make_default_account(address: &Address) -> UserAccount {
        UserAccount {
            address: address.clone(),
            para_balance: 0,
            vox_balance: 0,
            cura_balance: 0,
            digm_tokens_held: 0,
            digm_tokens_consumed: 0,
            digm_token_acquired_at: Vec::new(),
            display_name: None,
            wallet_age_epochs: 0,
            stations_created: 0,
            curator_playlist: Vec::new(),
            curator_vibe: None,
        }
    }

    /// Bancor curve price for the nth XFG pool token.
    /// price = base * (1 + sold/total * (1/reserve_ratio - 1))
    pub fn digm_xfg_price(&self, nth: u64) -> u64 {
        let total = DIGM_XFG_POOL_SIZE as f64;
        let sold = (nth.saturating_sub(1)) as f64;
        if sold >= total { return u64::MAX; }
        let reserve_ratio = 0.1;
        let base = 1_000_000u64 as f64; // 0.1 XFG base
        let mark = 1.0 + sold / total * (1.0 / reserve_ratio - 1.0);
        (base * mark) as u64
    }

    pub fn digm_xfg_current_price(&self) -> u64 {
        let state = self.state.read().unwrap();
        self.digm_xfg_price(state.digm_xfg_pool_sold + 1)
    }

    /// Consume a held DIGM (from XFG pool) to post a single.
    pub fn consume_held_digm(&self, address: &Address) -> Result<u64, String> {
        let mut state = self.state.write().unwrap();

        if state.total_singles_posted >= MAX_SINGLE_SLOTS {
            return Err("0P Singles Catalogue full. DIGM now gates albums only.".into());
        }

        let now = Self::now_secs();
        if now >= DIGM_V0_DEADLINE {
            return Err("DIGM v0 cycle has ended. Unused tokens expired.".into());
        }

        let acct = state.accounts.get_mut(address).ok_or("Account not found")?;
        let unspent = acct.digm_token_acquired_at.iter_mut()
            .filter(|e| !e.consumed)
            .next()
            .ok_or("No unspent DIGM tokens")?;

        if unspent.source == DigmPoolSource::Xfg {
            if now > unspent.acquired_at + DIGM_XFG_HOLD_LIMIT_SECS {
                unspent.consumed = true;
                acct.digm_tokens_consumed += 1;
                return Err("DIGM token expired (90-day hold limit).".into());
            }
        }

        unspent.consumed = true;
        acct.digm_tokens_consumed += 1;
        state.total_singles_posted += 1;
        Ok(state.total_singles_posted)
    }

    pub fn singles_remaining(&self) -> u64 {
        let state = self.state.read().unwrap();
        MAX_SINGLE_SLOTS.saturating_sub(state.total_singles_posted)
    }

    pub fn is_single_catalogue_full(&self) -> bool {
        self.singles_remaining() == 0
    }

    pub fn get_unspent_digm(&self, address: &Address) -> u64 {
        let state = self.state.read().unwrap();
        state.accounts.get(address)
            .map(|a| a.digm_tokens_held.saturating_sub(a.digm_tokens_consumed))
            .unwrap_or(0)
    }

    pub fn digm_pool_stats(&self) -> DigmPoolStats {
        let state = self.state.read().unwrap();
        DigmPoolStats {
            heat_pool_remaining: DIGM_HEAT_POOL_SIZE.saturating_sub(state.digm_heat_pool_sold),
            xfg_pool_remaining: DIGM_XFG_POOL_SIZE.saturating_sub(state.digm_xfg_pool_sold),
            heat_pool_sold: state.digm_heat_pool_sold,
            xfg_pool_sold: state.digm_xfg_pool_sold,
            heat_fixed_price: DIGM_HEAT_FIXED_PRICE,
            xfg_current_price: self.digm_xfg_current_price(),
            deadline: DIGM_V0_DEADLINE,
            singles_posted: state.total_singles_posted,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DigmPoolStats {
    pub heat_pool_remaining: u64,
    pub xfg_pool_remaining: u64,
    pub heat_pool_sold: u64,
    pub xfg_pool_sold: u64,
    pub heat_fixed_price: u64,
    pub xfg_current_price: u64,
    pub deadline: u64,
    pub singles_posted: u64,
}

pub fn init() {
    println!("DIGM App initialized");
}

