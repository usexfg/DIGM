use crate::format::{Header, MAGIC, VERSION};
use anyhow::{Result, bail};
use sha2::{Sha256, Digest};
use std::io::{Read, Write, Seek, SeekFrom};
use std::fs::File;
use serde_json::to_vec;
use std::path::Path;

fn write_u32_le<W: Write>(w: &mut W, v: u32) -> Result<()> {
    w.write_all(&v.to_le_bytes())?;
    Ok(())
}

fn write_u64_le<W: Write>(w: &mut W, v: u64) -> Result<()> {
    w.write_all(&v.to_le_bytes())?;
    Ok(())
}

/// Streaming writer: reads from `audio_reader` and writes out `.digm` at `out_path`.
/// `signature` must be provided: it is a signature (DER bytes) over SHA256(audio bytes).
/// `public_key` should be DER/PEM bytes to be included in file.
pub fn write_digm_stream<R: Read>(
    mut audio_reader: R,
    out_path: &Path,
    header: &Header,
    signature: &[u8],
    public_key: &[u8],
    tsa: Option<&[u8]>,
    sensor_json: Option<&[u8]>,
) -> Result<()> {
    if signature.is_empty() { 
        bail!("signature required"); 
    }

    // Create output file
    let mut out = File::create(out_path)?;

    // Header: magic + version + reserved
    out.write_all(MAGIC)?;
    out.write_all(&[VERSION])?;
    out.write_all(&[0u8, 0u8, 0u8])?;

    // Header JSON
    let header_bytes = to_vec(header)?;
    write_u32_le(&mut out, header_bytes.len() as u32)?;
    out.write_all(&header_bytes)?;

    // Reserve space for audio_len (u64) - we'll patch this later
    let audio_len_pos = out.stream_position()?;
    write_u64_le(&mut out, 0u64)?; // Placeholder

    // Write audio data in chunks and compute SHA256
    let mut audio_hasher = Sha256::new();
    let mut audio_len: u64 = 0;
    let mut buffer = [0u8; 16 * 1024]; // 16KB buffer
    
    loop {
        let n = audio_reader.read(&mut buffer)?;
        if n == 0 { break; }
        out.write_all(&buffer[..n])?;
        audio_hasher.update(&buffer[..n]);
        audio_len += n as u64;
    }

    // Patch audio length (seek back and write)
    let cur = out.stream_position()?;
    out.seek(SeekFrom::Start(audio_len_pos))?;
    write_u64_le(&mut out, audio_len)?;
    out.seek(SeekFrom::Start(cur))?;

    // Signature
    write_u32_le(&mut out, signature.len() as u32)?;
    out.write_all(signature)?;

    // Public key
    write_u32_le(&mut out, public_key.len() as u32)?;
    out.write_all(public_key)?;

    // TSA (optional)
    let tsa_bytes = tsa.unwrap_or(&[]);
    write_u32_le(&mut out, tsa_bytes.len() as u32)?;
    if !tsa_bytes.is_empty() { 
        out.write_all(tsa_bytes)?; 
    }

    // Sensor JSON (optional)
    let sensor_bytes = sensor_json.unwrap_or(&[]);
    write_u32_le(&mut out, sensor_bytes.len() as u32)?;
    if !sensor_bytes.is_empty() { 
        out.write_all(sensor_bytes)?; 
    }

    // Compute final file hash
    out.flush()?;
    let mut f2 = File::open(out_path)?;
    let mut file_hasher = Sha256::new();
    let mut read_buf = [0u8; 16 * 1024];
    
    loop {
        let n = f2.read(&mut read_buf)?;
        if n == 0 { break; }
        file_hasher.update(&read_buf[..n]);
    }
    
    let final_hash = file_hasher.finalize();
    out.write_all(&final_hash)?;
    out.flush()?;
    
    Ok(())
}

