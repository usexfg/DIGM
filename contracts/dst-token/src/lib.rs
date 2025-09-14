/**
 * Universal DIGM Stable Token (UDST) - Colored Coin Implementation
 * 
 * A decentralized stable asset built on Fuego blockchain using colored-coin technology
 * to provide price stability for album purchases while maintaining decentralization.
 */

use std::collections::HashMap;
use std::string::String;
use std::vec::Vec;

// UDST Token Structure
#[derive(Debug, Clone)]
pub struct DIGMStableToken {
    pub token_id: u64,
    pub total_supply: u64,
    pub collateral_ratio: u64,  // Percentage (150 = 150%)
    pub target_price_xfg: u64,  // Target price in XFG atomic units
    pub last_rebalance: u64,    // Timestamp of last rebalancing
    pub collateral: Vec<CollateralAsset>,
    pub governance: String,      // Governance contract address
    pub emergency_halt: bool,   // Emergency stop mechanism
}

#[derive(Debug, Clone)]
pub struct CollateralAsset {
    pub asset_type: String,     // "XFG", "BTC", "ETH", "USDC"
    pub amount: u64,            // Amount held as collateral
    pub value_in_xfg: u64,      // Value in XFG atomic units
    pub weight: u64,            // Weight in collateral basket (percentage)
    pub last_price_update: u64, // Last price update timestamp
}

#[derive(Debug, Clone)]
pub struct CollateralBasket {
    pub assets: HashMap<String, CollateralAsset>,
    pub total_value_xfg: u64,
    pub collateral_ratio: u64,
    pub min_ratio: u64,         // Minimum collateralization ratio
    pub max_ratio: u64,         // Maximum collateralization ratio
    pub target_ratio: u64,      // Target collateralization ratio
}

#[derive(Debug, Clone)]
pub struct DSTBalance {
    pub address: String,
    pub balance: u64,           // DST balance in atomic units
    pub locked_collateral: HashMap<String, u64>, // Locked collateral per asset
    pub last_activity: u64,     // Last transaction timestamp
}

#[derive(Debug, Clone)]
pub struct PriceOracle {
    pub feeds: Vec<String>,     // Price feed sources
    pub prices: HashMap<String, u64>, // Current prices in XFG atomic units
    pub last_update: u64,       // Last price update timestamp
    pub deviation_threshold: u64, // Maximum price deviation (5%)
}

#[derive(Debug, Clone)]
pub struct GovernanceProposal {
    pub proposal_id: u64,
    pub proposer: String,
    pub proposal_type: String,  // "parameter_change", "collateral_addition", "fee_adjustment"
    pub description: String,
    pub parameters: HashMap<String, u64>,
    pub votes_for: u64,
    pub votes_against: u64,
    pub voting_deadline: u64,
    pub executed: bool,
}

// UDST Token Implementation
impl DIGMStableToken {
    pub fn new(token_id: u64, governance: String) -> Self {
        Self {
            token_id,
            total_supply: 0,
            collateral_ratio: 150, // Start at 150% collateralization
            target_price_xfg: 1000000, // 0.1 XFG = 1 DST (1M atomic units)
            last_rebalance: 0,
            collateral: Vec::new(),
            governance,
            emergency_halt: false,
        }
    }

    /**
     * Initialize collateral basket with default assets
     */
    pub fn initialize_collateral_basket(&mut self) {
        let mut basket = CollateralBasket {
            assets: HashMap::new(),
            total_value_xfg: 0,
            collateral_ratio: 150,
            min_ratio: 120,
            max_ratio: 200,
            target_ratio: 150,
        };

        // Initialize default collateral assets
        let default_assets = vec![
            ("XFG".to_string(), 40),   // 40% Fuego native
            ("BTC".to_string(), 30),   // 30% Bitcoin
            ("ETH".to_string(), 20),   // 20% Ethereum
            ("USDC".to_string(), 10),  // 10% Stablecoin
        ];

        for (asset_type, weight) in default_assets {
            let collateral_asset = CollateralAsset {
                asset_type: asset_type.clone(),
                amount: 0,
                value_in_xfg: 0,
                weight,
                last_price_update: 0,
            };
            basket.assets.insert(asset_type, collateral_asset);
        }

        self.collateral = basket.assets.values().cloned().collect();
    }

