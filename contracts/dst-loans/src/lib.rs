/**
 * DST Loan System - Dynamic Interest Rate Implementation
 * 
 * A decentralized lending system that rewards prompt repayment with reduced interest rates,
 * creating a sustainable lending ecosystem within the DIGM platform.
 */

use std::collections::HashMap;
use std::string::String;
use std::vec::Vec;

// Loan Status Enum
#[derive(Debug, Clone, PartialEq)]
pub enum LoanStatus {
    Active,
    Repaid,
    Defaulted,
    Liquidated,
    GracePeriod,
}

// Repayment Structure
#[derive(Debug, Clone)]
pub struct Repayment {
    pub amount: u64,                   // Repayment amount
    pub timestamp: u64,               // Repayment timestamp
    pub interest_paid: u64,           // Interest portion of payment
    pub principal_paid: u64,          // Principal portion of payment
    pub early_payment_bonus: u64,     // Discount applied for early payment
    pub days_early: u64,              // Days repaid early
}

// DST Loan Structure
#[derive(Debug, Clone)]
pub struct DSTLoan {
    pub loan_id: u64,
    pub borrower: String,
    pub collateral_amount: u64,        // XFG amount locked as collateral
    pub loan_amount: u64,              // DST amount borrowed
    pub base_interest_rate: u64,      // Base annual interest rate (basis points)
    pub current_interest_rate: u64,    // Current interest rate after discounts
    pub term_length: u64,              // Loan term in days
    pub created_at: u64,              // Loan creation timestamp
    pub due_date: u64,                // Loan due date
    pub repaid_at: Option<u64>,        // Repayment timestamp
    pub status: LoanStatus,            // Current loan status
    pub repayment_history: Vec<Repayment>,
    pub collateral_ratio: u64,         // Current collateralization ratio
    pub total_interest_paid: u64,      // Total interest paid so far
    pub total_principal_paid: u64,     // Total principal paid so far
    pub early_payment_bonus_total: u64, // Total early payment bonuses
}

// Borrower Reputation Structure
#[derive(Debug, Clone)]
pub struct BorrowerReputation {
    pub borrower: String,
    pub total_loans: u64,
    pub repaid_loans: u64,
    pub defaulted_loans: u64,
    pub average_repayment_time: u64,  // Average days to repayment
    pub prompt_payment_ratio: u64,    // Percentage of prompt payments
    pub credit_score: u64,            // 0-1000 credit score
    pub last_activity: u64,
    pub total_early_payment_bonus: u64, // Total bonuses earned
}

// Interest Rate Model
#[derive(Debug, Clone)]
pub struct InterestRateModel {
    pub base_rate: u64,               // Base annual interest rate (e.g., 12% = 1200 bps)
    pub prompt_payment_discount: u64,  // Discount for early payment (e.g., 50% = 5000 bps)
    pub risk_premium: u64,           // Risk-based premium
    pub collateral_discount: u64,     // Discount for high-quality collateral
    pub borrower_history_factor: u64, // Factor based on repayment history
    pub max_discount: u64,            // Maximum total discount (e.g., 75% = 7500 bps)
}

// DST Loan System Implementation
pub struct DSTLoanSystem {
    pub loans: HashMap<u64, DSTLoan>,
    pub borrower_reputations: HashMap<String, BorrowerReputation>,
    pub interest_rate_model: InterestRateModel,
    pub next_loan_id: u64,
    pub total_loans_created: u64,
    pub total_loans_repaid: u64,
    pub total_interest_collected: u64,
    pub total_early_payment_bonus: u64,
}

impl DSTLoanSystem {
    pub fn new() -> Self {
        Self {
            loans: HashMap::new(),
            borrower_reputations: HashMap::new(),
            interest_rate_model: InterestRateModel {
                base_rate: 1200,        // 12% base rate
                prompt_payment_discount: 100, // 1% per day early
                risk_premium: 200,      // 2% risk premium
                collateral_discount: 500, // 5% collateral discount
                borrower_history_factor: 10000, // 100% base factor
                max_discount: 7500,     // 75% maximum discount
            },
            next_loan_id: 1,
            total_loans_created: 0,
            total_loans_repaid: 0,
            total_interest_collected: 0,
            total_early_payment_bonus: 0,
        }
    }

