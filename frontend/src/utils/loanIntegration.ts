/**
 * DST Loan System Integration
 * Frontend integration for dynamic interest rate loan functionality
 */

export interface LoanApplication {
  applicant: string;
  loanType: 'production' | 'marketing' | 'equipment';
  requestedAmount: number;
  collateralAmount: number;
  termLength: number;
  purpose: string;
  repaymentPlan: string;
  creditScore: number;
  applicationDate: number;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
}

export interface DSTLoan {
  loanId: number;
  borrower: string;
  collateralAmount: number;        // XFG amount locked as collateral
  loanAmount: number;              // DST amount borrowed
  baseInterestRate: number;
  currentInterestRate: number;
  termLength: number;
  createdAt: number;
  dueDate: number;
  repaidAt?: number;
  status: 'active' | 'repaid' | 'defaulted' | 'liquidated' | 'grace_period';
  repaymentHistory: Repayment[];
  collateralRatio: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  earlyPaymentBonusTotal: number;
}

export interface Repayment {
  amount: number;
  timestamp: number;
  interestPaid: number;
  principalPaid: number;
  earlyPaymentBonus: number;
  daysEarly: number;
}

export interface BorrowerReputation {
  borrower: string;
  totalLoans: number;
  repaidLoans: number;
  defaultedLoans: number;
  averageRepaymentTime: number;
  promptPaymentRatio: number;
  creditScore: number;
  lastActivity: number;
  totalEarlyPaymentBonus: number;
}

export interface LoanStats {
  totalLoansCreated: number;
  totalLoansRepaid: number;
  totalInterestCollected: number;
  totalEarlyPaymentBonus: number;
  activeLoans: number;
  defaultedLoans: number;
  averageInterestRate: number;
  promptPaymentRate: number;
}

export interface InterestRateCalculation {
  baseRate: number;
  collateralDiscount: number;
  reputationFactor: number;
  promptPaymentDiscount: number;
  finalRate: number;
  savings: number;
}

class LoanIntegration {
  private contractAddress: string;
  private fuegoRpcUrl: string;
  private isInitialized = false;

  constructor() {
    this.contractAddress = process.env.REACT_APP_LOAN_CONTRACT_ADDRESS || '';
    this.fuegoRpcUrl = process.env.REACT_APP_FUEGO_RPC_URL || 'http://localhost:8080';
  }

  /**
   * Initialize loan integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Verify contract connection
      await this.verifyContractConnection();
      
      this.isInitialized = true;
      console.log('Loan Integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize loan integration:', error);
      throw error;
    }
  }

  /**
   * Apply for a loan
   */
  async applyForLoan(application: LoanApplication): Promise<number> {
    await this.ensureInitialized();

    try {
      const response = await fetch(`${this.fuegoRpcUrl}/loans/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(application)
      });

      if (!response.ok) {
        throw new Error(`Failed to apply for loan: ${response.statusText}`);
      }

      const data = await response.json();
      return data.applicationId;
    } catch (error) {
      console.error('Error applying for loan:', error);
      throw error;
    }
  }

  /**
   * Create a loan (after approval)
   */
  async createLoan(
    borrower: string,
    collateralAmount: number,
    loanAmount: number,
    termLength: number
  ): Promise<DSTLoan> {
    await this.ensureInitialized();

    try {
      const response = await fetch(`${this.fuegoRpcUrl}/loans/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrower,
          collateralAmount,
          loanAmount,
          termLength
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create loan: ${response.statusText}`);
      }

      const data = await response.json();
      return data.loan;
    } catch (error) {
      console.error('Error creating loan:', error);
      throw error;
    }
  }

  /**
   * Repay a loan
   */
  async repayLoan(
    loanId: number,
    repaymentAmount: number,
    borrower: string
  ): Promise<Repayment> {
    await this.ensureInitialized();

    try {
      const response = await fetch(`${this.fuegoRpcUrl}/loans/repay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId,
          repaymentAmount,
          borrower
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to repay loan: ${response.statusText}`);
      }

      const data = await response.json();
      return data.repayment;
    } catch (error) {
      console.error('Error repaying loan:', error);
      throw error;
    }
  }

  /**
   * Get loan information
   */
  async getLoan(loanId: number): Promise<DSTLoan> {
    await this.ensureInitialized();

    try {
      const response = await fetch(`${this.fuegoRpcUrl}/loans/${loanId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch loan: ${response.statusText}`);
      }

      const data = await response.json();
      return data.loan;
    } catch (error) {
      console.error('Error fetching loan:', error);
      throw error;
    }
  }

  /**
   * Get all loans for a borrower
   */
  async getBorrowerLoans(borrower: string): Promise<DSTLoan[]> {
    await this.ensureInitialized();

    try {
      const response = await fetch(`${this.fuegoRpcUrl}/loans/borrower/${borrower}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch borrower loans: ${response.statusText}`);
      }

      const data = await response.json();
      return data.loans;
    } catch (error) {
      console.error('Error fetching borrower loans:', error);
      throw error;
    }
  }

  /**
   * Get borrower reputation
   */
  async getBorrowerReputation(borrower: string): Promise<BorrowerReputation> {
    await this.ensureInitialized();

    try {
      const response = await fetch(`${this.fuegoRpcUrl}/loans/reputation/${borrower}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch borrower reputation: ${response.statusText}`);
      }

      const data = await response.json();
      return data.reputation;
    } catch (error) {
      console.error('Error fetching borrower reputation:', error);
      throw error;
    }
  }

  /**
   * Calculate interest rate for a potential loan
   */
  async calculateInterestRate(
    collateralAmount: number,
    loanAmount: number,
    termLength: number,
    borrower: string
  ): Promise<InterestRateCalculation> {
    await this.ensureInitialized();

    try {
      const response = await fetch(`${this.fuegoRpcUrl}/loans/calculate-rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collateralAmount,
          loanAmount,
          termLength,
          borrower
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to calculate interest rate: ${response.statusText}`);
      }

      const data = await response.json();
      return data.calculation;
    } catch (error) {
      console.error('Error calculating interest rate:', error);
      throw error;
    }
  }

  /**
   * Calculate early payment bonus
   */
  async calculateEarlyPaymentBonus(
    loanId: number,
    repaymentAmount: number,
    daysEarly: number
  ): Promise<number> {
    await this.ensureInitialized();

    try {
      const response = await fetch(`${this.fuegoRpcUrl}/loans/calculate-bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId,
          repaymentAmount,
          daysEarly
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to calculate early payment bonus: ${response.statusText}`);
      }

      const data = await response.json();
      return data.bonus;
    } catch (error) {
      console.error('Error calculating early payment bonus:', error);
      throw error;
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<LoanStats> {
    await this.ensureInitialized();

    try {
      const response = await fetch(`${this.fuegoRpcUrl}/loans/stats`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch system stats: ${response.statusText}`);
      }

      const data = await response.json();
      return data.stats;
    } catch (error) {
      console.error('Error fetching system stats:', error);
      throw error;
    }
  }

