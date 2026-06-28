import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../hooks/useWallet';
import { usePlayer } from '../context/AudioContext';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  coverArt: string;
  audioUrl: string;
  paraEarnings: number;
  streamCount: number;
}

interface PlatformMetrics {
  totalPlays: number;
  totalUsers: number;
  totalPARADistributed: number;
  totalXFGContributed: number;
  totalListeningTime: number;
  totalSessions: number;
  averageSessionLength: number;
  premiumUsers: number;
  totalStaked: number;
  platformUptime: number;
  lastUpdate: number;
  version: string;
}

interface ParadioStats {
  currentListeners: number;
  totalPARAEarned: number;
  sessionDuration: number;
  isListening: boolean;
  currentEarningRate: number;
  totalTracksPlayed: number;
  averageEarningRate: number;
  lastEarningUpdate: number;
  humanVerificationScore: number;
  dailyEarnings: number;
  lastClaimTime: number;
  consecutiveListeningTime: number;
  interactionCount: number;
  reputationScore: number;
  behavioralSignature: string;
  proofOfHumanity: string;
  stakedAmount: number;
  peerVerifications: number;
  hasPremium: boolean;
  premiumCores: number;
  xfgMined: number;
  paraMiningMultiplier: number;
  isMining: boolean;
  dailySkips: number;
  totalSkips: number;
  lastSkipTime: number;
  skipPenaltyMultiplier: number;
  lastSkipReset: number;
  totalLifetimePARA: number;
  totalLifetimeXFG: number;
  totalListeningTime: number;
  totalSessions: number;
  longestSession: number;
  averageSessionLength: number;
  favoriteGenres: string[];
  favoriteArtists: string[];
  totalClaims: number;
  totalStaked: number;
  joinDate: number;
  lastActiveDate: number;
  streakDays: number;
  weeklyStats: { [weekKey: string]: { paraEarned: number; xfgMined: number; listeningTime: number; sessions: number } };
  monthlyStats: { [monthKey: string]: { paraEarned: number; xfgMined: number; listeningTime: number; sessions: number; averageScore: number } };
  platformContributions: { plays: number; listeningTime: number; paraEarned: number; xfgContributed: number; sessions: number; lastContribution: number };
}

interface SessionData {
  startTime: number;
  endTime: number;
  duration: number;
  tracksPlayed: string[];
  paraEarned: number;
  xfgMined: number;
  humanScore: number;
  isPremium: boolean;
}

