use anyhow::{Context, Result};
use async_trait::async_trait;
use futures::StreamExt;
use libp2p::{
    core::upgrade,
    gossipsub::{self, MessageId},
    identify,
    identity::Keypair,
    kad::{self, store::MemoryStore, QueryResult},
    mdns,
    noise, ping,
    swarm::{NetworkBehaviour, Swarm, SwarmEvent},
    tcp, yamux, Multiaddr, PeerId, Transport,
};
use std::hash::{DefaultHasher, Hash, Hasher};
use std::time::Duration;
use tokio::sync::{mpsc, oneshot};
use tokio_util::compat::FuturesAsyncReadCompatExt;

// ---------------------------------------------------------------------------
// Stream opening command
// ---------------------------------------------------------------------------

struct StreamCmd {
    peer: PeerId,
    reply: oneshot::Sender<Result<libp2p::Stream>>,
}

// ---------------------------------------------------------------------------
// Combined behaviour
// ---------------------------------------------------------------------------

#[derive(NetworkBehaviour)]
#[behaviour(to_swarm = "DigmEvent")]
struct DigmBehaviour {
    kad: kad::Behaviour<MemoryStore>,
    mdns: mdns::tokio::Behaviour,
    gossipsub: gossipsub::Behaviour,
    identify: identify::Behaviour,
    ping: ping::Behaviour,
}

#[derive(Debug)]
enum DigmEvent {
    Kad(kad::Event),
    Mdns(mdns::Event),
    Gossipsub(gossipsub::Event),
    Identify(identify::Event),
    Ping(#[allow(dead_code)] ping::Event),
}

impl From<kad::Event> for DigmEvent { fn from(e: kad::Event) -> Self { Self::Kad(e) } }
impl From<mdns::Event> for DigmEvent { fn from(e: mdns::Event) -> Self { Self::Mdns(e) } }
impl From<gossipsub::Event> for DigmEvent { fn from(e: gossipsub::Event) -> Self { Self::Gossipsub(e) } }
impl From<identify::Event> for DigmEvent { fn from(e: identify::Event) -> Self { Self::Identify(e) } }
impl From<ping::Event> for DigmEvent { fn from(e: ping::Event) -> Self { Self::Ping(e) } }

// ---------------------------------------------------------------------------
// P2PProvider trait
// ---------------------------------------------------------------------------

pub use tokio::io::{AsyncRead, AsyncWrite};
pub trait AsyncStream: AsyncRead + AsyncWrite + Send + Unpin {}
impl<T: AsyncRead + AsyncWrite + Send + Unpin> AsyncStream for T {}

#[async_trait]
pub trait P2PProvider: Send + Sync {
    async fn connect(&self, peer_id: &str) -> Result<Box<dyn AsyncStream>>;
    fn local_peer_id(&self) -> PeerId;
}

// ---------------------------------------------------------------------------
// Libp2pProvider
// ---------------------------------------------------------------------------

pub struct Libp2pProvider {
    peer_id: PeerId,
    cmd_tx: mpsc::Sender<StreamCmd>,
}

impl Libp2pProvider {
    pub async fn new(bootstrap_peers: Vec<Multiaddr>) -> Result<Self> {
        let keypair = Keypair::generate_ed25519();
        let peer_id = PeerId::from(keypair.public());

        // --- Transport stack (TCP + Noise + Yamux) ---
        let transport = tcp::tokio::Transport::new(tcp::Config::default().nodelay(true))
            .upgrade(upgrade::Version::V1Lazy)
            .authenticate(noise::Config::new(&keypair).context("Noise config")?)
            .multiplex(yamux::Config::default())
            .boxed();

        // --- Behaviours ---
        let kad = kad::Behaviour::new(
            peer_id,
            MemoryStore::new(peer_id),
        );
        let mdns = mdns::tokio::Behaviour::new(mdns::Config::default(), peer_id)?;
        let gossipsub = gossipsub::Behaviour::new(
            gossipsub::MessageAuthenticity::Signed(keypair.clone()),
            gossipsub::ConfigBuilder::default()
                .heartbeat_interval(Duration::from_secs(10))
                .validation_mode(gossipsub::ValidationMode::Strict)
                .message_id_fn(|msg| {
                    let mut h = DefaultHasher::new();
                    msg.data.hash(&mut h);
                    MessageId::from(h.finish().to_string())
                })
                .build()
                .map_err(|e| anyhow::anyhow!("Gossipsub config: {e}"))?,
        )
        .map_err(|e| anyhow::anyhow!("Gossipsub setup: {e}"))?;
        let identify = identify::Behaviour::new(
            identify::Config::new("/digm/1.0.0".into(), keypair.public())
                .with_agent_version(format!("digm-platform/{}", env!("CARGO_PKG_VERSION"))),
        );
        let ping = ping::Behaviour::new(ping::Config::new());

        let behaviour = DigmBehaviour { kad, mdns, gossipsub, identify, ping };

        // --- Swarm ---
        let mut swarm = Swarm::new(
            transport,
            behaviour,
            peer_id,
            libp2p::swarm::Config::with_tokio_executor(),
        );

        swarm.listen_on("/ip4/0.0.0.0/tcp/0".parse().unwrap())
            .map_err(|e| anyhow::anyhow!("listen_on failed: {e}"))?;

        for addr in &bootstrap_peers {
            swarm.dial(addr.clone())?;
        }

        let (cmd_tx, cmd_rx) = mpsc::channel::<StreamCmd>(32);
        tokio::spawn(run_swarm(swarm, cmd_rx));

        Ok(Self { peer_id, cmd_tx })
    }
}

#[async_trait]
impl P2PProvider for Libp2pProvider {
    async fn connect(&self, peer_id_str: &str) -> Result<Box<dyn AsyncStream>> {
        let peer: PeerId = peer_id_str.parse().context("Invalid PeerId")?;
        let (tx, rx) = oneshot::channel();
        self.cmd_tx.send(StreamCmd { peer, reply: tx }).await
            .map_err(|_| anyhow::anyhow!("Swarm event loop dropped"))?;
        let stream = rx.await
            .map_err(|_| anyhow::anyhow!("Stream request cancelled"))??;
        Ok(Box::new(stream.compat()))
    }

