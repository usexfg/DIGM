use std::sync::{Arc, Mutex, RwLock};
use std::path::PathBuf;
use std::str::FromStr;

use fuego_vault::{Vault, recovery::RecoveryRequest};
use fuego_node::{FuegoNode, NodeMode, PrunedState};
use digm_app::DigmApp;
use i2p_net::I2pRouter;
use chunk_store::ChunkStore;
use fuego_audio::AudioStreamer;
use fuego_crypto::Address;

pub mod api_server;

pub struct DigmCore {
    vault: Arc<Mutex<Vault>>,
    node: Arc<Mutex<FuegoNode>>,
    app: Arc<Mutex<DigmApp>>,
    router: Arc<tokio::sync::Mutex<I2pRouter>>,
    store: Arc<Mutex<ChunkStore>>,
    audio: Arc<Mutex<AudioStreamer>>,
}

impl DigmCore {
    pub fn new(mnemonic: String, storage_path: String, mode: String) -> Result<DigmCore, String> {
        let storage_path_buf = PathBuf::from(&storage_path);
        
        let vault = Vault::new(&mnemonic).map_err(|e| e)?;
        
        let router_arc = Arc::new(tokio::sync::Mutex::new(I2pRouter::new(storage_path_buf.clone(), 8080)));
        
        // Initialize hybrid network providers
        let p2p_provider = Arc::new(futures::executor::block_on(p2p_net::Libp2pProvider::new()).map_err(|e: anyhow::Error| e.to_string())?);
        
        let peers = vec![
            "destination1.b32.i2p".to_string(),
            "destination2.b32.i2p".to_string(),
        ];
        
        let network = Arc::new(fuego_node::HybridNetworkManager::new(
            p2p_provider,
            Arc::clone(&router_arc),
            peers,
            10000,
        )) as Arc<dyn fuego_node::NetworkProvider>;
        
        let node_mode = match mode.as_str() {
            "Sovereign" => NodeMode::Sovereign,
            "Seeder" => NodeMode::Seeder,
            "Client" => NodeMode::Client,
            _ => NodeMode::Client,
        };
        
        let node = FuegoNode::new(
            storage_path_buf.clone(),
            network,
            Arc::new(RwLock::new(PrunedState::new())),
            node_mode,
            fuego_node::NetworkMode::Auto,
            None,
        );
        let app = DigmApp::new();
        
        let store_inner = ChunkStore::open(storage_path_buf.clone(), 4 * 1024 * 1024 * 1024)
            .map_err(|e| format!("Store error: {:?}", e))?;
        let store = Arc::new(Mutex::new(store_inner));
        
        let audio = Arc::new(Mutex::new(AudioStreamer::new(Arc::clone(&store), None)));
        
        Ok(DigmCore {
            vault: Arc::new(Mutex::new(vault)),
            node: Arc::new(Mutex::new(node)),
            app: Arc::new(Mutex::new(app)),
            router: router_arc,
            store,
            audio,
        })
    }



    pub fn get_address(&self, index: u32) -> String {
        let vault = self.vault.lock().unwrap();
        vault.get_address(index).0
    }

    pub fn sync_node(&self) -> Result<(), String> {
        let node = self.node.lock().unwrap();
        futures::executor::block_on(node.sync()).map_err(|e| e.to_string())
    }

    pub fn get_state_root(&self) -> String {
        let app = self.app.lock().unwrap();
        app.compute_state_root()
    }

    pub fn anchor_state(&self) -> Result<String, String> {
        let app = self.app.lock().unwrap();
        app.anchor_state()
    }

    pub fn get_single_pools(&self) -> String {
        let app = self.app.lock().unwrap();
        let pools = app.get_single_pools();
        serde_json::to_string(&pools).unwrap_or_else(|_| "[]".to_string())
    }

    pub fn get_album_rankings(&self) -> String {
        let app = self.app.lock().unwrap();
        let rankings = app.get_album_rankings();
        serde_json::to_string(&rankings).unwrap_or_else(|_| "[]".to_string())
    }

    pub fn stake_album(&self, address: String, album_id: String, amount: u64) -> Result<(), String> {
        let app = self.app.lock().unwrap();
        app.stake_album(&Address::from(address), &album_id, amount)
    }

    pub fn create_album(&self, album_id: String, title: String, price: u64, preview_singles: Vec<String>) -> Result<(), String> {
        let app = self.app.lock().unwrap();
        app.create_album(album_id, title, price, preview_singles)
    }

    pub fn stake_single(&self, address: String, track_id: String, album_id: String, amount: u64) -> Result<(), String> {
        let app = self.app.lock().unwrap();
        app.stake_single(&Address::from(address), &track_id, &album_id, amount)
    }

    pub fn purchase_album(&self, address: String, album_id: String, amount: u64) -> Result<(), String> {
        let app = self.app.lock().unwrap();
        app.purchase_album(&Address::from(address), &album_id, amount)
    }

