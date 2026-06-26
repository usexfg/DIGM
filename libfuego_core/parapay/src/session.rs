use thiserror::Error;
use serde::{Serialize, Deserialize};

/// Unique identifier for a streaming session.
pub type StreamId = [u8; 32];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SessionState {
    /// Pre-threshold. Accrual at BASE_PPS into pending buckets. Skip → forfeit.
    Streaming,
    /// Threshold crossed. Pending becomes locked. Accrual at BONUS_PPS. Skip → finalize.
    Locked,
    /// Payouts emitted or forfeited. Terminal.
    Settled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamSession {
    pub stream_id: StreamId,
    pub state: SessionState,
    pub track_length_sec: u32,
    pub max_played_sec: u32,
    pub current_pos_sec: u32,
    pub artist_pending: u128,
    pub listener_pending: u128,
    pub artist_locked: u128,
    pub listener_locked: u128,
    pub boost_presses: u32,
    pub curator_present: bool,
}

#[derive(Debug, Error)]
pub enum SessionError {
    #[error("track length {0}s is below minimum {1}s")]
    TrackTooShort(u32, u32),
    #[error("session already settled")]
    AlreadySettled,
    #[error("position {pos} exceeds track length {max}")]
    OutOfBounds { pos: u32, max: u32 },
    #[error("fast forward: {jumped} > max_played + 1 ({max})")]
    FastForward { jumped: u32, max: u32 },
    #[error("invalid splits: total {total} bps != 10000")]
    InvalidSplits { total: u32 },
}