    /**
     * Create a new loan
     */
    pub fn create_loan(
        &mut self,
        borrower: String,
        collateral_amount: u64,
        loan_amount: u64,
        term_length: u64,
    ) -> Result<u64, String> {
        // Validate loan parameters
        if loan_amount == 0 {
            return Err("Loan amount must be greater than zero".to_string());
        }
        
        if collateral_amount == 0 {
            return Err("Collateral amount must be greater than zero".to_string());
        }
        
        if term_length == 0 {
            return Err("Term length must be greater than zero".to_string());
        }

        // Check minimum collateralization ratio (120%)
        // XFG collateral / DST loan amount (both in atomic units)
        let collateral_ratio = (collateral_amount * 100) / loan_amount;
        if collateral_ratio < 120 {
            return Err("Insufficient collateral: minimum 120% required".to_string());
        }

        // Calculate interest rate based on borrower reputation and collateral
        let borrower_rep = self.get_or_create_borrower_reputation(&borrower);
        let interest_rate = self.calculate_interest_rate(collateral_ratio, &borrower_rep);

        // Create loan
        let loan_id = self.next_loan_id;
        let current_time = self.get_current_timestamp();
        
        let loan = DSTLoan {
            loan_id,
            borrower: borrower.clone(),
            collateral_amount,
            loan_amount,
            base_interest_rate: self.interest_rate_model.base_rate,
            current_interest_rate: interest_rate,
            term_length,
            created_at: current_time,
            due_date: current_time + (term_length * 24 * 60 * 60), // Convert days to seconds
            repaid_at: None,
            status: LoanStatus::Active,
            repayment_history: Vec::new(),
            collateral_ratio,
            total_interest_paid: 0,
            total_principal_paid: 0,
            early_payment_bonus_total: 0,
        };

        // Store loan
        self.loans.insert(loan_id, loan);
        self.next_loan_id += 1;
        self.total_loans_created += 1;

        // Update borrower reputation
        self.update_borrower_reputation(&borrower, 0, 0, 0); // New loan created

        Ok(loan_id)
    }

    /**
     * Repay a loan
     */
    pub fn repay_loan(
        &mut self,
        loan_id: u64,
        repayment_amount: u64,
        borrower: String,
    ) -> Result<Repayment, String> {
        let loan = self.loans.get_mut(&loan_id)
            .ok_or("Loan not found")?;

        // Validate borrower
        if loan.borrower != borrower {
            return Err("Unauthorized borrower".to_string());
        }

        // Check loan status
        if loan.status != LoanStatus::Active {
            return Err("Loan is not active".to_string());
        }

        // Calculate days early
        let current_time = self.get_current_timestamp();
        let days_early = if current_time < loan.due_date {
            (loan.due_date - current_time) / (24 * 60 * 60) // Convert seconds to days
        } else {
            0
        };

        // Calculate interest owed
        let interest_owed = self.calculate_interest_owed(loan, days_early);
        let principal_owed = loan.loan_amount - loan.total_principal_paid;

        // Validate repayment amount
        if repayment_amount < interest_owed + principal_owed {
            return Err("Insufficient repayment amount".to_string());
        }

        // Calculate early payment bonus
        let early_payment_bonus = if days_early > 0 {
            self.calculate_early_payment_bonus(interest_owed, days_early)
        } else {
            0
        };

        // Calculate final interest (after bonus)
        let final_interest = interest_owed.saturating_sub(early_payment_bonus);
        let principal_paid = repayment_amount - final_interest;

        // Create repayment record
        let repayment = Repayment {
            amount: repayment_amount,
            timestamp: current_time,
            interest_paid: final_interest,
            principal_paid,
            early_payment_bonus,
            days_early,
        };

        // Update loan
        loan.repayment_history.push(repayment.clone());
        loan.total_interest_paid += final_interest;
        loan.total_principal_paid += principal_paid;
        loan.early_payment_bonus_total += early_payment_bonus;

        // Check if loan is fully repaid
        if loan.total_principal_paid >= loan.loan_amount {
            loan.status = LoanStatus::Repaid;
            loan.repaid_at = Some(current_time);
            self.total_loans_repaid += 1;
        }

        // Update system totals
        self.total_interest_collected += final_interest;
        self.total_early_payment_bonus += early_payment_bonus;

        // Update borrower reputation
        self.update_borrower_reputation(&borrower, 1, 0, days_early);

        Ok(repayment)
    }

    /**
     * Calculate interest rate based on collateral and borrower reputation
     */
    fn calculate_interest_rate(&self, collateral_ratio: u64, borrower_rep: &BorrowerReputation) -> u64 {
        let mut rate = self.interest_rate_model.base_rate;

        // Apply collateral discount
        if collateral_ratio > 200 {
            // Over-collateralized: 20% discount
            rate = rate.saturating_sub(self.interest_rate_model.collateral_discount);
        } else if collateral_ratio > 150 {
            // Well-collateralized: 10% discount
            rate = rate.saturating_sub(self.interest_rate_model.collateral_discount / 2);
        }

        // Apply borrower reputation factor
        let reputation_factor = borrower_rep.get_interest_rate_factor();
        rate = (rate * reputation_factor) / 10000;

        // Ensure minimum rate
        rate.max(100) // Minimum 1% annual rate
    }

