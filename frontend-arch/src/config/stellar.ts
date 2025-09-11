// Stellar Network Configuration
export const STELLAR_CONFIG = {
  // PARA Token Asset ID
  PARA_ASSET_ID: 'PARA-GCFWKV4KWYPBPQVQYLVL6N6VARBLVQS6POYEMLN7AGZB5UK4VIJX565U',
  
  // PARA Token Issuer
  PARA_ISSUER: 'GCFWKV4KWYPBPQVQYLVL6N6VARBLVQS6POYEMLN7AGZB5UK4VIJX565U',
  
  // PARA Token Code
  PARA_CODE: 'PARA',
  
  // Network Configuration
  NETWORK: process.env.REACT_APP_STELLAR_NETWORK || 'testnet',
  
  // Stellar Horizon URLs
  HORIZON_URL: process.env.REACT_APP_STELLAR_NETWORK === 'mainnet' 
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org',
  
  // PARA Token Details
  PARA_DETAILS: {
    name: 'PARA Token',
    symbol: 'PARA',
    decimals: 7,
    description: 'PARA token for DIGM Platform rewards and payments',
    assetId: 'PARA-GCFWKV4KWYPBPQVQYLVL6N6VARBLVQS6POYEMLN7AGZB5UK4VIJX565U',
    issuer: 'GCFWKV4KWYPBPQVQYLVL6N6VARBLVQS6POYEMLN7AGZB5UK4VIJX565U'
  }
};

// Helper functions for PARA token operations
export const PARA_UTILS = {
  // Get PARA asset for Stellar SDK
  getPARAAsset: () => ({
    asset: STELLAR_CONFIG.PARA_CODE,
    issuer: STELLAR_CONFIG.PARA_ISSUER
  }),
  
  // Format PARA amount (7 decimals)
  formatPARA: (amount: number): string => {
    return (amount / 10000000).toFixed(7);
  },
  
  // Parse PARA amount from string
  parsePARA: (amount: string): number => {
    return Math.floor(parseFloat(amount) * 10000000);
  },
  
  // Get PARA balance from account
  getPARABalance: (account: any): number => {
    const paraBalance = account.balances.find(
      (balance: any) => balance.asset_code === STELLAR_CONFIG.PARA_CODE &&
                       balance.asset_issuer === STELLAR_CONFIG.PARA_ISSUER
    );
    return paraBalance ? parseFloat(paraBalance.balance) : 0;
  }
};

export default STELLAR_CONFIG; 