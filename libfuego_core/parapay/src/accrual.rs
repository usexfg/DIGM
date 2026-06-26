use crate::config::AccrualConfig;
use crate::session::{SessionState, StreamSession};
use thiserror::Error;

#[derive(Debug, PartialEq, Eq)]
pub enum ReportResult {
    /// Position accepted, PARA accrued.
    Accrued {
        threshold_just_crossed: bool,
        new_max_played_sec: u32,
    },
    /// Position is a replay — no accrual.
    Replay,
}

#[derive(Debug, Error, PartialEq, Eq)]
pub enum ReportRejection {
    #[error("already settled")]
    AlreadySettled,
    #[error("out of bounds")]
    OutOfBounds,
    #[error("fast forward")]
    FastForward,
}

/// Report new playback position. Called once per elapsed second.
///
/// # Integrity rules (from spec Reading C):
/// - If state == Settled: rejected
/// - If new_pos > track_length: rejected
/// - If new_pos > max_played + 1: rejected (fast-forward)
/// - If new_pos <= max_played: replay (no accrual)
/// - Else (new_pos == max_played + 1): accrual applied
pub fn report_position(
    session: &mut StreamSession,
    new_pos_sec: u32,
    cfg: &AccrualConfig,
) -> Result<ReportResult, ReportRejection> {
    if session.state == SessionState::Settled {
        return Err(ReportRejection::AlreadySettled);
    }

    if new_pos_sec > session.track_length_sec {
        return Err(ReportRejection::OutOfBounds);
    }

    if new_pos_sec > session.max_played_sec + 1 {
        return Err(ReportRejection::FastForward);
    }

    if new_pos_sec <= session.max_played_sec {
        session.current_pos_sec = new_pos_sec;
        return Ok(ReportResult::Replay);
    }

    // new_pos == max_played + 1 — genuine forward playback
    let threshold_sec = cfg.threshold_secs(session.track_length_sec);
    let was_streaming = session.state == SessionState::Streaming;

    let rate = if session.max_played_sec < threshold_sec {
        cfg.base_pps
    } else {
        cfg.bonus_pps
    };

    let artist_inc = rate as u128 * cfg.split_artist_bps as u128 / 10000;
    let listener_inc = rate as u128 * cfg.split_listener_bps as u128 / 10000;

    session.artist_pending += artist_inc;
    session.listener_pending += listener_inc;

    session.max_played_sec = new_pos_sec;
    session.current_pos_sec = new_pos_sec;

    // Threshold crossing: state was Streaming, now max_played >= threshold
    let threshold_just_crossed = was_streaming && session.max_played_sec > threshold_sec;
    if threshold_just_crossed {
        session.artist_locked = session.artist_pending;
        session.listener_locked = session.listener_pending;
        session.state = SessionState::Locked;
    }

    Ok(ReportResult::Accrued {
        threshold_just_crossed,
        new_max_played_sec: new_pos_sec,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::session::StreamSession;

    fn make_session(track_len: u32, curator: bool) -> StreamSession {
        StreamSession {
            stream_id: [0u8; 32],
            state: SessionState::Streaming,
            track_length_sec: track_len,
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

    #[test]
    fn test_forward_playback_accrues() {
        let mut s = make_session(180, false);
        let cfg = AccrualConfig::default();

        let r = report_position(&mut s, 1, &cfg).unwrap();
        assert_eq!(r, ReportResult::Accrued { threshold_just_crossed: false, new_max_played_sec: 1 });
        assert!(s.artist_pending > 0);
        assert!(s.listener_pending > 0);
    }

    #[test]
    fn test_replay_no_accrual() {
        let mut s = make_session(180, false);
        let cfg = AccrualConfig::default();

        report_position(&mut s, 1, &cfg).unwrap();
        let before = (s.artist_pending, s.listener_pending);

        let r = report_position(&mut s, 1, &cfg).unwrap();
        assert_eq!(r, ReportResult::Replay);
        assert_eq!((s.artist_pending, s.listener_pending), before);
    }

    #[test]
    fn test_fast_forward_rejected() {
        let mut s = make_session(180, false);
        let cfg = AccrualConfig::default();

        report_position(&mut s, 1, &cfg).unwrap();
        let r = report_position(&mut s, 5, &cfg);
        assert_eq!(r, Err(ReportRejection::FastForward));
    }

    #[test]
    fn test_threshold_crossing_locks() {
        let mut s = make_session(180, false);
        let cfg = AccrualConfig::default();
        let thresh = cfg.threshold_secs(180); // 120

        // Play up to threshold
        for sec in 1..=thresh {
            report_position(&mut s, sec, &cfg).unwrap();
        }
        assert_eq!(s.state, SessionState::Streaming);

        // Cross threshold
        let r = report_position(&mut s, thresh + 1, &cfg).unwrap();
        assert_eq!(r, ReportResult::Accrued { threshold_just_crossed: true, new_max_played_sec: thresh + 1 });
        assert_eq!(s.state, SessionState::Locked);
        assert!(s.artist_locked > 0);
    }
}
