use std::sync::{Arc, Mutex};
use ffi_bridge::DigmCore;

#[tokio::main]
async fn main() {
    let core = DigmCore::new(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about".to_string(),
        "/tmp/digm_data".to_string(),
        "Sovereign".to_string(),
    )
    .expect("Failed to initialize DIGM core");

    let core_arc = Arc::new(Mutex::new(core));

    // Seed some mock data for the UI
    {
        let c = core_arc.lock().unwrap();
        let _ = c.create_album(
            "album-1".to_string(), "Fuego Waves".to_string(), 10_000_000,
            vec!["single-001".to_string(), "single-002".to_string()],
        );
        let _ = c.create_album(
            "album-2".to_string(), "Deep Rust".to_string(), 8_000_000,
            vec!["single-003".to_string()],
        );
        let addr = c.get_address(0);
        c.earn_para(addr.clone(), 100_000_000); // give user PARA to stake
        let _ = c.stake_single(addr.clone(), "single-001".to_string(), "album-1".to_string(), 5_000_000);
        let _ = c.stake_single(addr.clone(), "single-003".to_string(), "album-2".to_string(), 7_800_000);
        let _ = c.purchase_album(addr.clone(), "album-1".to_string(), 10_000_000); // simulate a sale
        let _ = c.purchase_album(addr.clone(), "album-2".to_string(), 8_000_000);
    }

    println!("DIGM Platform API server");
    println!("Frontend expects API at: http://localhost:8889");

    ffi_bridge::api_server::start_api_server(core_arc, 8889).await;
}
