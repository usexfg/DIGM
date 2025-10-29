use anyhow::{Result, bail};
use sha2::{Sha256, Digest};
use crate::reader::DigmFile;
use p256::ecdsa::{Signature, VerifyingKey};
use p256::pkcs8::DecodePublicKey;

pub fn verify_audio_signature(d: &DigmFile) -> Result<()> {
    // Hash the audio data
    let mut h = Sha256::new();
    h.update(&d.audio);
    let audio_digest = h.finalize();

    // Parse public key (try DER first, then PEM)
    let vk = VerifyingKey::from_public_key_der(&d.public_key)
        .or_else(|_| {
            VerifyingKey::from_public_key_pem(std::str::from_utf8(&d.public_key)?)
        })?;
    
    // Parse signature
    let sig = Signature::from_der(&d.signature)?;
    
    // Verify signature
    vk.verify(&audio_digest, &sig)
        .map_err(|e| anyhow::anyhow!("signature verify failed: {:?}", e))?;
    
    Ok(())
}

pub fn verify_file_hash(path: &std::path::Path) -> Result<()> {
    let data = std::fs::read(path)?;
    if data.len() < 32 { 
        bail!("file too short"); 
    }
    
    let content_len = data.len() - 32;
    
    // Hash content (everything except last 32 bytes)
    let mut hasher = Sha256::new();
    hasher.update(&data[..content_len]);
    let computed = hasher.finalize();
    
    // Compare with stored hash (last 32 bytes)
    let stored = &data[content_len..];
    if computed.as_slice() != stored { 
        bail!("file hash mismatch"); 
    }
    
    Ok(())
}

