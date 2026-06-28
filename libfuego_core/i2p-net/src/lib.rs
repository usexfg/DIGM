use anyhow::{anyhow, bail, Context, Result};
use std::collections::HashMap;
use std::path::PathBuf;
use std::pin::Pin;
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::task::{Context as TaskContext, Poll};
use std::time::Duration;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio::time::sleep;

const SAM_DEFAULT_PORT: u16 = 7656;

// ---------------------------------------------------------------------------
// SAM line I/O — reads exactly one line without over-reading
// ---------------------------------------------------------------------------

async fn sam_command(stream: &mut TcpStream, cmd: &str) -> Result<HashMap<String, String>> {
    stream.write_all(cmd.as_bytes()).await?;
    stream.write_all(b"\n").await?;
    let line = read_sam_line(stream).await?;
    Ok(parse_sam_kv(&line))
}

async fn read_sam_line(stream: &mut TcpStream) -> Result<String> {
    let mut buf = Vec::new();
    loop {
        let mut byte = [0u8; 1];
        stream.read_exact(&mut byte).await?;
        if byte[0] == b'\n' {
            break;
        }
        buf.push(byte[0]);
    }
    String::from_utf8(buf).context("SAM response contained non-UTF8 bytes")
}

fn parse_sam_kv(line: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    for token in line.split(' ') {
        if let Some((k, v)) = token.split_once('=') {
            map.insert(k.to_string(), v.to_string());
        }
    }
    map
}

fn check_sam_result(fields: &HashMap<String, String>, context: &str) -> Result<()> {
    match fields.get("RESULT").map(|s| s.as_str()) {
        Some("OK") => Ok(()),
        Some(other) => {
            let msg = fields
                .get("MESSAGE")
                .cloned()
                .unwrap_or_else(|| format!("RESULT={other}"));
            bail!("SAM {context} failed: {msg}")
        }
        None => bail!("SAM {context}: missing RESULT field in response"),
    }
}

// ---------------------------------------------------------------------------
// I2pRouter
// ---------------------------------------------------------------------------

/// Manages an i2pd daemon process and provides SAM-based I2P connectivity.
///
/// Call `start()` to launch i2pd and wait for the SAM bridge.  Once started
/// you can `connect()` to remote destinations or `bind()` to accept seed
/// connections.
pub struct I2pRouter {
    i2pd_binary: String,
    data_dir: PathBuf,
    sam_port: u16,
    http_port: u16,
    process: Option<Child>,
    our_destination: Option<String>,
}

impl I2pRouter {
    /// `i2pd_binary` — path to the i2pd executable (e.g. `"i2pd"`).
    /// `data_dir` — directory for i2pd keys, netDb, and config.
    pub fn new(i2pd_binary: String, data_dir: PathBuf) -> Self {
        Self {
            i2pd_binary,
            data_dir,
            sam_port: SAM_DEFAULT_PORT,
            http_port: 7070,
            process: None,
            our_destination: None,
        }
    }

    /// Connect to a running I2P router (i2pd or Java I2P) via its SAM
    /// bridge, or launch i2pd if none is already running.
    ///
    /// First checks whether a SAM bridge is already listening on
    /// `127.0.0.1:{sam_port}`.  If so, it assumes the user has the Java I2P
    /// app or a system i2pd service running and uses that directly.
    ///
    /// If no SAM bridge is found, it attempts to spawn `i2pd` as a child
    /// process with auto-generated config.
    pub async fn start(&mut self) -> Result<()> {
        // Try the SAM bridge first — covers Java I2P app, brew services, etc.
        if TcpStream::connect(format!("127.0.0.1:{}", self.sam_port))
            .await
            .is_ok()
        {
            self.our_destination = Some(self.fetch_our_destination().await?);
            return Ok(());
        }

        // No live SAM bridge — try to launch i2pd ourselves.
        std::fs::create_dir_all(&self.data_dir)
            .context("Failed to create i2pd data directory")?;

        let conf_path = self.data_dir.join("i2pd.conf");
        if !conf_path.exists() {
            let conf = format!(
                "sam.enabled=true\n\
                 sam.address=127.0.0.1\n\
                 sam.port={}\n\
                 http.enabled=true\n\
                 http.address=127.0.0.1\n\
                 http.port=7070\n",
                self.sam_port
            );
            std::fs::write(&conf_path, conf).context("Failed to write i2pd.conf")?;
        }

        let child = Command::new(&self.i2pd_binary)
            .arg("--datadir")
            .arg(&self.data_dir)
            .arg("--conf")
            .arg(&conf_path)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .with_context(|| {
                format!(
                    "i2pd not found at '{}' and no I2P router is already running.\n\
                     Install i2pd:  brew install i2pd\n\
                     Or run the Java I2P app: https://geti2p.net",
                    self.i2pd_binary
                )
            })?;

        self.process = Some(child);

        let deadline = tokio::time::Instant::now() + Duration::from_secs(30);
        loop {
            if tokio::time::Instant::now() > deadline {
                bail!("i2pd SAM bridge did not become ready within 30 seconds");
            }
            if TcpStream::connect(format!("127.0.0.1:{}", self.sam_port))
                .await
                .is_ok()
            {
                break;
            }
            sleep(Duration::from_millis(500)).await;
        }

        self.our_destination = Some(self.fetch_our_destination().await?);

        Ok(())
    }

