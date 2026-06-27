/// Runtime configuration for the ParaPay engine.
/// BASE_PPS and BONUS_PPS values are tunable; the invariant holds regardless.
///
/// PARA supply model: 1 total PARA with 27 decimal places.
/// Total atomic units: 10^27 (1,000,000,000,000,000,000,000,000,000).
/// Minted as a Fuego colored coin via 0xAA tx_extra tag.
#[derive(Debug, Clone)]
pub struct AccrualConfig {
    pub base_pps: u128,
    pub bonus_pps: u128,
    pub threshold_num: u32,
    pub threshold_den: u32,
    pub curator_rate_bps: u32,
    pub max_boost_presses: u32,
    pub split_artist_bps: u32,
    pub split_listener_bps: u32,
    pub tick_granularity_secs: u32,
    pub min_track_length_sec: u32,
}

/// 1 total PARA with 27 decimal places.
pub const PARA_TOTAL_SUPPLY: u128 = 1_000_000_000_000_000_000_000_000_000;
pub const PARA_DECIMALS: u8 = 27;

impl Default for AccrualConfig {
    fn default() -> Self {
        // 1 nano-PARA/sec = 10^18 atomic units (10^-9 × 10^27)
        // BASE_PPS = 0.4 nano-PARA/sec, BONUS_PPS = 0.6 nano-PARA/sec
        let nano_para: u128 = 1_000_000_000_000_000_000; // 10^18
        AccrualConfig {
            base_pps: 400_000_000_000_000_000,   // 0.4 nPARA/sec
            bonus_pps: 600_000_000_000_000_000,  // 0.6 nPARA/sec
            threshold_num: 2,
            threshold_den: 3,
            curator_rate_bps: 3300,
            max_boost_presses: 5,
            split_artist_bps: 5000,
            split_listener_bps: 5000,
            tick_granularity_secs: 1,
            min_track_length_sec: 30,
        }
    }
}

impl AccrualConfig {
    /// Compute the threshold in seconds for a given track length.
    pub fn threshold_secs(&self, track_length_sec: u32) -> u32 {
        (track_length_sec as u64 * self.threshold_num as u64 / self.threshold_den as u64) as u32
    }
}
