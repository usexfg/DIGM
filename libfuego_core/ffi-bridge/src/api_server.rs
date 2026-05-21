use std::sync::{Arc, Mutex};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::{Any, CorsLayer};

use crate::DigmCore;

#[derive(Clone)]
pub struct ApiState {
    pub core: Arc<Mutex<DigmCore>>,
}

#[derive(Serialize)]
struct BalanceResponse {
    para: u64,
    vox: u64,
    cura: u64,
}

pub async fn start_api_server(core: Arc<Mutex<DigmCore>>, port: u16) {
    let state = ApiState { core };
    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any);

    let app = Router::new()
        .route("/api/digm/address", get(get_address))
        .route("/api/digm/balance/:address", get(get_balance))
        .route("/api/digm/single-pools", get(get_single_pools))
        .route("/api/digm/album-rankings", get(get_album_rankings))
        .route("/api/digm/state-root", get(get_state_root))
        .route("/api/digm/guardians", get(get_guardians))
        .route("/api/digm/stake-album", post(stake_album))
        .route("/api/digm/stake-single", post(stake_single))
        .route("/api/digm/unstake-single", post(unstake_single_route))
        .route("/api/digm/unstake-album", post(unstake_album_route))
        .route("/api/digm/purchase-album", post(purchase_album))
        .route("/api/digm/browse", post(can_browse))
        .route("/api/digm/anchor", post(anchor_state))
        .route("/api/digm/sync", post(sync_node))
        .route("/api/digm/create-album", post(create_album))
        .route("/api/digm/earn-para", post(earn_para_route))
        .route("/api/digm/stream-payment", post(stream_payment_route))
        .route("/api/digm/charge-browsing", post(charge_browsing_route))
        .route("/api/digm/vote-single", post(vote_single_route))
        .route("/api/digm/close-epoch", post(close_epoch_route))
        .layer(cors)
        .with_state(state);

    let addr = std::net::SocketAddr::from(([127, 0, 0, 1], port));
    println!("DIGM API server starting on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

#[derive(Deserialize)]
struct StakeAlbumRequest {
    address: String,
    album_id: String,
    amount: u64,
}

#[derive(Deserialize)]
struct StakeSingleRequest {
    address: String,
    track_id: String,
    album_id: String,
    amount: u64,
}

#[derive(Deserialize)]
struct UnstakeSingleRequest {
    address: String,
    track_id: String,
}

#[derive(Deserialize)]
struct UnstakeAlbumRequest {
    address: String,
    album_id: String,
}

#[derive(Deserialize)]
struct PurchaseAlbumRequest {
    address: String,
    album_id: String,
    amount: u64,
}

#[derive(Deserialize)]
struct BrowseRequest {
    address: String,
    album_id: String,
}

#[derive(Deserialize)]
struct CreateAlbumRequest {
    album_id: String,
    title: String,
    price: u64,
    preview_singles: Vec<String>,
}

#[derive(Deserialize)]
struct EarnParaRequest {
    address: String,
    amount: u64,
}

#[derive(Deserialize)]
struct StreamPaymentRequest {
    from: String,
    to: String,
    amount: u64,
}

#[derive(Deserialize)]
struct ChargeBrowsingRequest {
    address: String,
    track_duration_secs: u64,
    played_secs: u64,
}

#[derive(Deserialize)]
struct VoteSingleRequest {
    address: String,
    track_id: String,
}

async fn earn_para_route(State(state): State<ApiState>, Json(req): Json<EarnParaRequest>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    core.earn_para(req.address, req.amount);
    Ok(Json(serde_json::json!({ "status": "ok" })))
}

async fn stream_payment_route(State(state): State<ApiState>, Json(req): Json<StreamPaymentRequest>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    match core.stream_payment(req.from, req.to, req.amount) {
        Ok(()) => Ok(Json(serde_json::json!({ "status": "ok" }))),
        Err(e) => Ok(Json(serde_json::json!({ "status": "error", "message": e }))),
    }
}

async fn charge_browsing_route(State(state): State<ApiState>, Json(req): Json<ChargeBrowsingRequest>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    match core.charge_browsing_play(req.address, req.track_duration_secs, req.played_secs) {
        Ok(cost) => Ok(Json(serde_json::json!({ "status": "ok", "cost": cost }))),
        Err(e) => Ok(Json(serde_json::json!({ "status": "error", "message": e }))),
    }
}

async fn vote_single_route(State(state): State<ApiState>, Json(req): Json<VoteSingleRequest>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    match core.vote_for_single(req.address, req.track_id) {
        Ok(()) => Ok(Json(serde_json::json!({ "status": "ok" }))),
        Err(e) => Ok(Json(serde_json::json!({ "status": "error", "message": e }))),
    }
}

async fn close_epoch_route(State(state): State<ApiState>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    core.close_epoch();
    Ok(Json(serde_json::json!({ "status": "ok" })))
}

async fn get_address(State(state): State<ApiState>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    Ok(Json(serde_json::json!({ "address": core.get_address(0) })))
}

async fn get_balance(State(state): State<ApiState>, Path(address): Path<String>) -> Result<Json<BalanceResponse>, StatusCode> {
    let core = state.core.lock().unwrap();
    Ok(Json(BalanceResponse {
        para: core.get_current_earnings(address.clone()),
        vox: core.get_vox_balance(address.clone()),
        cura: core.get_cura_balance(address),
    }))
}

async fn get_single_pools(State(state): State<ApiState>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    let json_str = core.get_single_pools();
    let value: serde_json::Value = serde_json::from_str(&json_str).unwrap_or(serde_json::json!([]));
    Ok(Json(value))
}

async fn get_album_rankings(State(state): State<ApiState>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    let json_str = core.get_album_rankings();
    let value: serde_json::Value = serde_json::from_str(&json_str).unwrap_or(serde_json::json!([]));
    Ok(Json(value))
}

async fn get_state_root(State(state): State<ApiState>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    Ok(Json(serde_json::json!({ "root": core.get_state_root() })))
}

async fn get_guardians(State(state): State<ApiState>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    Ok(Json(serde_json::json!({
        "guardians": core.get_guardians(),
        "threshold": core.get_recovery_threshold()
    })))
}

async fn stake_album(State(state): State<ApiState>, Json(req): Json<StakeAlbumRequest>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    match core.stake_album(req.address, req.album_id, req.amount) {
        Ok(()) => Ok(Json(serde_json::json!({ "status": "ok" }))),
        Err(e) => Ok(Json(serde_json::json!({ "status": "error", "message": e }))),
    }
}

async fn stake_single(State(state): State<ApiState>, Json(req): Json<StakeSingleRequest>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    match core.stake_single(req.address, req.track_id, req.album_id, req.amount) {
        Ok(()) => Ok(Json(serde_json::json!({ "status": "ok" }))),
        Err(e) => Ok(Json(serde_json::json!({ "status": "error", "message": e }))),
    }
}

async fn unstake_single_route(State(state): State<ApiState>, Json(req): Json<UnstakeSingleRequest>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    match core.unstake_single(req.address, req.track_id) {
        Ok(returned) => Ok(Json(serde_json::json!({ "status": "ok", "returned_para": returned }))),
        Err(e) => Ok(Json(serde_json::json!({ "status": "error", "message": e }))),
    }
}

async fn unstake_album_route(State(state): State<ApiState>, Json(req): Json<UnstakeAlbumRequest>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    match core.unstake_album(req.address, req.album_id) {
        Ok(returned) => Ok(Json(serde_json::json!({ "status": "ok", "returned_para": returned }))),
        Err(e) => Ok(Json(serde_json::json!({ "status": "error", "message": e }))),
    }
}

async fn purchase_album(State(state): State<ApiState>, Json(req): Json<PurchaseAlbumRequest>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    match core.purchase_album(req.address, req.album_id, req.amount) {
        Ok(()) => Ok(Json(serde_json::json!({ "status": "ok" }))),
        Err(e) => Ok(Json(serde_json::json!({ "status": "error", "message": e }))),
    }
}

async fn can_browse(State(state): State<ApiState>, Json(req): Json<BrowseRequest>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    let can = core.can_browse_album(req.address, req.album_id);
    Ok(Json(serde_json::json!({ "can_browse": can })))
}

async fn anchor_state(State(state): State<ApiState>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    match core.anchor_state() {
        Ok(tx) => Ok(Json(serde_json::json!({ "status": "ok", "tx_hash": tx }))),
        Err(e) => Ok(Json(serde_json::json!({ "status": "error", "message": e }))),
    }
}

async fn sync_node(State(state): State<ApiState>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    match core.sync_node() {
        Ok(()) => Ok(Json(serde_json::json!({ "status": "ok" }))),
        Err(e) => Ok(Json(serde_json::json!({ "status": "error", "message": e }))),
    }
}

async fn create_album(State(state): State<ApiState>, Json(req): Json<CreateAlbumRequest>) -> Result<Json<serde_json::Value>, StatusCode> {
    let core = state.core.lock().unwrap();
    match core.create_album(req.album_id, req.title, req.price, req.preview_singles) {
        Ok(()) => Ok(Json(serde_json::json!({ "status": "ok" }))),
        Err(e) => Ok(Json(serde_json::json!({ "status": "error", "message": e }))),
    }
}