    pub async fn stop(&mut self) {
        if let Some(mut child) = self.process.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }

    pub fn our_destination(&self) -> Option<&str> {
        self.our_destination.as_deref()
    }

    /// Connect to `remote_dest` (a base64 I2P destination) and return a
    /// fully-negotiated bidirectional I2P stream.
    pub async fn connect(&self, remote_dest: &str) -> Result<I2pStream> {
        let mut stream = TcpStream::connect(format!("127.0.0.1:{}", self.sam_port))
            .await
            .context("SAM bridge not reachable")?;

        let session_id = format!("digm_out_{}", fastrand::u64(..));

        check_sam_result(
            &sam_command(&mut stream, "HELLO VERSION MIN=3.1 MAX=3.1").await?,
            "HELLO",
        )?;

        check_sam_result(
            &sam_command(
                &mut stream,
                &format!(
                    "SESSION CREATE STYLE=STREAM ID={session_id} DESTINATION=TRANSIENT SIGNATURE_TYPE=7"
                ),
            )
            .await?,
            "SESSION CREATE",
        )?;

        check_sam_result(
            &sam_command(
                &mut stream,
                &format!("STREAM CONNECT ID={session_id} DESTINATION={remote_dest} SILENT=false"),
            )
            .await?,
            "STREAM CONNECT",
        )?;

        Ok(I2pStream { stream })
    }

    /// Bind an accept loop on our persistent destination.  Returns a
    /// [`SeedListener`] that accepts incoming seed requests.
    pub async fn bind(&self) -> Result<SeedListener> {
        let dest = self
            .our_destination
            .as_ref()
            .context("I2pRouter must be started before bind()")?
            .clone();

        Ok(SeedListener {
            sam_port: self.sam_port,
            destination: dest,
        })
    }

    async fn fetch_our_destination(&self) -> Result<String> {
        // Try i2pd HTTP API first (port 7070).
        if let Ok(dest) = Self::fetch_destination_via_http(self.http_port).await {
            return Ok(dest);
        }
        // Fall back to SAM named-destination (works on Java I2P too).
        Self::fetch_destination_via_sam(self.sam_port).await
    }

    async fn fetch_destination_via_http(http_port: u16) -> Result<String> {
        let url = format!("http://127.0.0.1:{}/?page=info", http_port);
        let resp = reqwest::get(&url)
            .await
            .context("i2pd HTTP API not reachable")?
            .text()
            .await?;
        let json: serde_json::Value =
            serde_json::from_str(&resp).context("Failed to parse i2pd info response")?;
        json["router"]["destination"]
            .as_str()
            .map(|s| s.to_string())
            .context("Could not extract destination from i2pd info response")
    }

    async fn fetch_destination_via_sam(sam_port: u16) -> Result<String> {
        let mut stream = TcpStream::connect(format!("127.0.0.1:{}", sam_port))
            .await
            .context("SAM bridge not reachable")?;

        let fields = sam_command(
            &mut stream,
            "HELLO VERSION MIN=3.1 MAX=3.1",
        )
        .await?;
        check_sam_result(&fields, "HELLO")?;

        let id = format!("digm_dest_{}", fastrand::u64(..));
        let fields = sam_command(
            &mut stream,
            &format!("SESSION CREATE STYLE=STREAM ID={id} DESTINATION=digm_seed SIGNATURE_TYPE=7"),
        )
        .await?;
        check_sam_result(&fields, "SESSION CREATE")?;

        fields
            .get("DESTINATION")
            .cloned()
            .context("SAM SESSION CREATE did not return a destination — ensure SAM is configured for persistent destinations")
    }
}

