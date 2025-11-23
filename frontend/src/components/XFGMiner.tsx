import React, { useState, useEffect, useRef, useCallback } from 'react';

interface MinerStats {
  hashes: number;
  accepted: number;
  rejected: number;
  hashrate: number;
  lastAccepted?: number;
  connected: boolean;
}

interface UserStatus {
  isPremium: boolean;
  miningWallet: string;
  sessionTime: number;
  earnedPARA: number;
  hasAccess: boolean;
}

const XFGMiner: React.FC = () => {
  const [isMining, setIsMining] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [stats, setStats] = useState<MinerStats>({
    hashes: 0,
    accepted: 0,
    rejected: 0,
    hashrate: 0,
    connected: false,
  });

  const [userStatus, setUserStatus] = useState<UserStatus>({
    isPremium: false,
    miningWallet: '',
    sessionTime: 0,
    earnedPARA: 0,
    hasAccess: false,
  });

  const [settings, setSettings] = useState({
    threads: -1, // Auto-detect
    throttle: 20, // 20% throttling for better UX
    poolUrl: 'wss://pool.usexfg.org:8080',
    donationAddress: 'oa1:xfg at donate.usexfg.org', // All XFG goes to dev address
  });

  const workerRef = useRef<Worker | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const hashRateInterval = useRef<NodeJS.Timeout | null>(null);
  const sessionTimer = useRef<NodeJS.Timeout | null>(null);

  // Check if user has premium status
  const checkPremiumStatus = useCallback(async () => {
    try {
      // Check if user has minimum XFG balance for premium
      const response = await fetch('/api/fuego/checkpremium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threshold: 0.0008 // Minimum 0.0008 XFG for premium
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserStatus(prev => ({
          ...prev,
          isPremium: data.isPremium,
          hasAccess: data.isPremium // Only premium users get access + PARA
        }));
      }
    } catch (error) {
      console.error('Failed to check premium status:', error);
    }
  }, []);

  // Initialize miner workers
  const initializeMiner = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    // Create worker from the js-miner worker.js
    const worker = new Worker('/js/worker.js');
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const data = e.data;

      if (data === 'kill') {
        setStats(prev => ({ ...prev, connected: false }));
        return;
      }

      if (data !== 'nothing' && data !== 'wakeup') {
        const result = JSON.parse(data);

        if (result.type === 'submit') {
          // Submit hash to pool
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(data);
          }
        }
      }
    };
  }, []);

  // Connect to mining pool
  const connectToPool = useCallback(async () => {
    setIsConnecting(true);

    try {
      const ws = new WebSocket(settings.poolUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStats(prev => ({ ...prev, connected: true }));
        console.log('Connected to mining pool');
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type === 'job') {
          // Distribute job to workers
          if (workerRef.current) {
            workerRef.current.postMessage({
              job: message.params,
              throttle: settings.throttle,
            });
          }
        } else if (message.type === 'hash_accepted') {
          setStats(prev => ({
            ...prev,
            accepted: prev.accepted + 1,
            lastAccepted: Date.now(),
          }));

          // Calculate PARA rewards (only for premium users)
          calculatePARARewards(true);
        } else if (message.type === 'hash_rejected') {
          setStats(prev => ({
            ...prev,
            rejected: prev.rejected + 1,
          }));
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStats(prev => ({ ...prev, connected: false }));
      };

      ws.onclose = () => {
        setStats(prev => ({ ...prev, connected: false }));
        setIsConnecting(false);
      };

    } catch (error) {
      console.error('Failed to connect to pool:', error);
      setStats(prev => ({ ...prev, connected: false }));
      setIsConnecting(false);
    }
  }, [settings.poolUrl, settings.throttle]);

  // Calculate PARA rewards
  const calculatePARARewards = useCallback((accepted: boolean) => {
    if (!accepted || !userStatus.isPremium) return; // Only premium users get PARA

    // PARA reward calculation for premium users only
    const baseReward = 0.001; // Base PARA per accepted hash
    const timeMultiplier = Math.min(1 + (userStatus.sessionTime / 3600) * 0.1, 2); // Up to 2x for long sessions
    const premiumMultiplier = 1.5; // Premium users get 1.5x rewards

    const reward = baseReward * timeMultiplier * premiumMultiplier;

    setUserStatus(prev => ({
      ...prev,
      earnedPARA: prev.earnedPARA + reward,
    }));
  }, [userStatus.sessionTime, userStatus.isPremium]);

  // Start mining
  const startMining = useCallback(async () => {
    if (isMining || isConnecting) return;

    // Check premium status first
    await checkPremiumStatus();

    setIsMining(true);
    initializeMiner();
    await connectToPool();

    // Start hash rate calculation
    hashRateInterval.current = setInterval(() => {
      setStats(prev => ({
        ...prev,
        hashrate: Math.round(prev.hashes / 10), // Rough estimation
      }));
    }, 10000);

    // Start session timer
    sessionTimer.current = setInterval(() => {
      setUserStatus(prev => ({
        ...prev,
        sessionTime: prev.sessionTime + 1,
      }));
    }, 1000);

  }, [isMining, isConnecting, checkPremiumStatus, initializeMiner, connectToPool]);

  // Stop mining
  const stopMining = useCallback(() => {
    setIsMining(false);

    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (hashRateInterval.current) {
      clearInterval(hashRateInterval.current);
      hashRateInterval.current = null;
    }

    if (sessionTimer.current) {
      clearInterval(sessionTimer.current);
      sessionTimer.current = null;
    }

    setStats({
      hashes: 0,
      accepted: 0,
      rejected: 0,
      hashrate: 0,
      connected: false,
    });
  }, []);

  // Update mining wallet address
  const updateMiningWallet = useCallback((address: string) => {
    setUserStatus(prev => ({ ...prev, miningWallet: address }));
    // All mining goes to donation address, only premium users get PARA rewards
  }, []);

  // Claim PARA rewards
  const claimPARARewards = useCallback(async () => {
    if (userStatus.earnedPARA <= 0) return;

    try {
      // Send PARA rewards to user's wallet (only for premium users)
      if (!userStatus.isPremium) {
        alert('PARA rewards are only available for premium users');
        return;
      }

      const response = await fetch('/api/para/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: userStatus.earnedPARA,
          address: userStatus.miningWallet, // PARA goes to user's wallet
        }),
      });

      if (response.ok) {
        setUserStatus(prev => ({ ...prev, earnedPARA: 0 }));
        alert(`Successfully claimed ${userStatus.earnedPARA.toFixed(6)} PARA!`);
      }
    } catch (error) {
      console.error('Failed to claim PARA rewards:', error);
    }
  }, [userStatus.earnedPARA, userStatus.rewardAddress]);

  // Initialize on mount
  useEffect(() => {
    checkPremiumStatus();
    return () => {
      stopMining();
    };
  }, [checkPremiumStatus, stopMining]);

  // Update worker when settings change
  useEffect(() => {
    if (workerRef.current && isMining) {
      workerRef.current.postMessage({
        throttle: settings.throttle,
      });
    }
  }, [settings.throttle, isMining]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="xfg-miner-container">
      <div className="miner-header">
        <h2>XFG Browser Miner</h2>
        <div className="user-status">
          <span className={`status-indicator ${userStatus.isPremium ? 'premium' : 'freemium'}`}>
            {userStatus.isPremium ? 'PREMIUM' : 'FREEMIUM'}
          </span>
          {userStatus.isPremium ? (
            <span>Premium user - Earn PARA rewards + full platform access</span>
          ) : (
            <span>Freemium - Mining supports dev fund, access to basic features</span>
          )}
        </div>
      </div>

      <div className="miner-controls">
        <div className="control-group">
          <label>Threads:</label>
          <select
            value={settings.threads}
            onChange={(e) => setSettings(prev => ({ ...prev, threads: parseInt(e.target.value) }))}
            disabled={isMining}
          >
            <option value={-1}>Auto-detect ({navigator.hardwareConcurrency || 4})</option>
            {[1, 2, 4, 6, 8].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Throttle:</label>
          <input
            type="range"
            min="0"
            max="80"
            value={settings.throttle}
            onChange={(e) => setSettings(prev => ({ ...prev, throttle: parseInt(e.target.value) }))}
            disabled={isMining}
          />
          <span>{settings.throttle}%</span>
        </div>

        <div className="control-group">
          <button
            onClick={isMining ? stopMining : startMining}
            disabled={isConnecting}
            className={`mining-button ${isMining ? 'stop' : 'start'}`}
          >
            {isConnecting ? 'Connecting...' : isMining ? 'Stop Mining' : 'Start Mining'}
          </button>
        </div>
      </div>

      <div className="miner-stats">
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Hash Rate:</span>
            <span className="stat-value">{stats.hashrate} H/s</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Accepted:</span>
            <span className="stat-value">{stats.accepted}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Rejected:</span>
            <span className="stat-value">{stats.rejected}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Access Status:</span>
            <span className={`stat-value ${userStatus.hasAccess ? 'access-granted' : 'access-denied'}`}>
              {userStatus.hasAccess ? 'Granted' : 'Limited'}
            </span>
          </div>
        </div>

        <div className="connection-status">
          <span className={`connection-indicator ${stats.connected ? 'connected' : 'disconnected'}`}>
            {stats.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="rewards-section">
        <h3>PARA Rewards</h3>
        <div className="rewards-display">
          <div className="earned-para">
            <span className="label">Earned:</span>
            <span className="amount">{userStatus.earnedPARA.toFixed(6)} PARA</span>
          </div>
          <button
            onClick={claimPARARewards}
            disabled={userStatus.earnedPARA <= 0 || !userStatus.isPremium}
            className={`claim-button ${!userStatus.isPremium ? 'disabled' : ''}`}
          >
            {userStatus.isPremium ? 'Claim PARA' : 'Premium Only'}
          </button>
        </div>

        <div className="mining-explanation">
          <h4>How it works:</h4>
          <ul>
            <li><strong>Premium Users:</strong> All XFG mining goes to dev fund, earn PARA rewards + full access</li>
            <li><strong>Freemium Users:</strong> All XFG mining goes to dev fund, no PARA rewards, limited access</li>
            <li>Minimum 0.0008 XFG required for premium status and PARA rewards</li>
            <li>PARA rewards increase with session time and premium multiplier (1.5x)</li>
          </ul>
        </div>
      </div>

      <div className="wallet-setup">
        <h3>Set Mining Address</h3>
        <input
          type="text"
          placeholder="Enter your XFG wallet address"
          value={userStatus.miningWallet}
          onChange={(e) => updateMiningWallet(e.target.value)}
        />
        <p className="wallet-help">
          All XFG mining rewards go to donation address (oa1:xfg at donate.usexfg.org).<br/>
          {userStatus.isPremium
            ? "PARA rewards will go to this address"
            : "PARA rewards are only available for premium users"
          }
        </p>
      </div>
    </div>
  );
};

export default XFGMiner;
```

Now let me create the worker.js file that will handle the actual mining:

<tool_call>
<function=edit_file>
<parameter=path>
/Users/aejt/digm-platform/public/js/worker.js
</parameter>
<parameter=mode>
create
</parameter>
<parameter=display_description>
Create worker.js for browser-based XFG mining
</parameter>
</function>
</tool_call>
