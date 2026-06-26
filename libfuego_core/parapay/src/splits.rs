/// Value splits for a streaming session.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ValueSplits {
    pub artist_rate_bps: u32,
    pub listener_rate_bps: u32,
    pub curator_present: bool,
}

impl ValueSplits {
    pub fn new(artist_rate_bps: u32, listener_rate_bps: u32, curator_present: bool) -> Self {
        ValueSplits {
            artist_rate_bps,
            listener_rate_bps,
            curator_present,
        }
    }

    pub fn total_bps(&self) -> u32 {
        self.artist_rate_bps + self.listener_rate_bps
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccruedAmounts {
    pub artist_pending: u128,
    pub listener_pending: u128,
}
