use sha2::Digest;

pub type AnonHandle = [u8; 32];

/// Derive a privacy-preserving anonymous handle for leaderboard display.
///
/// handle = SHA256(listener_wallet_bytes || artist_id_bytes || artist_salt)
///
/// This is HMAC-like but uses concatenation + SHA256 for simplicity.
/// Cross-artist linkability is prevented because each artist has a different salt.
pub fn derive_handle(
    listener_wallet: &str,
    artist_id: &str,
    artist_salt: &[u8; 32],
) -> AnonHandle {
    let mut hasher = sha2::Sha256::new();
    hasher.update(listener_wallet.as_bytes());
    hasher.update(artist_id.as_bytes());
    hasher.update(artist_salt);
    let result = hasher.finalize();
    let mut handle = [0u8; 32];
    handle.copy_from_slice(&result);
    handle
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_handle_stability() {
        let salt = [7u8; 32];
        let h1 = derive_handle("wallet_a", "artist_x", &salt);
        let h2 = derive_handle("wallet_a", "artist_x", &salt);
        assert_eq!(h1, h2);
    }

    #[test]
    fn test_cross_artist_unlinkability() {
        let salt_a = [1u8; 32];
        let salt_b = [2u8; 32];
        let h1 = derive_handle("wallet_1", "artist_a", &salt_a);
        let h2 = derive_handle("wallet_1", "artist_b", &salt_b);
        assert_ne!(h1, h2);
    }
}
