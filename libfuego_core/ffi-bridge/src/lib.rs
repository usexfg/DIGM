use std::sync::{Arc, Mutex, RwLock};
use std::path::PathBuf;
use fuego_vault::{Vault, recovery::RecoveryRequest};
use fuego_node::{FuegoNode, NodeMode, PrunedState, NetworkProvider, rpc_client::FuegoRpcClient};
use digm_app::DigmApp;
use i2p_net::{I2pRouter, PrefetchManager, SeedingManager, ChunkStoreTrait};
use chunk_store::{ChunkStore, Quality};
use fuego_audio::AudioStreamer;
use fuego_crypto::Address;
use digm_app::scanner::ScannerBlockObserver;

struct ChunkStoreBridge(Arc<Mutex<ChunkStore>>);

impl ChunkStoreTrait for ChunkStoreBridge {
    fn put_chunk(&self, data: &[u8]) -> Result<String, anyhow::Error> {
        self.0.lock().unwrap().put_chunk(data, Quality::High).map_err(|e| anyhow::anyhow!("{:?}", e))
    }
    fn get_chunk(&self, hash_str: &str) -> Result<Vec<u8>, anyhow::Error> {
        self.0.lock().unwrap().get_chunk(hash_str).map_err(|e| anyhow::anyhow!("{:?}", e))
    }
    fn pin_chunk(&self, hash_str: &str) -> Result<(), anyhow::Error> {
        self.0.lock().unwrap().pin_chunk(hash_str).map_err(|e| anyhow::anyhow!("{:?}", e))
    }
}

pub mod api_server;

pub struct DigmCore {
    vault: Arc<Mutex<Vault>>,
    pub node: Arc<Mutex<FuegoNode>>,
    app: Arc<Mutex<DigmApp>>,
    #[allow(dead_code)]
    router: Option<Arc<I2pRouter>>,
    #[allow(dead_code)]
    store: Arc<Mutex<ChunkStore>>,
    audio: Arc<Mutex<AudioStreamer>>,
    prefetcher: Option<Arc<PrefetchManager>>,
    rpc_client: Option<Arc<FuegoRpcClient>>,
}

impl DigmCore {
    pub fn new(mnemonic: String, storage_path: String, mode: String) -> Result<DigmCore, String> {
        let storage_path_buf = PathBuf::from(&storage_path);
        
        let vault = Vault::new(&mnemonic)?;
        
        // Launch i2pd and wait for SAM bridge.
        let mut router = I2pRouter::new("i2pd".into(), storage_path_buf.join("i2pd"));
        futures::executor::block_on(router.start()).map_err(|e| e.to_string())?;
        let router_arc = Arc::new(router);

        // Open chunk store.
        let store_inner = ChunkStore::open(storage_path_buf.join("chunks.db"), 4 * 1024 * 1024 * 1024)
            .map_err(|e| format!("Store error: {e:?}"))?;
        let store = Arc::new(Mutex::new(store_inner));
        let store_trait: Arc<dyn ChunkStoreTrait> = Arc::new(ChunkStoreBridge(Arc::clone(&store)));

        // Build network stack.
        let p2p_provider = Arc::new(futures::executor::block_on(
            p2p_net::Libp2pProvider::new(vec![])
        ).map_err(|e: anyhow::Error| e.to_string())?);

        let peers: Vec<String> = Vec::new(); // populated at runtime via add_seeders

        let network = Arc::new(fuego_node::HybridNetworkManager::new(
            p2p_provider,
            Arc::clone(&router_arc),
            peers,
        )) as Arc<dyn fuego_node::NetworkProvider>;

        let node_mode = match mode.as_str() {
            "Sovereign" => NodeMode::Sovereign,
            "Seeder" => NodeMode::Seeder,
            "Client" => NodeMode::Client,
            _ => NodeMode::Client,
        };

        // Spin up the seeding manager if we're a Sovereing or Seeder.
        let seeding_manager = match node_mode {
            NodeMode::Sovereign | NodeMode::Seeder => {
                let sm = Arc::new(SeedingManager::new(
                    Arc::clone(&router_arc),
                    Arc::clone(&store_trait),
                ));
                Some(sm)
            }
            NodeMode::Client => None,
        };

        let node = FuegoNode::new(
            storage_path_buf.clone(),
            network,
            Arc::new(RwLock::new(PrunedState::new())),
            node_mode,
            fuego_node::NetworkMode::Auto,
            seeding_manager,
        );
        let app = DigmApp::new();

        let prefetcher = Arc::new(PrefetchManager::new(
            Arc::clone(&router_arc),
            store_trait,
            5,
        ));
        let audio = Arc::new(Mutex::new(AudioStreamer::new(
            Arc::clone(&store),
            Some(Arc::clone(&prefetcher)),
        )));
        
        Ok(DigmCore {
            vault: Arc::new(Mutex::new(vault)),
            node: Arc::new(Mutex::new(node)),
            app: Arc::new(Mutex::new(app)),
            router: Some(router_arc),
            store,
            audio,
            prefetcher: Some(prefetcher),
            rpc_client: None,
        })
    }