    pub fn earn_para(&self, address: String, amount: u64) {
        let app = self.app.lock().unwrap();
        app.earn_para(&Address::from(address), amount)
    }

    pub fn can_browse_album(&self, address: String, album_id: String) -> bool {
        let app = self.app.lock().unwrap();
        app.can_browse_album(&Address::from(address), &album_id)
    }

    pub fn charge_browsing_play(&self, address: String, track_duration_secs: u64, played_secs: u64) -> Result<u64, String> {
        let app = self.app.lock().unwrap();
        app.charge_browsing_play(&Address::from(address), track_duration_secs, played_secs)
    }

    pub fn stream_payment(&self, from: String, to: String, amount: u64) -> Result<(), String> {
        let app = self.app.lock().unwrap();
        app.stream_payment(&Address::from(from), &Address::from(to), amount)
    }

    pub fn get_current_earnings(&self, address: String) -> u64 {
        let app = self.app.lock().unwrap();
        // Use Address::from for the string
        let addr = Address::from(address);
        app.get_current_earnings(&addr)
    }

    pub fn get_vox_balance(&self, address: String) -> u64 {
        let app = self.app.lock().unwrap();
        let addr = Address::from(address);
        app.get_account(&addr).map(|a| a.vox_balance).unwrap_or(0)
    }

    pub fn get_cura_balance(&self, address: String) -> u64 {
        let app = self.app.lock().unwrap();
        let addr = Address::from(address);
        app.get_account(&addr).map(|a| a.cura_balance).unwrap_or(0)
    }

    pub fn close_epoch(&self) {
        let app = self.app.lock().unwrap();
        app.close_epoch();
    }

    pub fn vote_for_single(&self, address: String, track_id: String) -> Result<(), String> {
        let app = self.app.lock().unwrap();
        app.vote_for_single(&Address::from(address), &track_id)
    }


    pub fn load_track(&self, chunk_hashes: Vec<String>) -> Result<(), String> {
        let mut audio = self.audio.lock().unwrap();
        audio.load_track(chunk_hashes).map_err(|e| e.to_string())
    }

    pub fn next_pcm_frame(&self) -> Result<Vec<f32>, String> {
        let mut audio = self.audio.lock().unwrap();
        audio.next_pcm_frame().map_err(|e| e.to_string())
    }

    pub fn play_track(&self, chunk_hashes: Vec<String>) -> Result<(), String> {
        let mut audio = self.audio.lock().unwrap();
        audio.load_track(chunk_hashes).map_err(|e| e.to_string())
    }

    pub fn set_node_mode(&self, mode: String) -> Result<(), String> {
        let mut node = self.node.lock().unwrap();
        let node_mode = match mode.as_str() {
            "Sovereign" => NodeMode::Sovereign,
            "Seeder" => NodeMode::Seeder,
            "Client" => NodeMode::Client,
            _ => return Err("Invalid node mode".to_string()),
        };
        futures::executor::block_on(node.set_mode(node_mode));
        Ok(())
    }

    pub fn add_guardian(&self, address: String) -> Result<(), String> {
        let mut vault = self.vault.lock().unwrap();
        vault.add_guardian(Address::from(address))
    }

    pub fn remove_guardian(&self, address: String) -> Result<(), String> {
        let mut vault = self.vault.lock().unwrap();
        vault.remove_guardian(&Address::from(address))
    }

    pub fn get_guardians(&self) -> Vec<String> {
        let vault = self.vault.lock().unwrap();
        vault.guardians.iter().map(|a| a.to_string()).collect()
    }

    pub fn get_recovery_threshold(&self) -> u8 {
        let vault = self.vault.lock().unwrap();
        vault.recovery_threshold
    }

    pub fn initiate_recovery(&self, new_public_key: Vec<u8>) -> Result<String, String> {
        let vault = self.vault.lock().unwrap();
        let mut pk = [0u8; 32];
        if new_public_key.len() != 32 {
            return Err("Public key must be 32 bytes".to_string());
        }
        pk.copy_from_slice(&new_public_key);
        
        let request = vault.initiate_recovery(pk);
        serde_json::to_string(&request).map_err(|e| e.to_string())
    }

    pub fn verify_recovery(&self, request_json: String) -> Result<bool, String> {
        let request: RecoveryRequest = serde_json::from_str(&request_json)
            .map_err(|e| format!("Invalid request JSON: {}", e))?;
        
        let vault = self.vault.lock().unwrap();
        vault.verify_recovery(&request)
    }

    pub fn finalize_recovery(&self, request_json: String) -> Result<(), String> {
        let request: RecoveryRequest = serde_json::from_str(&request_json)
            .map_err(|e| format!("Invalid request JSON: {}", e))?;
        
        let mut vault = self.vault.lock().unwrap();
        vault.finalize_recovery(request)
    }
}

pub fn init_ffi() {
    println!("FFI Bridge initialized");
}
