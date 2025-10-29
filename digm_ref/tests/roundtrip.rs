use digm_ref::{writer_stream, reader, verify, format::Header};
use std::fs::File;
use std::path::PathBuf;
use p256::ecdsa::{SigningKey, signature::Signer};
use rand::rngs::OsRng;

#[test]
fn test_roundtrip() {
    // Create small synthetic audio (sine wave) as PCM16LE
    let mut audio = vec![];
    for i in 0..4800 {
        let v = ((i as f32 / 4800.0) * std::f32::consts::PI * 2.0).sin();
        let s = (v * i16::MAX as f32) as i16;
        audio.extend_from_slice(&s.to_le_bytes());
    }
    let tmp_audio = std::env::temp_dir().join("tmp.raw");
    std::fs::write(&tmp_audio, &audio).unwrap();

    // Sign
    let signing_key = SigningKey::random(&mut OsRng);
    use sha2::Digest;
    let digest = sha2::Sha256::digest(&audio);
    let sig = signing_key.sign(digest.as_slice()).to_der().as_bytes().to_vec();
    let pub_der = signing_key.verifying_key().to_public_key_der().unwrap().as_bytes().to_vec();

    let header = Header {
        sample_rate: 48000,
        channels: 1,
        bit_depth: 16,
        encoding: "pcm16le".to_string(),
        duration_ms: None,
        nonce: Some(uuid::Uuid::new_v4().to_string()),
        created_iso8601: Some(chrono::Utc::now().to_rfc3339()),
        app: Some("digm-test".to_string()),
        device_model: None,
        canonicalization: Some("pcm16le,48kHz,mono".to_string()),
    };

    let out = std::env::temp_dir().join("test.digm");
    writer_stream::write_digm_stream(
        File::open(&tmp_audio).unwrap(), 
        &out, 
        &header, 
        &sig, 
        &pub_der, 
        None, 
        None
    ).unwrap();
    
    let df = reader::read_digm(&out).unwrap();
    verify::verify_audio_signature(&df).unwrap();
    verify::verify_file_hash(&out).unwrap();
    
    // Cleanup
    let _ = std::fs::remove_file(&tmp_audio);
    let _ = std::fs::remove_file(&out);
}

