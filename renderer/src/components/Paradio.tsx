import { useState, useEffect } from 'react';

interface ParaRewards {
  listening: number;
  mining: number;
  total: number;
}

interface MinerStats {
  active: boolean;
  threads: number;
  hashrate: number;
  accepted: number;
}

function Paradio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState({
    title: 'Digital Dreams',
    artist: 'CyberSounds',
    album: 'Future Beats Vol. 2',
    duration: 245,
    position: 67,
  });
  const [rewards, setRewards] = useState<ParaRewards>({
    listening: 1250,
    mining: 3200,
    total: 4450,
  });
  const [miner, setMiner] = useState<MinerStats>({
    active: false,
    threads: 0,
    hashrate: 0,
    accepted: 12,
  });

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMiner = () => {
    if (miner.active) {
      setMiner(prev => ({ ...prev, active: false, threads: 0, hashrate: 0 }));
    } else {
      setMiner(prev => ({ ...prev, active: true, threads: 4, hashrate: 1250 }));
    }
  };

  const setMinerThreads = (threads: number) => {
    setMiner(prev => ({ 
      ...prev, 
      threads, 
      hashrate: threads * 312, // ~312 H/s per thread estimate
      active: threads > 0 
    }));
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setRewards(prev => ({
          listening: prev.listening + 10, // 10 para per second base
          mining: prev.mining + (miner.active ? miner.threads * 5 : 0), // bonus for mining
          total: prev.total + 10 + (miner.active ? miner.threads * 5 : 0),
        }));
        
        setCurrentTrack(prev => ({
          ...prev,
          position: Math.min(prev.position + 1, prev.duration),
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, miner.active, miner.threads]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Paradio - P2P Streaming Radio</h2>

        {/* Current Track */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center space-x-6">
            {/* Album Art */}
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎵</span>
            </div>
            
            {/* Track Info */}
            <div className="flex-1">
              <h3 className="text-xl font-bold">{currentTrack.title}</h3>
              <p className="text-gray-400">{currentTrack.artist}</p>
              <p className="text-sm text-gray-500">{currentTrack.album}</p>
            </div>

            {/* Play Controls */}
            <div className="flex items-center space-x-4">
              <button className="text-gray-400 hover:text-white">
                ⏮
              </button>
              <button
                onClick={togglePlay}
                className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-xl"
              >
                {isPlaying ? '⏸' : '▶️'}
              </button>
              <button className="text-gray-400 hover:text-white">
                ⏭
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>{formatTime(currentTrack.position)}</span>
              <span>{formatTime(currentTrack.duration)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all"
                style={{ width: `${(currentTrack.position / currentTrack.duration) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Rewards Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-2">Listening Rewards</h3>
            <p className="text-2xl font-bold text-white">{rewards.listening.toLocaleString()}</p>
            <p className="text-green-100 text-sm">+10 para/second</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-2">Mining Bonus</h3>
            <p className="text-2xl font-bold text-white">{rewards.mining.toLocaleString()}</p>
            <p className="text-blue-100 text-sm">+{miner.threads * 5} para/second</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-2">Total Earned</h3>
            <p className="text-2xl font-bold text-white">{rewards.total.toLocaleString()}</p>
            <p className="text-purple-100 text-sm">This session</p>
          </div>
        </div>

        {/* Mining Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Proxy Miner</h3>
              <p className="text-sm text-gray-400">
                Contribute hashpower for bonus PARA rewards
              </p>
            </div>
            <button
              onClick={toggleMiner}
              className={`px-4 py-2 rounded font-medium ${
                miner.active
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {miner.active ? 'Stop Mining' : 'Start Mining'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                CPU Threads: {miner.threads}
              </label>
              <input
                type="range"
                min="0"
                max="8"
                value={miner.threads}
                onChange={(e) => setMinerThreads(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0</span>
                <span>8</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Hashrate:</span>
                <span className="text-sm">{miner.hashrate} H/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Shares Accepted:</span>
                <span className="text-sm">{miner.accepted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Status:</span>
                <span className={`text-sm ${miner.active ? 'text-green-400' : 'text-gray-400'}`}>
                  {miner.active ? 'Mining' : 'Idle'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Up Next */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Up Next</h3>
          <div className="space-y-3">
            {[
              { title: 'Neon Nights', artist: 'ElectroWave', duration: 203 },
              { title: 'Cosmic Journey', artist: 'StarBeats', duration: 287 },
              { title: 'Urban Pulse', artist: 'CityRhythm', duration: 234 },
            ].map((track, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-900 rounded">
                <div>
                  <p className="font-medium">{track.title}</p>
                  <p className="text-sm text-gray-400">{track.artist}</p>
                </div>
                <span className="text-sm text-gray-400">{formatTime(track.duration)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Paradio; 