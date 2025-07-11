import { useState } from 'react';
import WalletView from './components/WalletView';
import Marketplace from './components/Marketplace';
import Paradio from './components/Paradio';
import ArtistDashboard from './components/ArtistDashboard';
import './App.css';

type TabType = 'wallet' | 'marketplace' | 'paradio' | 'artist';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('wallet');

  const tabs = [
    { id: 'wallet' as const, label: 'Wallet', icon: '💳' },
    { id: 'marketplace' as const, label: 'Marketplace', icon: '🎵' },
    { id: 'paradio' as const, label: 'Paradio', icon: '📻' },
    { id: 'artist' as const, label: 'Artist', icon: '🎤' },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'wallet':
        return <WalletView />;
      case 'marketplace':
        return <Marketplace />;
      case 'paradio':
        return <Paradio />;
      case 'artist':
        return <ArtistDashboard />;
      default:
        return <WalletView />;
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold">
              D
            </div>
            <h1 className="text-xl font-bold">DIGM Platform</h1>
            <span className="text-xs bg-blue-600 px-2 py-1 rounded">v0.1.0-alpha</span>
          </div>
          <div className="text-sm text-gray-400">
            Fuego Network • Elder Node Connected
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {renderActiveTab()}
      </main>
    </div>
  );
}

export default App;