    /// Create a light client using HTTP RPC to fuegod (no I2P needed).
    pub fn new_rpc(mnemonic: String, storage_path: String, fuegod_host: &str, fuegod_port: u16) -> Result<DigmCore, String> {
        let storage_path_buf = PathBuf::from(&storage_path);

        let vault = Vault::new(&mnemonic)?;
        let app = DigmApp::new();

        let rpc = Arc::new(FuegoRpcClient::new(fuegod_host, fuegod_port));
        let state_mgr = Arc::new(RwLock::new(PrunedState::new()));

        let node = FuegoNode::new(
            storage_path_buf.clone(),
            rpc.clone() as Arc<dyn NetworkProvider>,
            state_mgr,
            NodeMode::Client,
            fuego_node::NetworkMode::Auto,
            None,
        );

        let store_inner = ChunkStore::open(storage_path_buf.join("chunks.db"), 512 * 1024 * 1024)
            .map_err(|e| format!("Store error: {e:?}"))?;
        let store = Arc::new(Mutex::new(store_inner));

        let audio = Arc::new(Mutex::new(AudioStreamer::new(
            Arc::clone(&store),
            None, // no prefetcher in light mode
        )));

        Ok(DigmCore {
            vault: Arc::new(Mutex::new(vault)),
            node: Arc::new(Mutex::new(node)),
            app: Arc::new(Mutex::new(app)),
            router: None,
            store,
            audio,
            prefetcher: None,
            rpc_client: Some(rpc),
        })
    }


    /// Sync the node via RPC and feed blocks to the DIGM scanner.
    pub async fn sync_and_scan(&self) -> Result<(), String> {
        let rpc = self.rpc_client.as_ref().ok_or("No RPC client — use new_rpc() constructor")?;

        // Register scanner as block observer
        {
            let app = self.app.lock().unwrap();
            let scanner = app.scanner.clone();
            let observer = Arc::new(ScannerBlockObserver { scanner });
            let mut node = self.node.lock().unwrap();
            node.add_observer(observer);
        }

        let node = self.node.lock().unwrap();
        node.sync_with_scan(rpc).await.map_err(|e| e.to_string())
    }



    pub fn get_address(&self, index: u32) -> String {
        let vault = self.vault.lock().unwrap();
        vault.get_address(index).0
    }

