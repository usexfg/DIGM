use clap::Parser;
use digm_ref::{reader, verify};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "digm-info")]
#[command(about = "Read and verify .digm file")]
struct Args {
    /// .digm file path
    file: PathBuf
}

fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    let df = reader::read_digm(&args.file)?;
    
    println!("DIGM File Info:");
    println!("  Header: {:?}", df.header);
    println!("  Audio bytes: {}", df.audio.len());
    println!("  Signature bytes: {}", df.signature.len());
    println!("  Public key bytes: {}", df.public_key.len());
    
    println!("\nVerification:");
    match verify::verify_audio_signature(&df) {
        Ok(_) => println!("  ✅ Audio signature: OK"),
        Err(e) => println!("  ❌ Audio signature: FAILED: {:?}", e),
    }
    
    match verify::verify_file_hash(&args.file) {
        Ok(_) => println!("  ✅ File hash: OK"),
        Err(e) => println!("  ❌ File hash: FAILED: {:?}", e),
    }
    
    Ok(())
}

