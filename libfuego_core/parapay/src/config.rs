/// Runtime configuration for the ParaPay engine.
/// BASE_PPS and BONUS_PPS values are tunable; the invariant holds regardless.
///
/// Para supply: "para" (lowercase) = 1 atomic unit. 10^27 para total.
/// Minted as Fuego colored coin via 0xAA tx_extra tag — any amount.
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

/// Total para supply in atomic units.
pub const PARA_TOTAL_SUPPLY: u128 = 1_000_000_000_000_000_000_000_000_000;
pub const PARA_DECIMALS: u8 = 27;

impl Default for AccrualConfig {
    fn default() -> Self {
        // ~1,000,000 para per full 180-sec track play.
        // BASE = 4,800 para/sec pre-threshold, BONUS = 7,100 para/sec post:
        //   120 × 4,800 + 60 × 7,100 = 1,002,000 ≈ 1M para per play
        // Total supply: 10^27 para — functionally infinite at any volume.
        AccrualConfig {
            base_pps: 4_800,
            bonus_pps: 7_100,
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
