# DIGM Superapp

A unified interface for the DIGM platform, featuring PARA bridging, voucher claiming, and NFT-based hosting permissions.

## Features

- **Wallet Connection**: Support for EVM (MetaMask) and Stellar (Freighter) wallets
- **PARA Bridge**: Transfer PARA between EVM and Stellar networks
- **Voucher System**: Create and claim Stellar claimable balances
- **Hosting Permissions**: NFT-based access control for hosting services

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- MetaMask browser extension
- Freighter wallet extension (for Stellar)

### Installation

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

### Components

- **WalletConnector**: Manages wallet connections for EVM and Stellar
- **ParaBridge**: Handles PARA transfers between networks
- **VoucherClaim**: Displays and claims Stellar claimable balances
- **HostingPermissions**: Shows NFT-based hosting permissions

### Key Features

#### PARA Bridge
- Direct transfers from EVM to Stellar
- Voucher creation for delayed claiming
- Real-time balance display
- Transaction status tracking

#### Voucher System
- View available claimable balances
- One-click claiming with wallet signature
- Automatic balance refresh
- Transaction history

#### Hosting Permissions
- NFT tier-based access control
- Bronze/Silver/Gold permission levels
- Real-time status updates
- Minting interface integration

## API Endpoints

The app expects the following backend endpoints:

### Bridge API
- `POST /api/bridge/transfer` - Direct PARA transfer
- `POST /api/bridge/create-voucher` - Create claimable balance
- `GET /api/stellar/balance/:address` - Get Stellar PARA balance

### Stellar API
- `GET /api/stellar/claimable-balances/:address` - Get claimable balances
- `POST /api/stellar/claim-balance` - Claim a balance

### NFT API
- `GET /api/nft/digm/:address` - Get user's DIGM NFTs
- `GET /api/nft/curve-price` - Get current bonding curve price

## Development

### Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **Wallets**: ethers.js (EVM), Stellar SDK
- **Build**: Create React App

### Project Structure

```
src/
├── components/          # React components
│   ├── WalletConnector.tsx
│   ├── ParaBridge.tsx
│   ├── VoucherClaim.tsx
│   └── HostingPermissions.tsx
├── hooks/              # Custom React hooks
│   └── useWallet.tsx
├── utils/              # Utility functions
├── App.tsx            # Main app component
└── index.tsx          # App entry point
```

## Deployment

Build the app for production:

```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the DIGM platform. 