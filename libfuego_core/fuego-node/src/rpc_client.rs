use anyhow::{Result, Context};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Serialize, Deserialize};
use crate::{NetworkProvider, NetworkMode, BlockHeader};
use p2p_net::AsyncStream;

/// JSON-RPC request body matching fuegod format.
#[derive(Debug, Serialize)]
struct JsonRpcRequest {
    jsonrpc: String,
    id: String,
    method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    params: Option<serde_json::Value>,
}

/// Raw block data from fuegod containing tx_extra for DIGM scanning.
#[derive(Debug, Clone, Deserialize)]
pub struct RawBlock {
    pub height: u64,
    pub hash: String,
    pub timestamp: u64,
    pub tx_count: u32,
    pub block_size: u64,
    pub difficulty: u64,
    #[serde(default)]
    pub transactions: Vec<RawTransaction>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RawTransaction {
    pub hash: String,
    #[serde(default)]
    pub extra: String,
    #[serde(default)]
    pub amount: u64,
    #[serde(default)]
    pub fee: u64,
}

/// HTTP JSON-RPC client for the Fuego daemon (fuegod).
pub struct FuegoRpcClient {
    host: String,
    port: u16,
    client: Client,
}

impl FuegoRpcClient {
    pub fn new(host: &str, port: u16) -> Self {
        FuegoRpcClient {
            host: host.to_string(),
            port,
            client: Client::new(),
        }
    }

    fn url(&self) -> String {
        format!("http://{}:{}/json_rpc", self.host, self.port)
    }

    async fn call(&self, method: &str, params: Option<serde_json::Value>) -> Result<serde_json::Value> {
        let req = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: "fuego_node".to_string(),
            method: method.to_string(),
            params,
        };

        let resp = self.client
            .post(&self.url())
            .header("Content-Type", "application/json")
            .json(&req)
            .send()
            .await
            .context("RPC request failed")?;

        if !resp.status().is_success() {
            anyhow::bail!("RPC HTTP {}", resp.status());
        }

        let body: serde_json::Value = resp.json().await.context("RPC parse failed")?;

        if let Some(err) = body.get("error").and_then(|e| e.as_str()) {
            anyhow::bail!("RPC error: {}", err);
        }

        Ok(body.get("result").cloned().unwrap_or(serde_json::Value::Null))
    }

    /// Fetch a block by height with full transaction data.
    pub async fn get_block_full(&self, height: u64) -> Result<RawBlock> {
        let params = serde_json::json!({"height": height});
        let result = self.call("get_block", Some(params)).await?;
        let block: RawBlock = serde_json::from_value(result)
            .context("Failed to parse block")?;
        Ok(block)
    }

    /// Fetch block count (current chain height).
    pub async fn get_block_count(&self) -> Result<u64> {
        let result = self.call("get_block_count", None).await?;
        let count = result["count"].as_u64()
            .or_else(|| result["block_count"].as_u64())
            .unwrap_or(0);
        Ok(count)
    }

    /// Fetch network info.
    pub async fn get_info(&self) -> Result<serde_json::Value> {
        self.call("get_info", None).await
    }
}

#[async_trait]
impl NetworkProvider for FuegoRpcClient {
    async fn get_current_height(&self) -> Result<u64> {
        self.get_block_count().await
    }

    async fn fetch_header(&self, height: u64) -> Result<BlockHeader> {
        let block = self.get_block_full(height).await?;
        let hash_bytes = hex::decode(&block.hash).unwrap_or_default();
        let mut prev_hash = [0u8; 32];
        let mut merkle = [0u8; 32];

        // Hash is hex-encoded; prev_hash will be set by caller
        // Merkle root is not exposed by RPC in simple mode; use hash as fallback
        if hash_bytes.len() >= 32 {
            merkle.copy_from_slice(&hash_bytes[..32]);
        }

        // For prev_hash, we'd need to fetch the previous block, but for
        // header-only sync we can use a zero hash placeholder.
        Ok(BlockHeader {
            height,
            prev_hash,
            merkle_root: merkle,
            timestamp: block.timestamp,
        })
    }

    async fn get_stream(&self, _peer_id: &str, _mode: NetworkMode) -> Result<Box<dyn AsyncStream>> {
        anyhow::bail!("FuegoRpcClient does not support P2P streams")
    }
}