    /**
     * Calculate interest owed based on repayment timing
     */
    fn calculate_interest_owed(&self, loan: &DSTLoan, days_early: u64) -> u64 {
        let days_elapsed = if days_early > 0 {
            loan.term_length - days_early
        } else {
            loan.term_length
        };

        // Calculate interest based on days elapsed
        let daily_rate = loan.current_interest_rate / 365; // Convert annual to daily
        let interest_owed = (loan.loan_amount * daily_rate * days_elapsed) / 10000;

        interest_owed
    }

    /**
     * Calculate early payment bonus
     */
    fn calculate_early_payment_bonus(&self, interest_owed: u64, days_early: u64) -> u64 {
        // Calculate bonus based on days early (max 75% discount)
        let bonus_percentage = (days_early * self.interest_rate_model.prompt_payment_discount)
            .min(self.interest_rate_model.max_discount);
        
        let bonus = (interest_owed * bonus_percentage) / 10000;
        bonus
    }

    /**
     * Get or create borrower reputation
     */
    fn get_or_create_borrower_reputation(&mut self, borrower: &String) -> BorrowerReputation {
        if let Some(rep) = self.borrower_reputations.get(borrower) {
            rep.clone()
        } else {
            let new_rep = BorrowerReputation {
                borrower: borrower.clone(),
                total_loans: 0,
                repaid_loans: 0,
                defaulted_loans: 0,
                average_repayment_time: 0,
                prompt_payment_ratio: 0,
                credit_score: 500, // Start with average credit score
                last_activity: self.get_current_timestamp(),
                total_early_payment_bonus: 0,
            };
            self.borrower_reputations.insert(borrower.clone(), new_rep.clone());
            new_rep
        }
    }

    /**
     * Update borrower reputation
     */
    fn update_borrower_reputation(&mut self, borrower: &String, repaid_loans: u64, defaulted_loans: u64, days_early: u64) {
        if let Some(rep) = self.borrower_reputations.get_mut(borrower) {
            rep.total_loans += 1;
            rep.repaid_loans += repaid_loans;
            rep.defaulted_loans += defaulted_loans;
            rep.last_activity = self.get_current_timestamp();

            // Update average repayment time
            if days_early > 0 {
                let total_time = rep.average_repayment_time * (rep.repaid_loans - 1) + days_early;
                rep.average_repayment_time = total_time / rep.repaid_loans;
            }

            // Update prompt payment ratio
            if rep.total_loans > 0 {
                rep.prompt_payment_ratio = (rep.repaid_loans * 10000) / rep.total_loans;
            }

            // Recalculate credit score
            rep.credit_score = rep.calculate_credit_score();
        }
    }

    /**
     * Get loan information
     */
    pub fn get_loan(&self, loan_id: u64) -> Option<&DSTLoan> {
        self.loans.get(&loan_id)
    }

    /**
     * Get borrower reputation
     */
    pub fn get_borrower_reputation(&self, borrower: &String) -> Option<&BorrowerReputation> {
        self.borrower_reputations.get(borrower)
    }

    /**
     * Get all loans for a borrower
     */
    pub fn get_borrower_loans(&self, borrower: &String) -> Vec<&DSTLoan> {
        self.loans.values()
            .filter(|loan| loan.borrower == *borrower)
            .collect()
    }

    /**
     * Get system statistics
     */
    pub fn get_system_stats(&self) -> SystemStats {
        SystemStats {
            total_loans_created: self.total_loans_created,
            total_loans_repaid: self.total_loans_repaid,
            total_interest_collected: self.total_interest_collected,
            total_early_payment_bonus: self.total_early_payment_bonus,
            active_loans: self.loans.values().filter(|l| l.status == LoanStatus::Active).count() as u64,
            defaulted_loans: self.loans.values().filter(|l| l.status == LoanStatus::Defaulted).count() as u64,
            average_interest_rate: self.calculate_average_interest_rate(),
            prompt_payment_rate: self.calculate_prompt_payment_rate(),
        }
    }

    /**
     * Calculate average interest rate
     */
    fn calculate_average_interest_rate(&self) -> u64 {
        if self.loans.is_empty() {
            return 0;
        }

        let total_rate: u64 = self.loans.values().map(|l| l.current_interest_rate).sum();
        total_rate / self.loans.len() as u64
    }

