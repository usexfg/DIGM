use cosmwasm_std::{
    entry_point, to_binary, Binary, Deps, DepsMut, Env, MessageInfo,
    Response, StdResult, Uint128, Addr, CosmosMsg, WasmMsg,
};
use cw2::set_contract_version;
use cw721_base::{ContractError as Cw721Error, Cw721Contract, InstantiateMsg as Cw721InstantiateMsg};
use cw721_base::state::TokenInfo;
use cw_storage_plus::Map;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

const CONTRACT_NAME: &str = "crates.io:digm-nft";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

// Bonding curve parameters
const CURVE_SUPPLY: u32 = 5000;
const CONTRIBUTION_SUPPLY: u32 = 5000;
const TOTAL_SUPPLY: u32 = CURVE_SUPPLY + CONTRIBUTION_SUPPLY;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    pub name: String,
    pub symbol: String,
    pub minter: String,
    pub curve_start_price: Uint128,
    pub curve_rate: Uint128, // Rate per NFT (e.g., 1000000 = 0.001 tokens)
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    // Bonding curve mint
    MintCurve {},
    // Contribution-based mint
    MintContribution {
        proof: Vec<String>,
        contribution_points: Uint128,
    },
    // Standard cw721 messages
    TransferNft { recipient: String, token_id: String },
    SendNft { contract: String, token_id: String, msg: Binary },
    Approve { spender: String, token_id: String, expires: Option<u64> },
    Revoke { spender: String, token_id: String },
    ApproveAll { operator: String, expires: Option<u64> },
    RevokeAll { operator: String },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    // Bonding curve queries
    GetCurvePrice {},
    GetCurveSupply {},
    GetContributionSupply {},
    // Standard cw721 queries
    OwnerOf { token_id: String, include_expired: Option<bool> },
    Approval { token_id: String, spender: String, include_expired: Option<bool> },
    ApprovalsFor { token_id: String, include_expired: Option<bool> },
    AllOperators { owner: String, include_expired: Option<bool>, start_after: Option<String>, limit: Option<u32> },
    AllTokens { start_after: Option<String>, limit: Option<u32> },
    Tokens { owner: String, start_after: Option<String>, limit: Option<u32> },
    ContractInfo {},
    NumTokens {},
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ContractInfoResponse {
    pub name: String,
    pub symbol: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct CurveInfoResponse {
    pub current_price: Uint128,
    pub curve_minted: u32,
    pub contribution_minted: u32,
    pub total_minted: u32,
    pub max_supply: u32,
}

// Storage for bonding curve state
pub const CURVE_MINTED: Map<&str, u32> = Map::new("curve_minted");
pub const CONTRIBUTION_MINTED: Map<&str, u32> = Map::new("contribution_minted");
pub const CONTRIBUTION_PROOFS: Map<&str, bool> = Map::new("contribution_proofs");

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    // Initialize curve state
    CURVE_MINTED.save(deps.storage, "total", &0)?;
    CONTRIBUTION_MINTED.save(deps.storage, "total", &0)?;

    // Initialize cw721 base contract
    let cw721_msg = Cw721InstantiateMsg {
        name: msg.name,
        symbol: msg.symbol,
        minter: msg.minter,
    };

    let cw721_contract = Cw721Contract::<ContractExtension, Empty>::default();
    cw721_contract.instantiate(deps, _env, info, cw721_msg)?;

    Ok(Response::new()
        .add_attribute("method", "instantiate")
        .add_attribute("curve_start_price", msg.curve_start_price)
        .add_attribute("curve_rate", msg.curve_rate))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::MintCurve {} => execute_mint_curve(deps, env, info),
        ExecuteMsg::MintContribution { proof, contribution_points } => {
            execute_mint_contribution(deps, env, info, proof, contribution_points)
        }
        // Delegate other messages to cw721 base
        _ => {
            let cw721_contract = Cw721Contract::<ContractExtension, Empty>::default();
            cw721_contract.execute(deps, env, info, msg.into())?;
            Ok(Response::new())
        }
    }
}

