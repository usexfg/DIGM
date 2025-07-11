# DIGM  - Decentralized P2P Music/Audio Marketplace using Fuego (XF₲) L1 privacy payment network.

A comprehensive platform for PARA token bridging, Fuego XFG privacy mining, and NFT-based hosting permissions.

## 🚀 Features

### 🔗 PARA Bridge
- Cross-chain token transfers between EVM and Stellar networks
- Voucher system for delayed transfers
- Real-time balance tracking
- Secure transaction processing

### ⛏️ Fuego XFG Privacy Mining
- Integration with Fuego L1 Privacy Blockchain Network
- LoudMining.com proxy integration for enhanced efficiency
- Contribution-based mining system using PARA tokens
- Privacy-preserving mining operations with zero-knowledge proofs
- Early adopter bonuses and mining pools

### 🏠 NFT-Based Hosting Permissions
- Tiered hosting system (Bronze, Silver, Gold)
- NFT-based access control
- Contribution-based NFT minting
- Bonding curve economics

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Ethers.js** for EVM interactions
- **Stellar SDK** for Stellar network integration

### Backend
- **Node.js** with Express
- **FuegoBridge** for child process management
- **ParaBridge** for Stellar interactions
- **CosmWasm** smart contracts for NFTs

### Blockchain Networks
- **EVM Networks** (Ethereum, COLD L3, etc.)
- **Stellar Network** for PARA token
- **Fuego L1 Privacy Blockchain** for XFG mining and peer-to-peer private transactions (audio purchases)

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/usexfg/DIGM.git
   cd DIGM
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install

   # Install frontend dependencies
   cd frontend
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment files
   cp .env.example .env
   cp frontend/.env.example frontend/.env
   ```

4. **Start the development servers**
   ```bash
   # Start backend (from root directory)
   npm run dev

   # Start frontend (from frontend directory)
   cd frontend
   npm start
   ```

## 🏗️ Project Structure

```
DIGM/
├── backend/                 # Backend services
│   ├── src/
│   │   ├── bridges/        # Bridge implementations
│   │   ├── services/       # Business logic
│   │   └── api/           # API routes
│   └── contracts/         # Smart contracts
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/        # Custom hooks
│   │   └── utils/        # Utility functions
│   └── public/           # Static assets
└── docs/                 # Documentation
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=your_database_url

# Blockchain Networks
STELLAR_NETWORK=testnet
STELLAR_SECRET_KEY=your_stellar_secret

# Fuego Integration
FUEGO_NODE_URL=your_fuego_node_url
LOUDMINING_API_KEY=your_loudmining_key

# API Keys
ETHERSCAN_API_KEY=your_etherscan_key
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_STELLAR_NETWORK=testnet
REACT_APP_FUEGO_NODE_URL=your_fuego_node_url
```

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd ..
npm run build
```

### Docker Deployment
```bash
# Build and run with Docker
docker-compose up -d
```

## 📚 API Documentation

### PARA Bridge Endpoints
- `POST /api/bridge/transfer` - Transfer PARA tokens
- `POST /api/bridge/create-voucher` - Create claimable balance
- `GET /api/stellar/balance/:address` - Get Stellar balance

### Mining Endpoints
- `POST /api/mining/start` - Start XFG mining
- `POST /api/mining/claim` - Claim mining rewards
- `GET /api/mining/stats/:address` - Get mining statistics
- `GET /api/mining/leaderboard` - Get mining leaderboard

### NFT Endpoints
- `POST /api/nft/mint` - Mint hosting permission NFT
- `GET /api/nft/balance/:address` - Get NFT balance
- `POST /api/nft/upgrade` - Upgrade NFT tier

## 🔒 Security

- All private keys are stored securely
- Zero-knowledge proofs for privacy mining
- Secure cross-chain bridge implementation
- Input validation and sanitization
- Rate limiting on API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Fuego L1 Privacy Blockchain](https://github.com/usexfg/fuego-node)
- [LoudMining.com](https://loudmining.com)
- [Stellar Network](https://stellar.org)
- [PARA Token](https://stellarterm.com/exchange/PARA-GCFWKV4KWYPBPQVQYLVL6N6VARBLVQS6POYEMLN7AGZB5UK4VIJX565U/XLM-native)

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Join our [Discord community](http://discord.usexfg.org)

---

**DIGM Platform** - Fuego Elder Council 2025