  /**
   * Get loan applications
   */
  async getLoanApplications(borrower?: string): Promise<LoanApplication[]> {
    await this.ensureInitialized();

    try {
      const url = borrower 
        ? `${this.fuegoRpcUrl}/loans/applications?borrower=${borrower}`
        : `${this.fuegoRpcUrl}/loans/applications`;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch loan applications: ${response.statusText}`);
      }

      const data = await response.json();
      return data.applications;
    } catch (error) {
      console.error('Error fetching loan applications:', error);
      throw error;
    }
  }

  /**
   * Approve or reject loan application
   */
  async reviewLoanApplication(
    applicationId: number,
    decision: 'approve' | 'reject',
    reviewer: string,
    notes?: string
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      const response = await fetch(`${this.fuegoRpcUrl}/loans/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          decision,
          reviewer,
          notes
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to review loan application: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error reviewing loan application:', error);
      throw error;
    }
  }

  /**
   * Get loan payment schedule
   */
  async getPaymentSchedule(loanId: number): Promise<PaymentSchedule> {
    await this.ensureInitialized();

    try {
      const response = await fetch(`${this.fuegoRpcUrl}/loans/schedule/${loanId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch payment schedule: ${response.statusText}`);
      }

      const data = await response.json();
      return data.schedule;
    } catch (error) {
      console.error('Error fetching payment schedule:', error);
      throw error;
    }
  }

  /**
   * Calculate loan affordability
   */
  async calculateAffordability(
    borrower: string,
    monthlyIncome: number,
    monthlyExpenses: number
  ): Promise<AffordabilityCalculation> {
    await this.ensureInitialized();

    try {
      const response = await fetch(`${this.fuegoRpcUrl}/loans/affordability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrower,
          monthlyIncome,
          monthlyExpenses
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to calculate affordability: ${response.statusText}`);
      }

      const data = await response.json();
      return data.calculation;
    } catch (error) {
      console.error('Error calculating affordability:', error);
      throw error;
    }
  }

  /**
   * Verify contract connection
   */
  private async verifyContractConnection(): Promise<void> {
    try {
      const response = await fetch(`${this.fuegoRpcUrl}/loans/status`);
      if (!response.ok) {
        throw new Error('Contract connection failed');
      }
    } catch (error) {
      throw new Error(`Failed to connect to loan contract: ${error}`);
    }
  }

  /**
   * Ensure loan integration is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

// Additional interfaces
export interface PaymentSchedule {
  loanId: number;
  totalPayments: number;
  payments: PaymentScheduleItem[];
  totalInterest: number;
  totalPrincipal: number;
  earlyPaymentSavings: number;
}

export interface PaymentScheduleItem {
  paymentNumber: number;
  dueDate: number;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  remainingBalance: number;
  earlyPaymentBonus?: number;
}

export interface AffordabilityCalculation {
  borrower: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  availableIncome: number;
  maxLoanAmount: number;
  recommendedLoanAmount: number;
  debtToIncomeRatio: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

// Export singleton instance
export const loanIntegration = new LoanIntegration();

export default loanIntegration;