    /**
     * Mint UDST tokens by depositing collateral
     */
    pub fn mint_udst(
        &mut self,
        collateral_amount: u64,
        asset_type: String,
        user_address: String,
        price_oracle: &PriceOracle,
    ) -> Result<u64, String> {
        // Check if emergency halt is active
        if self.emergency_halt {
            return Err("Emergency halt is active".to_string());
        }

        // Validate collateral asset
        if !self.is_supported_asset(&asset_type) {
            return Err(format!("Unsupported collateral asset: {}", asset_type));
        }

        // Get current price of collateral asset
        let asset_price = price_oracle.prices.get(&asset_type)
            .ok_or("Price not available for asset")?;

        // Calculate collateral value in XFG
        let collateral_value_xfg = (collateral_amount * asset_price) / 10000000; // Convert to XFG atomic units

        // Check minimum collateralization ratio
        if self.collateral_ratio < self.get_min_ratio() {
            return Err("Insufficient collateralization ratio".to_string());
        }

        // Calculate UDST to mint (with 5% fee)
        let udst_to_mint = (collateral_value_xfg * 95) / 100; // 5% fee
        let udst_amount = udst_to_mint / self.target_price_xfg;

        // Update collateral
        self.update_collateral(&asset_type, collateral_amount, collateral_value_xfg);

        // Update total supply
        self.total_supply += udst_amount;

        // Update collateralization ratio
        self.update_collateral_ratio();

        Ok(udst_amount)
    }

    /**
     * Burn UDST tokens to redeem collateral
     */
    pub fn burn_udst(
        &mut self,
        udst_amount: u64,
        preferred_asset: Option<String>,
        user_address: String,
        price_oracle: &PriceOracle,
    ) -> Result<HashMap<String, u64>, String> {
        // Check if emergency halt is active
        if self.emergency_halt {
            return Err("Emergency halt is active".to_string());
        }

        // Validate UDST amount
        if udst_amount > self.total_supply {
            return Err("Insufficient UDST supply".to_string());
        }

        // Calculate collateral value to return
        let collateral_value_xfg = udst_amount * self.target_price_xfg;

        // Determine asset mix for redemption
        let asset_mix = if let Some(asset) = preferred_asset {
            if self.is_supported_asset(&asset) {
                let mut mix = HashMap::new();
                mix.insert(asset, collateral_value_xfg);
                mix
            } else {
                return Err(format!("Unsupported preferred asset: {}", preferred_asset.unwrap()));
            }
        } else {
            self.calculate_optimal_asset_mix(collateral_value_xfg)
        };

        // Update collateral
        for (asset_type, amount) in &asset_mix {
            self.update_collateral(asset_type, *amount, *amount);
        }

        // Update total supply
        self.total_supply -= udst_amount;

        // Update collateralization ratio
        self.update_collateral_ratio();

        Ok(asset_mix)
    }

    /**
     * Rebalance collateral to maintain target ratio
     */
    pub fn rebalance_collateral(&mut self, price_oracle: &PriceOracle) -> Result<(), String> {
        let current_ratio = self.collateral_ratio;
        let target_ratio = self.get_target_ratio();
        let threshold = 5; // 5% deviation threshold

        if (current_ratio as i64 - target_ratio as i64).abs() > threshold as i64 {
            if current_ratio < target_ratio {
                // Under-collateralized: Need to increase collateral or decrease DST supply
                self.increase_collateral(price_oracle)?;
            } else {
                // Over-collateralized: Can decrease collateral or increase DST supply
                self.decrease_collateral(price_oracle)?;
            }
        }

        self.last_rebalance = self.get_current_timestamp();
        Ok(())
    }

    /**
     * Update collateral for a specific asset
     */
    fn update_collateral(&mut self, asset_type: &String, amount: u64, value_xfg: u64) {
        if let Some(collateral) = self.collateral.iter_mut().find(|c| c.asset_type == *asset_type) {
            collateral.amount += amount;
            collateral.value_in_xfg += value_xfg;
            collateral.last_price_update = self.get_current_timestamp();
        }
    }

    /**
     * Update collateralization ratio
     */
    fn update_collateral_ratio(&mut self) {
        let total_collateral_value = self.collateral.iter().map(|c| c.value_in_xfg).sum::<u64>();
        let total_dst_value = self.total_supply * self.target_price_xfg;
        
        if total_dst_value > 0 {
            self.collateral_ratio = (total_collateral_value * 100) / total_dst_value;
        }
    }

    /**
     * Calculate optimal asset mix for redemption
     */
    fn calculate_optimal_asset_mix(&self, total_value: u64) -> HashMap<String, u64> {
        let mut mix = HashMap::new();
        
        for collateral in &self.collateral {
            let asset_value = (total_value * collateral.weight) / 100;
            mix.insert(collateral.asset_type.clone(), asset_value);
        }
        
        mix
    }

