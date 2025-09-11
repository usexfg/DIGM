import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { fuegoDiscovery, FuegoNetworkStats } from '../utils/fuegoDiscovery';
import { playlistStorage } from '../utils/playlistStorage';

interface PerformanceMetrics {
  networkLatency: number;
  syncSpeed: number;
  dataThroughput: number;
  errorRate: number;
  peerConnections: number;
  cacheHitRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

interface AnalyticsData {
  totalPlaylists: number;
  totalSessions: number;
  totalPARAEarned: number;
  activeCurators: number;
  averageSessionLength: number;
  peakConcurrentListeners: number;
  networkUptime: number;
  userEngagement: number;
}

const PerformanceAnalytics: React.FC = () => {
  const { evmAddress } = useWallet();
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    networkLatency: 0,
    syncSpeed: 0,
    dataThroughput: 0,
    errorRate: 0,
    peerConnections: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    cpuUsage: 0
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalPlaylists: 0,
    totalSessions: 0,
    totalPARAEarned: 0,
    activeCurators: 0,
    averageSessionLength: 0,
    peakConcurrentListeners: 0,
    networkUptime: 0,
    userEngagement: 0
  });
  const [networkStats, setNetworkStats] = useState<FuegoNetworkStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAnalytics = async () => {
      try {
        // Load initial data
        await loadAnalyticsData();
        
        // Start real-time metrics collection
        startMetricsCollection();
        
      } catch (error) {
        console.error('Error initializing analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAnalytics();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      // Load playlists
      const playlists = await playlistStorage.getAllPlaylists();
      
      // Mock analytics data
      const mockAnalytics: AnalyticsData = {
        totalPlaylists: playlists.length,
        totalSessions: Math.floor(Math.random() * 100) + 50,
        totalPARAEarned: Math.floor(Math.random() * 10000) + 5000,
        activeCurators: Math.floor(Math.random() * 20) + 10,
        averageSessionLength: Math.floor(Math.random() * 120) + 60,
        peakConcurrentListeners: Math.floor(Math.random() * 500) + 200,
        networkUptime: 99.5 + Math.random() * 0.5,
        userEngagement: 75 + Math.random() * 20
      };

      setAnalyticsData(mockAnalytics);

      // Load network stats
      const stats = fuegoDiscovery.getNetworkStats();
      setNetworkStats(stats);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    }
  };

  const startMetricsCollection = () => {
    // Simulate real-time metrics collection
    updateMetrics();
  };

  const updateMetrics = () => {
    // Simulate performance metrics
    const mockMetrics: PerformanceMetrics = {
      networkLatency: Math.floor(Math.random() * 200) + 50,
      syncSpeed: Math.floor(Math.random() * 1000) + 500,
      dataThroughput: Math.floor(Math.random() * 100) + 50,
      errorRate: Math.random() * 2,
      peerConnections: Math.floor(Math.random() * 50) + 10,
      cacheHitRate: 85 + Math.random() * 15,
      memoryUsage: Math.floor(Math.random() * 30) + 70,
      cpuUsage: Math.floor(Math.random() * 40) + 20
    };

    setPerformanceMetrics(mockMetrics);
  };

  const getMetricColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-400';
    if (value <= thresholds.warning) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white">Loading performance analytics...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Performance Analytics</h1>
        <p className="text-gray-300">
          Monitor system performance and optimize Paradio Curation Stations
        </p>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Network Latency</h3>
          <p className={`text-3xl font-bold ${getMetricColor(performanceMetrics.networkLatency, { good: 100, warning: 200 })}`}>
            {performanceMetrics.networkLatency}ms
          </p>
          <p className="text-gray-400 text-sm">Average response time</p>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Sync Speed</h3>
          <p className={`text-3xl font-bold ${getMetricColor(performanceMetrics.syncSpeed, { good: 500, warning: 1000 })}`}>
            {performanceMetrics.syncSpeed}ms
          </p>
          <p className="text-gray-400 text-sm">Data synchronization</p>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Error Rate</h3>
          <p className={`text-3xl font-bold ${getMetricColor(performanceMetrics.errorRate, { good: 0.5, warning: 1 })}`}>
            {performanceMetrics.errorRate.toFixed(2)}%
          </p>
          <p className="text-gray-400 text-sm">System errors</p>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Cache Hit Rate</h3>
          <p className={`text-3xl font-bold ${getMetricColor(performanceMetrics.cacheHitRate, { good: 90, warning: 80 })}`}>
            {performanceMetrics.cacheHitRate.toFixed(1)}%
          </p>
          <p className="text-gray-400 text-sm">Cache efficiency</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Analytics Overview */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Analytics Overview</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400 text-sm">Total Playlists</span>
                <p className="text-2xl font-bold text-white">{analyticsData.totalPlaylists}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Total Sessions</span>
                <p className="text-2xl font-bold text-white">{analyticsData.totalSessions}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">PARA Earned</span>
                <p className="text-2xl font-bold text-green-400">{analyticsData.totalPARAEarned}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Active Curators</span>
                <p className="text-2xl font-bold text-blue-400">{analyticsData.activeCurators}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 text-sm">Avg Session Length</span>
                  <p className="text-lg font-semibold text-white">{analyticsData.averageSessionLength} min</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Peak Listeners</span>
                  <p className="text-lg font-semibold text-white">{analyticsData.peakConcurrentListeners}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Network Uptime</span>
                  <p className="text-lg font-semibold text-green-400">{analyticsData.networkUptime.toFixed(2)}%</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">User Engagement</span>
                  <p className="text-lg font-semibold text-blue-400">{analyticsData.userEngagement.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Network Status */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Network Status</h2>
          
          {networkStats && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Network Health</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    networkStats.networkHealth === 'excellent' ? 'bg-green-400' :
                    networkStats.networkHealth === 'good' ? 'bg-blue-400' :
                    networkStats.networkHealth === 'fair' ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`}></div>
                  <span className="text-white capitalize">{networkStats.networkHealth}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Active Peers</span>
                <span className="text-white">{networkStats.activePeers}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Peers</span>
                <span className="text-white">{networkStats.totalPeers}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Avg Latency</span>
                <span className="text-white">{networkStats.averageLatency}ms</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceAnalytics;
