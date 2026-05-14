use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use fuego_crypto::{Address, Keypair};
use sha2::{Sha256, Digest};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserAccount {
    pub address: Address,
    pub para_balance: u64,
    pub vox_balance: u64,
    pub cura_balance: u64,
    pub display_name: Option<String>,
    pub wallet_age_epochs: u64,
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
pub struct GlobalState {
    pub accounts: HashMap<Address, UserAccount>,
    pub singles: HashMap<String, Single>,
    pub albums: HashMap<String, Album>,
    pub current_epoch: u64,
    pub top_holder: Option<Address>,
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

pub struct DigmApp {
    state: Arc<RwLock<GlobalState>>,
}

impl DigmApp {
    pub fn new() -> Self {
        Self {
            state: Arc::new(RwLock::new(GlobalState {
                accounts: HashMap::new(),
                singles: HashMap::new(),
                albums: HashMap::new(),
                current_epoch: 0,
                top_holder: None,
            })),
        }
    }

    pub fn get_account(&self, address: &Address) -> Option<UserAccount> {
        let state = self.state.read().unwrap();
        state.accounts.get(address).cloned()
    }

    pub fn get_current_earnings(&self, address: &Address) -> u64 {
        let state = self.state.read().unwrap();
        state.accounts.get(address).map(|a| a.para_balance).unwrap_or(0)
    }

    pub fn earn_para(&self, address: &Address, amount: u64) {
        let mut state = self.state.write().unwrap();
        let account = state.accounts.entry(address.clone()).or_insert(UserAccount {
            address: address.clone(),
            para_balance: 0,
            vox_balance: 0,
            cura_balance: 0,
            display_name: None,
            wallet_age_epochs: 0,
        });
        account.para_balance += amount;
    }

    pub fn stream_payment(&self, from_address: &Address, to_address: &Address, amount: u64) -> Result<(), String> {
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
            display_name: None,
            wallet_age_epochs: 0,
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
        if account.para_balance < amount {
            return Err("Insufficient PARA balance".to_string());
        }
        
        account.para_balance -= amount;
        
        let single = state.singles.entry(track_id.to_string()).or_insert(Single {
            track_id: track_id.to_string(),
            album_id: album_id.to_string(),
            total_para_staked: 0,
            stakers: HashMap::new(),
            listener_votes: 0,
        });
        
        single.total_para_staked += amount;
        let positions = single.stakers.entry(address.clone()).or_insert(Vec::new());
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
        if account.para_balance < amount {
            return Err("Insufficient PARA balance".to_string());
        }
        
        account.para_balance -= amount;
        
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

    pub fn purchase_album(&self, address: &Address, album_id: &str, amount: u64) -> Result<(), String> {
        let mut state = self.state.write().unwrap();
        
        let album_price = {
            let album = state.albums.get(album_id).ok_or("Album not found")?;
            if amount < album.price {
                return Err("Insufficient payment for album".to_string());
            }
            album.price
        };
        
        let account = state.accounts.get_mut(address).ok_or("Account not found")?;
        if account.para_balance < amount {
            return Err("Insufficient PARA balance".to_string());
        }
        
        account.para_balance -= amount;
        
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
        
        // Check 0x0B license ownership (placeholder)
        // In a real implementation, we'd scan the blockchain here
        
        false
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
        
        if account.para_balance < cost {
            return Err("Insufficient PARA for browsing".to_string());
        }
        
        account.para_balance -= cost;
        Ok(cost)
    }

    pub fn vote_for_single(&self, address: &Address, track_id: &str) -> Result<(), String> {
        let mut state = self.state.write().unwrap();
        let single = state.singles.get_mut(track_id).ok_or("Single not found")?;
        single.listener_votes += 1;
        Ok(())
    }

    pub fn compute_state_root(&self) -> String {
        let state = self.state.read().unwrap();
        let serialized = bincode::serialize(&*state).unwrap();
        let mut hasher = Sha256::new();
        hasher.update(&serialized);
        hex::encode(hasher.finalize())
    }

    pub fn anchor_state(&self) -> Result<String, String> {
        let root = self.compute_state_root();
        println!("Anchoring state root to Fuego L1: {}", root);
        
        // Simulate L1 transaction submission
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
        
        state.current_epoch += 1;
    }

}

pub fn init() {
    println!("DIGM App initialized");
}

