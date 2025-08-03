# PARA Token Integration - Stellar Network

## 🪙 PARA Token Details

### Asset Information
- **Asset ID**: `PARA-GCFWKV4KWYPBPQVQYLVL6N6VARBLVQS6POYEMLN7AGZB5UK4VIJX565U`
- **Issuer**: `GCFWKV4KWYPBPQVQYLVL6N6VARBLVQS6POYEMLN7AGZB5UK4VIJX565U`
- **Asset Code**: `PARA`
- **Decimals**: 7
- **Network**: Stellar Mainnet

### Token Purpose
PARA tokens are used for:
- **DIGM Platform Rewards**: Earned by listeners and artists
- **Cross-Chain Bridge**: Transfer between EVM and Stellar networks
- **Platform Payments**: Premium features and hosting permissions
- **Staking**: DIGM NFT hosting requirements

## 🔧 Technical Integration

### Configuration File
Located at: `frontend/src/config/stellar.ts`

```typescript
export const STELLAR_CONFIG = {
  PARA_ASSET_ID: 'PARA-GCFWKV4KWYPBPQVQYLVL6N6VARBLVQS6POYEMLN7AGZB5UK4VIJX565U',
  PARA_ISSUER: 'GCFWKV4KWYPBPQVQYLVL6N6VARBLVQS6POYEMLN7AGZB5UK4VIJX565U',
  PARA_CODE: 'PARA',
  // ... other config
};
```

### Utility Functions
```typescript
// Format PARA amount (7 decimals)
PARA_UTILS.formatPARA(amount: number): string

// Parse PARA amount from string
PARA_UTILS.parsePARA(amount: string): number

// Get PARA balance from account
PARA_UTILS.getPARABalance(account: any): number
```

## 🌐 Stellar Network Integration

### Horizon API Endpoints
- **Mainnet**: `https://horizon.stellar.org`
- **Testnet**: `https://horizon-testnet.stellar.org`

### Key Operations
1. **Balance Queries**: Check PARA token balances
2. **Asset Trust**: Establish trustlines for PARA tokens
3. **Cross-Chain Bridge**: Transfer PARA between networks
4. **Voucher System**: Claimable balances for delayed transfers

## 🔗 Cross-Chain Bridge

### EVM → Stellar
1. User locks PARA tokens on EVM network
2. Bridge creates claimable balance on Stellar
3. User claims tokens on Stellar network

### Stellar → EVM
1. User creates claimable balance on Stellar
2. Bridge processes the claim
3. Tokens are unlocked on EVM network

## 📊 PARA Token Economics

### Distribution
- **Mining Rewards**: Earned through Fuego XFG mining
- **Platform Rewards**: For active participation
- **Artist Rewards**: For content creation and hosting

### Use Cases
- **DIGM NFT Hosting**: Required for artist features
- **Premium Access**: Unlock advanced features
- **Staking**: Earn additional rewards
- **Governance**: Voting on platform decisions

## 🛠️ Development Notes

### Environment Variables
```env
REACT_APP_STELLAR_NETWORK=mainnet|testnet
REACT_APP_STELLAR_HORIZON_URL=https://horizon.stellar.org
```

### Testing
- Use Stellar Testnet for development
- Test PARA token operations with test tokens
- Verify cross-chain bridge functionality

### Security Considerations
- Always verify asset issuer addresses
- Implement proper error handling
- Use secure wallet connections
- Validate transaction parameters

## 🔍 Monitoring

### Stellar Explorer
- **Mainnet**: https://stellar.expert/asset/PARA-GCFWKV4KWYPBPQVQYLVL6N6VARBLVQS6POYEMLN7AGZB5UK4VIJX565U
- **Testnet**: https://testnet.stellar.expert/

### Key Metrics
- Total PARA supply
- Cross-chain bridge volume
- Active wallet addresses
- Platform reward distribution

---

**PARA Token Integration** - DIGM Platform v1.0 