    /**
     * Increase collateral (under-collateralized scenario)
     */
    fn increase_collateral(&mut self, price_oracle: &PriceOracle) -> Result<(), String> {
        // In a real implementation, this would trigger mechanisms to:
        // 1. Incentivize users to deposit more collateral
        // 2. Temporarily increase minting fees
        // 3. Activate emergency protocols
        
        // For now, we'll just log the need for rebalancing
        println!("Under-collateralized: Need to increase collateral");
        Ok(())
    }

    /**
     * Decrease collateral (over-collateralized scenario)
     */
    fn decrease_collateral(&mut self, price_oracle: &PriceOracle) -> Result<(), String> {
        // In a real implementation, this would trigger mechanisms to:
        // 1. Allow users to withdraw excess collateral
        // 2. Temporarily decrease minting fees
        // 3. Increase DST supply if needed
        
        // For now, we'll just log the need for rebalancing
        println!("Over-collateralized: Can decrease collateral");
        Ok(())
    }

    /**
     * Check if asset is supported
     */
    fn is_supported_asset(&self, asset_type: &String) -> bool {
        self.collateral.iter().any(|c| c.asset_type == *asset_type)
    }

    /**
     * Get minimum collateralization ratio
     */
    fn get_min_ratio(&self) -> u64 {
        120 // 120% minimum
    }

    /**
     * Get target collateralization ratio
     */
    fn get_target_ratio(&self) -> u64 {
        150 // 150% target
    }

    /**
     * Get current timestamp (placeholder)
     */
    fn get_current_timestamp(&self) -> u64 {
        // In a real implementation, this would get the current blockchain timestamp
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }

    /**
     * Emergency halt mechanism
     */
    pub fn emergency_halt(&mut self, reason: String) {
        self.emergency_halt = true;
        println!("Emergency halt activated: {}", reason);
    }

    /**
     * Resume operations after emergency halt
     */
    pub fn resume_operations(&mut self) {
        self.emergency_halt = false;
        println!("Operations resumed");
    }
}

// Price Oracle Implementation
impl PriceOracle {
    pub fn new() -> Self {
        Self {
            feeds: vec![
                "coingecko".to_string(),
                "binance".to_string(),
                "kraken".to_string(),
                "chainlink".to_string(),
            ],
            prices: HashMap::new(),
            last_update: 0,
            deviation_threshold: 5, // 5% maximum deviation
        }
    }

    /**
     * Update prices from multiple feeds
     */
    pub fn update_prices(&mut self, new_prices: HashMap<String, u64>) -> Result<(), String> {
        // Validate price deviations
        for (asset, new_price) in &new_prices {
            if let Some(old_price) = self.prices.get(asset) {
                let deviation = if *old_price > 0 {
                    ((new_price - old_price) * 100) / old_price
                } else {
                    0
                };
                
                if deviation > self.deviation_threshold {
                    return Err(format!("Price deviation too high for {}: {}%", asset, deviation));
                }
            }
        }

        // Update prices
        self.prices = new_prices;
        self.last_update = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        Ok(())
    }

    /**
     * Get median price from multiple feeds
     */
    pub fn get_median_price(&self, asset: &String) -> Result<u64, String> {
        // In a real implementation, this would fetch from multiple feeds
        // and calculate the median price
        
        self.prices.get(asset)
            .ok_or(format!("Price not available for {}", asset))
            .map(|price| *price)
    }
}

// Governance Implementation
impl GovernanceProposal {
    pub fn new(
        proposal_id: u64,
        proposer: String,
        proposal_type: String,
        description: String,
        parameters: HashMap<String, u64>,
    ) -> Self {
        Self {
            proposal_id,
            proposer,
            proposal_type,
            description,
            parameters,
            votes_for: 0,
            votes_against: 0,
            voting_deadline: 0,
            executed: false,
        }
    }

    /**
     * Vote on a proposal
     */
    pub fn vote(&mut self, voter: String, vote: bool, voting_power: u64) -> Result<(), String> {
        if self.executed {
            return Err("Proposal already executed".to_string());
        }

        if self.voting_deadline > 0 && self.get_current_timestamp() > self.voting_deadline {
            return Err("Voting deadline passed".to_string());
        }

        if vote {
            self.votes_for += voting_power;
        } else {
            self.votes_against += voting_power;
        }

        Ok(())
    }

    /**
     * Execute proposal if approved
     */
    pub fn execute(&mut self, dst_token: &mut DIGMStableToken) -> Result<(), String> {
        if self.executed {
            return Err("Proposal already executed".to_string());
        }

        if self.votes_for <= self.votes_against {
            return Err("Proposal not approved".to_string());
        }

        // Execute proposal based on type
        match self.proposal_type.as_str() {
            "parameter_change" => {
                self.execute_parameter_change(dst_token)?;
            }
            "collateral_addition" => {
                self.execute_collateral_addition(dst_token)?;
            }
            "fee_adjustment" => {
                self.execute_fee_adjustment(dst_token)?;
            }
            _ => {
                return Err(format!("Unknown proposal type: {}", self.proposal_type));
            }
        }

        self.executed = true;
        Ok(())
    }

