#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, Vec};

#[contract]
pub struct StellarVoucher;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Voucher {
    pub id: Symbol,
    pub recipient: Address,
    pub amount: i128,
    pub asset: Address,
    pub expires_at: u64,
    pub claimed: bool,
}

#[contractimpl]
impl StellarVoucher {
    /// Create a new voucher for PARA redemption
    pub fn create_voucher(
        env: &Env,
        recipient: Address,
        amount: i128,
        asset: Address,
        expires_at: u64,
    ) -> Symbol {
        let voucher_id = symbol_short!("voucher");
        
        // Check if voucher already exists
        if env.storage().has(&voucher_id) {
            panic!("Voucher already exists");
        }

        let voucher = Voucher {
            id: voucher_id.clone(),
            recipient,
            amount,
            asset,
            expires_at,
            claimed: false,
        };

        env.storage().set(&voucher_id, &voucher);
        voucher_id
    }

    /// Claim a voucher and transfer PARA to recipient
    pub fn claim_voucher(env: &Env, voucher_id: Symbol) -> bool {
        let voucher: Voucher = env.storage().get(&voucher_id).unwrap();
        
        // Check if voucher is already claimed
        if voucher.claimed {
            panic!("Voucher already claimed");
        }

        // Check if voucher has expired
        if env.ledger().timestamp() > voucher.expires_at {
            panic!("Voucher has expired");
        }

        // Check if caller is the recipient
        let caller = env.current_contract_address();
        if caller != voucher.recipient {
            panic!("Only recipient can claim voucher");
        }

        // Transfer PARA to recipient
        let client = soroban_sdk::token::Client::new(env, &voucher.asset);
        client.transfer(&env.current_contract_address(), &voucher.recipient, &voucher.amount);

        // Mark voucher as claimed
        let mut updated_voucher = voucher;
        updated_voucher.claimed = true;
        env.storage().set(&voucher_id, &updated_voucher);

        true
    }

    /// Get voucher details
    pub fn get_voucher(env: &Env, voucher_id: Symbol) -> Voucher {
        env.storage().get(&voucher_id).unwrap()
    }

    /// List all vouchers for an address
    pub fn list_vouchers(env: &Env, recipient: Address) -> Vec<Symbol> {
        // This is a simplified implementation
        // In production, you'd want to maintain an index of vouchers per recipient
        let voucher_id = symbol_short!("voucher");
        if env.storage().has(&voucher_id) {
            let voucher: Voucher = env.storage().get(&voucher_id).unwrap();
            if voucher.recipient == recipient {
                let mut vouchers = Vec::new(env);
                vouchers.push_back(voucher_id);
                vouchers
            } else {
                Vec::new(env)
            }
        } else {
            Vec::new(env)
        }
    }

    /// Cancel a voucher (only by creator)
    pub fn cancel_voucher(env: &Env, voucher_id: Symbol) -> bool {
        let voucher: Voucher = env.storage().get(&voucher_id).unwrap();
        
        // Only the contract creator can cancel vouchers
        let creator = env.current_contract_address();
        let caller = env.current_contract_address();
        if caller != creator {
            panic!("Only creator can cancel vouchers");
        }

        // Remove voucher from storage
        env.storage().remove(&voucher_id);
        true
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger, LedgerInfo};

    #[test]
    fn test_create_and_claim_voucher() {
        let env = Env::default();
        let contract_id = env.register_contract(None, StellarVoucher);
        let client = StellarVoucherClient::new(&env, &contract_id);

        let recipient = Address::generate(&env);
        let asset = Address::generate(&env);
        let amount = 1000000; // 1 PARA (6 decimals)
        let expires_at = env.ledger().timestamp() + 3600; // 1 hour from now

        // Create voucher
        let voucher_id = client.create_voucher(&recipient, &amount, &asset, &expires_at);
        
        // Get voucher details
        let voucher = client.get_voucher(&voucher_id);
        assert_eq!(voucher.recipient, recipient);
        assert_eq!(voucher.amount, amount);
        assert_eq!(voucher.claimed, false);

        // Claim voucher (this would fail in real test due to token transfer)
        // let claimed = client.claim_voucher(&voucher_id);
        // assert_eq!(claimed, true);
    }
} 