    fn local_peer_id(&self) -> PeerId { self.peer_id }
}

// ---------------------------------------------------------------------------
// Swarm event loop
// ---------------------------------------------------------------------------

async fn run_swarm(
    mut swarm: Swarm<DigmBehaviour>,
    mut cmd_rx: mpsc::Receiver<StreamCmd>,
) {
    let mut pending_dials: Vec<(PeerId, oneshot::Sender<Result<libp2p::Stream>>)> = Vec::new();

    loop {
        tokio::select! {
            event = swarm.select_next_some() => {
                handle_swarm_event(&mut swarm, event, &mut pending_dials);
            }
            cmd = cmd_rx.recv() => {
                match cmd {
                    Some(StreamCmd { peer, reply }) => {
                        match swarm.dial(peer) {
                            Ok(()) => pending_dials.push((peer, reply)),
                            Err(e) => { let _ = reply.send(Err(e.into())); }
                        }
                    }
                    None => break,
                }
            }
        }
    }
}

fn handle_swarm_event(
    swarm: &mut Swarm<DigmBehaviour>,
    event: SwarmEvent<DigmEvent>,
    pending_dials: &mut Vec<(PeerId, oneshot::Sender<Result<libp2p::Stream>>)>,
) {
    match event {
        SwarmEvent::Behaviour(DigmEvent::Kad(kad::Event::OutboundQueryProgressed {
            result: QueryResult::GetRecord(Ok(kad::GetRecordOk::FoundRecord(record))),
            ..
        })) => {
            tracing::debug!("Kademlia found record: {:?}", record.record.key);
        }
        SwarmEvent::Behaviour(DigmEvent::Kad(kad::Event::RoutingUpdated {
            peer, is_new_peer, ..
        })) => {
            if is_new_peer {
                tracing::info!("New peer in routing table: {peer}");
            }
        }
        SwarmEvent::Behaviour(DigmEvent::Mdns(mdns::Event::Discovered(list))) => {
            for (peer, addr) in list {
                tracing::info!("mDNS discovered: {peer} at {addr}");
                swarm.behaviour_mut().kad.add_address(&peer, addr);
            }
        }
        SwarmEvent::Behaviour(DigmEvent::Identify(identify::Event::Received {
            peer_id, info, ..
        })) => {
            tracing::info!("Identify from {peer_id}: {} ({})",
                info.agent_version, info.protocol_version);
        }
        SwarmEvent::Behaviour(DigmEvent::Gossipsub(gossipsub::Event::Message {
            message, ..
        })) => {
            tracing::debug!("Gossipsub message from {:?} on topic {:?}",
                message.source, message.topic);
        }
        SwarmEvent::ConnectionEstablished { peer_id, .. } => {
            tracing::info!("Connection established with {peer_id}");
            if let Some(pos) = pending_dials.iter().position(|(p, _)| *p == peer_id) {
                let (_, sender) = pending_dials.remove(pos);
                let _ = sender.send(Err(anyhow::anyhow!(
                    "Connected to {peer_id} — stream protocol negotiation not yet implemented (Phase 2.1)"
                )));
            }
        }
        SwarmEvent::OutgoingConnectionError { peer_id, error, .. } => {
            tracing::warn!("Connection to {peer_id:?} failed: {error}");
            if let Some(peer_id) = peer_id {
                if let Some(pos) = pending_dials.iter().position(|(p, _)| *p == peer_id) {
                    let (_, sender) = pending_dials.remove(pos);
                    let _ = sender.send(Err(anyhow::anyhow!("Connection failed: {error}")));
                }
            }
        }
        SwarmEvent::NewListenAddr { address, .. } => {
            tracing::info!("Listening on {address}");
        }
        _ => {}
    }
}

pub fn init() {
    println!("P2P-Net (libp2p + Kademlia + mDNS + Gossipsub) initialized");
}
