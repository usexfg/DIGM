import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { fuegoDiscovery, FuegoNetworkStats } from '../utils/fuegoDiscovery';
import { playlistStorage } from '../utils/playlistStorage';

interface SystemHealth {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  network: 'healthy' | 'degraded' | 'critical';
  storage: 'optimal' | 'slow' | 'error';
  performance: 'fast' | 'moderate' | 'slow';
  lastCheck: number;
}

interface OptimizationTask {
  id: string;
  title: string;
  description: string;
  category: 'network' | 'storage' | 'performance' | 'cache';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  estimatedTime: number; // seconds
  result?: string;
}

interface CacheStats {
  hitRate: number;
  missRate: number;
  totalSize: number;
  usedSize: number;
  entries: number;
  lastCleared: number;
}

interface NetworkOptimizations {
  peerDiscovery: boolean;
  connectionPooling: boolean;
  dataCompression: boolean;
  adaptiveBandwidth: boolean;
  loadBalancing: boolean;
}

const SystemOptimization: React.FC = () => {
  const { evmAddress } = useWallet();
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: 'good',
    network: 'healthy',
    storage: 'optimal',
    performance: 'fast',
    lastCheck: Date.now()
  });
  const [optimizationTasks, setOptimizationTasks] = useState<OptimizationTask[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    hitRate: 0,
    missRate: 0,
    totalSize: 0,
    usedSize: 0,
    entries: 0,
    lastCleared: 0
  });
  const [networkOptimizations, setNetworkOptimizations] = useState<NetworkOptimizations>({
    peerDiscovery: true,
    connectionPooling: true,
    dataCompression: false,
    adaptiveBandwidth: false,
    loadBalancing: true
  });
  const [networkStats, setNetworkStats] = useState<FuegoNetworkStats | null>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [autoOptimize, setAutoOptimize] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeOptimization = async () => {
      try {
        // Load system health
        await checkSystemHealth();
        
        // Load cache stats
        loadCacheStats();
        
        // Load network stats
        const stats = fuegoDiscovery.getNetworkStats();
        setNetworkStats(stats);
        
        // Load optimization tasks
        loadOptimizationTasks();

      } catch (error) {
        console.error('Error initializing system optimization:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeOptimization();

    // Set up periodic health checks
    const healthCheckInterval = setInterval(() => {
      checkSystemHealth();
    }, 60000); // Check every minute

    return () => clearInterval(healthCheckInterval);
  }, []);

  const checkSystemHealth = async () => {
    try {
      // Simulate health checks
      const networkLatency = Math.random() * 200 + 50; // 50-250ms
      const storageSpeed = Math.random() * 1000 + 200; // 200-1200ms
      const performanceScore = Math.random() * 100 + 50; // 50-150

      let networkHealth: SystemHealth['network'] = 'healthy';
      if (networkLatency > 200) networkHealth = 'degraded';
      if (networkLatency > 300) networkHealth = 'critical';

      let storageHealth: SystemHealth['storage'] = 'optimal';
      if (storageSpeed > 800) storageHealth = 'slow';
      if (storageSpeed > 1000) storageHealth = 'error';

      let performanceHealth: SystemHealth['performance'] = 'fast';
      if (performanceScore < 80) performanceHealth = 'moderate';
      if (performanceScore < 60) performanceHealth = 'slow';

      // Calculate overall health
      let overall: SystemHealth['overall'] = 'excellent';
      if (networkHealth === 'degraded' || storageHealth === 'slow' || performanceHealth === 'moderate') {
        overall = 'good';
      }
      if (networkHealth === 'critical' || storageHealth === 'error' || performanceHealth === 'slow') {
        overall = 'poor';
      }

      setSystemHealth({
        overall,
        network: networkHealth,
        storage: storageHealth,
        performance: performanceHealth,
        lastCheck: Date.now()
      });

      // Auto-optimize if enabled and health is poor
      if (autoOptimize && overall === 'poor') {
        runAutoOptimization();
      }

    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const loadCacheStats = () => {
    // Simulate cache stats
    const totalSize = 1024 * 1024 * 100; // 100MB
    const usedSize = Math.floor(totalSize * (0.3 + Math.random() * 0.4)); // 30-70%
    const entries = Math.floor(Math.random() * 5000) + 1000;
    const hitRate = 85 + Math.random() * 10; // 85-95%

    setCacheStats({
      hitRate,
      missRate: 100 - hitRate,
      totalSize,
      usedSize,
      entries,
      lastCleared: Date.now() - Math.random() * 3600000 // Random time in last hour
    });
  };

  const loadOptimizationTasks = () => {
    const tasks: OptimizationTask[] = [
      {
        id: 'task_1',
        title: 'Optimize Peer Connections',
        description: 'Analyze and optimize network peer connections for better performance',
        category: 'network',
        priority: 'high',
        status: 'pending',
        progress: 0,
        estimatedTime: 120
      },
      {
        id: 'task_2',
        title: 'Clean Cache Data',
        description: 'Remove outdated cache entries and optimize memory usage',
        category: 'cache',
        priority: 'medium',
        status: 'pending',
        progress: 0,
        estimatedTime: 60
      },
      {
        id: 'task_3',
        title: 'Compress Storage Data',
        description: 'Enable compression for playlist and track data to reduce storage usage',
        category: 'storage',
        priority: 'low',
        status: 'pending',
        progress: 0,
        estimatedTime: 300
      }
    ];

    setOptimizationTasks(tasks);
  };

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);

    try {
      // Simulate diagnostic process
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        // Update progress if needed
      }

      // Check various system components
      await checkSystemHealth();
      loadCacheStats();
      
      // Update network stats
      const stats = fuegoDiscovery.getNetworkStats();
      setNetworkStats(stats);

      console.log('Diagnostics completed successfully');
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const runOptimizationTask = async (taskId: string) => {
    const task = optimizationTasks.find(t => t.id === taskId);
    if (!task || task.status === 'running') return;

    // Mark task as running
    setOptimizationTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: 'running', progress: 0 } : t
    ));

    try {
      // Simulate task execution with progress updates
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, task.estimatedTime * 10));
        
        setOptimizationTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, progress } : t
        ));
      }

      // Mark task as completed
      setOptimizationTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { 
              ...t, 
              status: 'completed', 
              progress: 100,
              result: 'Optimization completed successfully'
            } 
          : t
      ));

      // Update system health after optimization
      setTimeout(() => {
        checkSystemHealth();
      }, 1000);

    } catch (error) {
      // Mark task as failed
      setOptimizationTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { 
              ...t, 
              status: 'failed',
              result: 'Optimization failed: ' + error
            } 
          : t
      ));
    }
  };

  const runAutoOptimization = async () => {
    console.log('Running auto-optimization...');
    
    // Run all high priority pending tasks
    const highPriorityTasks = optimizationTasks.filter(t => 
      t.priority === 'high' && t.status === 'pending'
    );

    for (const task of highPriorityTasks) {
      await runOptimizationTask(task.id);
    }
  };

  const clearCache = async () => {
    try {
      // Simulate cache clearing
      setCacheStats(prev => ({
        ...prev,
        usedSize: 0,
        entries: 0,
        lastCleared: Date.now(),
        hitRate: 0,
        missRate: 0
      }));

      // Gradually restore cache stats
      setTimeout(() => {
        loadCacheStats();
      }, 2000);

      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const toggleNetworkOptimization = (option: keyof NetworkOptimizations) => {
    setNetworkOptimizations(prev => ({
      ...prev,
      [option]: !prev[option]
    }));

    // Simulate immediate effect on network performance
    setTimeout(() => {
      checkSystemHealth();
    }, 500);
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
      case 'healthy':
      case 'optimal':
      case 'fast':
        return 'text-green-400';
      case 'good':
      case 'degraded':
      case 'slow':
      case 'moderate':
        return 'text-yellow-400';
      case 'fair':
      case 'critical':
      case 'error':
      case 'poor':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTaskStatusColor = (status: OptimizationTask['status']) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'running': return 'text-blue-400';
      case 'failed': return 'text-red-400';
      case 'pending': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getPriorityColor = (priority: OptimizationTask['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white">Loading system optimization...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">System Optimization</h1>
        <p className="text-gray-300">
          Monitor and optimize system performance for the best experience
        </p>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Overall Health</h3>
          <p className={`text-3xl font-bold ${getHealthColor(systemHealth.overall)}`}>
            {systemHealth.overall.toUpperCase()}
          </p>
          <p className="text-gray-400 text-sm">System status</p>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Network</h3>
          <p className={`text-3xl font-bold ${getHealthColor(systemHealth.network)}`}>
            {systemHealth.network.toUpperCase()}
          </p>
          <p className="text-gray-400 text-sm">Connection status</p>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Storage</h3>
          <p className={`text-3xl font-bold ${getHealthColor(systemHealth.storage)}`}>
            {systemHealth.storage.toUpperCase()}
          </p>
          <p className="text-gray-400 text-sm">Data access speed</p>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Performance</h3>
          <p className={`text-3xl font-bold ${getHealthColor(systemHealth.performance)}`}>
            {systemHealth.performance.toUpperCase()}
          </p>
          <p className="text-gray-400 text-sm">Processing speed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cache Management */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Cache Management</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-400 text-sm">Hit Rate</span>
                <p className="text-2xl font-bold text-green-400">{cacheStats.hitRate.toFixed(1)}%</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Miss Rate</span>
                <p className="text-2xl font-bold text-red-400">{cacheStats.missRate.toFixed(1)}%</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Used Size</span>
                <p className="text-lg font-semibold text-white">{formatBytes(cacheStats.usedSize)}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Entries</span>
                <p className="text-lg font-semibold text-white">{cacheStats.entries.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${(cacheStats.usedSize / cacheStats.totalSize) * 100}%` }}
              ></div>
            </div>
            
            <button
              onClick={clearCache}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Clear Cache
            </button>
          </div>
        </div>

        {/* Network Optimizations */}
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Network Optimizations</h2>
          
          <div className="space-y-4">
            {Object.entries(networkOptimizations).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-gray-300 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <button
                  onClick={() => toggleNetworkOptimization(key as keyof NetworkOptimizations)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enabled ? 'bg-blue-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
            
            <div className="pt-4 border-t border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Auto-Optimize</span>
                <button
                  onClick={() => setAutoOptimize(!autoOptimize)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoOptimize ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoOptimize ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Optimization Tasks */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Optimization Tasks</h2>
        
        <div className="space-y-4">
          {optimizationTasks.map(task => (
            <div key={task.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                    {task.priority.toUpperCase()}
                  </span>
                  <h3 className="text-white font-medium">{task.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${getTaskStatusColor(task.status)}`}>
                    {task.status.toUpperCase()}
                  </span>
                  {task.status === 'pending' && (
                    <button
                      onClick={() => runOptimizationTask(task.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      Run
                    </button>
                  )}
                </div>
              </div>
              
              <p className="text-gray-400 text-sm mb-3">{task.description}</p>
              
              {task.status === 'running' && (
                <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
              )}
              
              {task.result && (
                <p className={`text-sm ${task.status === 'completed' ? 'text-green-400' : 'text-red-400'}`}>
                  {task.result}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* System Actions */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">System Actions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Diagnostics</h3>
            <button
              onClick={runDiagnostics}
              disabled={isRunningDiagnostics}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {isRunningDiagnostics ? 'Running...' : 'Run Full Diagnostics'}
            </button>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Health Check</h3>
            <button
              onClick={checkSystemHealth}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Check System Health
            </button>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Auto-Optimize</h3>
            <button
              onClick={runAutoOptimization}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Run Auto-Optimization
            </button>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Last health check: {new Date(systemHealth.lastCheck).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemOptimization;
