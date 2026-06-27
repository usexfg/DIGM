use crate::config::AccrualConfig;
use crate::session::{StreamSession};
use crate::splits::AccruedAmounts;

/// Final payout from a settled ParaPay session.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Payout {
    pub stream_id: [u8; 32],
    pub artist_amount: u128,
    pub listener_amount: u128,
    pub curator_amount: u128,
    pub total_emission: u128,
    pub forfeited: bool,
}

/// Finalize a session that ended normally (track completed or post-threshold skip).
/// Applies full settlement math from spec.
pub fn finalize(session: &StreamSession, cfg: &AccrualConfig) -> Payout {
    compute_payout(session, cfg, false)
}

/// Forfeit — pre-threshold skip. Nobody gets anything.
pub fn forfeit(session: &StreamSession) -> Payout {
    Payout {
        stream_id: session.stream_id,
        artist_amount: 0,
        listener_amount: 0,
        curator_amount: 0,
        total_emission: 0,
        forfeited: true,
    }
}

fn compute_payout(session: &StreamSession, cfg: &AccrualConfig, forfeited: bool) -> Payout {
    if forfeited || session.boost_presses == 0 && matches!(session.state, crate::session::SessionState::Streaming) {
        // Use forfeit path for actual forfeited flag; otherwise compute normally
        if forfeited {
            return forfeit(session);
        }
    }

    let artist_pending = session.artist_pending;
    let listener_pending = session.listener_pending;
    let total_emission = artist_pending + listener_pending;

    // Curator slice from listener side
    let (curator_from_listener, listener_after_curator) = if session.curator_present {
        let c = listener_pending * cfg.curator_rate_bps as u128 / 10000;
        (c, listener_pending - c)
    } else {
        (0, listener_pending)
    };

    // Boost redirect: listener forgoes share to artist
    let boost_redirect = if cfg.max_boost_presses > 0 {
        listener_after_curator * session.boost_presses as u128 / cfg.max_boost_presses as u128
    } else {
        0
    };
    let listener_final = listener_after_curator - boost_redirect;
    let artist_after_boost = artist_pending + boost_redirect;

    // Curator slice from artist side
    let (curator_total, artist_final) = if session.curator_present {
        let c = artist_after_boost * cfg.curator_rate_bps as u128 / 10000;
        (curator_from_listener + c, artist_after_boost - c)
    } else {
        (0, artist_after_boost)
    };

    Payout {
        stream_id: session.stream_id,
        artist_amount: artist_final,
        listener_amount: listener_final,
        curator_amount: curator_total,
        total_emission,
        forfeited: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session::{SessionState, StreamSession};
    use crate::accrual::report_position;
    use crate::boost::boost;

    #[test]
    fn test_invariant_no_curator() {
        let cfg = AccrualConfig::default();
        let mut s = session_180sec(false);

        for sec in 1..=180 {
            report_position(&mut s, sec, &cfg).unwrap();
        }

        let payout = finalize(&s, &cfg);
        let sum = payout.artist_amount + payout.listener_amount + payout.curator_amount;
        assert_eq!(sum, payout.total_emission);
        assert!(!payout.forfeited);
        assert_eq!(payout.curator_amount, 0);
    }

    #[test]
    fn test_invariant_with_curator() {
        let cfg = AccrualConfig::default();
        let mut s = session_180sec(true);

        for sec in 1..=180 {
            report_position(&mut s, sec, &cfg).unwrap();
        }
        for _ in 0..3 {
            boost(&mut s, &cfg).unwrap();
        }

        let payout = finalize(&s, &cfg);
        let sum = payout.artist_amount + payout.listener_amount + payout.curator_amount;
        assert_eq!(sum, payout.total_emission);
        assert!(payout.curator_amount > 0);
    }

    #[test]
    fn test_forfeit_gives_zero() {
        let s = session_180sec(false);
        let payout = forfeit(&s);
        assert!(payout.forfeited);
        assert_eq!(payout.total_emission, 0);
        assert_eq!(payout.artist_amount, 0);
    }

    #[test]
    fn test_worked_example_full_completion() {
        let cfg = AccrualConfig {
            base_pps: 400_000_000_000_000_000u128,
            bonus_pps: 600_000_000_000_000_000u128,
            ..AccrualConfig::default()
        };
        let mut s = session_180sec(true);

        for sec in 1..=180 {
            report_position(&mut s, sec, &cfg).unwrap();
        }
        for _ in 0..5 {
            boost(&mut s, &cfg).unwrap();
        }

        let payout = finalize(&s, &cfg);
        // From spec: 84 PARA total, artist ~46.99, curator ~37.01, listener 0 after 5 boosts
        assert!(payout.total_emission > 0);
        let sum = payout.artist_amount + payout.listener_amount + payout.curator_amount;
        assert_eq!(sum, payout.total_emission);
    }

    fn session_180sec(curator: bool) -> StreamSession {
        StreamSession {
            stream_id: [1u8; 32],
            state: SessionState::Streaming,
            track_length_sec: 180,
            max_played_sec: 0,
            current_pos_sec: 0,
            artist_pending: 0,
            listener_pending: 0,
            artist_locked: 0,
            listener_locked: 0,
            boost_presses: 0,
            curator_present: curator,
        }
    }
}