    pub fn sync_node(&self) -> Result<(), String> {
        // Try RPC sync with scanner feed if available
        if self.rpc_client.is_some() {
            futures::executor::block_on(self.sync_and_scan()).map_err(|e| e.to_string())?;
        } else {
            let node = self.node.lock().unwrap();
            futures::executor::block_on(node.sync()).map_err(|e| e.to_string())?;
        }
        Ok(())
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

    pub fn unstake_single(&self, address: String, track_id: String) -> Result<u64, String> {
        let app = self.app.lock().unwrap();
        app.unstake_single(&Address::from(address), &track_id)
    }

    pub fn unstake_album(&self, address: String, album_id: String) -> Result<u64, String> {
        let app = self.app.lock().unwrap();
        app.unstake_album(&Address::from(address), &album_id)
    }

    pub fn purchase_album(&self, address: String, album_id: String, amount: u64) -> Result<(), String> {
        let app = self.app.lock().unwrap();
        app.purchase_album(&Address::from(address), &album_id, amount)
    }

    pub fn earn_para(&self, address: String, amount: u128) {
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

    pub fn stream_payment(&self, from: String, to: String, amount: u128) -> Result<(), String> {
        let app = self.app.lock().unwrap();
        app.stream_payment(&Address::from(from), &Address::from(to), amount)
    }

    pub fn get_current_earnings(&self, address: String) -> u64 {
        let app = self.app.lock().unwrap();
        let addr = Address::from(address);
        app.get_current_earnings(&addr)
    }

    pub fn get_para_balance(&self, address: String) -> u128 {
        let app = self.app.lock().unwrap();
        app.get_para_balance(&Address::from(address))
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

    // --- DIGM token / anti-spam gate ---

    pub fn acquire_digm_heat(&self, address: String) -> Result<u64, String> {
        let app = self.app.lock().unwrap();
        app.acquire_digm_heat(&Address::from(address))
    }

    pub fn acquire_digm_xfg(&self, address: String) -> Result<u64, String> {
        let app = self.app.lock().unwrap();
        app.acquire_digm_xfg(&Address::from(address))
    }

    pub fn consume_held_digm(&self, address: String) -> Result<u64, String> {
        let app = self.app.lock().unwrap();
        app.consume_held_digm(&Address::from(address))
    }

    pub fn digm_pool_stats(&self) -> String {
        let app = self.app.lock().unwrap();
        serde_json::to_string(&app.digm_pool_stats()).unwrap_or_else(|_| "{}".into())
    }

    pub fn singles_remaining(&self) -> u64 {
        let app = self.app.lock().unwrap();
        app.singles_remaining()
    }

    pub fn is_single_catalogue_full(&self) -> bool {
        let app = self.app.lock().unwrap();
        app.is_single_catalogue_full()
    }

    pub fn get_unspent_digm(&self, address: String) -> u64 {
        let app = self.app.lock().unwrap();
        app.get_unspent_digm(&Address::from(address))
    }


    pub fn vote_for_single(&self, address: String, track_id: String) -> Result<(), String> {
        let app = self.app.lock().unwrap();
        app.vote_for_single(&Address::from(address), &track_id)
    }

    // --- Stations ---

    pub fn create_station(&self, curator: String, station_id: String, name: String, description: String, tracks: Vec<String>) -> Result<(), String> {
        let app = self.app.lock().unwrap();
        app.create_station(&Address::from(curator), station_id, name, description, tracks)
    }

    pub fn get_curator_stations(&self, curator: String) -> String {
        let app = self.app.lock().unwrap();
        let stations = app.get_curator_stations(&Address::from(curator));
        serde_json::to_string(&stations).unwrap_or_else(|_| "[]".to_string())
    }

    pub fn curator_stations_remaining(&self, curator: String) -> u64 {
        let app = self.app.lock().unwrap();
        app.curator_stations_remaining(&Address::from(curator))
    }

    pub fn update_curator_vibe(&self, curator: String, vibe: String) -> Result<(), String> {
        let app = self.app.lock().unwrap();
        app.update_curator_vibe(&Address::from(curator), vibe)
    }

    pub fn get_curator_vibe(&self, curator: String) -> Option<String> {
        let app = self.app.lock().unwrap();
        app.get_curator_vibe(&Address::from(curator))
    }

    pub fn set_curator_playlist(&self, curator: String, tracks: Vec<String>) -> Result<(), String> {
        let app = self.app.lock().unwrap();
        app.set_curator_playlist(&Address::from(curator), tracks)
    }

    pub fn get_curator_playlist(&self, curator: String) -> String {
        let app = self.app.lock().unwrap();
        let tracks = app.get_curator_playlist(&Address::from(curator));
        serde_json::to_string(&tracks).unwrap_or_else(|_| "[]".to_string())
    }

    // --- End Stations ---


    pub fn load_track(&self, chunk_hashes: Vec<String>) -> Result<(), String> {
        {
            let mut audio = self.audio.lock().unwrap();
            audio.load_track(chunk_hashes.clone()).map_err(|e| e.to_string())?;
        }
        if let Some(ref pf) = self.prefetcher {
            let pf = Arc::clone(pf);
            tokio::spawn(async move {
                pf.set_track(chunk_hashes).await;
            });
        }
        Ok(())
    }

    pub fn next_pcm_frame(&self) -> Result<Vec<f32>, String> {
        let mut audio = self.audio.lock().unwrap();
        audio.next_pcm_frame().map_err(|e| e.to_string())
    }

    pub fn play_track(&self, chunk_hashes: Vec<String>) -> Result<(), String> {
        let mut audio = self.audio.lock().unwrap();
        audio.load_track(chunk_hashes).map_err(|e| e.to_string())
    }

    // --- Networking ---

    pub fn our_i2p_destination(&self) -> Option<String> {
        self.router.as_ref().and_then(|r| r.our_destination()).map(|s| s.to_string())
    }

    pub fn add_seeders(&self, destinations: Vec<String>) {
        if let Some(ref pf) = self.prefetcher {
            let pf = Arc::clone(pf);
            tokio::spawn(async move {
                pf.add_seeders(destinations).await;
            });
        }
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

    // --- ParaPay delegation ---

    pub fn init_parapay(&self) -> Result<(), String> {
        let app = self.app.lock().unwrap();
        app.init_parapay()
    }

    pub fn parapay_begin(
        &self,
        track_length_sec: u32,
        curator_present: bool,
        artist: String,
        listener: String,
        curator: Option<String>,
    ) -> Result<String, String> {
        let app = self.app.lock().unwrap();
        app.parapay_begin(track_length_sec, curator_present, &artist, &listener, curator.as_deref())
    }

    pub fn parapay_tick(&self, stream_id: String, pos_sec: u32) -> Result<(), String> {
        let app = self.app.lock().unwrap();
        app.parapay_tick(&stream_id, pos_sec)
    }

    pub fn parapay_boost(&self, stream_id: String) -> Result<u32, String> {
        let app = self.app.lock().unwrap();
        app.parapay_boost(&stream_id)
    }

    pub fn parapay_end(&self, stream_id: String, skipped: bool) -> Result<(), String> {
        let app = self.app.lock().unwrap();
        app.parapay_end(&stream_id, skipped)
    }

    pub fn parapay_begin_simple(&self, track_length_sec: u32) -> Result<String, String> {
        let app = self.app.lock().unwrap();
        app.init_parapay()?;
        app.parapay_begin(track_length_sec, false, "artist", "listener", None)
    }
}

pub fn init_ffi() {
    println!("FFI Bridge initialized");
}
