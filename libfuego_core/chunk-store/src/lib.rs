use rusqlite::{params, Connection, Result};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

#[derive(Debug)]
pub enum StoreError {
    DbError(rusqlite::Error),
    IoError(std::io::Error),
    ChunkNotFound,
}

#[derive(Debug, Clone, Copy)]
pub enum Quality {
    High,
    Lofi,
}

impl From<rusqlite::Error> for StoreError {
    fn from(e: rusqlite::Error) -> Self {
        StoreError::DbError(e)
    }
}

impl From<std::io::Error> for StoreError {
    fn from(e: std::io::Error) -> Self {
        StoreError::IoError(e)
    }
}

pub struct ChunkStore {
    conn: Arc<Mutex<Connection>>,
    storage_path: PathBuf,
    max_size_bytes: u64,
}

impl ChunkStore {
    pub fn open(path: PathBuf, max_size_bytes: u64) -> Result<Self, StoreError> {
        let conn = Connection::open(&path)?;
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS chunks (
                hash BLOB PRIMARY KEY,
                data BLOB NOT NULL,
                quality TEXT NOT NULL,
                pinned INTEGER DEFAULT 0,
                last_accessed INTEGER NOT NULL
            )",
            [],
        )?;
        
        Ok(ChunkStore {
            conn: Arc::new(Mutex::new(conn)),
            storage_path: path,
            max_size_bytes,
        })
    }

    pub fn put_chunk(&self, data: &[u8], quality: Quality) -> Result<String, StoreError> {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(data);
        hasher.update(match quality {
            Quality::High => b"high",
            Quality::Lofi => b"lofi",
        });
        let hash = hasher.finalize();
        let hash_str = hex::encode(&hash);

        {
            let conn = self.conn.lock().unwrap();
            conn.execute(
                "INSERT OR REPLACE INTO chunks (hash, data, quality, pinned, last_accessed) 
                 VALUES (?1, ?2, ?3, 0, ?4)",
                params![
                    hash.as_slice(),
                    data,
                    match quality {
                        Quality::High => "high",
                        Quality::Lofi => "lofi",
                    },
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs(),
                ],
            )?;
        }

        self.enforce_limit()?;

        Ok(hash_str)
    }

    pub fn get_chunk(&self, hash_str: &str) -> Result<Vec<u8>, StoreError> {
        let hash = hex::decode(hash_str).map_err(|_| StoreError::ChunkNotFound)?;
        
        let conn = self.conn.lock().unwrap();
        
        conn.execute(
            "UPDATE chunks SET last_accessed = ?1 WHERE hash = ?2",
            params![
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
                hash.as_slice(),
            ],
        )?;
        
        let data: Vec<u8> = conn.query_row(
            "SELECT data FROM chunks WHERE hash = ?1",
            params![hash.as_slice()],
            |row| row.get(0),
        )?;
        
        Ok(data)
    }

    pub fn get_chunk_by_original_hash(&self, original_hash_str: &str, quality: Quality) -> Result<Vec<u8>, StoreError> {
        use sha2::{Sha256, Digest};
        let original_hash = hex::decode(original_hash_str).map_err(|_| StoreError::ChunkNotFound)?;
        
        let mut h = sha2::Sha256::new();
        h.update(&original_hash);
        h.update(match quality {
            Quality::High => b"high",
            Quality::Lofi => b"lofi",
        });
        let final_hash = h.finalize();
        
        let conn = self.conn.lock().unwrap();
        let data: Vec<u8> = conn.query_row(
            "SELECT data FROM chunks WHERE hash = ?1",
            params![final_hash.as_slice()],
            |row| row.get(0),
        )?;
        
        Ok(data)
    }

    pub fn pin_chunk(&self, hash_str: &str) -> Result<(), StoreError> {
        let hash = hex::decode(hash_str).map_err(|_| StoreError::ChunkNotFound)?;
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE chunks SET pinned = 1 WHERE hash = ?1",
            params![hash.as_slice()],
        )?;
        Ok(())
    }

    pub fn unpin_chunk(&self, hash_str: &str) -> Result<(), StoreError> {
        let hash = hex::decode(hash_str).map_err(|_| StoreError::ChunkNotFound)?;
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE chunks SET pinned = 0 WHERE hash = ?1",
            params![hash.as_slice()],
        )?;
        Ok(())
    }

    fn enforce_limit(&self) -> Result<(), StoreError> {
        let conn = self.conn.lock().unwrap();
        let current_size: u64 = conn.query_row(
            "SELECT SUM(length(data)) FROM chunks",
            [],
            |row| row.get(0),
        ).unwrap_or(0);

        if current_size > self.max_size_bytes {
            let to_delete: Option<Vec<u8>> = conn.query_row(
                "SELECT hash FROM chunks WHERE pinned = 0 ORDER BY last_accessed ASC LIMIT 1",
                [],
                |row| row.get(0),
            ).ok();

            if let Some(hash) = to_delete {
                conn.execute("DELETE FROM chunks WHERE hash = ?1", params![hash.as_slice()])?;
                drop(conn); 
                self.enforce_limit()?;
            }
        }
        Ok(())
    }
}

impl i2p_net::ChunkStoreTrait for ChunkStore {
    fn put_chunk(&self, data: &[u8]) -> Result<String, anyhow::Error> {
        self.put_chunk(data, Quality::High).map_err(|e| anyhow::anyhow!("{:?}", e))
    }

    fn get_chunk(&self, hash_str: &str) -> Result<Vec<u8>, anyhow::Error> {
        self.get_chunk(hash_str).map_err(|e| anyhow::anyhow!("{:?}", e))
    }

    fn pin_chunk(&self, hash_str: &str) -> Result<(), anyhow::Error> {
        self.pin_chunk(hash_str).map_err(|e| anyhow::anyhow!("{:?}", e))
    }
}