    /**
     * Calculate prompt payment rate
     */
    fn calculate_prompt_payment_rate(&self) -> u64 {
        if self.total_loans_repaid == 0 {
            return 0;
        }

        let prompt_payments = self.loans.values()
            .filter(|l| l.status == LoanStatus::Repaid)
            .filter(|l| l.early_payment_bonus_total > 0)
            .count() as u64;

        (prompt_payments * 10000) / self.total_loans_repaid
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

// Borrower Reputation Implementation
impl BorrowerReputation {
    /**
     * Calculate credit score based on repayment history
     */
    pub fn calculate_credit_score(&self) -> u64 {
        if self.total_loans == 0 {
            return 500; // Default score for new borrowers
        }

        let repayment_rate = (self.repaid_loans * 10000) / self.total_loans;
        let prompt_payment_bonus = self.prompt_payment_ratio;
        let time_bonus = if self.average_repayment_time < 7 { 100 } else { 0 };
        
        let score = (repayment_rate + prompt_payment_bonus + time_bonus).min(1000);
        score
    }

    /**
     * Get interest rate factor based on credit score
     */
    pub fn get_interest_rate_factor(&self) -> u64 {
        match self.credit_score {
            900..=1000 => 8000,  // 20% discount for excellent credit
            800..=899  => 9000,   // 10% discount for good credit
            700..=799  => 9500,   // 5% discount for fair credit
            600..=699  => 10000,  // No discount for average credit
            500..=599  => 10500,  // 5% penalty for below average
            _          => 11000,  // 10% penalty for poor credit
        }
    }
}

// System Statistics Structure
#[derive(Debug, Clone)]
pub struct SystemStats {
    pub total_loans_created: u64,
    pub total_loans_repaid: u64,
    pub total_interest_collected: u64,
    pub total_early_payment_bonus: u64,
    pub active_loans: u64,
    pub defaulted_loans: u64,
    pub average_interest_rate: u64,
    pub prompt_payment_rate: u64,
}

// Export public functions
pub fn create_dst_loan_system() -> DSTLoanSystem {
    DSTLoanSystem::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_loan_creation() {
        let mut system = create_dst_loan_system();
        let borrower = "test_borrower".to_string();
        
        let result = system.create_loan(borrower.clone(), 120000000, 100000000, 30);
        assert!(result.is_ok());
        
        let loan_id = result.unwrap();
        let loan = system.get_loan(loan_id).unwrap();
        assert_eq!(loan.borrower, borrower);
        assert_eq!(loan.collateral_amount, 120000000);
        assert_eq!(loan.loan_amount, 100000000);
        assert_eq!(loan.term_length, 30);
        assert_eq!(loan.status, LoanStatus::Active);
    }

    #[test]
    fn test_loan_repayment() {
        let mut system = create_dst_loan_system();
        let borrower = "test_borrower".to_string();
        
        let loan_id = system.create_loan(borrower.clone(), 120000000, 100000000, 30).unwrap();
        
        // Repay loan early (10 days early)
        let repayment = system.repay_loan(loan_id, 100000000, borrower.clone()).unwrap();
        
        assert_eq!(repayment.amount, 100000000);
        assert!(repayment.early_payment_bonus > 0);
        assert!(repayment.days_early > 0);
        
        let loan = system.get_loan(loan_id).unwrap();
        assert_eq!(loan.status, LoanStatus::Repaid);
    }

    #[test]
    fn test_borrower_reputation() {
        let mut system = create_dst_loan_system();
        let borrower = "test_borrower".to_string();
        
        // Create and repay multiple loans
        for _ in 0..5 {
            let loan_id = system.create_loan(borrower.clone(), 120000000, 100000000, 30).unwrap();
            system.repay_loan(loan_id, 100000000, borrower.clone()).unwrap();
        }
        
        let reputation = system.get_borrower_reputation(&borrower).unwrap();
        assert_eq!(reputation.total_loans, 5);
        assert_eq!(reputation.repaid_loans, 5);
        assert!(reputation.credit_score > 500);
    }

    #[test]
    fn test_interest_rate_calculation() {
        let mut system = create_dst_loan_system();
        let borrower = "test_borrower".to_string();
        
        // Test over-collateralized loan
        let loan_id = system.create_loan(borrower.clone(), 200000000, 100000000, 30).unwrap();
        let loan = system.get_loan(loan_id).unwrap();
        
        // Should have lower interest rate due to over-collateralization
        assert!(loan.current_interest_rate < system.interest_rate_model.base_rate);
    }

    #[test]
    fn test_early_payment_bonus() {
        let mut system = create_dst_loan_system();
        let borrower = "test_borrower".to_string();
        
        let loan_id = system.create_loan(borrower.clone(), 120000000, 100000000, 30).unwrap();
        
        // Repay very early (25 days early)
        let repayment = system.repay_loan(loan_id, 100000000, borrower.clone()).unwrap();
        
        // Should have significant early payment bonus
        assert!(repayment.early_payment_bonus > 0);
        assert!(repayment.days_early > 20);
    }
}
