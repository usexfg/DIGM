import React, { useState, useEffect } from 'react';
import { 
  loanIntegration, 
  DSTLoan, 
  BorrowerReputation, 
  LoanApplication, 
  InterestRateCalculation,
  LoanStats 
} from '../utils/loanIntegration';

interface LoanManagerProps {
  userAddress: string;
  onClose: () => void;
}

const LoanManager: React.FC<LoanManagerProps> = ({ userAddress, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'apply' | 'my-loans' | 'repay' | 'stats'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  
  // Data state
  const [reputation, setReputation] = useState<BorrowerReputation | null>(null);
  const [loans, setLoans] = useState<DSTLoan[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [stats, setStats] = useState<LoanStats | null>(null);
  
  // Apply form state
  const [applyForm, setApplyForm] = useState({
    loanType: 'production' as 'production' | 'marketing' | 'equipment',
    requestedAmount: '',
    collateralAmount: '',
    termLength: '30',
    purpose: '',
    repaymentPlan: ''
  });
  
  // Repay form state
  const [repayForm, setRepayForm] = useState({
    loanId: '',
    repaymentAmount: '',
    daysEarly: 0,
    earlyPaymentBonus: 0
  });
  
  // Interest calculation state
  const [interestCalculation, setInterestCalculation] = useState<InterestRateCalculation | null>(null);

  useEffect(() => {
    loadLoanData();
  }, [userAddress]);

  const loadLoanData = async () => {
    try {
      setIsLoading(true);
      
      // Load all loan data in parallel
      const [reputationData, loansData, applicationsData, statsData] = await Promise.all([
        loanIntegration.getBorrowerReputation(userAddress),
        loanIntegration.getBorrowerLoans(userAddress),
        loanIntegration.getLoanApplications(userAddress),
        loanIntegration.getSystemStats()
      ]);
      
      setReputation(reputationData);
      setLoans(loansData);
      setApplications(applicationsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load loan data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyForLoan = async () => {
    try {
      setIsLoading(true);
      
      const application: LoanApplication = {
        applicant: userAddress,
        loanType: applyForm.loanType,
        requestedAmount: parseFloat(applyForm.requestedAmount),
        collateralAmount: parseFloat(applyForm.collateralAmount),
        termLength: parseInt(applyForm.termLength),
        purpose: applyForm.purpose,
        repaymentPlan: applyForm.repaymentPlan,
        creditScore: reputation?.creditScore || 500,
        applicationDate: Date.now(),
        status: 'pending'
      };
      
      const applicationId = await loanIntegration.applyForLoan(application);
      console.log('Loan application submitted:', applicationId);
      
      // Refresh data
      await loadLoanData();
      
      // Reset form
      setApplyForm({
        loanType: 'production',
        requestedAmount: '',
        collateralAmount: '',
        termLength: '30',
        purpose: '',
        repaymentPlan: ''
      });
      
      setActiveTab('my-loans');
    } catch (error) {
      console.error('Failed to apply for loan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepayLoan = async () => {
    try {
      setIsLoading(true);
      
      const repayment = await loanIntegration.repayLoan(
        parseInt(repayForm.loanId),
        parseFloat(repayForm.repaymentAmount),
        userAddress
      );
      
      console.log('Loan repayment processed:', repayment);
      
      // Refresh data
      await loadLoanData();
      
      // Reset form
      setRepayForm({
        loanId: '',
        repaymentAmount: '',
        daysEarly: 0,
        earlyPaymentBonus: 0
      });
      
      setActiveTab('my-loans');
    } catch (error) {
      console.error('Failed to repay loan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateInterestRate = async () => {
    if (!applyForm.requestedAmount || !applyForm.collateralAmount || !applyForm.termLength) {
      return;
    }

    try {
      const calculation = await loanIntegration.calculateInterestRate(
        parseFloat(applyForm.collateralAmount),
        parseFloat(applyForm.requestedAmount),
        parseInt(applyForm.termLength),
        userAddress
      );
      
      setInterestCalculation(calculation);
    } catch (error) {
      console.error('Failed to calculate interest rate:', error);
    }
  };

  const calculateEarlyPaymentBonus = async (loanId: number, repaymentAmount: number, daysEarly: number) => {
    try {
      const bonus = await loanIntegration.calculateEarlyPaymentBonus(loanId, repaymentAmount, daysEarly);
      setRepayForm(prev => ({ ...prev, earlyPaymentBonus: bonus }));
    } catch (error) {
      console.error('Failed to calculate early payment bonus:', error);
    }
  };

  const formatAmount = (amount: number, decimals = 4): string => {
    return (amount / 10000000).toFixed(decimals);
  };

  const formatUSD = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'repaid': return 'text-blue-400';
      case 'defaulted': return 'text-red-400';
      case 'liquidated': return 'text-red-600';
      case 'grace_period': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'active': return '🟢';
      case 'repaid': return '✅';
      case 'defaulted': return '❌';
      case 'liquidated': return '🔥';
      case 'grace_period': return '⏰';
      default: return '❓';
    }
  };

  const getCreditScoreColor = (score: number): string => {
    if (score >= 800) return 'text-green-400';
    if (score >= 700) return 'text-blue-400';
    if (score >= 600) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getCreditScoreLabel = (score: number): string => {
    if (score >= 800) return 'Excellent';
    if (score >= 700) return 'Good';
    if (score >= 600) return 'Fair';
    if (score >= 500) return 'Poor';
    return 'Very Poor';
  };

  if (isLoading && !reputation) {
    return (
      <div className="glass p-8 rounded-2xl max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-8 rounded-2xl max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold gradient-text mb-2">DST Loan System</h2>
          <p className="text-gray-400">Dynamic interest rates with prompt payment rewards</p>
        </div>
        <button
          onClick={onClose}
          className="btn-secondary"
        >
          Close
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-8 bg-gray-800/50 p-1 rounded-xl">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'apply', label: 'Apply for Loan' },
          { id: 'my-loans', label: 'My Loans' },
          { id: 'repay', label: 'Repay Loan' },
          { id: 'stats', label: 'System Stats' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Credit Score Overview */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-xl border border-purple-500/20">
              <h3 className="text-purple-400 font-semibold mb-2">Credit Score</h3>
              <div className={`text-3xl font-bold ${getCreditScoreColor(reputation?.creditScore || 500)}`}>
                {reputation?.creditScore || 500}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {getCreditScoreLabel(reputation?.creditScore || 500)}
              </div>
            </div>

            <div className="glass p-6 rounded-xl border border-green-500/20">
              <h3 className="text-green-400 font-semibold mb-2">Active Loans</h3>
              <div className="text-3xl font-bold text-white">
                {loans.filter(l => l.status === 'active').length}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {loans.filter(l => l.status === 'repaid').length} Repaid
              </div>
            </div>

            <div className="glass p-6 rounded-xl border border-blue-500/20">
              <h3 className="text-blue-400 font-semibold mb-2">Early Payment Bonus</h3>
              <div className="text-3xl font-bold text-white">
                {formatAmount(reputation?.totalEarlyPaymentBonus || 0)} DST
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Total savings earned
              </div>
            </div>
          </div>

          {/* Reputation Details */}
          {reputation && (
            <div className="glass p-6 rounded-xl">
              <h3 className="text-xl font-semibold text-white mb-4">Borrower Reputation</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass p-4 rounded-lg border border-gray-600/50">
                  <div className="text-sm text-gray-400 mb-1">Total Loans</div>
                  <div className="text-lg font-semibold text-white">{reputation.totalLoans}</div>
                </div>
                <div className="glass p-4 rounded-lg border border-gray-600/50">
                  <div className="text-sm text-gray-400 mb-1">Repaid Loans</div>
                  <div className="text-lg font-semibold text-white">{reputation.repaidLoans}</div>
                </div>
                <div className="glass p-4 rounded-lg border border-gray-600/50">
                  <div className="text-sm text-gray-400 mb-1">Prompt Payment Ratio</div>
                  <div className="text-lg font-semibold text-white">{(reputation.promptPaymentRatio / 100).toFixed(1)}%</div>
                </div>
                <div className="glass p-4 rounded-lg border border-gray-600/50">
                  <div className="text-sm text-gray-400 mb-1">Avg Repayment Time</div>
                  <div className="text-lg font-semibold text-white">{reputation.averageRepaymentTime} days</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Loans */}
          <div className="glass p-6 rounded-xl">
            <h3 className="text-xl font-semibold text-white mb-4">Recent Loans</h3>
            <div className="space-y-4">
              {loans.slice(0, 3).map((loan, index) => (
                <div key={index} className="glass p-4 rounded-lg border border-gray-600/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">💰</span>
                      <span className="text-white font-semibold">Loan #{loan.loanId}</span>
                    </div>
                    <span className={`text-sm font-semibold ${getStatusColor(loan.status)}`}>
                      {getStatusIcon(loan.status)} {loan.status}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Amount:</span>
                      <div className="text-white">{formatAmount(loan.loanAmount)} XFG</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Interest Rate:</span>
                      <div className="text-white">{(loan.currentInterestRate / 100).toFixed(2)}%</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Due Date:</span>
                      <div className="text-white">{new Date(loan.dueDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Apply Tab */}
      {activeTab === 'apply' && (
        <div className="glass p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-white mb-6">Apply for Loan</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1">Loan Type</label>
              <select
                value={applyForm.loanType}
                onChange={(e) => setApplyForm(prev => ({ ...prev, loanType: e.target.value as any }))}
                className="input-field w-full"
              >
                <option value="production">Production Loan</option>
                <option value="marketing">Marketing Loan</option>
                <option value="equipment">Equipment Loan</option>
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1">Requested Amount (XFG)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={applyForm.requestedAmount}
                  onChange={(e) => {
                    setApplyForm(prev => ({ ...prev, requestedAmount: e.target.value }));
                    calculateInterestRate();
                  }}
                  className="input-field w-full"
                  placeholder="1.0000"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1">Collateral Amount (DST)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={applyForm.collateralAmount}
                  onChange={(e) => {
                    setApplyForm(prev => ({ ...prev, collateralAmount: e.target.value }));
                    calculateInterestRate();
                  }}
                  className="input-field w-full"
                  placeholder="1.2000"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1">Term Length (Days)</label>
              <input
                type="number"
                value={applyForm.termLength}
                onChange={(e) => {
                  setApplyForm(prev => ({ ...prev, termLength: e.target.value }));
                  calculateInterestRate();
                }}
                className="input-field w-full"
                placeholder="30"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1">Purpose</label>
              <textarea
                value={applyForm.purpose}
                onChange={(e) => setApplyForm(prev => ({ ...prev, purpose: e.target.value }))}
                className="input-field w-full"
                rows={3}
                placeholder="Describe the purpose of this loan..."
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1">Repayment Plan</label>
              <textarea
                value={applyForm.repaymentPlan}
                onChange={(e) => setApplyForm(prev => ({ ...prev, repaymentPlan: e.target.value }))}
                className="input-field w-full"
                rows={3}
                placeholder="Describe your repayment plan..."
              />
            </div>

            {/* Interest Rate Preview */}
            {interestCalculation && (
              <div className="glass p-4 rounded-lg border border-blue-500/20">
                <h4 className="text-blue-400 font-semibold mb-2">Interest Rate Preview</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Base Rate:</span>
                    <span className="text-white">{(interestCalculation.baseRate / 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Collateral Discount:</span>
                    <span className="text-green-400">-{(interestCalculation.collateralDiscount / 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reputation Factor:</span>
                    <span className="text-white">{(interestCalculation.reputationFactor / 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-600 pt-2">
                    <span className="text-gray-400">Final Rate:</span>
                    <span className="text-white font-semibold">{(interestCalculation.finalRate / 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Potential Savings:</span>
                    <span className="text-green-400 font-semibold">{formatAmount(interestCalculation.savings)} DST</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleApplyForLoan}
              disabled={!applyForm.requestedAmount || !applyForm.collateralAmount || isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Applying...' : 'Apply for Loan'}
            </button>
          </div>
        </div>
      )}

      {/* My Loans Tab */}
      {activeTab === 'my-loans' && (
        <div className="glass p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-white mb-6">My Loans</h3>
          
          <div className="space-y-4">
            {loans.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No loans found
              </div>
            ) : (
              loans.map((loan, index) => (
                <div key={index} className="glass p-4 rounded-lg border border-gray-600/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">💰</span>
                      <span className="text-white font-semibold">Loan #{loan.loanId}</span>
                    </div>
                    <span className={`text-sm font-semibold ${getStatusColor(loan.status)}`}>
                      {getStatusIcon(loan.status)} {loan.status}
                    </span>
                  </div>
                  
                  <div className="grid md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-400">Amount:</span>
                      <div className="text-white">{formatAmount(loan.loanAmount)} XFG</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Interest Rate:</span>
                      <div className="text-white">{(loan.currentInterestRate / 100).toFixed(2)}%</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Due Date:</span>
                      <div className="text-white">{new Date(loan.dueDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Collateral:</span>
                      <div className="text-white">{formatAmount(loan.collateralAmount)} DST</div>
                    </div>
                  </div>
                  
                  {loan.status === 'active' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setRepayForm(prev => ({ ...prev, loanId: loan.loanId.toString() }));
                          setActiveTab('repay');
                        }}
                        className="btn-primary flex-1"
                      >
                        Repay Loan
                      </button>
                      <button
                        onClick={() => {
                          const daysEarly = Math.max(0, Math.ceil((loan.dueDate - Date.now()) / (24 * 60 * 60 * 1000)));
                          calculateEarlyPaymentBonus(loan.loanId, loan.loanAmount, daysEarly);
                        }}
                        className="btn-secondary flex-1"
                      >
                        Calculate Bonus
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Repay Tab */}
      {activeTab === 'repay' && (
        <div className="glass p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-white mb-6">Repay Loan</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1">Loan ID</label>
              <input
                type="number"
                value={repayForm.loanId}
                onChange={(e) => setRepayForm(prev => ({ ...prev, loanId: e.target.value }))}
                className="input-field w-full"
                placeholder="Enter loan ID"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1">Repayment Amount (XFG)</label>
              <input
                type="number"
                step="0.0001"
                value={repayForm.repaymentAmount}
                onChange={(e) => setRepayForm(prev => ({ ...prev, repaymentAmount: e.target.value }))}
                className="input-field w-full"
                placeholder="1.0000"
              />
            </div>

            {repayForm.earlyPaymentBonus > 0 && (
              <div className="glass p-4 rounded-lg border border-green-500/20">
                <h4 className="text-green-400 font-semibold mb-2">Early Payment Bonus</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Days Early:</span>
                    <span className="text-white">{repayForm.daysEarly}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bonus Amount:</span>
                    <span className="text-green-400 font-semibold">{formatAmount(repayForm.earlyPaymentBonus)} DST</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Interest Savings:</span>
                    <span className="text-green-400 font-semibold">{formatAmount(repayForm.earlyPaymentBonus)} DST</span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleRepayLoan}
              disabled={!repayForm.loanId || !repayForm.repaymentAmount || isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Processing...' : 'Repay Loan'}
            </button>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && stats && (
        <div className="glass p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-white mb-6">System Statistics</h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass p-4 rounded-lg border border-blue-500/20">
              <div className="text-sm text-gray-400 mb-1">Total Loans Created</div>
              <div className="text-2xl font-bold text-white">{stats.totalLoansCreated}</div>
            </div>
            
            <div className="glass p-4 rounded-lg border border-green-500/20">
              <div className="text-sm text-gray-400 mb-1">Total Loans Repaid</div>
              <div className="text-2xl font-bold text-white">{stats.totalLoansRepaid}</div>
            </div>
            
            <div className="glass p-4 rounded-lg border border-purple-500/20">
              <div className="text-sm text-gray-400 mb-1">Total Interest Collected</div>
              <div className="text-2xl font-bold text-white">{formatAmount(stats.totalInterestCollected)} DST</div>
            </div>
            
            <div className="glass p-4 rounded-lg border border-yellow-500/20">
              <div className="text-sm text-gray-400 mb-1">Total Early Payment Bonus</div>
              <div className="text-2xl font-bold text-white">{formatAmount(stats.totalEarlyPaymentBonus)} DST</div>
            </div>
            
            <div className="glass p-4 rounded-lg border border-cyan-500/20">
              <div className="text-sm text-gray-400 mb-1">Active Loans</div>
              <div className="text-2xl font-bold text-white">{stats.activeLoans}</div>
            </div>
            
            <div className="glass p-4 rounded-lg border border-red-500/20">
              <div className="text-sm text-gray-400 mb-1">Defaulted Loans</div>
              <div className="text-2xl font-bold text-white">{stats.defaultedLoans}</div>
            </div>
            
            <div className="glass p-4 rounded-lg border border-indigo-500/20">
              <div className="text-sm text-gray-400 mb-1">Average Interest Rate</div>
              <div className="text-2xl font-bold text-white">{(stats.averageInterestRate / 100).toFixed(2)}%</div>
            </div>
            
            <div className="glass p-4 rounded-lg border border-pink-500/20">
              <div className="text-sm text-gray-400 mb-1">Prompt Payment Rate</div>
              <div className="text-2xl font-bold text-white">{(stats.promptPaymentRate / 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanManager;
