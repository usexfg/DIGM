import React, { useState, useEffect } from 'react';
import WalletConnector from './components/WalletConnector';
import ParaBridge from './components/ParaBridge';
import VoucherClaim from './components/VoucherClaim';
import HostingPermissions from './components/HostingPermissions';
import XfgWallet from './components/XfgWallet';
import ArtistProfile from './components/ArtistProfile';
import ArtistDashboard from './components/ArtistDashboard';
import AudioMarketplace from './components/AudioMarketplace';
import { WalletProvider } from './hooks/useWallet';

function App() {
  const [activeTab, setActiveTab] = useState('bridge');

  return (
    <WalletProvider>
      <div className="min-h-screen bg-slate-900">
        <header className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-white">DIGM Superapp</h1>
              </div>
              <WalletConnector />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg mb-8">
            <button
              onClick={() => setActiveTab('bridge')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'bridge'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              PARA Bridge
            </button>
            <button
              onClick={() => setActiveTab('vouchers')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'vouchers'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Vouchers
            </button>
            <button
              onClick={() => setActiveTab('hosting')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'hosting'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Hosting Permissions
            </button>
            <button
              onClick={() => setActiveTab('xfg')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'xfg'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Fuego XFG Mining
            </button>
            <button
              onClick={() => setActiveTab('artist')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'artist'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Artist Profile
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Artist Dashboard
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'marketplace'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Audio Marketplace
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-8">
            {activeTab === 'bridge' && <ParaBridge />}
            {activeTab === 'vouchers' && <VoucherClaim />}
            {activeTab === 'hosting' && <HostingPermissions />}
            {activeTab === 'xfg' && <XfgWallet />}
            {activeTab === 'artist' && <ArtistProfile />}
            {activeTab === 'dashboard' && <ArtistDashboard />}
            {activeTab === 'marketplace' && <AudioMarketplace />}
          </div>
        </main>
      </div>
    </WalletProvider>
  );
}

export default App; 