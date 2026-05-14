use anyhow::{Result, Context};
use serde::{Serialize, Deserialize};
use std::process::Child;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use std::sync::atomic::{AtomicUsize, Ordering};
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};
use std::pin::Pin;
use std::task::{Context as TaskContext, Poll};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct I2pDestination {
    pub destination: String,
    pub private_key: String,
}

pub struct I2pRouter {
    api_url: String,
    process: Option<Child>,
    config_path: PathBuf,
}

impl I2pRouter {
    pub fn new(config_path: PathBuf, api_port: u16) -> Self {
        Self {
            api_url: format!("http://127.0.0.1:{}/api", api_port),
            process: None,
            config_path,
        }
    }

    pub async fn start(&mut self) -> Result<()> {
        println!("Starting I2P router (i2pd)...");
        Ok(())
    }

    pub async fn stop(&mut self) -> Result<()> {
        if let Some(mut child) = self.process.take() {
            child.kill()?;
        }
        Ok(())
    }

    pub async fn get_my_destination(&self) -> Result<I2pDestination> {
        let client = reqwest::Client::new();
        let res = client.get(format!("{}/destination", self.api_url))
            .send()
            .await?
            .json::<I2pDestination>()
            .await?;
        
        Ok(res)
    }

    pub async fn create_tunnel(&self, local_port: u16, remote_destination: &str) -> Result<()> {
        let client = reqwest::Client::new();
        let payload = serde_json::json!({
            "local_port": local_port,
            "remote": remote_destination
        });
        
        client.post(format!("{}/tunnels", self.api_url))
            .json(&payload)
            .send()
            .await?;
            
        Ok(())
    }
}

pub struct I2pStream {
    stream: tokio::net::TcpStream,
}

pub struct SeedingManager {
    router: Arc<I2pRouter>,
    chunk_store: Arc<dyn ChunkStoreTrait>,
    listen_port: u16,
    is_enabled: Arc<tokio::sync::RwLock<bool>>,
    worker_handle: Mutex<Option<JoinHandle<()>>>,
}

impl SeedingManager {
    pub fn new(router: Arc<I2pRouter>, chunk_store: Arc<dyn ChunkStoreTrait>, listen_port: u16) -> Self {
        Self {
            router,
            chunk_store,
            listen_port,
            is_enabled: Arc::new(tokio::sync::RwLock::new(false)),
            worker_handle: Mutex::new(None),
        }
    }

    pub async fn set_enabled(&self, enabled: bool) {
        let mut lock = self.is_enabled.write().await;
        *lock = enabled;
        if enabled {
            self.start_worker().await;
        }
    }

    async fn start_worker(&self) {
        let mut handle_lock = self.worker_handle.lock().await;
        if handle_lock.is_some() {
            return;
        }

        let store = Arc::clone(&self.chunk_store);
        let enabled = Arc::clone(&self.is_enabled);
        let port = self.listen_port;

        let handle = tokio::spawn(async move {
            let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port)).await
                .expect("Failed to bind seeding listener");
            
            println!("Seeding listener started on port {}", port);

            loop {
                if !*enabled.read().await {
                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                    continue;
                }

                if let Ok((mut stream, _)) = listener.accept().await {
                    let store_clone = Arc::clone(&store);
                    tokio::spawn(async move {
                        let mut buf = [0u8; 64];
                        if let Ok(n) = tokio::io::AsyncReadExt::read(&mut stream, &mut buf).await {
                            if n > 0 {
                                let hash_str = String::from_utf8_lossy(&buf[..n]).trim().to_string();
                                if let Ok(data) = store_clone.get_chunk(&hash_str) {
                                    let _ = tokio::io::AsyncWriteExt::write_all(&mut stream, &data).await;
                                }
                            }
                        }
                    });
                }
            }
        });

        *handle_lock = Some(handle);
    }
}

impl I2pStream {
    pub async fn connect(local_port: u16) -> Result<Self, anyhow::Error> {
        let stream = tokio::net::TcpStream::connect(format!("127.0.0.1:{}", local_port)).await?;
        Ok(I2pStream { stream })
    }

    pub async fn write_all(&mut self, data: &[u8]) -> Result<(), anyhow::Error> {
        AsyncWriteExt::write_all(&mut self.stream, data).await?;
        Ok(())
    }

    pub async fn read_exact(&mut self, buf: &mut [u8]) -> Result<(), anyhow::Error> {
        AsyncReadExt::read_exact(&mut self.stream, buf).await?;
        Ok(())
    }
}

