use parapay::{StreamSession, SessionState, StreamId};
use std::path::PathBuf;
use std::sync::Mutex;

/// Sled-backed session persistor for ParaPay crash recovery.
pub struct SledPersistor {
    db: Mutex<sled::Db>,
    /// Track which sessions are active (not yet settled).
    active_tree: sled::Tree,
}

impl SledPersistor {
    pub fn new(path: &PathBuf) -> Result<Self, String> {
        let db = sled::open(path).map_err(|e| format!("sled open failed: {}", e))?;
        let active_tree = db.open_tree("parapay_active").map_err(|e| format!("sled tree failed: {}", e))?;

        Ok(SledPersistor {
            db: Mutex::new(db),
            active_tree,
        })
    }
}

impl crate::parapay_sessions::SessionPersistor for SledPersistor {
    fn persist(&self, session: &StreamSession) {
        let key = session.stream_id.to_vec();
        let value = bincode::serialize(session).unwrap_or_default();

        if let Ok(db) = self.db.lock() {
            let _ = db.insert(&key[..], value.as_slice());
        }

        let _ = self.active_tree.insert(&key[..], &[]);
        let _ = self.active_tree.flush();
    }

    fn load_unsettled(&self) -> Vec<StreamSession> {
        let mut sessions = Vec::new();

        for entry in &self.active_tree {
            if let Ok((key, _)) = entry {
                if let Ok(db) = self.db.lock() {
                    if let Ok(Some(data)) = db.get(&key) {
                        if let Ok(session) = bincode::deserialize::<StreamSession>(&data) {
                            // Only return non-settled sessions
                            if session.state != SessionState::Settled {
                                sessions.push(session);
                            }
                        }
                    }
                }
            }
        }

        sessions
    }

    fn remove(&self, id: StreamId) {
        if let Ok(db) = self.db.lock() {
            let _ = db.remove(&id[..]);
        }
        let _ = self.active_tree.remove(&id[..]);
        let _ = self.active_tree.flush();
    }
}