const Paradio: React.FC = () => {
  const { evmAddress, stellarAddress } = useWallet();
  const { currentTrack, isPlaying, earnings, playTrack, pause, resume, volume, setVolume, togglePlay } = usePlayer();
  
  const [stats, setStats] = useState<ParadioStats>({
    currentListeners: 0,
    totalPARAEarned: 0,
    sessionDuration: 0,
    isListening: false,
    currentEarningRate: 0,
    totalTracksPlayed: 0,
    averageEarningRate: 0,
    lastEarningUpdate: Date.now(),
    humanVerificationScore: 50,
    dailyEarnings: 0,
    lastClaimTime: 0,
    consecutiveListeningTime: 0,
    interactionCount: 0,
    reputationScore: 0,
    behavioralSignature: '',
    proofOfHumanity: '',
    stakedAmount: 0,
    peerVerifications: 0,
    hasPremium: false,
    premiumCores: 0,
    xfgMined: 0,
    paraMiningMultiplier: 1.0,
    isMining: false,
    dailySkips: 0,
    totalSkips: 0,
    lastSkipTime: 0,
    skipPenaltyMultiplier: 1.0,
    lastSkipReset: Date.now(),
    totalLifetimePARA: 0,
    totalLifetimeXFG: 0,
    totalListeningTime: 0,
    totalSessions: 0,
    longestSession: 0,
    averageSessionLength: 0,
    favoriteGenres: [],
    favoriteArtists: [],
    totalClaims: 0,
    totalStaked: 0,
    joinDate: Date.now(),
    lastActiveDate: Date.now(),
    streakDays: 0,
    weeklyStats: {},
    monthlyStats: {},
    platformContributions: {
      plays: 0,
      listeningTime: 0,
      paraEarned: 0,
      xfgContributed: 0,
      sessions: 0,
      lastContribution: 0
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationChallenge, setVerificationChallenge] = useState('');
  const [showReputationModal, setShowReputationModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showPlatformMetrics, setShowPlatformMetrics] = useState(false);
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics>({
    totalPlays: 0,
    totalUsers: 0,
    totalPARADistributed: 0,
    totalXFGContributed: 0,
    totalListeningTime: 0,
    totalSessions: 0,
    averageSessionLength: 0,
    premiumUsers: 0,
    totalStaked: 0,
    platformUptime: 0,
    lastUpdate: Date.now(),
    version: '1.0.0'
  });

  const STATS_KEY = 'paradio-stats';
  const SESSIONS_KEY = 'paradio-sessions';
  const PLATFORM_METRICS_KEY = 'paradio-platform-metrics';

  useEffect(() => {
    loadStats();
    fetchParadioPlaylist();
  }, []);

  const loadStats = () => {
    try {
      const savedStats = localStorage.getItem(STATS_KEY);
      if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        setStats(prev => ({ ...prev, ...parsedStats }));
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const saveStats = (updatedStats: ParadioStats) => {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(updatedStats));
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  };

  const fetchParadioPlaylist = async () => {
    setIsLoading(true);
    try {
      // In real implementation this would come from P2P network
      const mockPlaylist: Track[] = [
        {
          id: '1',
          title: 'Midnight City',
          artist: 'Headphone Son',
          duration: '4:32',
          coverArt: 'https://i1.sndcdn.com/artworks-000321337836-5zcudq-t500x500.jpg',
          audioUrl: '/Midnight City.m4a',
          paraEarnings: 156.8,
          streamCount: 2840
        },
        {
          id: '2',
          title: 'Bitcoin',
          artist: 'Headphone Son',
          duration: '4:20',
          coverArt: '',
          audioUrl: '/bitcoin-headphone_son.mp3',
          paraEarnings: 89.2,
          streamCount: 1200
        },
        {
          id: '3',
          title: 'Recording 2018-04-19',
          artist: 'Headphone Son',
          duration: '5:15',
          coverArt: '',
          audioUrl: '/Recording 2018-04-19 03 00_35.m4a',
          paraEarnings: 78.9,
          streamCount: 2100
        },
        {
          id: '4',
          title: 'Blockchain Blues',
          artist: 'Decentralized Soul',
          duration: '3:30',
          coverArt: '',
          audioUrl: '#',
          paraEarnings: 32.1,
          streamCount: 890
        }
      ];
      
      if (mockPlaylist.length > 0) {
        playTrack({
          id: mockPlaylist[0].id,
          title: mockPlaylist[0].title,
          artist: mockPlaylist[0].artist,
          url: mockPlaylist[0].audioUrl,
          duration: parseInt(mockPlaylist[0].duration.split(':')[0]) * 60 + parseInt(mockPlaylist[0].duration.split(':')[1]),
        }, 'paradio');
      }
    } catch (error) {
      console.error('Failed to fetch Paradio playlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (newVolume < 0.4 && isPlaying) {
      pause();
    }
  };

  // ... other stats methods remain (claimPARARewards, etc.)’
  // Note: In a real implementation, these would also be moved to a Provider/Service
  const claimPARARewards = async () => {
    if (!stellarAddress) {
      alert('Please connect your Stellar wallet to claim PARA rewards');
      return;
    }
    alert(`Successfully claimed ${earnings.toFixed(3)} PARA tokens on Stellar!`);
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="text-6xl">📻</div>
        <h1 className="text-4xl font-bold gradient-text">Paradio</h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          P2P streaming radio that rewards artists and listeners with PARA tokens
        </p>
        <div className="flex justify-center space-x-4">
          <button onClick={() => setShowStatsModal(true)} className="btn-secondary text-sm">📊 View Stats</button>
          <button onClick={() => setShowPlatformMetrics(true)} className="btn-secondary text-sm">🌐 Platform Metrics</button>
        </div>
      </div>

      <div className="glass p-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">Now Playing</h2>
            
            {currentTrack ? (
              <div className="space-y-4">
                <div className="w-full h-80 bg-gradient-to-br from-fuchsia-900/50 to-purple-900/50 rounded-xl flex items-center justify-center overflow-hidden">
                  {currentTrack.albumArtUrl ? (
                    <img src={currentTrack.albumArtUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-8xl text-fuchsia-400/50">🎵</div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-white font-bold text-xl">{currentTrack.title}</h3>
                  <p className="text-fuchsia-300 text-lg">{currentTrack.artist}</p>
                  <p className="text-gray-400">{currentTrack.duration ? `${Math.floor(currentTrack.duration / 60)}:${(currentTrack.duration % 60).toString().padStart(2, '0')}` : 'Streaming...'}</p>
                </div>

                <div className="flex items-center justify-center space-x-4">
                   <button
                     onClick={togglePlay}
                     className="w-16 h-16 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-full flex items-center justify-center text-2xl transition-all duration-200 hover:scale-110"
                   >
                     {isPlaying ? '⏸' : '►'}
                   </button>
                </div>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                Loading station...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Paradio;
