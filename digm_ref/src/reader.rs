use crate::format::{Header, MAGIC};
use anyhow::{Result, bail};
use std::io::Read;
use std::fs::File;
use sha2::{Sha256, Digest};
use serde_json::from_slice;
use std::path::Path;

fn read_u32_le<R: Read>(r: &mut R) -> Result<u32> {
    let mut buf = [0u8; 4];
    r.read_exact(&mut buf)?;
    Ok(u32::from_le_bytes(buf))
}

fn read_u64_le<R: Read>(r: &mut R) -> Result<u64> {
    let mut buf = [0u8; 8];
    r.read_exact(&mut buf)?;
    Ok(u64::from_le_bytes(buf))
}

pub struct DigmFile {
    pub header: Header,
    pub audio: Vec<u8>,
    pub signature: Vec<u8>,
    pub public_key: Vec<u8>,
    pub tsa: Vec<u8>,
    pub sensor_json: Vec<u8>,
    pub file_hash: [u8; 32],
}

pub fn read_digm(path: &Path) -> Result<DigmFile> {
    let mut f = File::open(path)?;
    
    // Magic
    let mut magic = [0u8; 4];
    f.read_exact(&mut magic)?;
    if &magic != MAGIC { 
        bail!("not a DIGM file"); 
    }
    
    // Version
    let mut ver = [0u8; 1];
    f.read_exact(&mut ver)?;
    
    // Reserved
    let mut reserved = [0u8; 3];
    f.read_exact(&mut reserved)?;

    // Header length and data
    let header_len = read_u32_le(&mut f)? as usize;
    let mut header_bytes = vec![0u8; header_len];
    f.read_exact(&mut header_bytes)?;
    let header: Header = from_slice(&header_bytes)?;

    // Audio length and data
    let audio_len = read_u64_le(&mut f)? as usize;
    let mut audio = vec![0u8; audio_len];
    f.read_exact(&mut audio)?;

    // Signature
    let sig_len = read_u32_le(&mut f)? as usize;
    let mut signature = vec![0u8; sig_len];
    f.read_exact(&mut signature)?;

    // Public key
    let pub_len = read_u32_le(&mut f)? as usize;
    let mut public_key = vec![0u8; pub_len];
    f.read_exact(&mut public_key)?;

    // TSA (optional)
    let tsa_len = read_u32_le(&mut f)? as usize;
    let mut tsa = vec![0u8; tsa_len];
    if tsa_len > 0 { 
        f.read_exact(&mut tsa)?; 
    }

    // Sensor JSON (optional)
    let sensor_len = read_u32_le(&mut f)? as usize;
    let mut sensor_json = vec![0u8; sensor_len];
    if sensor_len > 0 { 
        f.read_exact(&mut sensor_json)?; 
    }

    // Final 32 bytes = file hash
    let mut file_hash = [0u8; 32];
    f.read_exact(&mut file_hash)?;

    Ok(DigmFile {
        header,
        audio,
        signature,
        public_key,
        tsa,
        sensor_json,
        file_hash,
    })
}

