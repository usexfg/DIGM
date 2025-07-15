import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import WalletConnector from './components/WalletConnector';
import ParaBridge from './components/ParaBridge';
import VoucherClaim from './components/VoucherClaim';
import HostingPermissions from './components/HostingPermissions';
import XfgWallet from './components/XfgWallet';
import Paradio from './components/Paradio';
import ArtistProfile from './components/ArtistProfile';
import ArtistDashboard from './components/ArtistDashboard';
import AudioMarketplace from './components/AudioMarketplace';
import ArtistPage from './components/ArtistPage';
import AlbumPage from './components/AlbumPage';
import PremiumAccess from './components/PremiumAccess';
import { WalletProvider, useWallet } from './hooks/useWallet';

function AppContent() {
  const [hasDigmHosting, setHasDigmHosting] = useState(false);
  const { evmAddress } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();

  // Check DIGM hosting status
  useEffect(() => {
    const checkDigmHosting = async () => {
      if (!evmAddress) {
        setHasDigmHosting(false);
        return;
      }

      try {
        // Mock check - in real app this would query the blockchain
        // For now, simulate that some users have DIGM hosting
        const mockHasHosting = Math.random() > 0.5; // 50% chance for demo
        setHasDigmHosting(mockHasHosting);
      } catch (error) {
        console.error('Failed to check DIGM hosting status:', error);
        setHasDigmHosting(false);
      }
    };

    checkDigmHosting();
  }, [evmAddress]);

  // Determine active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/artist/') && path !== '/artist/profile') {
      return 'marketplace'; // Artist pages show in marketplace context
    }
    if (path.startsWith('/album/')) {
      return 'marketplace'; // Album pages show in marketplace context
    }
    if (path === '/artist/profile') return 'artist';
    if (path === '/artist/dashboard') return 'dashboard';
    if (path === '/paradio') return 'paradio';
    if (path === '/bridge') return 'bridge';
    if (path === '/premium') return 'premium';
    if (path === '/hosting') return 'hosting';
    if (path === '/xfg') return 'xfg';
    return 'marketplace';
  };

  const activeTab = getActiveTab();

  const navigationItems = [
    { id: 'marketplace', label: 'Discover', icon: '🎵', description: 'Audio Marketplace', path: '/' },
    ...(hasDigmHosting ? [
      { id: 'artist', label: 'Profile', icon: '👤', description: 'Artist Profile', path: '/artist/profile' },
      { id: 'dashboard', label: 'Dashboard', icon: '📊', description: 'Artist Dashboard', path: '/artist/dashboard' }
    ] : []),
    { id: 'paradio', label: 'Paradio', icon: '📻', description: 'P2P Radio Station', path: '/paradio' },
    { id: 'bridge', label: 'Bridge', icon: ':paralogo:', description: 'Bridge PARA & claim vouchers', path: '/bridge' },
    { id: 'hosting', label: 'Hosting', icon: '🖥️', description: 'Hosting Permissions', path: '/hosting' },
    { id: 'premium', label: 'Premium', icon: '👑', description: 'Premium Access', path: '/premium' },
    { id: 'xfg', label: 'Freemium', icon: '🔥', description: 'CPU-Powered Freemium Access', path: '/xfg' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // Check if current route requires DIGM hosting
  const requiresDigmHosting = location.pathname === '/artist/profile' || location.pathname === '/artist/dashboard';
  const hasAccess = !requiresDigmHosting || hasDigmHosting;

  if (requiresDigmHosting && !hasDigmHosting) {
  return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
        <header className="glass border-b border-fuchsia-500/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-xl font-bold">D</span>
                  </div>
                  <div>
                    <h1 className="gradient-text text-2xl font-bold">DIGM</h1>
                    <p className="text-xs text-gray-400">Decentralize</p>
                  </div>
                </div>
              </div>
              <WalletConnector />
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-screen">
          <div className="card text-center py-16 max-w-md">
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-2xl font-bold text-white mb-2">Artist Features Locked</h3>
            <p className="text-gray-400 mb-4">You need DIGM hosting permissions to access artist features</p>
            <button
              onClick={() => navigate('/hosting')}
              className="btn-primary"
            >
              Get DIGM Hosting
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
        {/* Top Header */}
        <header className="glass border-b border-fuchsia-500/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-xl font-bold">D</span>
                  </div>
                  <div>
                    <h1 className="gradient-text text-2xl font-bold">DIGM</h1>
                    <p className="text-xs text-gray-400">Decentralize</p>
                  </div>
                </div>
              </div>
              <WalletConnector />
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar Navigation */}
          <aside className="w-64 min-h-screen glass border-r border-fuchsia-500/20 p-6">
            <nav className="space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    activeTab === item.id
                      ? 'bg-fuchsia-600/20 border border-fuchsia-500/40 text-fuchsia-300'
                      : 'text-gray-300 hover:bg-black/40 hover:text-white hover:border-fuchsia-500/20 border border-transparent'
                  }`}
                >
                  {item.icon === ':paralogo:' ? (
                    <img 
                      src="https://github.com/usexfg/fuego-data/raw/master/fuego-images/para.png" 
                      alt="PARA" 
                      className="w-6 h-6 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-xl">{item.icon}</span>
                  )}
                  <div className="text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-400 group-hover:text-gray-300">
                      {item.description}
                    </div>
                  </div>
                </button>
              ))}
            </nav>

            {/* Bottom section */}
            <div className="mt-8 pt-6 border-t border-fuchsia-500/20">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-2">Powered by</p>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-xl">🔥</span>
                  <span className="text-sm font-medium gradient-text-gold">Fuego L1</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8 overflow-auto">
            <div className="max-w-6xl mx-auto">
              <Routes>
                <Route path="/" element={<AudioMarketplace />} />
                <Route path="/artist/:artistId" element={<ArtistPage />} />
                <Route path="/album/:albumId" element={<AlbumPage />} />
                <Route path="/artist/profile" element={<ArtistProfile />} />
                <Route path="/artist/dashboard" element={<ArtistDashboard />} />
                <Route path="/paradio" element={<Paradio />} />
                <Route path="/bridge" element={<ParaBridge />} />
                <Route path="/premium" element={<PremiumAccess />} />
                <Route path="/hosting" element={<HostingPermissions />} />
                <Route path="/xfg" element={<XfgWallet />} />
              </Routes>
          </div>
        </main>
        </div>
      </div>
    );
  }

  function App() {
    return (
      <WalletProvider>
        <Router>
          <AppContent />
        </Router>
    </WalletProvider>
  );
}

export default App; 