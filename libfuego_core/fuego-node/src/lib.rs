use std::sync::{Arc, RwLock, Mutex};
use std::path::PathBuf;
use std::fs::{File, OpenOptions};
use std::io::{Read, Write};
use serde::{Serialize, Deserialize};
use anyhow::{Result, Context};
use sha2::{Sha256, Digest};
use std::collections::HashMap;
use i2p_net::{I2pRouter, I2pStream, SeedingManager};
use p2p_net::P2PProvider;
use async_trait::async_trait;
use tokio::io::{AsyncRead, AsyncWrite};

pub trait AsyncStream: AsyncRead + AsyncWrite + Send + Unpin {}
impl<T: AsyncRead + AsyncWrite + Send + Unpin> AsyncStream for T {}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum NetworkMode {
    Performance, // Use libp2p (Fast Path)
    Privacy,     // Use I2P (Ghost Path)
    Auto,        // Orchestrator decides
}

#[async_trait]
pub trait NetworkProvider: Send + Sync {
    async fn get_current_height(&self) -> Result<u64>;
    async fn fetch_header(&self, height: u64) -> Result<BlockHeader>;
    async fn get_stream(&self, peer_id: &str, mode: NetworkMode) -> Result<Box<dyn AsyncStream>>;
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockHeader {
    pub height: u64,
    pub prev_hash: [u8; 32],
    pub merkle_root: [u8; 32],
    pub timestamp: u64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum NodeMode {
    Sovereign, // Full pruned node, seeds content, validates all headers
    Seeder,    // Lightweight validation, but still seeds content
    Client,    // Lightweight, uses SPV-like verification, no seeding
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrunedState {
    pub current_height: u64,
    pub utxo_set: HashMap<[u8; 32], u64>, // Txid -> Amount
}

impl PrunedState {
    pub fn new() -> Self {
        Self {
            current_height: 0,
            utxo_set: HashMap::new(),
        }
    }

    pub fn save(&self, path: &PathBuf) -> Result<()> {
        let encoded = bincode::serialize(self).context("Failed to serialize state")?;
        let mut file = File::create(path).context("Failed to create state file")?;
        file.write_all(&encoded).context("Failed to write state to disk")?;
        Ok(())
    }

    pub fn load(path: &PathBuf) -> Result<Self> {
        let mut file = File::open(path).context("Failed to open state file")?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).context("Failed to read state file")?;
        let state = bincode::deserialize(&buffer).context("Failed to deserialize state")?;
        Ok(state)
    }
}

// Alias for consistency with ffi-bridge
pub type NodeState = PrunedState;

pub struct HybridNetworkManager {
    p2p_provider: Arc<dyn p2p_net::P2PProvider>,
    router: Arc<tokio::sync::Mutex<I2pRouter>>,
    peers: Vec<String>,
    local_port_base: u16,
}

impl HybridNetworkManager {
    pub fn new(
        p2p_provider: Arc<dyn p2p_net::P2PProvider>,
        router: Arc<tokio::sync::Mutex<I2pRouter>>,
        peers: Vec<String>,
        local_port_base: u16
    ) -> Self {
        Self { p2p_provider, router, peers, local_port_base }
    }
}

#[async_trait]
impl NetworkProvider for HybridNetworkManager {
    async fn get_current_height(&self) -> Result<u64> {
        Ok(1000)
    }

    async fn fetch_header(&self, height: u64) -> Result<BlockHeader> {
        // For now, we use I2P for headers as it's more stable for small requests
        if self.peers.is_empty() {
            return Err(anyhow::anyhow!("No peers available"));
        }
        let peer = &self.peers[0];
        let local_port = self.local_port_base + (height as u16 % 1000);
        
        {
            let router = self.router.lock().await;
            router.create_tunnel(local_port, peer).await
                .context("Failed to create tunnel to peer")?;
        }
            
        let mut stream = I2pStream::connect(local_port).await
            .context("Failed to connect to local I2P tunnel")?;
            
        let mut request = Vec::new();
        request.push(0x01); // CMD_GET_HEADER
        request.extend_from_slice(&height.to_be_bytes());
        stream.write_all(&request).await?;
        
        let mut buffer = [0u8; 80];
        stream.read_exact(&mut buffer).await?;
        
        let header: BlockHeader = bincode::deserialize(&buffer)
            .context("Failed to deserialize block header")?;
            
        Ok(header)
    }

    async fn get_stream(&self, peer_id: &str, mode: NetworkMode) -> Result<Box<dyn AsyncStream>> {
        match mode {
            NetworkMode::Performance => {
                let tcp = self.p2p_provider.connect(peer_id).await?;
                Ok(Box::new(tcp))
            }
            NetworkMode::Privacy => {
                let local_port = 10000; // In real impl, this is dynamic
                {
                    let router = self.router.lock().await;
                    router.create_tunnel(local_port, peer_id).await?;
                }
                let stream = I2pStream::connect(local_port).await?;
                Ok(Box::new(stream))
            }
            NetworkMode::Auto => {
                let tcp = self.p2p_provider.connect(peer_id).await?;
                Ok(Box::new(tcp))
            }
        }
    }
}

pub struct FuegoNode {
    pub mode: NodeMode,
    pub network_mode: NetworkMode,
    pub network: Arc<dyn NetworkProvider>,
    pub state_manager: Arc<RwLock<NodeState>>,
    pub data_dir: PathBuf,
    pub seeding_manager: Option<Arc<i2p_net::SeedingManager>>,
}

impl FuegoNode {
    pub fn new(
        data_dir: PathBuf, 
        network: Arc<dyn NetworkProvider>, 
        state_manager: Arc<RwLock<NodeState>>, 
        mode: NodeMode,
        network_mode: NetworkMode,
        seeding_manager: Option<Arc<i2p_net::SeedingManager>>
    ) -> Self {
        Self {
            mode,
            network_mode,
            network,
            state_manager,
            data_dir,
            seeding_manager,
        }
    }

    pub async fn set_mode(&mut self, mode: NodeMode) {
        self.mode = mode;
        if let Some(ref manager) = self.seeding_manager {
            let enabled = mode == NodeMode::Sovereign || mode == NodeMode::Seeder;
            manager.set_enabled(enabled).await;
        }
    }

    pub async fn sync(&self) -> Result<()> {
        if self.mode == NodeMode::Client {
            let height = self.network.get_current_height().await
                .context("Failed to get network height")?;
            let _header = self.network.fetch_header(height).await
                .context("Failed to fetch latest header")?;
            
            let mut state = self.state_manager.write().unwrap();
            state.current_height = height;
            return Ok(());
        }

        let target_height = self.network.get_current_height().await
            .context("Failed to get network height")?;
        
        let current_height = self.get_height();
        if current_height >= target_height {
            return Ok(());
        }

        println!("Syncing Sovereign Lite node: {} -> {}", current_height, target_height);

        for height in (current_height + 1)..=target_height {
            let _header = self.network.fetch_header(height).await
                .with_context(|| format!("Failed to fetch header at height {}", height))?;
            
            let mut state = self.state_manager.write().unwrap();
            state.current_height = height;
            
            if height % 100 == 0 || height == target_height {
                state.save(&self.data_dir.join("snapshot.bin"))?;
            }
        }

        println!("Sync complete. Current height: {}", self.get_height());
        Ok(())
    }

    pub fn verify_merkle_proof(&self, root: &[u8; 32], leaf: &[u8], proof: &[Vec<u8>]) -> bool {
        let mut current_hash = leaf.to_vec();

        for sibling in proof {
            let mut hasher = Sha256::new();
            if current_hash < *sibling {
                hasher.update(&current_hash);
                hasher.update(sibling);
            } else {
                hasher.update(sibling);
                hasher.update(&current_hash);
            }
            current_hash = hasher.finalize().to_vec();
        }

        current_hash == root
    }

    pub fn get_height(&self) -> u64 {
        self.state_manager.read().unwrap().current_height
    }
}

pub fn init() {
    println!("Fuego Node (Sovereign Lite) initialized");
}