impl AsyncRead for I2pStream {
    fn poll_read(
        mut self: Pin<&mut Self>,
        cx: &mut TaskContext<'_>,
        buf: &mut tokio::io::ReadBuf<'_>,
    ) -> Poll<std::io::Result<()>> {
        Pin::new(&mut self.stream).poll_read(cx, buf)
    }
}

impl AsyncWrite for I2pStream {
    fn poll_write(
        mut self: Pin<&mut Self>,
        cx: &mut TaskContext<'_>,
        buf: &[u8],
    ) -> Poll<std::io::Result<usize>> {
        Pin::new(&mut self.stream).poll_write(cx, buf)
    }

    fn poll_flush(
        mut self: Pin<&mut Self>,
        cx: &mut TaskContext<'_>,
    ) -> Poll<std::io::Result<()>> {
        Pin::new(&mut self.stream).poll_flush(cx)
    }

    fn poll_shutdown(
        mut self: Pin<&mut Self>,
        cx: &mut TaskContext<'_>,
    ) -> Poll<std::io::Result<()>> {
        Pin::new(&mut self.stream).poll_shutdown(cx)
    }
}

/// Manages predictive pre-fetching of audio chunks to ensure gapless playback.
pub struct PrefetchManager {
    router: Arc<I2pRouter>,
    chunk_store: Arc<dyn ChunkStoreTrait>,
    current_track_chunks: Mutex<Vec<String>>,
    playback_position: Arc<AtomicUsize>,
    prefetch_window: usize,
    worker_handle: Mutex<Option<JoinHandle<()>>>,
}

pub trait ChunkStoreTrait: Send + Sync {
    fn put_chunk(&self, data: &[u8]) -> Result<String, anyhow::Error>;
    fn get_chunk(&self, hash_str: &str) -> Result<Vec<u8>, anyhow::Error>;
    fn pin_chunk(&self, hash_str: &str) -> Result<(), anyhow::Error>;
}

impl PrefetchManager {
    pub fn new(router: Arc<I2pRouter>, chunk_store: Arc<dyn ChunkStoreTrait>, prefetch_window: usize) -> Self {
        Self {
            router,
            chunk_store,
            current_track_chunks: Mutex::new(Vec::new()),
            playback_position: Arc::new(AtomicUsize::new(0)),
            prefetch_window,
            worker_handle: Mutex::new(None),
        }
    }

    pub async fn set_track(&self, chunks: Vec<String>) {
        let mut current = self.current_track_chunks.lock().await;
        *current = chunks;
        self.playback_position.store(0, Ordering::SeqCst);
        self.start_worker().await;
    }

    pub fn update_position(&self, position: usize) {
        self.playback_position.store(position, Ordering::SeqCst);
    }

    async fn start_worker(&self) {
        let mut handle_lock = self.worker_handle.lock().await;
        if handle_lock.is_some() {
            return;
        }

        let router = Arc::clone(&self.router);
        let store = Arc::clone(&self.chunk_store);
        let chunks_ptr = Arc::new(Mutex::new(Vec::<String>::new()));
        {
            let mut current = self.current_track_chunks.lock().await;
            *chunks_ptr.lock().await = current.clone();
        }
        let pos = Arc::clone(&self.playback_position);
        let window = self.prefetch_window;

        let handle = tokio::spawn(async move {
            loop {
                let current_pos = pos.load(Ordering::SeqCst);
                let chunks = chunks_ptr.lock().await.clone();
                
                if chunks.is_empty() {
                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                    continue;
                }

                let end = (current_pos + window).min(chunks.len());
                for i in current_pos..end {
                    let chunk_hash = &chunks[i];
                    // Check if already in store
                    if store.get_chunk(chunk_hash).is_err() {
                        // Fetch via I2P (Simulation of fetch_chunk)
                        if let Ok(data) = fetch_chunk_from_i2p(&router, chunk_hash).await {
                            let _ = store.put_chunk(&data);
                        }
                    }
                }
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            }
        });

        *handle_lock = Some(handle);
    }
}

async fn fetch_chunk_from_i2p(router: &I2pRouter, chunk_hash: &str) -> Result<Vec<u8>> {
    // In a real implementation, this would:
    // 1. Find a seeder for the chunk_hash via netDb.
    // 2. Create a tunnel to the seeder.
    // 3. Request the chunk data.
    // For now, we simulate a successful fetch.
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    Ok(vec![0u8; 256 * 1024]) // Return a dummy 256KB chunk
}

pub fn init() {
    println!("I2P Net initialized");
}