pub fn execute_mint_curve(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
) -> Result<Response, ContractError> {
    let current_curve_minted = CURVE_MINTED.load(deps.storage, "total")?;
    
    if current_curve_minted >= CURVE_SUPPLY {
        return Err(ContractError::CurveSupplyExhausted {});
    }

    // Calculate price based on bonding curve
    let price = calculate_curve_price(current_curve_minted)?;
    
    // Verify payment
    if info.funds.len() != 1 || info.funds[0].amount < price {
        return Err(ContractError::InsufficientPayment { required: price });
    }

    // Mint NFT
    let token_id = format!("curve-{}", current_curve_minted + 1);
    let token_uri = format!("ipfs://digm-curve-{}", current_curve_minted + 1);
    
    let token_info = TokenInfo {
        owner: deps.api.addr_validate(&info.sender.to_string())?,
        approvals: vec![],
        token_uri: Some(token_uri),
        extension: ContractExtension::default(),
    };

    // Update storage
    CURVE_MINTED.save(deps.storage, "total", &(current_curve_minted + 1))?;
    
    // Mint via cw721 base
    let cw721_contract = Cw721Contract::<ContractExtension, Empty>::default();
    cw721_contract.mint(deps, env, info, token_id, token_info)?;

    Ok(Response::new()
        .add_attribute("method", "mint_curve")
        .add_attribute("token_id", token_id)
        .add_attribute("price", price))
}

pub fn execute_mint_contribution(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    proof: Vec<String>,
    contribution_points: Uint128,
) -> Result<Response, ContractError> {
    let current_contribution_minted = CONTRIBUTION_MINTED.load(deps.storage, "total")?;
    
    if current_contribution_minted >= CONTRIBUTION_SUPPLY {
        return Err(ContractError::ContributionSupplyExhausted {});
    }

    // Verify contribution proof (simplified - in production use proper merkle verification)
    let proof_hash = format!("{:?}", proof);
    if CONTRIBUTION_PROOFS.load(deps.storage, &proof_hash).unwrap_or(false) {
        return Err(ContractError::ProofAlreadyUsed {});
    }

    // Check minimum contribution points (e.g., 100 points for Bronze tier)
    if contribution_points < Uint128::from(100u128) {
        return Err(ContractError::InsufficientContributionPoints { 
            required: Uint128::from(100u128),
            provided: contribution_points 
        });
    }

    // Mark proof as used
    CONTRIBUTION_PROOFS.save(deps.storage, &proof_hash, &true)?;

    // Determine tier based on contribution points
    let tier = if contribution_points >= Uint128::from(10000u128) {
        "gold"
    } else if contribution_points >= Uint128::from(1000u128) {
        "silver"
    } else {
        "bronze"
    };

    // Mint NFT
    let token_id = format!("contribution-{}", current_contribution_minted + 1);
    let token_uri = format!("ipfs://digm-{}-{}", tier, current_contribution_minted + 1);
    
    let token_info = TokenInfo {
        owner: deps.api.addr_validate(&info.sender.to_string())?,
        approvals: vec![],
        token_uri: Some(token_uri),
        extension: ContractExtension {
            tier: Some(tier.to_string()),
            contribution_points: Some(contribution_points),
        },
    };

    // Update storage
    CONTRIBUTION_MINTED.save(deps.storage, "total", &(current_contribution_minted + 1))?;
    
    // Mint via cw721 base
    let cw721_contract = Cw721Contract::<ContractExtension, Empty>::default();
    cw721_contract.mint(deps, env, info, token_id, token_info)?;

    Ok(Response::new()
        .add_attribute("method", "mint_contribution")
        .add_attribute("token_id", token_id)
        .add_attribute("tier", tier)
        .add_attribute("contribution_points", contribution_points))
}

fn calculate_curve_price(current_supply: u32) -> Result<Uint128, ContractError> {
    // Simple linear bonding curve: price = base_price + (rate * current_supply)
    // In production, use exponential or more sophisticated curves
    let base_price = Uint128::from(1000000u128); // 0.001 tokens
    let rate = Uint128::from(50000u128); // 0.00005 tokens per NFT
    
    let price = base_price + (rate * Uint128::from(current_supply as u128));
    Ok(price)
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetCurvePrice {} => to_binary(&query_curve_price(deps)?),
        QueryMsg::GetCurveSupply {} => to_binary(&query_curve_supply(deps)?),
        QueryMsg::GetContributionSupply {} => to_binary(&query_contribution_supply(deps)?),
        // Delegate other queries to cw721 base
        _ => {
            let cw721_contract = Cw721Contract::<ContractExtension, Empty>::default();
            cw721_contract.query(deps, _env, msg.into())
        }
    }
}

