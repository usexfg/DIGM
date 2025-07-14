import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  price: number;
  genre: string;
  coverArt: string;
  audioUrl: string;
  sales: number;
  revenue: number;
  uploadDate: string;
  status: 'published' | 'draft' | 'processing';
}

interface SalesData {
  totalSales: number;
  totalRevenue: number;
  monthlyRevenue: number;
  topTracks: Track[];
  recentSales: any[];
}

const ArtistDashboard: React.FC = () => {
  const { evmAddress } = useWallet();
  const [activeTab, setActiveTab] = useState('overview');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    price: '',
    genre: '',
    description: ''
  });

  useEffect(() => {
    if (evmAddress) {
      fetchTracks();
      fetchSalesData();
    }
  }, [evmAddress]);

  const fetchTracks = async () => {
    if (!evmAddress) return;
    
    try {
      const response = await fetch(`/api/artist/tracks/${evmAddress}`);
      const data = await response.json();
      setTracks(data.tracks || []);
    } catch (error) {
      console.error('Failed to fetch tracks:', error);
    }
  };

  const fetchSalesData = async () => {
    if (!evmAddress) return;
    
    try {
      const response = await fetch(`/api/artist/sales/${evmAddress}`);
      const data = await response.json();
      setSalesData(data);
    } catch (error) {
      console.error('Failed to fetch sales data:', error);
    }
  };

  const handleUpload = async () => {
    if (!evmAddress || !uploadForm.title || !uploadForm.price) {
      alert('Please fill in all required fields');
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch('/api/artist/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistAddress: evmAddress,
          ...uploadForm
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload track');
      }

      await fetchTracks();
      setUploadForm({
        title: '',
        price: '',
        genre: '',
        description: ''
      });
      alert('Track uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload track');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTrackAction = async (trackId: string, action: 'publish' | 'unpublish' | 'delete') => {
    try {
      const response = await fetch(`/api/artist/tracks/${trackId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistAddress: evmAddress
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${action} track`);
      }

      await fetchTracks();
      alert(`Track ${action}ed successfully!`);
    } catch (error) {
      console.error(`${action} failed:`, error);
      alert(`Failed to ${action} track`);
    }
  };

  if (!evmAddress) {
    return (
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Artist Dashboard</h2>
        <p className="text-slate-400">Please connect your wallet to access your artist dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="card">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">Artist Dashboard</h2>
          <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
            100% Revenue Model
          </div>
        </div>
        <div className="bg-green-900 bg-opacity-20 border border-green-600 rounded-lg p-4 mb-6">
          <p className="text-green-300 text-sm">
            <strong>🎵 Keep 100% of Your Sales:</strong> Every XFG from your music sales goes directly to you. 
            No platform fees, no intermediaries, no hidden costs. This is the DIGM promise.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('tracks')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'tracks'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            My Tracks
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Upload Track
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Analytics
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {salesData && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-700 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-300 mb-2">Total Sales</h3>
                    <p className="text-2xl font-bold text-white">{salesData.totalSales}</p>
                  </div>
                  <div className="bg-slate-700 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-300 mb-2">Total Revenue (100% Yours)</h3>
                    <p className="text-2xl font-bold text-white">{salesData.totalRevenue} XFG</p>
                    <p className="text-xs text-green-400 mt-1">No platform fees!</p>
                  </div>
                  <div className="bg-slate-700 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-300 mb-2">Monthly Revenue</h3>
                    <p className="text-2xl font-bold text-white">{salesData.monthlyRevenue} XFG</p>
                  </div>
                  <div className="bg-slate-700 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-300 mb-2">Total Tracks</h3>
                    <p className="text-2xl font-bold text-white">{tracks.length}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Tracks */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Top Performing Tracks</h3>
                  <div className="space-y-3">
                    {salesData?.topTracks?.slice(0, 5).map((track, index) => (
                      <div key={track.id} className="flex items-center space-x-3 p-3 bg-slate-700 rounded-lg">
                        <span className="text-lg font-bold text-slate-400">#{index + 1}</span>
                        <div className="flex-1">
                          <p className="text-white font-medium">{track.title}</p>
                          <p className="text-slate-400 text-sm">{track.sales} sales</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">{track.revenue} XFG</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Recent Sales</h3>
                  <div className="space-y-3">
                    {salesData?.recentSales?.slice(0, 5).map((sale, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-slate-700 rounded-lg">
                        <div className="flex-1">
                          <p className="text-white font-medium">{sale.trackTitle}</p>
                          <p className="text-slate-400 text-sm">{new Date(sale.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">{sale.amount} XFG</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tracks Tab */}
          {activeTab === 'tracks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">My Tracks</h3>
                <button
                  onClick={() => setActiveTab('upload')}
                  className="btn-primary"
                >
                  Upload New Track
                </button>
              </div>

              <div className="space-y-4">
                {tracks.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No tracks uploaded yet.</p>
                ) : (
                  tracks.map(track => (
                    <div key={track.id} className="flex items-center space-x-4 p-4 bg-slate-700 rounded-lg">
                      <div className="w-16 h-16 bg-slate-600 rounded flex items-center justify-center">
                        {track.coverArt ? (
                          <img src={track.coverArt} alt={track.title} className="w-16 h-16 rounded object-cover" />
                        ) : (
                          <span className="text-xl text-slate-400">🎵</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{track.title}</h4>
                        <p className="text-slate-400 text-sm">{track.genre} • {track.duration}</p>
                        <p className="text-slate-400 text-sm">{track.sales} sales • {track.revenue} XFG</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          track.status === 'published' ? 'bg-green-600 text-white' :
                          track.status === 'processing' ? 'bg-yellow-600 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {track.status}
                        </span>
                        <div className="flex space-x-2">
                          {track.status === 'draft' && (
                            <button
                              onClick={() => handleTrackAction(track.id, 'publish')}
                              className="btn-primary text-xs"
                            >
                              Publish
                            </button>
                          )}
                          {track.status === 'published' && (
                            <button
                              onClick={() => handleTrackAction(track.id, 'unpublish')}
                              className="btn-secondary text-xs"
                            >
                              Unpublish
                            </button>
                          )}
                          <button
                            onClick={() => handleTrackAction(track.id, 'delete')}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Upload New Track</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Track Title *
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                    className="input-field w-full"
                    placeholder="Enter track title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Price (XFG) *
                  </label>
                  <input
                    type="number"
                    value={uploadForm.price}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, price: e.target.value }))}
                    className="input-field w-full"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Genre
                  </label>
                  <select
                    value={uploadForm.genre}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, genre: e.target.value }))}
                    className="input-field w-full"
                  >
                    <option value="">Select genre</option>
                    <option value="Electronic">Electronic</option>
                    <option value="Hip Hop">Hip Hop</option>
                    <option value="Rock">Rock</option>
                    <option value="Pop">Pop</option>
                    <option value="Jazz">Jazz</option>
                    <option value="Classical">Classical</option>
                    <option value="Country">Country</option>
                    <option value="R&B">R&B</option>
                    <option value="Reggae">Reggae</option>
                    <option value="Folk">Folk</option>
                    <option value="Blues">Blues</option>
                    <option value="Metal">Metal</option>
                    <option value="Ambient">Ambient</option>
                    <option value="Techno">Techno</option>
                    <option value="House">House</option>
                    <option value="Drum & Bass">Drum & Bass</option>
                    <option value="Trap">Trap</option>
                    <option value="Lo-fi">Lo-fi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field w-full h-24 resize-none"
                    placeholder="Describe your track..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Audio File
                  </label>
                  <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                    <p className="text-slate-400 mb-2">Drag and drop your audio file here</p>
                    <p className="text-slate-500 text-sm">or click to browse</p>
                    <input type="file" className="hidden" accept="audio/*" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Cover Art
                  </label>
                  <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                    <p className="text-slate-400 mb-2">Upload cover art (optional)</p>
                    <p className="text-slate-500 text-sm">Recommended: 1000x1000px</p>
                    <input type="file" className="hidden" accept="image/*" />
                  </div>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={isUploading || !uploadForm.title || !uploadForm.price}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload Track'}
                </button>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Analytics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <h4 className="text-md font-semibold mb-4">Revenue Trends</h4>
                  <div className="h-64 bg-slate-700 rounded-lg flex items-center justify-center">
                    <p className="text-slate-400">Chart coming soon</p>
                  </div>
                </div>

                <div className="card">
                  <h4 className="text-md font-semibold mb-4">Top Genres</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Electronic</span>
                      <span className="text-white font-medium">45%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Hip Hop</span>
                      <span className="text-white font-medium">30%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Rock</span>
                      <span className="text-white font-medium">25%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtistDashboard; 