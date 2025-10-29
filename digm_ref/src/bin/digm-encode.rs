use clap::Parser;
use digm_ref::writer_stream;
use digm_ref::format::Header;
use std::fs::File;
use std::path::PathBuf;
use p256::ecdsa::{SigningKey, signature::Signer};
use rand::rngs::OsRng;

#[derive(Parser)]
#[command(name = "digm-encode")]
#[command(about = "Encode raw PCM audio to .digm format")]
struct Args {
    /// Input PCM file path
    input: PathBuf,
    
    /// Output .digm file path
    out: PathBuf,
    
    /// Sample rate (default: 48000)
    #[arg(long, default_value = "48000")]
    sample_rate: u32,
    
    /// Channels (default: 1)
    #[arg(long, default_value = "1")]
    channels: u16,
}

fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    
    // Read input raw PCM file
    let mut f = File::open(&args.input)?;
    let mut buf = Vec::new();
    std::io::Read::read_to_end(&mut f, &mut buf)?;
    
    // Demo: generate ephemeral ECDSA key and sign digest
    let signing_key = SigningKey::random(&mut OsRng);
    use sha2::Digest;
    let digest = sha2::Sha256::digest(&buf);
    let sig = signing_key.sign(digest.as_slice()).to_der().as_bytes().to_vec();
    let pub_der = signing_key.verifying_key().to_public_key_der()?.as_bytes().to_vec();

    // Prepare header
    let header = Header {
        sample_rate: args.sample_rate,
        channels: args.channels,
        bit_depth: 16,
        encoding: "pcm16le".to_string(),
        duration_ms: None,
        nonce: Some(uuid::Uuid::new_v4().to_string()),
        created_iso8601: Some(chrono::Utc::now().to_rfc3339()),
        app: Some("digm-ref-cli".to_string()),
        device_model: None,
        canonicalization: Some("pcm16le,48kHz,mono".to_string()),
    };

    // Reopen file and stream to writer
    let f2 = File::open(&args.input)?;
    writer_stream::write_digm_stream(
        f2, 
        &args.out, 
        &header, 
        &sig, 
        &pub_der, 
        None, 
        None
    )?;
    
    println!("Wrote {}", args.out.display());
    Ok(())
}

