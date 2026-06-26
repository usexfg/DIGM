use crate::config::AccrualConfig;
use crate::session::{SessionState, StreamSession};
use thiserror::Error;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BoostApplied {
    pub presses_used: u32,
    pub presses_remaining: u32,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum BoostError {
    #[error("already settled")]
    AlreadySettled,
    #[error("max boost presses ({0}) already reached")]
    MaxReached(u32),
}

/// Apply a boost press. Listener forgoes listener share in favor of artist.
/// Allowed in Streaming and Locked states, rejected in Settled.
pub fn boost(
    session: &mut StreamSession,
    cfg: &AccrualConfig,
) -> Result<BoostApplied, BoostError> {
    if session.state == SessionState::Settled {
        return Err(BoostError::AlreadySettled);
    }

    if session.boost_presses >= cfg.max_boost_presses {
        return Err(BoostError::MaxReached(cfg.max_boost_presses));
    }

    session.boost_presses += 1;

    Ok(BoostApplied {
        presses_used: session.boost_presses,
        presses_remaining: cfg.max_boost_presses - session.boost_presses,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session::{SessionState, StreamSession};

    fn make_session() -> StreamSession {
        StreamSession {
            stream_id: [0u8; 32],
            state: SessionState::Streaming,
            track_length_sec: 180,
            max_played_sec: 0,
            current_pos_sec: 0,
            artist_pending: 0,
            listener_pending: 0,
            artist_locked: 0,
            listener_locked: 0,
            boost_presses: 0,
            curator_present: false,
        }
    }

    #[test]
    fn test_boost_applies() {
        let mut s = make_session();
        let cfg = AccrualConfig::default();
        let r = boost(&mut s, &cfg).unwrap();
        assert_eq!(r.presses_used, 1);
        assert_eq!(r.presses_remaining, 4);
    }

    #[test]
    fn test_max_boost() {
        let mut s = make_session();
        let cfg = AccrualConfig::default();
        for _ in 0..5 {
            boost(&mut s, &cfg).unwrap();
        }
        assert_eq!(boost(&mut s, &cfg), Err(BoostError::MaxReached(5)));
    }
}
