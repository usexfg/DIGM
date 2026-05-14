use libp2p::{PeerId, identity};
use anyhow::{Result, Context};
use async_trait::async_trait;

#[async_trait]
pub trait P2PProvider: Send + Sync {
    async fn connect(&self, addr: &str) -> Result<tokio::net::TcpStream>;
    fn get_local_peer_id(&self) -> PeerId;
}

pub struct Libp2pProvider {
    peer_id: PeerId,
}

impl Libp2pProvider {
    pub async fn new() -> Result<Self> {
        let local_key = identity::Keypair::generate_ed25519();
        let peer_id = PeerId::from(local_key.public());

        Ok(Self { peer_id })
    }
}

#[async_trait]
impl P2PProvider for Libp2pProvider {
    async fn connect(&self, _addr: &str) -> Result<tokio::net::TcpStream> {
        // Placeholder: will dial via libp2p swarm once integrated
        let stream = tokio::net::TcpStream::connect("127.0.0.1:9999").await
            .context("Failed to establish p2p stream")?;
        Ok(stream)
    }

    fn get_local_peer_id(&self) -> PeerId {
        self.peer_id
    }
}

pub fn init() {
    println!("P2P-Net (libp2p) initialized");
}
