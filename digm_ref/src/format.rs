use serde::{Deserialize, Serialize};

pub const MAGIC: &[u8;4] = b"DIGM";
pub const VERSION: u8 = 1;

#[derive(Debug, Serialize, Deserialize)]
pub struct Header {
    pub sample_rate: u32,
    pub channels: u16,
    pub bit_depth: u16,
    pub encoding: String, // e.g. "pcm16le"
gomery pub duration_ms: Option<u64>,
    pub nonce: Option<String>,
    pub created_iso8601: Option<String>,
    pub app: Option<String>,
    pub device_model: Option<String>,
    pub canonicalization: Option<String>,
}