fn query_curve_price(deps: Deps) -> StdResult<CurveInfoResponse> {
    let curve_minted = CURVE_MINTED.load(deps.storage, "total")?;
    let contribution_minted = CONTRIBUTION_MINTED.load(deps.storage, "total")?;
    let current_price = calculate_curve_price(curve_minted)?;
    
    Ok(CurveInfoResponse {
        current_price,
        curve_minted,
        contribution_minted,
        total_minted: curve_minted + contribution_minted,
        max_supply: TOTAL_SUPPLY,
    })
}

fn query_curve_supply(deps: Deps) -> StdResult<u32> {
    CURVE_MINTED.load(deps.storage, "total")
}

fn query_contribution_supply(deps: Deps) -> StdResult<u32> {
    CONTRIBUTION_MINTED.load(deps.storage, "total")
}

// Contract extension for DIGM-specific metadata
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct ContractExtension {
    pub tier: Option<String>,
    pub contribution_points: Option<Uint128>,
}

impl Default for ContractExtension {
    fn default() -> Self {
        Self {
            tier: None,
            contribution_points: None,
        }
    }
}

// Empty struct for unused generic parameter
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct Empty {}

#[derive(thiserror::Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("Curve supply exhausted")]
    CurveSupplyExhausted {},
    
    #[error("Contribution supply exhausted")]
    ContributionSupplyExhausted {},
    
    #[error("Insufficient payment: required {required}")]
    InsufficientPayment { required: Uint128 },
    
    #[error("Proof already used")]
    ProofAlreadyUsed {},
    
    #[error("Insufficient contribution points: required {required}, provided {provided}")]
    InsufficientContributionPoints { required: Uint128, provided: Uint128 },
    
    #[error("CW721 error: {0}")]
    Cw721Error(#[from] Cw721Error),
}

impl From<ContractError> for Cw721Error {
    fn from(err: ContractError) -> Self {
        Cw721Error::Custom(err.to_string())
    }
}

// Implement conversions for cw721 messages
impl From<ExecuteMsg> for cw721_base::ExecuteMsg<ContractExtension, Empty> {
    fn from(msg: ExecuteMsg) -> Self {
        match msg {
            ExecuteMsg::TransferNft { recipient, token_id } => {
                cw721_base::ExecuteMsg::TransferNft { recipient, token_id }
            }
            ExecuteMsg::SendNft { contract, token_id, msg } => {
                cw721_base::ExecuteMsg::SendNft { contract, token_id, msg }
            }
            ExecuteMsg::Approve { spender, token_id, expires } => {
                cw721_base::ExecuteMsg::Approve { spender, token_id, expires }
            }
            ExecuteMsg::Revoke { spender, token_id } => {
                cw721_base::ExecuteMsg::Revoke { spender, token_id }
            }
            ExecuteMsg::ApproveAll { operator, expires } => {
                cw721_base::ExecuteMsg::ApproveAll { operator, expires }
            }
            ExecuteMsg::RevokeAll { operator } => {
                cw721_base::ExecuteMsg::RevokeAll { operator }
            }
            _ => panic!("Invalid conversion"),
        }
    }
}

impl From<QueryMsg> for cw721_base::QueryMsg<ContractExtension> {
    fn from(msg: QueryMsg) -> Self {
        match msg {
            QueryMsg::OwnerOf { token_id, include_expired } => {
                cw721_base::QueryMsg::OwnerOf { token_id, include_expired }
            }
            QueryMsg::Approval { token_id, spender, include_expired } => {
                cw721_base::QueryMsg::Approval { token_id, spender, include_expired }
            }
            QueryMsg::ApprovalsFor { token_id, include_expired } => {
                cw721_base::QueryMsg::ApprovalsFor { token_id, include_expired }
            }
            QueryMsg::AllOperators { owner, include_expired, start_after, limit } => {
                cw721_base::QueryMsg::AllOperators { owner, include_expired, start_after, limit }
            }
            QueryMsg::AllTokens { start_after, limit } => {
                cw721_base::QueryMsg::AllTokens { start_after, limit }
            }
            QueryMsg::Tokens { owner, start_after, limit } => {
                cw721_base::QueryMsg::Tokens { owner, start_after, limit }
            }
            QueryMsg::ContractInfo {} => {
                cw721_base::QueryMsg::ContractInfo {}
            }
            QueryMsg::NumTokens {} => {
                cw721_base::QueryMsg::NumTokens {}
            }
            _ => panic!("Invalid conversion"),
        }
    }
} 