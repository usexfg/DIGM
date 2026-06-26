/// Runtime configuration for the ParaPay engine.
/// BASE_PPS and BONUS_PPS values are tunable; the invariant holds regardless.
#[derive(Debug, Clone)]
pub struct AccrualConfig {
    pub base_pps: u64,
    pub bonus_pps: u64,
    pub threshold_num: u32,
    pub threshold_den: u32,
    pub curator_rate_bps: u32,
    pub max_boost_presses: u32,
    pub split_artist_bps: u32,
    pub split_listener_bps: u32,
    pub tick_granularity_secs: u32,
    pub min_track_length_sec: u32,
}

impl Default for AccrualConfig {
    fn default() -> Self {
        AccrualConfig {
            base_pps: 40_000_000,              // 0.4 PARA/sec in atomic units (18 decimal = 1e17 base)
            bonus_pps: 60_000_000,             // 0.6 PARA/sec
            threshold_num: 2,
            threshold_den: 3,
            curator_rate_bps: 3300,            // 33.00%
            max_boost_presses: 5,
            split_artist_bps: 5000,            // 50%
            split_listener_bps: 5000,          // 50%
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