    /**
     * Execute parameter change
     */
    fn execute_parameter_change(&self, dst_token: &mut DIGMStableToken) -> Result<(), String> {
        // Update DST token parameters based on proposal
        for (parameter, value) in &self.parameters {
            match parameter.as_str() {
                "target_ratio" => {
                    // Update target collateralization ratio
                    println!("Updating target ratio to: {}", value);
                }
                "min_ratio" => {
                    // Update minimum collateralization ratio
                    println!("Updating minimum ratio to: {}", value);
                }
                "max_ratio" => {
                    // Update maximum collateralization ratio
                    println!("Updating maximum ratio to: {}", value);
                }
                _ => {
                    return Err(format!("Unknown parameter: {}", parameter));
                }
            }
        }
        Ok(())
    }

    /**
     * Execute collateral addition
     */
    fn execute_collateral_addition(&self, dst_token: &mut DIGMStableToken) -> Result<(), String> {
        // Add new collateral asset to the basket
        for (asset_type, weight) in &self.parameters {
            let new_collateral = CollateralAsset {
                asset_type: asset_type.clone(),
                amount: 0,
                value_in_xfg: 0,
                weight: *weight,
                last_price_update: 0,
            };
            dst_token.collateral.push(new_collateral);
            println!("Added new collateral asset: {} with weight: {}%", asset_type, weight);
        }
        Ok(())
    }

    /**
     * Execute fee adjustment
     */
    fn execute_fee_adjustment(&self, dst_token: &mut DIGMStableToken) -> Result<(), String> {
        // Adjust minting/burning fees
        for (fee_type, value) in &self.parameters {
            match fee_type.as_str() {
                "minting_fee" => {
                    println!("Updating minting fee to: {}%", value);
                }
                "burning_fee" => {
                    println!("Updating burning fee to: {}%", value);
                }
                _ => {
                    return Err(format!("Unknown fee type: {}", fee_type));
                }
            }
        }
        Ok(())
    }

    /**
     * Get current timestamp (placeholder)
     */
    fn get_current_timestamp(&self) -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }
}

// Export public functions
pub fn create_dst_token(token_id: u64, governance: String) -> DIGMStableToken {
    let mut dst = DIGMStableToken::new(token_id, governance);
    dst.initialize_collateral_basket();
    dst
}

pub fn create_price_oracle() -> PriceOracle {
    PriceOracle::new()
}

pub fn create_governance_proposal(
    proposal_id: u64,
    proposer: String,
    proposal_type: String,
    description: String,
    parameters: HashMap<String, u64>,
) -> GovernanceProposal {
    GovernanceProposal::new(proposal_id, proposer, proposal_type, description, parameters)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dst_creation() {
        let dst = create_dst_token(1, "governance_address".to_string());
        assert_eq!(dst.token_id, 1);
        assert_eq!(dst.collateral_ratio, 150);
        assert_eq!(dst.target_price_xfg, 1000000);
    }

    #[test]
    fn test_collateral_basket_initialization() {
        let mut dst = create_dst_token(1, "governance_address".to_string());
        assert_eq!(dst.collateral.len(), 4);
        
        let asset_types: Vec<String> = dst.collateral.iter().map(|c| c.asset_type.clone()).collect();
        assert!(asset_types.contains(&"XFG".to_string()));
        assert!(asset_types.contains(&"BTC".to_string()));
        assert!(asset_types.contains(&"ETH".to_string()));
        assert!(asset_types.contains(&"USDC".to_string()));
    }

    #[test]
    fn test_price_oracle_creation() {
        let oracle = create_price_oracle();
        assert_eq!(oracle.feeds.len(), 4);
        assert_eq!(oracle.deviation_threshold, 5);
    }

    #[test]
    fn test_governance_proposal_creation() {
        let mut parameters = HashMap::new();
        parameters.insert("target_ratio".to_string(), 160);
        
        let proposal = create_governance_proposal(
            1,
            "proposer_address".to_string(),
            "parameter_change".to_string(),
            "Increase target ratio to 160%".to_string(),
            parameters,
        );
        
        assert_eq!(proposal.proposal_id, 1);
        assert_eq!(proposal.proposal_type, "parameter_change");
        assert_eq!(proposal.votes_for, 0);
        assert_eq!(proposal.votes_against, 0);
    }
}