impl Drop for I2pRouter {
    fn drop(&mut self) {
        if let Some(mut child) = self.process.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

// ---------------------------------------------------------------------------
// I2pStream
// ---------------------------------------------------------------------------

pub struct I2pStream {
    stream: TcpStream,
}

impl I2pStream {
    pub async fn write_all(&mut self, data: &[u8]) -> Result<()> {
        AsyncWriteExt::write_all(&mut self.stream, data)
            .await
            .map_err(Into::into)
    }

    pub async fn read_exact(&mut self, buf: &mut [u8]) -> Result<()> {
        AsyncReadExt::read_exact(&mut self.stream, buf)
            .await
            .map(|_| ())
            .map_err(Into::into)
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

// ---------------------------------------------------------------------------
// SeedListener
// ---------------------------------------------------------------------------

pub struct SeedListener {
    sam_port: u16,
    destination: String,
}

impl SeedListener {
    /// Wait for a remote peer to connect to our seed destination.
    pub async fn accept(&self) -> Result<(I2pStream, String)> {
        let mut stream = TcpStream::connect(format!("127.0.0.1:{}", self.sam_port))
            .await
            .context("SAM bridge not reachable")?;

        let session_id = format!("digm_seed_{}", fastrand::u64(..));

        check_sam_result(
            &sam_command(&mut stream, "HELLO VERSION MIN=3.1 MAX=3.1").await?,
            "HELLO",
        )?;

        check_sam_result(
            &sam_command(
                &mut stream,
                &format!(
                    "SESSION CREATE STYLE=STREAM ID={session_id} DESTINATION={} SIGNATURE_TYPE=7",
                    self.destination
                ),
            )
            .await?,
            "SESSION CREATE",
        )?;

        let fields = sam_command(
            &mut stream,
            &format!("STREAM ACCEPT ID={session_id} SILENT=false"),
        )
        .await?;
        check_sam_result(&fields, "STREAM ACCEPT")?;

        let remote_dest = fields
            .get("DESTINATION")
            .cloned()
            .unwrap_or_else(|| "unknown".into());

        Ok((I2pStream { stream }, remote_dest))
    }
}

// ---------------------------------------------------------------------------
// Wire protocol for seed requests
// ---------------------------------------------------------------------------

const CMD_GET_CHUNK: u8 = 0x01;

async fn request_chunk(stream: &mut I2pStream, chunk_hash: &str) -> Result<Vec<u8>> {
    let hash_bytes = hex::decode(chunk_hash)
        .map_err(|_| anyhow!("Invalid chunk hash: {chunk_hash}"))?;

    if hash_bytes.len() != 32 {
        bail!("Chunk hash must be 32 bytes, got {}", hash_bytes.len());
    }

    let mut req = Vec::with_capacity(33);
    req.push(CMD_GET_CHUNK);
    req.extend_from_slice(&hash_bytes);
    stream.write_all(&req).await?;

    let mut len_buf = [0u8; 4];
    stream.read_exact(&mut len_buf).await?;
    let data_len = u32::from_be_bytes(len_buf) as usize;

    if data_len == 0 {
        bail!("Chunk {chunk_hash} not found on this seeder");
    }

    let mut data = vec![0u8; data_len];
    stream.read_exact(&mut data).await?;

    use sha2::Digest;
    let actual_hash = hex::encode(sha2::Sha256::digest(&data));
    if actual_hash != chunk_hash {
        bail!("Chunk hash mismatch: expected {chunk_hash}, got {actual_hash}");
    }

    Ok(data)
}

// ---------------------------------------------------------------------------
// SeedingManager
// ---------------------------------------------------------------------------

pub struct SeedingManager {
    router: Arc<I2pRouter>,
    chunk_store: Arc<dyn ChunkStoreTrait>,
    is_enabled: Arc<tokio::sync::RwLock<bool>>,
    worker_handle: Mutex<Option<JoinHandle<()>>>,
}

impl SeedingManager {
    pub fn new(router: Arc<I2pRouter>, chunk_store: Arc<dyn ChunkStoreTrait>) -> Self {
        Self {
            router,
            chunk_store,
            is_enabled: Arc::new(tokio::sync::RwLock::new(false)),
            worker_handle: Mutex::new(None),
        }
    }

    pub async fn set_enabled(&self, enabled: bool) {
        let mut lock = self.is_enabled.write().await;
        *lock = enabled;
        drop(lock);

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
        let router = Arc::clone(&self.router);

        let handle = tokio::spawn(async move {
            loop {
                if !*enabled.read().await {
                    sleep(Duration::from_secs(1)).await;
                    continue;
                }

                let listener = match router.bind().await {
                    Ok(l) => l,
                    Err(e) => {
                        eprintln!("SeedingManager: bind failed: {e}");
                        sleep(Duration::from_secs(5)).await;
                        continue;
                    }
                };

                match listener.accept().await {
                    Ok((mut stream, remote_dest)) => {
                        let store_clone = Arc::clone(&store);
                        tokio::spawn(async move {
                            handle_seed_request(&mut stream, &*store_clone).await;
                        });
                        let _ = remote_dest;
                    }
                    Err(e) => {
                        eprintln!("SeedingManager: accept error: {e}");
                    }
                }
            }
        });

        *handle_lock = Some(handle);
    }
}

async fn handle_seed_request(stream: &mut I2pStream, store: &dyn ChunkStoreTrait) {
    let mut cmd = [0u8; 1];
    if stream.read_exact(&mut cmd).await.is_err() {
        return;
    }

    match cmd[0] {
        CMD_GET_CHUNK => {
            let mut hash_bytes = [0u8; 32];
            if stream.read_exact(&mut hash_bytes).await.is_err() {
                return;
            }
            let hash_str = hex::encode(hash_bytes);

            match store.get_chunk(&hash_str) {
                Ok(data) => {
                    let len = (data.len() as u32).to_be_bytes();
                    let _ = stream.write_all(&len).await;
                    let _ = stream.write_all(&data).await;
                }
                Err(_) => {
                    let _ = stream.write_all(&[0u8; 4]).await;
                }
            }
        }
        _ => {
            let _ = stream.write_all(&[0u8; 4]).await;
        }
    }
}

// ---------------------------------------------------------------------------
// ChunkStoreTrait
// ---------------------------------------------------------------------------

pub trait ChunkStoreTrait: Send + Sync {
    fn put_chunk(&self, data: &[u8]) -> Result<String, anyhow::Error>;
    fn get_chunk(&self, hash_str: &str) -> Result<Vec<u8>, anyhow::Error>;
    fn pin_chunk(&self, hash_str: &str) -> Result<(), anyhow::Error>;
}

// ---------------------------------------------------------------------------
// PrefetchManager
// ---------------------------------------------------------------------------

pub struct PrefetchManager {
    router: Arc<I2pRouter>,
    chunk_store: Arc<dyn ChunkStoreTrait>,
    current_track_chunks: Mutex<Vec<String>>,
    playback_position: Arc<AtomicUsize>,
    prefetch_window: usize,
    seeders: Mutex<Vec<String>>,
    worker_handle: Mutex<Option<JoinHandle<()>>>,
}

impl PrefetchManager {
    pub fn new(
        router: Arc<I2pRouter>,
        chunk_store: Arc<dyn ChunkStoreTrait>,
        prefetch_window: usize,
    ) -> Self {
        Self {
            router,
            chunk_store,
            current_track_chunks: Mutex::new(Vec::new()),
            playback_position: Arc::new(AtomicUsize::new(0)),
            prefetch_window,
            seeders: Mutex::new(Vec::new()),
            worker_handle: Mutex::new(None),
        }
    }

    pub async fn add_seeders(&self, destinations: Vec<String>) {
        let mut seeders = self.seeders.lock().await;
        for d in destinations {
            if !seeders.contains(&d) {
                seeders.push(d);
            }
        }
    }

    pub async fn set_track(&self, chunks: Vec<String>) {
        let mut current = self.current_track_chunks.lock().await;
        *current = chunks;
        drop(current);
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
            let current = self.current_track_chunks.lock().await;
            *chunks_ptr.lock().await = current.clone();
        }
        let pos = Arc::clone(&self.playback_position);
        let window = self.prefetch_window;
        let seeders_ptr = Arc::new(Mutex::new(
            self.seeders.lock().await.clone(),
        ));

        let handle = tokio::spawn(async move {
            loop {
                let current_pos = pos.load(Ordering::SeqCst);
                let chunks = chunks_ptr.lock().await.clone();

                if chunks.is_empty() {
                    sleep(Duration::from_secs(1)).await;
                    continue;
                }

                let end = (current_pos + window).min(chunks.len());
                for chunk_hash in &chunks[current_pos..end] {
                    if store.get_chunk(chunk_hash).is_ok() {
                        continue;
                    }

                    match fetch_chunk_from_seeders(
                        &router,
                        &seeders_ptr.lock().await,
                        chunk_hash,
                    )
                    .await
                    {
                        Ok(data) => {
                            let _ = store.put_chunk(&data);
                        }
                        Err(e) => {
                            eprintln!("Prefetch: {e}");
                        }
                    }
                }
                sleep(Duration::from_millis(500)).await;
            }
        });

        *handle_lock = Some(handle);
    }
}

async fn fetch_chunk_from_seeders(
    router: &I2pRouter,
    seeders: &[String],
    chunk_hash: &str,
) -> Result<Vec<u8>> {
    if seeders.is_empty() {
        bail!("No seeders configured for chunk {chunk_hash}");
    }

    for seeder_dest in seeders {
        match router.connect(seeder_dest).await {
            Ok(mut stream) => match request_chunk(&mut stream, chunk_hash).await {
                Ok(data) => return Ok(data),
                Err(_) => continue,
            },
            Err(_) => continue,
        }
    }

    bail!("No seeder had chunk {chunk_hash}")
}

// ---------------------------------------------------------------------------
// I2pDestination
// ---------------------------------------------------------------------------

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct I2pDestination {
    pub destination: String,
    pub private_key: String,
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

pub fn init() {
    println!("I2P Net (SAMv3 + i2pd) initialized");
}
