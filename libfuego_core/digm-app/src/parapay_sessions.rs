use parapay::{AccrualConfig, StreamSession, SessionState, StreamId, Payout};
use parapay::accrual::{report_position, ReportResult, ReportRejection};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use fuego_crypto::Address;

/// Applies a ParaPay session payout to GlobalState wallets.
/// MUST be idempotent — if the same stream_id has already been settled, do nothing.
pub trait PayoutSettler: Send + Sync {
    fn apply(&self, payout: &Payout, artist: &Address, listener: &Address, curator: Option<&Address>);
}

/// Persists streaming sessions to disk for crash recovery.
pub trait SessionPersistor: Send + Sync {
    fn persist(&self, session: &StreamSession);
    fn load_unsettled(&self) -> Vec<StreamSession>;
    fn remove(&self, id: StreamId);
}

/// In-memory no-op persistor for testing/prototyping.
pub struct NoopPersistor;

impl SessionPersistor for NoopPersistor {
    fn persist(&self, _session: &StreamSession) {}
    fn load_unsettled(&self) -> Vec<StreamSession> { vec![] }
    fn remove(&self, _id: StreamId) {}
}

/// Manages all active ParaPay streaming sessions and coordinates with GlobalState.
pub struct ParaPaySessionManager {
    sessions: HashMap<StreamId, StreamSession>,
    config: AccrualConfig,
    settler: Arc<dyn PayoutSettler>,
    persistor: Arc<dyn SessionPersistor>,
    settled_ids: RwLock<Vec<StreamId>>,
}

impl ParaPaySessionManager {
    pub fn new(
        config: AccrualConfig,
        settler: Arc<dyn PayoutSettler>,
        persistor: Arc<dyn SessionPersistor>,
    ) -> Self {
        let mut mgr = ParaPaySessionManager {
            sessions: HashMap::new(),
            config,
            settler,
            persistor,
            settled_ids: RwLock::new(Vec::new()),
        };
        mgr.recover();
        mgr
    }

    /// Begin a new streaming session for a track.
    pub fn begin(
        &mut self,
        stream_id: StreamId,
        track_length_sec: u32,
        curator_present: bool,
        artist_address: Address,
        listener_address: Address,
        curator_address: Option<Address>,
    ) -> Result<(), String> {
        if track_length_sec < self.config.min_track_length_sec {
            return Err(format!(
                "Track too short: {}s < {}s minimum",
                track_length_sec, self.config.min_track_length_sec
            ));
        }

        let session = StreamSession {
            stream_id,
            state: SessionState::Streaming,
            track_length_sec,
            max_played_sec: 0,
            current_pos_sec: 0,
            artist_pending: 0,
            listener_pending: 0,
            artist_locked: 0,
            listener_locked: 0,
            boost_presses: 0,
            curator_present,
        };
        self.persistor.persist(&session);
        self.sessions.insert(stream_id, session);

        Ok(())
    }

    /// Report a new playback position (called every second from audio loop).
    pub fn tick(
        &mut self,
        stream_id: StreamId,
        new_pos_sec: u32,
        artist: &Address,
        listener: &Address,
        curator: Option<&Address>,
    ) -> Result<ReportResult, ReportRejection> {
        let session = self.sessions.get_mut(&stream_id)
            .ok_or(ReportRejection::AlreadySettled)?;

        let old_state = session.state;
        let result = report_position(session, new_pos_sec, &self.config)?;

        match &result {
            ReportResult::Accrued { threshold_just_crossed, .. } => {
                if session.state != old_state {
                    // State changed — persist immediately
                    self.persistor.persist(session);
                }

                if session.state == SessionState::Settled {
                    self.handle_settlement(stream_id, artist, listener, curator);
                }
            }
            ReportResult::Replay => {}
        }

        Ok(result)
    }

    /// Apply a boost press to the current session.
    pub fn boost(&mut self, stream_id: StreamId) -> Result<parapay::boost::BoostApplied, parapay::boost::BoostError> {
        let session = self.sessions.get_mut(&stream_id)
            .ok_or(parapay::boost::BoostError::AlreadySettled)?;

        let result = parapay::boost::boost(session, &self.config)?;
        self.persistor.persist(session);
        Ok(result)
    }

    /// End a session — user skipped or track ended.
    pub fn end(
        &mut self,
        stream_id: StreamId,
        reason: EndReason,
        artist: &Address,
        listener: &Address,
        curator: Option<&Address>,
    ) {
        let session = match self.sessions.get(&stream_id) {
            Some(s) => s.clone(),
            None => return,
        };

        let payout = match (reason, session.state) {
            (EndReason::Skipped, SessionState::Streaming) => {
                parapay::settle::forfeit(&session)
            }
            _ => {
                parapay::settle::finalize(&session, &self.config)
            }
        };

        if !payout.forfeited && payout.total_emission > 0 {
            self.handle_payout(&payout, artist, listener, curator);
        }

        self.sessions.remove(&stream_id);
        self.persistor.remove(stream_id);
    }

    /// Get session state for UI display.
    pub fn get_session(&self, stream_id: StreamId) -> Option<&StreamSession> {
        self.sessions.get(&stream_id)
    }

    fn handle_settlement(
        &mut self,
        stream_id: StreamId,
        artist: &Address,
        listener: &Address,
        curator: Option<&Address>,
    ) {
        if let Some(session) = self.sessions.get(&stream_id) {
            let payout = parapay::settle::finalize(session, &self.config);
            self.handle_payout(&payout, artist, listener, curator);
        }
        self.sessions.remove(&stream_id);
        self.persistor.remove(stream_id);
    }

    fn handle_payout(
        &self,
        payout: &Payout,
        artist: &Address,
        listener: &Address,
        curator: Option<&Address>,
    ) {
        // Idempotency check
        {
            let settled = self.settled_ids.read().unwrap();
            if settled.contains(&payout.stream_id) {
                return;
            }
        }
        {
            let mut settled = self.settled_ids.write().unwrap();
            settled.push(payout.stream_id);
        }

        self.settler.apply(payout, artist, listener, curator);
    }

    /// Load unsettled sessions from persistor and handle crash recovery.
    fn recover(&mut self) {
        let unsettled = self.persistor.load_unsettled();
        for session in unsettled {
            match session.state {
                SessionState::Streaming => {
                    // Pre-threshold crash → forfeit
                    self.persistor.remove(session.stream_id);
                }
                SessionState::Locked => {
                    // Post-threshold crash → finalize (listener gets locked earnings)
                    let payout = parapay::settle::finalize(&session, &self.config);
                    if !payout.forfeited && payout.total_emission > 0 {
                        // Recovery payout — settler must be idempotent
                        self.settler.apply(&payout, &Address("recovery".into()), &Address("recovery".into()), None);
                    }
                    self.persistor.remove(session.stream_id);
                }
                SessionState::Settled => {
                    self.persistor.remove(session.stream_id);
                }
            }
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EndReason {
    /// Listener skipped (pre-threshold = forfeit, post-threshold = finalize)
    Skipped,
    /// Track played to completion
    Completed,
}
