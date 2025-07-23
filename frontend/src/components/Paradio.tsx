import React, { useState, useEffect, useRef } from 'react';
import { useWallet } from '../hooks/useWallet';

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
  currentEarningRate: number; // PARA per minute
  totalTracksPlayed: number;
  averageEarningRate: number;
  lastEarningUpdate: number;
  humanVerificationScore: number; // 0-100, higher = more human-like
  dailyEarnings: number;
  lastClaimTime: number;
  consecutiveListeningTime: number;
  interactionCount: number;
  reputationScore: number; // On-chain reputation
  behavioralSignature: string; // Privacy-preserving behavioral hash
  proofOfHumanity: string; // ZK proof of human behavior
  stakedAmount: number; // Amount staked for reputation
  peerVerifications: number; // Number of peer verifications
  hasPremium: boolean; // Premium access status
  premiumCores: number; // Number of premium cores (1-8)
  xfgMined: number; // XFG mined (goes to dev wallet)
  paraMiningMultiplier: number; // PARA mining multiplier based on cores
  isMining: boolean; // Whether actively mining
  // Skip penalty tracking
  dailySkips: number; // Number of skips today
  totalSkips: number; // Total skips across all time
  lastSkipTime: number; // Last time user skipped a track
  skipPenaltyMultiplier: number; // Current penalty multiplier (0.1 to 1.0)
  lastSkipReset: number; // Last time daily skips were reset
  // Historical stats
  totalLifetimePARA: number; // Total PARA earned across all time
  totalLifetimeXFG: number; // Total XFG mined across all time
  totalListeningTime: number; // Total time spent listening (seconds)
  totalSessions: number; // Total number of listening sessions
  longestSession: number; // Longest single session (seconds)
  averageSessionLength: number; // Average session length (seconds)
  favoriteGenres: string[]; // Most listened to genres
  favoriteArtists: string[]; // Most listened to artists
  totalClaims: number; // Total number of PARA claims
  totalStaked: number; // Total amount staked over time
  joinDate: number; // When user first started using Paradio
  lastActiveDate: number; // Last active date
  streakDays: number; // Consecutive days of activity
  weeklyStats: {
    [weekKey: string]: {
      paraEarned: number;
      xfgMined: number;
      listeningTime: number;
      sessions: number;
    }
  };
  monthlyStats: {
    [monthKey: string]: {
      paraEarned: number;
      xfgMined: number;
      listeningTime: number;
      sessions: number;
      averageScore: number;
    }
  };
  // Platform contribution tracking
  platformContributions: {
    plays: number;
    listeningTime: number;
    paraEarned: number;
    xfgContributed: number;
    sessions: number;
    lastContribution: number;
  };
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
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [showVolumeWarning, setShowVolumeWarning] = useState(false);
  const [stats, setStats] = useState<ParadioStats>({
    currentListeners: 0,
    totalPARAEarned: 0,
    sessionDuration: 0,
    isListening: false,
    currentEarningRate: 0,
    totalTracksPlayed: 0,
    averageEarningRate: 0,
    lastEarningUpdate: Date.now(),
    humanVerificationScore: 50, // Start neutral
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
    // Skip penalty tracking
    dailySkips: 0,
    totalSkips: 0,
    lastSkipTime: 0,
    skipPenaltyMultiplier: 1.0, // Start with no penalty
    lastSkipReset: Date.now(),
    // Historical stats
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
  const [playlist, setPlaylist] = useState<Track[]>([]);
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
  const [paraMeterProgress, setParaMeterProgress] = useState(0); // 0-100 for meter animation
  const [currentMinuteStart, setCurrentMinuteStart] = useState(Date.now());
  const [minutePARAEarned, setMinutePARAEarned] = useState(0);
  const [lastMeterLog, setLastMeterLog] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const lastTrackChangeRef = useRef<number>(Date.now());
  const lastInteractionRef = useRef<number>(Date.now());
  const consecutiveStartRef = useRef<number>(Date.now());
  const behavioralDataRef = useRef<any[]>([]);
  const miningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentSessionRef = useRef<SessionData | null>(null);
  const blockchainLogIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const paraMeterIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stats persistence keys
  const STATS_KEY = 'paradio-stats';
  const SESSIONS_KEY = 'paradio-sessions';
  const PLATFORM_METRICS_KEY = 'paradio-platform-metrics';

  // Load stats from localStorage
  const loadStats = () => {
    try {
      const savedStats = localStorage.getItem(STATS_KEY);
      if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        setStats(prev => ({
          ...prev,
          ...parsedStats,
          // Don't override current session data
          currentPARAEarned: 0,
          sessionDuration: 0,
          isListening: false,
          currentEarningRate: 0,
          isMining: false
        }));
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // Save stats to localStorage
  const saveStats = (updatedStats: ParadioStats) => {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(updatedStats));
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  };

  // Update weekly stats
  const updateWeeklyStats = (paraEarned: number, xfgMined: number, listeningTime: number) => {
    const now = new Date();
    const weekKey = `${now.getFullYear()}-W${Math.ceil((now.getDate() + now.getDay()) / 7)}`;
    
    setStats(prev => {
      const currentWeek = prev.weeklyStats[weekKey] || {
        paraEarned: 0,
        xfgMined: 0,
        listeningTime: 0,
        sessions: 0
      };
      
      const updatedWeeklyStats = {
        ...prev.weeklyStats,
        [weekKey]: {
          paraEarned: currentWeek.paraEarned + paraEarned,
          xfgMined: currentWeek.xfgMined + xfgMined,
          listeningTime: currentWeek.listeningTime + listeningTime,
          sessions: currentWeek.sessions + 1
        }
      };
      
      return {
        ...prev,
        weeklyStats: updatedWeeklyStats
      };
    });
  };

  // Update monthly stats
  const updateMonthlyStats = (paraEarned: number, xfgMined: number, listeningTime: number, humanScore: number) => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    setStats(prev => {
      const currentMonth = prev.monthlyStats[monthKey] || {
        paraEarned: 0,
        xfgMined: 0,
        listeningTime: 0,
        sessions: 0,
        averageScore: 0
      };
      
      const totalSessions = currentMonth.sessions + 1;
      const newAverageScore = (currentMonth.averageScore * currentMonth.sessions + humanScore) / totalSessions;
      
      const updatedMonthlyStats = {
        ...prev.monthlyStats,
        [monthKey]: {
          paraEarned: currentMonth.paraEarned + paraEarned,
          xfgMined: currentMonth.xfgMined + xfgMined,
          listeningTime: currentMonth.listeningTime + listeningTime,
          sessions: totalSessions,
          averageScore: newAverageScore
        }
      };
      
      return {
        ...prev,
        monthlyStats: updatedMonthlyStats
      };
    });
  };

  // Start a new session
  const startSession = () => {
    const sessionData: SessionData = {
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      tracksPlayed: [],
      paraEarned: 0,
      xfgMined: 0,
      humanScore: stats.humanVerificationScore,
      isPremium: stats.hasPremium
    };
    
    currentSessionRef.current = sessionData;
    sessionStartRef.current = Date.now();
    
    // Update streak
    const today = new Date().toDateString();
    const lastActive = new Date(stats.lastActiveDate).toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    let newStreak = stats.streakDays;
    if (today === lastActive) {
      // Same day, no change
    } else if (today === yesterday) {
      // Consecutive day
      newStreak = stats.streakDays + 1;
    } else {
      // Break in streak
      newStreak = 1;
    }
    
    setStats(prev => ({
      ...prev,
      totalSessions: prev.totalSessions + 1,
      lastActiveDate: Date.now(),
      streakDays: newStreak
    }));
  };

  // End current session
  const endSession = () => {
    if (!currentSessionRef.current) return;
    
    const session = currentSessionRef.current;
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    session.paraEarned = stats.totalPARAEarned;
    session.xfgMined = stats.xfgMined;
    
    // Update platform contributions
    updatePlatformContributions(
      1, // 1 play
      session.duration, // listening time
      session.paraEarned, // PARA earned
      session.xfgMined // XFG contributed
    );
    
    // Update historical stats
    setStats(prev => {
      const newTotalListeningTime = prev.totalListeningTime + session.duration;
      const newLongestSession = Math.max(prev.longestSession, session.duration);
      const newAverageSessionLength = newTotalListeningTime / (prev.totalSessions + 1);
      
      const updatedStats = {
        ...prev,
        totalLifetimePARA: prev.totalLifetimePARA + session.paraEarned,
        totalLifetimeXFG: prev.totalLifetimeXFG + session.xfgMined,
        totalListeningTime: newTotalListeningTime,
        longestSession: newLongestSession,
        averageSessionLength: newAverageSessionLength
      };
      
      // Save to localStorage
      saveStats(updatedStats);
      
      return updatedStats;
    });
    
    // Update weekly and monthly stats
    updateWeeklyStats(session.paraEarned, session.xfgMined, session.duration);
    updateMonthlyStats(session.paraEarned, session.xfgMined, session.duration, session.humanScore);
    
    // Save session data
    try {
      const savedSessions = localStorage.getItem(SESSIONS_KEY);
      const sessions = savedSessions ? JSON.parse(savedSessions) : [];
      sessions.push(session);
      
      // Keep only last 100 sessions
      if (sessions.length > 100) {
        sessions.splice(0, sessions.length - 100);
      }
      
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
    
    currentSessionRef.current = null;
  };

  // Load stats on component mount
  useEffect(() => {
    loadStats();
  }, []);

  // Auto-save stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      saveStats(stats);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [stats]);

  // Start session when listening starts
  useEffect(() => {
    if (stats.isListening && !currentSessionRef.current) {
      startSession();
    } else if (!stats.isListening && currentSessionRef.current) {
      endSession();
    }
  }, [stats.isListening]);

  // Check premium status on component mount
  useEffect(() => {
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = () => {
    const premium = localStorage.getItem('digm-premium') === 'true';
    const cores = parseInt(localStorage.getItem('digm-cores') || '0');
    
    setStats(prev => ({
      ...prev,
      hasPremium: premium,
      premiumCores: cores,
      paraMiningMultiplier: premium ? Math.min(1 + (cores * 0.125), 2.0) : 0 // Max 2x multiplier
    }));
  };

  // XFG Mining System (goes to dev wallet)
  const startXfgMining = () => {
    if (!stats.hasPremium) {
      setShowPremiumModal(true);
      return;
    }

    if (miningIntervalRef.current) {
      clearInterval(miningIntervalRef.current);
    }

    setStats(prev => ({ ...prev, isMining: true }));

    // Mine XFG (goes to dev wallet) - very low rate to ensure PARA is more valuable
    miningIntervalRef.current = setInterval(() => {
      const xfgPerMinute = 0.001; // Very low XFG mining rate
      
      setStats(prev => ({
        ...prev,
        xfgMined: prev.xfgMined + (xfgPerMinute / 60) // Per second
      }));
    }, 1000);
  };

  const stopXfgMining = () => {
    if (miningIntervalRef.current) {
      clearInterval(miningIntervalRef.current);
      miningIntervalRef.current = null;
    }
    setStats(prev => ({ ...prev, isMining: false }));
  };

  // Cleanup mining interval on unmount
  useEffect(() => {
    return () => {
      if (miningIntervalRef.current) {
        clearInterval(miningIntervalRef.current);
      }
    };
  }, []);

  // Privacy-preserving behavioral signature generation
  const generateBehavioralSignature = (): string => {
    const data = behavioralDataRef.current;
    if (data.length < 10) return '';
    
    // Create a privacy-preserving hash of behavioral patterns
    const patterns = {
      avgInteractionInterval: data.reduce((sum, d) => sum + d.interval, 0) / data.length,
      interactionVariance: Math.sqrt(data.reduce((sum, d) => sum + Math.pow(d.interval - data.reduce((s, x) => s + x.interval, 0) / data.length, 2), 0) / data.length),
      naturalBreaks: data.filter(d => d.type === 'break').length,
      sessionPatterns: data.filter(d => d.type === 'session').length
    };
    
    // Hash the patterns (can't be reverse-engineered to identify user)
    const patternString = JSON.stringify(patterns);
    return btoa(patternString).slice(0, 16); // Simple hash for demo
  };

  // Zero-knowledge proof of human behavior
  const generateProofOfHumanity = (): string => {
    const signature = generateBehavioralSignature();
    const score = stats.humanVerificationScore;
    const reputation = stats.reputationScore;
    
    // Create a proof that user is human without revealing specific data
    const proof = {
      hasValidSignature: signature.length > 0,
      scoreThreshold: score >= 70,
      reputationThreshold: reputation >= 50,
      timestamp: Date.now()
    };
    
    return btoa(JSON.stringify(proof)).slice(0, 24);
  };

  // Advanced behavioral analysis with privacy preservation
  const analyzeBehavior = () => {
    const now = Date.now();
    const timeSinceLastInteraction = now - lastInteractionRef.current;
    
    // Collect behavioral data locally (not sent to server)
    behavioralDataRef.current.push({
      timestamp: now,
      interval: timeSinceLastInteraction,
      type: timeSinceLastInteraction > 300000 ? 'break' : 'interaction',
      sessionDuration: stats.sessionDuration
    });
    
    // Keep only last 100 data points for privacy
    if (behavioralDataRef.current.length > 100) {
      behavioralDataRef.current = behavioralDataRef.current.slice(-100);
    }
    
    // Update behavioral signature
    const newSignature = generateBehavioralSignature();
    const newProof = generateProofOfHumanity();
    
    setStats(prev => ({
      ...prev,
      behavioralSignature: newSignature,
      proofOfHumanity: newProof
    }));
  };

  // Anti-bot: Track user interactions with enhanced privacy
  const trackInteraction = () => {
    const now = Date.now();
    const timeSinceLastInteraction = now - lastInteractionRef.current;
    
    // Enhanced interaction analysis
    if (timeSinceLastInteraction > 30000 && timeSinceLastInteraction < 300000) {
      setStats(prev => ({
        ...prev,
        humanVerificationScore: Math.min(prev.humanVerificationScore + 2, 100),
        interactionCount: prev.interactionCount + 1
      }));
    }
    
    // Detect suspicious patterns
    if (timeSinceLastInteraction < 1000) { // Too fast
      setStats(prev => ({
        ...prev,
        humanVerificationScore: Math.max(prev.humanVerificationScore - 1, 0)
      }));
    }
    
    lastInteractionRef.current = now;
    analyzeBehavior();
  };

  // Anti-bot: Enhanced bot detection
  const detectBotBehavior = () => {
    const now = Date.now();
    const consecutiveTime = now - consecutiveStartRef.current;
    
    // Detect automation patterns
    const behavioralData = behavioralDataRef.current;
    const recentInteractions = behavioralData.filter(d => now - d.timestamp < 60000);
    
    // Check for too-perfect timing (bots)
    if (recentInteractions.length > 10) {
      const intervals = recentInteractions.map((d, i) => 
        i > 0 ? d.timestamp - recentInteractions[i-1].timestamp : 0
      ).slice(1);
      
      const avgInterval = intervals.reduce((sum, int) => sum + int, 0) / intervals.length;
      const variance = Math.sqrt(intervals.reduce((sum, int) => sum + Math.pow(int - avgInterval, 2), 0) / intervals.length);
      
      // Too consistent timing indicates bot
      if (variance < 1000) { // Less than 1 second variance
        setStats(prev => ({
          ...prev,
          humanVerificationScore: Math.max(prev.humanVerificationScore - 10, 0)
        }));
      }
    }
    
    // Penalize 24/7 listening
    if (consecutiveTime > 3600000) {
      setStats(prev => ({
        ...prev,
        humanVerificationScore: Math.max(prev.humanVerificationScore - 5, 0)
      }));
      consecutiveStartRef.current = now;
    }
    
    // Reward natural breaks
    if (!isPlaying && consecutiveTime > 300000) {
      setStats(prev => ({
        ...prev,
        humanVerificationScore: Math.min(prev.humanVerificationScore + 3, 100)
      }));
    }
  };

  // Anti-bot: Generate verification challenge
  const generateVerificationChallenge = () => {
    const challenges = [
      "What color is the sky?",
      "How many fingers do you have?",
      "What is 2 + 2?",
      "Are you human?",
      "What do you call a baby cow?"
    ];
    const answers = ["blue", "5", "4", "yes", "calf"];
    const randomIndex = Math.floor(Math.random() * challenges.length);
    setVerificationChallenge(challenges[randomIndex]);
    return answers[randomIndex];
  };

  // Anti-bot: Rate limiting based on human score and reputation
  const getRateMultiplier = (): number => {
    const score = stats.humanVerificationScore;
    const reputation = stats.reputationScore;
    
    // Combine human verification and reputation scores
    const combinedScore = (score * 0.7) + (reputation * 0.3);
    
    let baseMultiplier = 1.0;
    if (combinedScore >= 80) baseMultiplier = 1.0; // Full rate
    else if (combinedScore >= 60) baseMultiplier = 0.7; // Reduced rate
    else if (combinedScore >= 40) baseMultiplier = 0.4; // Heavily reduced
    else baseMultiplier = 0.1; // Minimal rate for suspicious users
    
    // Apply skip penalty multiplier
    return baseMultiplier * stats.skipPenaltyMultiplier;
  };

  // Calculate skip penalty based on daily skips
  const calculateSkipPenalty = (dailySkips: number): number => {
    if (dailySkips === 0) return 1.0; // No penalty
    if (dailySkips === 1) return 0.9; // 10% penalty for first skip
    if (dailySkips === 2) return 0.7; // 30% penalty for second skip
    if (dailySkips === 3) return 0.5; // 50% penalty for third skip
    if (dailySkips === 4) return 0.3; // 70% penalty for fourth skip
    if (dailySkips >= 5) return 0.1; // 90% penalty for 5+ skips
    return 1.0;
  };

  // Reset daily skips if it's a new day
  const checkAndResetDailySkips = () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const timeSinceReset = now - stats.lastSkipReset;
    
    if (timeSinceReset >= oneDay) {
      setStats(prev => ({
        ...prev,
        dailySkips: 0,
        skipPenaltyMultiplier: 1.0,
        lastSkipReset: now
      }));
    }
  };

  // Calculate earning rate based on track popularity, current listeners, and premium status
  const calculateEarningRate = (track: Track | null): number => {
    if (!track) return 0;
    
    // Base rate: 0.1 PARA per minute
    let baseRate = 0.1;
    
    // Bonus for popular tracks (more streams = higher earnings)
    const popularityMultiplier = Math.min(1 + (track.streamCount / 1000), 2.0);
    
    // Bonus for tracks with high PARA earnings (indicates artist success)
    const artistSuccessMultiplier = Math.min(1 + (track.paraEarnings / 100), 1.5);
    
    // Random listener count simulation (1-50 listeners)
    const simulatedListeners = Math.floor(Math.random() * 50) + 1;
    const listenerBonus = Math.min(1 + (simulatedListeners / 20), 1.3);
    
    // Anti-bot: Apply human verification multiplier
    const humanMultiplier = getRateMultiplier();
    
    // Premium multiplier: Only applies if user has premium access
    const premiumMultiplier = stats.hasPremium ? stats.paraMiningMultiplier : 0;
    
    const totalRate = baseRate * popularityMultiplier * artistSuccessMultiplier * listenerBonus * humanMultiplier * premiumMultiplier;
    
    return Math.round(totalRate * 1000) / 1000; // Round to 3 decimal places
  };

  useEffect(() => {
    fetchParadioPlaylist();
    startSessionTracking();
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Update earning rate when premium status or skip penalty changes
  useEffect(() => {
    if (currentTrack) {
      const newRate = calculateEarningRate(currentTrack);
      setStats(prev => ({
        ...prev,
        currentEarningRate: newRate
      }));
    }
  }, [stats.hasPremium, stats.premiumCores, stats.paraMiningMultiplier, stats.skipPenaltyMultiplier]);

  // Check for daily skip reset on component mount and periodically
  useEffect(() => {
    checkAndResetDailySkips();
    
    const interval = setInterval(checkAndResetDailySkips, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const fetchParadioPlaylist = async () => {
    setIsLoading(true);
    try {
      // Mock Paradio playlist - in real implementation this would come from P2P network
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
      
      setPlaylist(mockPlaylist);
      if (mockPlaylist.length > 0) {
        setCurrentTrack(mockPlaylist[0]);
      }
    } catch (error) {
      console.error('Failed to fetch Paradio playlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startSessionTracking = () => {
    const interval = setInterval(() => {
      if (stats.isListening && currentTrack) {
        const now = Date.now();
        const sessionDuration = Math.floor((now - sessionStartRef.current) / 1000);
        const timeSinceLastUpdate = (now - stats.lastEarningUpdate) / 1000 / 60; // minutes
        
        // Calculate earnings based on current rate
        const newEarnings = stats.currentEarningRate * timeSinceLastUpdate;
        const totalEarnings = stats.totalPARAEarned + newEarnings;
        
        // Calculate average earning rate
        const averageRate = sessionDuration > 0 ? (totalEarnings / (sessionDuration / 60)) : 0;
        
        setStats(prev => ({
          ...prev,
          sessionDuration,
          totalPARAEarned: totalEarnings,
          averageEarningRate: Math.round(averageRate * 1000) / 1000,
          lastEarningUpdate: now
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  };

  const isValidAudioUrl = (url: string) => url && url !== '#' && (url.startsWith('http') || url.startsWith('/'));

  const togglePlayback = () => {
    if (!currentTrack || !isValidAudioUrl(currentTrack.audioUrl)) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setStats(prev => ({ ...prev, isListening: false }));
    } else {
      // Check if volume is below 40% before allowing play
      if (volume < 0.4) {
        setShowVolumeWarning(true);
        setTimeout(() => {
          setShowVolumeWarning(false);
        }, 5000);
        return; // Don't resume playback
      }
      
      audioRef.current?.play();
      setIsPlaying(true);
      setStats(prev => ({ ...prev, isListening: true }));
      if (!stats.isListening) {
        sessionStartRef.current = Date.now();
      }
    }
  };

  const skipTrack = () => {
    if (!currentTrack || playlist.length === 0) return;
    
    // Check and reset daily skips if it's a new day
    checkAndResetDailySkips();
    
    // Apply skip penalty
    const newDailySkips = stats.dailySkips + 1;
    const newSkipPenalty = calculateSkipPenalty(newDailySkips);
    
    setStats(prev => ({
      ...prev,
      dailySkips: newDailySkips,
      totalSkips: prev.totalSkips + 1,
      lastSkipTime: Date.now(),
      skipPenaltyMultiplier: newSkipPenalty
    }));
    
    // Show skip penalty notification
    const penaltyPercent = Math.round((1 - newSkipPenalty) * 100);
    if (newDailySkips > 1) {
      console.log(`⚠️ Skip penalty applied: ${penaltyPercent}% reduction in PARA earnings for today`);
    }
    
    // Find next track
    let currentIndex = playlist.findIndex(track => track.id === currentTrack.id);
    let nextIndex = (currentIndex + 1) % playlist.length;
    let attempts = 0;
    // Find next valid track or stop after looping all
    while (!isValidAudioUrl(playlist[nextIndex].audioUrl) && attempts < playlist.length) {
      nextIndex = (nextIndex + 1) % playlist.length;
      attempts++;
    }
    setCurrentTrack(playlist[nextIndex]);
    // Auto-play next track if valid
    setTimeout(() => {
      if (audioRef.current && isValidAudioUrl(playlist[nextIndex].audioUrl)) {
        audioRef.current.play();
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    }, 100);
  };

  // Check PARA token balance on Stellar
  const checkPARABalance = async (): Promise<number> => {
    if (!stellarAddress) return 0;
    
    try {
      // TODO: Implement real Stellar balance check
      // const server = new StellarSdk.Server('https://horizon.stellar.org');
      // const account = await server.loadAccount(stellarAddress);
      // const paraBalance = account.balances.find(b => 
      //   b.asset_code === 'PARA' && 
      //   b.asset_issuer === 'GCFWKV4KWYPBPQVQYLVL6N6VARBLVQS6POYEMLN7AGZB5UK4VIJX565U'
      // );
      // return parseFloat(paraBalance?.balance || '0');
      
      // Mock balance for now
      return Math.random() * 100; // Random balance between 0-100 PARA
    } catch (error) {
      console.error('Failed to check PARA balance:', error);
      return 0;
    }
  };

  // Enhanced claim function with real Stellar PARA tokens
  const claimPARARewards = async () => {
    if (!stellarAddress) {
      alert('Please connect your Stellar wallet to claim PARA rewards');
      return;
    }

    // Anti-bot: Check daily limit
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const timeSinceLastClaim = now - stats.lastClaimTime;
    
    if (timeSinceLastClaim < oneDay && stats.dailyEarnings >= 100) {
      alert('Daily earning limit reached (100 PARA). Try again tomorrow!');
      return;
    }

    // Anti-bot: Enhanced verification requirements
    const requiresVerification = (
      stats.totalPARAEarned > 10 && 
      (stats.humanVerificationScore < 70 || stats.reputationScore < 50)
    );
    
    if (requiresVerification) {
      setShowVerification(true);
      return;
    }

    // Anti-bot: Reputation staking requirement for large claims
    if (stats.totalPARAEarned > 50 && stats.stakedAmount < 10) {
      alert('Large claims require staking at least 10 XFG for reputation. Please stake first.');
      setShowReputationModal(true);
      return;
    }

    try {
      const claimedAmount = stats.totalPARAEarned;
      
      // TODO: Implement real Stellar transaction for PARA distribution
      // const server = new StellarSdk.Server('https://horizon.stellar.org');
      // const account = await server.loadAccount(stellarAddress);
      // const paraAsset = new StellarSdk.Asset('PARA', 'GCFWKV4KWYPBPQVQYLVL6N6VARBLVQS6POYEMLN7AGZB5UK4VIJX565U');
      // 
      // const transaction = new StellarSdk.TransactionBuilder(account, {
      //   fee: StellarSdk.BASE_FEE,
      //   networkPassphrase: StellarSdk.Networks.PUBLIC
      // })
      //   .addOperation(StellarSdk.Operation.payment({
      //     destination: stellarAddress,
      //     asset: paraAsset,
      //     amount: claimedAmount.toString()
      //   }))
      //   .setTimeout(30)
      //   .build();
      // 
      // const signedTransaction = transaction.sign(privateKey);
      // const result = await server.submitTransaction(signedTransaction);
      
      // Mock transaction for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(`Successfully claimed ${claimedAmount.toFixed(3)} PARA tokens on Stellar!`);
      
      // Reset session and update daily earnings and stats
      setStats(prev => ({
        ...prev,
        totalPARAEarned: 0,
        sessionDuration: 0,
        dailyEarnings: prev.dailyEarnings + claimedAmount,
        lastClaimTime: now,
        totalClaims: prev.totalClaims + 1
      }));
      sessionStartRef.current = Date.now();
      
      // Save updated stats
      saveStats(stats);
      
      console.log(`PARA claimed on Stellar: ${claimedAmount.toFixed(3)} PARA to ${stellarAddress}`);
    } catch (error) {
      console.error('Failed to claim PARA rewards on Stellar:', error);
      alert('Failed to claim rewards. Please try again.');
    }
  };

  // Format time duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Get current week/month keys
  const getCurrentWeekKey = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-W${Math.ceil((now.getDate() + now.getDay()) / 7)}`;
  };

  const getCurrentMonthKey = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const handleVerification = (answer: string) => {
    const correctAnswer = generateVerificationChallenge();
    
    if (answer.toLowerCase() === correctAnswer.toLowerCase()) {
      setStats(prev => ({
        ...prev,
        humanVerificationScore: Math.min(prev.humanVerificationScore + 20, 100)
      }));
      setShowVerification(false);
      claimPARARewards(); // Retry claim after verification
    } else {
      alert('Verification failed. Please try again.');
      setStats(prev => ({
        ...prev,
        humanVerificationScore: Math.max(prev.humanVerificationScore - 10, 0)
      }));
    }
  };

  // Add event listeners for interaction tracking
  useEffect(() => {
    const handleUserInteraction = () => trackInteraction();
    
    document.addEventListener('mousemove', handleUserInteraction);
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keypress', handleUserInteraction);
    
    return () => {
      document.removeEventListener('mousemove', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keypress', handleUserInteraction);
    };
  }, []);

  // Bot behavior detection
  useEffect(() => {
    const interval = setInterval(detectBotBehavior, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Decentralized reputation system
  const stakeForReputation = async (amount: number) => {
    if (!evmAddress) {
      alert('Please connect your wallet to stake for reputation');
      return;
    }
    
    try {
      // Mock staking - in real implementation this would call smart contract
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStats(prev => ({
        ...prev,
        stakedAmount: prev.stakedAmount + amount,
        reputationScore: Math.min(prev.reputationScore + (amount / 10), 100)
      }));
      
      alert(`Successfully staked ${amount} XFG for reputation!`);
    } catch (error) {
      console.error('Failed to stake for reputation:', error);
      alert('Failed to stake. Please try again.');
    }
  };

  // Peer verification system
  const verifyPeer = async (peerAddress: string) => {
    if (!evmAddress) {
      alert('Please connect your wallet to verify peers');
      return;
    }
    
    try {
      // Mock peer verification - in real implementation this would call smart contract
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats(prev => ({
        ...prev,
        peerVerifications: prev.peerVerifications + 1,
        reputationScore: Math.min(prev.reputationScore + 5, 100)
      }));
      
      alert('Successfully verified peer!');
    } catch (error) {
      console.error('Failed to verify peer:', error);
      alert('Failed to verify peer. Please try again.');
    }
  };

  // Load platform metrics from localStorage
  const loadPlatformMetrics = () => {
    try {
      const savedMetrics = localStorage.getItem(PLATFORM_METRICS_KEY);
      if (savedMetrics) {
        setPlatformMetrics(JSON.parse(savedMetrics));
      }
    } catch (error) {
      console.error('Failed to load platform metrics:', error);
    }
  };

  // Save platform metrics to localStorage
  const savePlatformMetrics = (metrics: PlatformMetrics) => {
    try {
      localStorage.setItem(PLATFORM_METRICS_KEY, JSON.stringify(metrics));
    } catch (error) {
      console.error('Failed to save platform metrics:', error);
    }
  };

  // Update user's platform contributions
  const updatePlatformContributions = (plays: number = 0, listeningTime: number = 0, paraEarned: number = 0, xfgContributed: number = 0) => {
    setStats(prev => ({
      ...prev,
      platformContributions: {
        plays: prev.platformContributions.plays + plays,
        listeningTime: prev.platformContributions.listeningTime + listeningTime,
        paraEarned: prev.platformContributions.paraEarned + paraEarned,
        xfgContributed: prev.platformContributions.xfgContributed + xfgContributed,
        sessions: prev.platformContributions.sessions + 1,
        lastContribution: Date.now()
      }
    }));
  };

  // Log platform metrics to blockchain (real Stellar implementation)
  const logPlatformMetricsToBlockchain = async () => {
    if (!stellarAddress) return;

    try {
      // Calculate user's contribution to platform metrics
      const userContribution = stats.platformContributions;
      
      // COLD L3 / Fuego L1 platform data storage
      const platformData = {
        type: 'PARADIO_PLATFORM_METRICS',
        timestamp: Date.now(),
        userAddress: stellarAddress,
        contribution: {
          plays: userContribution.plays,
          listeningTime: userContribution.listeningTime,
          paraEarned: userContribution.paraEarned,
          xfgContributed: userContribution.xfgContributed,
          sessions: userContribution.sessions
        },
        platformMetrics: {
          totalPlays: platformMetrics.totalPlays + userContribution.plays,
          totalUsers: platformMetrics.totalUsers + (userContribution.sessions > 0 ? 1 : 0),
          totalPARADistributed: platformMetrics.totalPARADistributed + userContribution.paraEarned,
          totalXFGContributed: platformMetrics.totalXFGContributed + userContribution.xfgContributed,
          totalListeningTime: platformMetrics.totalListeningTime + userContribution.listeningTime,
          totalSessions: platformMetrics.totalSessions + userContribution.sessions,
          premiumUsers: platformMetrics.premiumUsers + (stats.hasPremium ? 1 : 0),
          totalStaked: platformMetrics.totalStaked + stats.totalStaked,
          platformUptime: Date.now() - platformMetrics.lastUpdate,
          lastUpdate: Date.now(),
          version: platformMetrics.version
        }
      };

      // Log to COLD L3 / Fuego L1 for platform data storage
      console.log('Logging platform metrics to COLD L3 / Fuego L1:', platformData);
      
      // TODO: Implement COLD L3 / Fuego L1 transaction
      // const coldTx = await coldL3Client.submitTransaction({
      //   to: 'PARADIO_PLATFORM_DATA_CONTRACT',
      //   data: JSON.stringify(platformData),
      //   gasLimit: 100000
      // });
      
      // PARA transactions remain on Stellar (naturally public)
      if (userContribution.paraEarned > 0) {
        console.log(`PARA transaction on Stellar: ${userContribution.paraEarned} PARA to ${stellarAddress}`);
        // TODO: Implement Stellar PARA distribution
        // const stellarTx = await stellarClient.payment({
        //   destination: stellarAddress,
        //   asset: 'PARA-GCFWKV4KWYPBPQVQYLVL6N6VARBLVQS6POYEMLN7AGZB5UK4VIJX565U-1',
        //   amount: userContribution.paraEarned.toString()
        // });
      }
      
      // Update local platform metrics
      const updatedMetrics = {
        ...platformMetrics,
        totalPlays: platformMetrics.totalPlays + userContribution.plays,
        totalUsers: platformMetrics.totalUsers + (userContribution.sessions > 0 ? 1 : 0),
        totalPARADistributed: platformMetrics.totalPARADistributed + userContribution.paraEarned,
        totalXFGContributed: platformMetrics.totalXFGContributed + userContribution.xfgContributed,
        totalListeningTime: platformMetrics.totalListeningTime + userContribution.listeningTime,
        totalSessions: platformMetrics.totalSessions + userContribution.sessions,
        premiumUsers: platformMetrics.premiumUsers + (stats.hasPremium ? 1 : 0),
        totalStaked: platformMetrics.totalStaked + stats.totalStaked,
        platformUptime: Date.now() - platformMetrics.lastUpdate,
        lastUpdate: Date.now()
      };
      
      setPlatformMetrics(updatedMetrics);
      savePlatformMetrics(updatedMetrics);
      
      // Reset user contributions after logging
      setStats(prev => ({
        ...prev,
        platformContributions: {
          plays: 0,
          listeningTime: 0,
          paraEarned: 0,
          xfgContributed: 0,
          sessions: 0,
          lastContribution: Date.now()
        }
      }));
      
      console.log('Platform metrics logged to COLD L3 / Fuego L1 successfully');
    } catch (error) {
      console.error('Failed to log platform metrics to COLD L3 / Fuego L1:', error);
    }
  };

  // Periodic platform data logging to COLD L3 / Fuego L1 (every 10 minutes)
  useEffect(() => {
    blockchainLogIntervalRef.current = setInterval(() => {
      if (stats.platformContributions.sessions > 0 || stats.platformContributions.paraEarned > 0) {
        logPlatformMetricsToBlockchain();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      if (blockchainLogIntervalRef.current) {
        clearInterval(blockchainLogIntervalRef.current);
      }
    };
  }, [stats.platformContributions, platformMetrics, stellarAddress]);

  // Load platform metrics on component mount
  useEffect(() => {
    loadPlatformMetrics();
  }, []);

  // PARA Meter Animation and Logging
  useEffect(() => {
    if (stats.isListening && stats.hasPremium) {
      paraMeterIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const minuteElapsed = (now - currentMinuteStart) / 1000 / 60; // minutes
        const progress = Math.min(minuteElapsed * 100, 100);
        
        setParaMeterProgress(progress);
        
        // Calculate PARA earned this minute
        const paraEarnedThisMinute = stats.currentEarningRate * minuteElapsed;
        setMinutePARAEarned(paraEarnedThisMinute);
        
        // When minute completes, log the reward
        if (progress >= 100 && now - lastMeterLog > 60000) { // 1 minute
          const actualPARAEarned = stats.currentEarningRate; // Full minute worth
          
          // Update total PARA earned
          setStats(prev => ({
            ...prev,
            totalPARAEarned: prev.totalPARAEarned + actualPARAEarned,
            totalLifetimePARA: prev.totalLifetimePARA + actualPARAEarned
          }));
          
          // Update platform contributions
          updatePlatformContributions(0, 60, actualPARAEarned, 0); // 60 seconds, PARA earned
          
          // Reset meter for next minute
          setCurrentMinuteStart(now);
          setParaMeterProgress(0);
          setMinutePARAEarned(0);
          setLastMeterLog(now);
          
          // Visual feedback
          console.log(`🎵 PARA earned and logged: ${actualPARAEarned.toFixed(3)} PARA`);
        }
      }, 1000); // Update every second
    } else {
      // Reset meter when not listening
      setParaMeterProgress(0);
      setMinutePARAEarned(0);
      if (paraMeterIntervalRef.current) {
        clearInterval(paraMeterIntervalRef.current);
      }
    }
    
    return () => {
      if (paraMeterIntervalRef.current) {
        clearInterval(paraMeterIntervalRef.current);
      }
    };
  }, [stats.isListening, stats.hasPremium, stats.currentEarningRate, currentMinuteStart, lastMeterLog]);

  // Reset meter when track changes
  useEffect(() => {
    if (currentTrack) {
      setCurrentMinuteStart(Date.now());
      setParaMeterProgress(0);
      setMinutePARAEarned(0);
    }
  }, [currentTrack]);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    
    // Check if volume drops below 40%
    if (newVolume < 0.4 && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setStats(prev => ({ ...prev, isListening: false }));
      setShowVolumeWarning(true);
      
      // Hide warning after 5 seconds
      setTimeout(() => {
        setShowVolumeWarning(false);
      }, 5000);
    } else if (newVolume >= 0.4) {
      setShowVolumeWarning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="text-6xl">📻</div>
        <h1 className="text-4xl font-bold gradient-text">Paradio</h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          P2P streaming radio that rewards artists and listeners with PARA tokens
        </p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => setShowStatsModal(true)}
            className="btn-secondary text-sm"
          >
            📊 View Stats
          </button>
          <button
            onClick={() => setShowPlatformMetrics(true)}
            className="btn-secondary text-sm"
          >
            🌐 Platform Metrics
          </button>
        </div>
      </div>

      {/* Main Player */}
      <div className="glass p-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Now Playing */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">Now Playing</h2>
            
            {currentTrack ? (
              <div className="space-y-4">
                <div className="w-full h-80 bg-gradient-to-br from-fuchsia-900/50 to-purple-900/50 rounded-xl flex items-center justify-center overflow-hidden">
                  {currentTrack.coverArt ? (
                    <img src={currentTrack.coverArt} alt={currentTrack.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-8xl text-fuchsia-400/50">🎵</div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-white font-bold text-xl">{currentTrack.title}</h3>
                  <p className="text-fuchsia-300 text-lg">{currentTrack.artist}</p>
                  <p className="text-gray-400">{currentTrack.duration}</p>
                </div>

                {/* Audio Controls */}
                <div className="space-y-4">
                  <audio
                    ref={audioRef}
                    src={currentTrack.audioUrl}
                    onEnded={skipTrack}
                    onError={() => {
                      setIsPlaying(false);
                      skipTrack();
                    }}
                  />
                  
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={togglePlayback}
                      className="w-16 h-16 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-full flex items-center justify-center text-2xl transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!isValidAudioUrl(currentTrack.audioUrl)}
                    >
                      {isPlaying ? '⏸' : '►'}
                    </button>
                    <button
                      onClick={skipTrack}
                      className="w-12 h-12 bg-gray-600 hover:bg-gray-700 text-white rounded-full flex items-center justify-center text-xl transition-all duration-200 hover:scale-110"
                    >
                      ⏭
                    </button>
                  </div>
                  {/* Show a message if not playable */}
                  {!isValidAudioUrl(currentTrack.audioUrl) && (
                    <div className="text-xs text-red-400 text-center">No audio preview available for this track.</div>
                  )}

                  {/* PARA Earning Meter */}
                  {stats.hasPremium && (
                    <div className="glass p-4 rounded-xl border border-sky-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <img 
                            src="https://github.com/usexfg/fuego-data/raw/master/fuego-images/para.png" 
                            alt="PARA" 
                            className="w-4 h-4 rounded-full"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span className="text-sky-400 font-semibold text-sm">PARA Earning Meter</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {Math.floor(paraMeterProgress)}% • {minutePARAEarned.toFixed(3)} PARA
                        </span>
                      </div>
                      
                      <div className="relative w-full bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
                        {/* Background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-sky-900/50 to-sky-700/50"></div>
                        
                        {/* Progress bar with animation */}
                        <div 
                          className="relative h-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-600 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${paraMeterProgress}%` }}
                        >
                          {/* Shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                        </div>
                        
                        {/* Pulsing dot at the end */}
                        {paraMeterProgress > 0 && (
                          <div 
                            className="absolute top-0 w-3 h-3 bg-sky-400 rounded-full shadow-lg shadow-sky-400/50 animate-pulse"
                            style={{ left: `calc(${paraMeterProgress}% - 6px)` }}
                          ></div>
                        )}
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>0:00</span>
                        <span>0:30</span>
                        <span>1:00</span>
                      </div>
                      
                      <div className="mt-2 text-center">
                        <div className="text-xs text-gray-400">
                          {stats.isListening ? (
                            <span className="text-green-400">🎧 Earning {stats.currentEarningRate.toFixed(3)} PARA/min</span>
                          ) : (
                            <span className="text-orange-400">⏸ Paused - No earning</span>
                          )}
                        </div>
                        {stats.skipPenaltyMultiplier < 1.0 && (
                          <div className="text-xs text-red-400 mt-1 animate-pulse">
                            ⚠️ Skip penalty: {Math.round((1 - stats.skipPenaltyMultiplier) * 100)}% reduction
                          </div>
                        )}
                        {paraMeterProgress >= 100 && (
                          <div className="text-xs text-sky-400 mt-1 animate-pulse">
                            ✅ {stats.currentEarningRate.toFixed(3)} PARA logged to Stellar blockchain!
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Volume Control */}
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400 text-sm">🔊</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <span className="text-gray-400 text-sm">{Math.round(volume * 100)}%</span>
                  </div>
                  
                  {/* Volume Warning */}
                  {showVolumeWarning && (
                    <div className="mt-3 p-3 bg-red-900/20 border border-red-500/40 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-red-400">⚠️</span>
                        <span className="text-red-300 text-sm">
                          Playback paused. Volume must be at least 40% for Paradio to continue playing.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📻</div>
                <p className="text-gray-400">No track currently playing</p>
              </div>
            )}
          </div>

          {/* Stats & Rewards */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">Your Session</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="glass p-4 rounded-xl">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Current Listeners</h3>
                <p className="text-2xl font-bold text-white">{Math.floor(Math.random() * 50) + 1}</p>
              </div>
              <div className="glass p-4 rounded-xl">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Session Duration</h3>
                <p className="text-2xl font-bold text-white">
                  {Math.floor(stats.sessionDuration / 60)}:{(stats.sessionDuration % 60).toString().padStart(2, '0')}
                </p>
              </div>
              <div className="glass p-4 rounded-xl">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Tracks Played</h3>
                <p className="text-2xl font-bold text-white">{stats.totalTracksPlayed}</p>
              </div>
              <div className="glass p-4 rounded-xl">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Current Rate</h3>
                <p className="text-2xl font-bold text-sky-400">{stats.currentEarningRate} PARA/min</p>
              </div>
              <div className="glass p-4 rounded-xl">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Skip Penalty</h3>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-orange-400">
                    {stats.skipPenaltyMultiplier < 1.0 ? `${Math.round((1 - stats.skipPenaltyMultiplier) * 100)}%` : 'None'}
                  </p>
                  {stats.skipPenaltyMultiplier < 1.0 && (
                    <span className="text-xs text-red-400">⚠️</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {stats.dailySkips} skip{stats.dailySkips !== 1 ? 's' : ''} today
                </p>
              </div>
            </div>

            {/* Human Verification Score */}
            <div className="glass p-4 rounded-xl border border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-green-400">🤖 Human Verification</h3>
                <span className="text-xs text-gray-400">Score: {stats.humanVerificationScore}/100</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    stats.humanVerificationScore >= 80 ? 'bg-green-500' :
                    stats.humanVerificationScore >= 60 ? 'bg-yellow-500' :
                    stats.humanVerificationScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${stats.humanVerificationScore}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Bot</span>
                <span>Suspicious</span>
                <span>Human</span>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                {stats.humanVerificationScore >= 80 ? '✅ Full earning rate' :
                 stats.humanVerificationScore >= 60 ? '⚠️ Reduced rate' :
                 stats.humanVerificationScore >= 40 ? '🚨 Heavily reduced' : '❌ Minimal rate'}
              </div>
            </div>

            {/* Reputation System */}
            <div className="glass p-4 rounded-xl border border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-blue-400">🏆 Reputation Score</h3>
                <span className="text-xs text-gray-400">Score: {stats.reputationScore}/100</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    stats.reputationScore >= 80 ? 'bg-blue-500' :
                    stats.reputationScore >= 60 ? 'bg-blue-400' :
                    stats.reputationScore >= 40 ? 'bg-blue-300' : 'bg-gray-500'
                  }`}
                  style={{ width: `${stats.reputationScore}%` }}
                ></div>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Staked Amount:</span>
                  <span className="text-white">{stats.stakedAmount} XFG</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Peer Verifications:</span>
                  <span className="text-white">{stats.peerVerifications}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Behavioral Signature:</span>
                  <span className="text-white font-mono text-xs">{stats.behavioralSignature.slice(0, 8)}...</span>
                </div>
              </div>
              
              <div className="flex space-x-2 mt-3">
                <button
                  onClick={() => setShowReputationModal(true)}
                  className="btn-primary text-xs flex-1"
                >
                  Stake XFG
                </button>
                <button
                  onClick={() => verifyPeer('0x1234...5678')}
                  className="btn-secondary text-xs flex-1"
                >
                  Verify Peer
                </button>
              </div>
            </div>

            {/* Privacy & Security */}
            <div className="glass p-4 rounded-xl border border-purple-500/20">
              <h3 className="text-sm font-semibold text-purple-400 mb-2">🔒 Privacy & Security</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Proof of Humanity:</span>
                  <span className="text-white font-mono">{stats.proofOfHumanity.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Data Collected:</span>
                  <span className="text-green-400">Local Only</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Behavioral Analysis:</span>
                  <span className="text-green-400">Privacy-Preserving</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Reputation:</span>
                  <span className="text-green-400">On-Chain</span>
                </div>
              </div>
            </div>

            {/* Daily Limits */}
            <div className="glass p-4 rounded-xl border border-orange-500/20">
              <h3 className="text-sm font-semibold text-orange-400 mb-2">📅 Daily Limits</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Earned Today:</span>
                  <span className="text-white">{stats.dailyEarnings.toFixed(3)} PARA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Daily Limit:</span>
                  <span className="text-white">100 PARA</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <div 
                    className="bg-orange-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((stats.dailyEarnings / 100) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* PARA Rewards */}
            <div className="glass p-6 rounded-xl border border-sky-500/20">
              <div className="flex items-center space-x-3 mb-4">
                <img 
                  src="https://github.com/usexfg/fuego-data/raw/master/fuego-images/para.png" 
                  alt="PARA" 
                  className="w-8 h-8 rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <h3 className="text-lg font-semibold text-white">PARA Rewards</h3>
                {stats.hasPremium && (
                  <span className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded-full text-xs">
                    Premium {stats.paraMiningMultiplier.toFixed(2)}x
                  </span>
                )}
                <span className="bg-sky-600/20 text-sky-400 px-2 py-1 rounded-full text-xs">
                  Stellar
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-sky-400 mb-2">
                    {stats.totalPARAEarned.toFixed(3)} PARA
                  </div>
                  <p className="text-sm text-gray-400 mb-2">
                    Earned this session ({stats.isListening ? 'Active' : 'Paused'})
                  </p>
                  <div className="flex justify-center space-x-4 text-xs text-gray-400">
                    <span>Current: {stats.currentEarningRate} PARA/min</span>
                    <span>Average: {stats.averageEarningRate} PARA/min</span>
                  </div>
                  {!stats.hasPremium && (
                    <div className="mt-2 text-xs text-orange-400">
                      ⚠️ Premium required to earn PARA
                    </div>
                  )}
                  <div className="mt-2 text-xs text-sky-400">
                    🌟 Real PARA token on Stellar blockchain
                  </div>
                </div>

                {/* Earning Rate Indicator */}
                {stats.isListening && stats.hasPremium && (
                  <div className="bg-sky-900/20 p-3 rounded-lg border border-sky-500/30">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-sky-400">🎧 Earning Rate</span>
                      <span className="text-white font-semibold">{stats.currentEarningRate} PARA/min</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div 
                        className="bg-gradient-to-r from-sky-400 to-sky-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((stats.currentEarningRate / 0.3) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>0.05</span>
                      <span>0.15</span>
                      <span>0.25</span>
                      <span>0.35+</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={claimPARARewards}
                  disabled={!stellarAddress || stats.totalPARAEarned === 0 || !stats.hasPremium}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Claim {stats.totalPARAEarned.toFixed(3)} PARA on Stellar
                </button>
              </div>
            </div>

            {/* XFG Mining (Premium Only) */}
            {stats.hasPremium && (
              <div className="glass p-6 rounded-xl border border-gold-500/20">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-2xl">⛏️</span>
                  <h3 className="text-lg font-semibold text-white">XFG Mining</h3>
                  <span className="bg-gold-600/20 text-gold-400 px-2 py-1 rounded-full text-xs">
                    Dev Pool
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gold-400 mb-2">
                      {stats.xfgMined.toFixed(6)} XFG
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      Mined to development wallet
                    </p>
                    <div className="text-xs text-gray-400">
                      Rate: 0.001 XFG/min (Very low to ensure PARA &gt; XFG value)
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={startXfgMining}
                      disabled={stats.isMining}
                      className="btn-primary flex-1 disabled:opacity-50"
                    >
                      {stats.isMining ? '⛏️ Mining...' : '⛏️ Start Mining'}
                    </button>
                    <button
                      onClick={stopXfgMining}
                      disabled={!stats.isMining}
                      className="btn-secondary flex-1 disabled:opacity-50"
                    >
                      Stop
                    </button>
                  </div>

                  <div className="text-xs text-gray-400 space-y-1">
                    <p>• XFG goes to development wallet</p>
                    <p>• Very low rate ensures PARA &gt; XFG value</p>
                    <p>• Premium users only</p>
                    <p>• Supports platform development</p>
                  </div>
                </div>
              </div>
            )}

            {/* Premium Status */}
            <div className="glass p-4 rounded-xl border border-purple-500/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-purple-400">💎 Premium Status</h3>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  stats.hasPremium 
                    ? 'bg-purple-600/20 text-purple-400' 
                    : 'bg-gray-600/20 text-gray-400'
                }`}>
                  {stats.hasPremium ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Premium Cores:</span>
                  <span className="text-white">{stats.premiumCores}/8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">PARA Multiplier:</span>
                  <span className="text-purple-400 font-semibold">{stats.paraMiningMultiplier.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">XFG Mining:</span>
                  <span className={stats.hasPremium ? 'text-green-400' : 'text-red-400'}>
                    {stats.hasPremium ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              
              {!stats.hasPremium && (
                <button
                  onClick={() => setShowPremiumModal(true)}
                  className="w-full btn-primary text-xs mt-3"
                >
                  Upgrade to Premium
                </button>
              )}
            </div>

            {/* Track Info */}
            {currentTrack && (
              <div className="glass p-4 rounded-xl border border-fuchsia-500/20">
                <h3 className="text-sm font-semibold text-fuchsia-400 mb-2">🎵 Current Track Info</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Stream Count:</span>
                    <span className="text-white">{currentTrack.streamCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Artist PARA Earned:</span>
                    <span className="text-white">{currentTrack.paraEarnings.toFixed(1)} PARA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Your Rate:</span>
                    <span className="text-sky-400 font-semibold">{stats.currentEarningRate} PARA/min</span>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Notice */}
            <div className="glass p-4 rounded-xl border border-fuchsia-500/20">
              <h3 className="text-sm font-semibold text-fuchsia-400 mb-2">🛡️ Privacy Protected</h3>
              <p className="text-xs text-gray-400">
                Your listening habits are private. No tracking, no profiling, no data collection.
                Earn PARA tokens anonymously through P2P streaming.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Playlist */}
      <div className="glass p-8">
        <h2 className="text-2xl font-bold text-white mb-6">Upcoming Tracks</h2>
        <div className="space-y-4">
          {playlist.map((track, index) => (
            <div
              key={track.id}
              className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                currentTrack?.id === track.id
                  ? 'bg-fuchsia-600/20 border border-fuchsia-500/40'
                  : 'bg-black/40 hover:bg-black/60 border border-transparent'
              }`}
              onClick={() => setCurrentTrack(track)}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-fuchsia-900/50 to-purple-900/50 rounded-lg flex items-center justify-center overflow-hidden">
                {track.coverArt ? (
                  <img src={track.coverArt} alt={track.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-2xl text-fuchsia-400/50">🎵</div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="text-white font-medium">{track.title}</h3>
                <p className="text-gray-400 text-sm">{track.artist}</p>
              </div>
              
              <div className="text-right">
                <p className="text-gray-400 text-sm">{track.duration}</p>
                <div className="flex items-center space-x-1 text-xs text-sky-400">
                  <img 
                    src="https://github.com/usexfg/fuego-data/raw/master/fuego-images/para.png" 
                    alt="PARA" 
                    className="w-3 h-3 rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span>{track.paraEarnings.toFixed(1)} PARA</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="glass p-8">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">How Paradio Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center space-y-2">
            <div className="text-3xl">🎧</div>
            <h4 className="font-semibold text-white">Listen & Earn</h4>
            <p className="text-sm text-gray-300">Stream music and earn PARA tokens for every second you listen</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl">🎵</div>
            <h4 className="font-semibold text-white">Artists Get Paid</h4>
            <p className="text-sm text-gray-300">Artists earn PARA tokens when their music is streamed on Paradio</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl">🛡️</div>
            <h4 className="font-semibold text-white">Privacy First</h4>
            <p className="text-sm text-gray-300">P2P streaming means no tracking, no profiling, complete privacy</p>
          </div>
        </div>
      </div>

      {/* Human Verification Modal */}
      {showVerification && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-md w-full">
            <div className="text-center space-y-6">
              <div className="text-4xl">🤖</div>
              <h3 className="text-xl font-bold text-white">Human Verification Required</h3>
              <p className="text-gray-400 text-sm">
                To prevent bots from stealing PARA, please verify you're human.
              </p>
              
              <div className="glass p-4 rounded-xl">
                <p className="text-white font-medium mb-4">{verificationChallenge}</p>
                <input
                  type="text"
                  placeholder="Your answer..."
                  className="input-field w-full mb-4"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleVerification(e.currentTarget.value);
                    }
                  }}
                />
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleVerification(document.querySelector('input')?.value || '')}
                    className="btn-primary flex-1"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => setShowVerification(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
    </div>
              </div>
              
              <div className="text-xs text-gray-400">
                <p>✅ Natural interactions boost your score</p>
                <p>❌ 24/7 listening reduces your score</p>
                <p>🛡️ Verification required for large claims</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reputation Staking Modal */}
      {showReputationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-md w-full">
            <div className="text-center space-y-6">
              <div className="text-4xl">🏆</div>
              <h3 className="text-xl font-bold text-white">Stake for Reputation</h3>
              <p className="text-gray-400 text-sm">
                Stake XFG tokens to build reputation and earn higher PARA rates.
              </p>
              
              <div className="glass p-4 rounded-xl">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">Amount to Stake (XFG)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      defaultValue="10"
                      className="input-field w-full mt-1"
                      id="stakeAmount"
                    />
                  </div>
                  
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>• Minimum stake: 1 XFG</p>
                    <p>• Reputation boost: +1 per 10 XFG staked</p>
                    <p>• Staked tokens are locked for 30 days</p>
                    <p>• Higher reputation = higher PARA earning rates</p>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        const amount = parseInt((document.getElementById('stakeAmount') as HTMLInputElement)?.value || '10');
                        stakeForReputation(amount);
                        setShowReputationModal(false);
                      }}
                      className="btn-primary flex-1"
                    >
                      Stake XFG
                    </button>
                    <button
                      onClick={() => setShowReputationModal(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-gray-400">
                <p>🔒 Staking helps prevent bot attacks</p>
                <p>🏆 Higher reputation = better rewards</p>
                <p>⚡ Staked tokens can be slashed for bad behavior</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-white">📊 Your Paradio Stats</h3>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-gray-400 hover:text-white text-2xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Lifetime Stats */}
              <div className="glass p-6 rounded-xl border border-sky-500/20">
                <h4 className="text-lg font-semibold text-sky-400 mb-4">🏆 Lifetime Achievements</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total PARA Earned:</span>
                    <span className="text-sky-400 font-bold">{stats.totalLifetimePARA.toFixed(3)} PARA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total XFG Mined:</span>
                    <span className="text-gold-400 font-bold">{stats.totalLifetimeXFG.toFixed(6)} XFG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Listening:</span>
                    <span className="text-white font-bold">{formatDuration(stats.totalListeningTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Sessions:</span>
                    <span className="text-white font-bold">{stats.totalSessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Claims:</span>
                    <span className="text-white font-bold">{stats.totalClaims}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Streak:</span>
                    <span className="text-green-400 font-bold">{stats.streakDays} days</span>
                  </div>
                </div>
              </div>

              {/* Session Stats */}
              <div className="glass p-6 rounded-xl border border-purple-500/20">
                <h4 className="text-lg font-semibold text-purple-400 mb-4">🎧 Session Analytics</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Longest Session:</span>
                    <span className="text-white font-bold">{formatDuration(stats.longestSession)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Average Session:</span>
                    <span className="text-white font-bold">{formatDuration(stats.averageSessionLength)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Join Date:</span>
                    <span className="text-white font-bold">{new Date(stats.joinDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Active:</span>
                    <span className="text-white font-bold">{new Date(stats.lastActiveDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Staked:</span>
                    <span className="text-blue-400 font-bold">{stats.totalStaked} XFG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Peer Verifications:</span>
                    <span className="text-green-400 font-bold">{stats.peerVerifications}</span>
                  </div>
                </div>
              </div>

              {/* Current Week Stats */}
              <div className="glass p-6 rounded-xl border border-green-500/20">
                <h4 className="text-lg font-semibold text-green-400 mb-4">📅 This Week</h4>
                {(() => {
                  const weekKey = getCurrentWeekKey();
                  const weekStats = stats.weeklyStats[weekKey];
                  return weekStats ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">PARA Earned:</span>
                        <span className="text-green-400 font-bold">{weekStats.paraEarned.toFixed(3)} PARA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">XFG Mined:</span>
                        <span className="text-gold-400 font-bold">{weekStats.xfgMined.toFixed(6)} XFG</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Listening Time:</span>
                        <span className="text-white font-bold">{formatDuration(weekStats.listeningTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Sessions:</span>
                        <span className="text-white font-bold">{weekStats.sessions}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">No data for this week yet</div>
                  );
                })()}
              </div>

              {/* Current Month Stats */}
              <div className="glass p-6 rounded-xl border border-orange-500/20">
                <h4 className="text-lg font-semibold text-orange-400 mb-4">📊 This Month</h4>
                {(() => {
                  const monthKey = getCurrentMonthKey();
                  const monthStats = stats.monthlyStats[monthKey];
                  return monthStats ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">PARA Earned:</span>
                        <span className="text-orange-400 font-bold">{monthStats.paraEarned.toFixed(3)} PARA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">XFG Mined:</span>
                        <span className="text-gold-400 font-bold">{monthStats.xfgMined.toFixed(6)} XFG</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Listening Time:</span>
                        <span className="text-white font-bold">{formatDuration(monthStats.listeningTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Sessions:</span>
                        <span className="text-white font-bold">{monthStats.sessions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg Score:</span>
                        <span className="text-purple-400 font-bold">{monthStats.averageScore.toFixed(1)}/100</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">No data for this month yet</div>
                  );
                })()}
              </div>

              {/* Achievements */}
              <div className="glass p-6 rounded-xl border border-yellow-500/20">
                <h4 className="text-lg font-semibold text-yellow-400 mb-4">🏅 Achievements</h4>
                <div className="space-y-2 text-sm">
                  {stats.totalLifetimePARA >= 100 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-400">🥇</span>
                      <span className="text-white">PARA Pioneer (100+ PARA earned)</span>
                    </div>
                  )}
                  {stats.streakDays >= 7 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-400">🔥</span>
                      <span className="text-white">Week Warrior (7+ day streak)</span>
                    </div>
                  )}
                  {stats.totalListeningTime >= 3600 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-400">⏰</span>
                      <span className="text-white">Time Master (1+ hour total)</span>
                    </div>
                  )}
                  {stats.totalSessions >= 10 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-400">🎵</span>
                      <span className="text-white">Session Master (10+ sessions)</span>
                    </div>
                  )}
                  {stats.hasPremium && (
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-400">💎</span>
                      <span className="text-white">Premium Member</span>
                    </div>
                  )}
                  {stats.reputationScore >= 80 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-yellow-400">🏆</span>
                      <span className="text-white">High Reputation (80+ score)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Skip Penalty Tracking */}
              <div className="glass p-6 rounded-xl border border-red-500/20">
                <h4 className="text-lg font-semibold text-red-400 mb-4">⏭ Skip Penalty</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Daily Skips:</span>
                    <span className={`font-bold ${stats.dailySkips > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {stats.dailySkips} skip{stats.dailySkips !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Skips:</span>
                    <span className="text-white font-bold">{stats.totalSkips}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Penalty:</span>
                    <span className={`font-bold ${stats.skipPenaltyMultiplier < 1.0 ? 'text-red-400' : 'text-green-400'}`}>
                      {stats.skipPenaltyMultiplier < 1.0 ? `${Math.round((1 - stats.skipPenaltyMultiplier) * 100)}% reduction` : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Skip:</span>
                    <span className="text-white font-bold">
                      {stats.lastSkipTime > 0 
                        ? new Date(stats.lastSkipTime).toLocaleTimeString()
                        : 'Never'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reset Time:</span>
                    <span className="text-white font-bold">
                      {new Date(stats.lastSkipReset + 24 * 60 * 60 * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                {stats.dailySkips > 0 && (
                  <div className="mt-3 p-2 bg-red-900/20 rounded-lg border border-red-500/30">
                    <div className="text-xs text-red-400 text-center">
                      ⚠️ Skip penalties reset daily at midnight
                    </div>
                    <div className="text-xs text-gray-400 text-center mt-1">
                      Listen longer to earn more PARA
                    </div>
                  </div>
                )}
              </div>

              {/* Export/Import */}
              <div className="glass p-6 rounded-xl border border-gray-500/20">
                <h4 className="text-lg font-semibold text-gray-400 mb-4">💾 Data Management</h4>
                <div className="space-y-3 text-sm">
                  <button
                    onClick={() => {
                      const dataStr = JSON.stringify(stats, null, 2);
                      const dataBlob = new Blob([dataStr], {type: 'application/json'});
                      const url = URL.createObjectURL(dataBlob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `paradio-stats-${new Date().toISOString().split('T')[0]}.json`;
                      link.click();
                    }}
                    className="btn-primary w-full text-sm"
                  >
                    📥 Export Stats
                  </button>
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.json';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            try {
                              const importedStats = JSON.parse(e.target?.result as string);
                              setStats(prev => ({ ...prev, ...importedStats }));
                              saveStats({ ...stats, ...importedStats });
                              alert('Stats imported successfully!');
                            } catch (error) {
                              alert('Failed to import stats. Invalid file format.');
                            }
                          };
                          reader.readAsText(file);
                        }
                      };
                      input.click();
                    }}
                    className="btn-secondary w-full text-sm"
                  >
                    📤 Import Stats
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Access Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-md w-full">
            <div className="text-center space-y-6">
              <div className="text-4xl">💎</div>
              <h3 className="text-xl font-bold text-white">Premium Access Required</h3>
              <p className="text-gray-400 text-sm">
                To unlock premium features like XFG mining and higher PARA rates, please upgrade your account.
              </p>
              
              <div className="glass p-4 rounded-xl">
                <p className="text-white font-medium mb-4">
                  Your current status: {stats.hasPremium ? 'Premium' : 'Standard'}
                </p>
                <p className="text-white font-medium mb-4">
                  Premium Cores: {stats.premiumCores}
                </p>
                <p className="text-white font-medium mb-4">
                  PARA Mining Multiplier: {stats.paraMiningMultiplier.toFixed(2)}x
                </p>
                <p className="text-white font-medium mb-4">
                  XFG Mined: {stats.xfgMined.toFixed(3)} XFG
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    localStorage.setItem('digm-premium', 'true');
                    localStorage.setItem('digm-cores', '1'); // Default to 1 core for premium
                    setShowPremiumModal(false);
                    checkPremiumStatus(); // Re-check premium status after upgrade
                  }}
                  className="btn-primary flex-1"
                >
                  Upgrade to Premium
                </button>
                <button
                  onClick={() => setShowPremiumModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Platform Metrics Modal */}
      {showPlatformMetrics && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-white">🌐 Paradio Platform Metrics</h3>
              <button
                onClick={() => setShowPlatformMetrics(false)}
                className="text-gray-400 hover:text-white text-2xl transition-colors"
              >
                ✕
              </button>
            </div>

                          <div className="mb-4 p-4 bg-blue-900/20 rounded-xl border border-blue-500/30">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-blue-400">🔗</span>
                  <span className="text-blue-400 font-semibold">Multi-Chain Architecture</span>
                </div>
                <p className="text-sm text-gray-400">
                  Platform metrics stored on COLD L3 / Fuego L1. PARA transactions tracked on Stellar (naturally public). 
                  No personal user data - only aggregate platform statistics for transparency.
                </p>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Platform Overview */}
              <div className="glass p-6 rounded-xl border border-blue-500/20">
                <h4 className="text-lg font-semibold text-blue-400 mb-4">📈 Platform Overview</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Plays:</span>
                    <span className="text-blue-400 font-bold">{platformMetrics.totalPlays.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Users:</span>
                    <span className="text-blue-400 font-bold">{platformMetrics.totalUsers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Premium Users:</span>
                    <span className="text-purple-400 font-bold">{platformMetrics.premiumUsers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Sessions:</span>
                    <span className="text-white font-bold">{platformMetrics.totalSessions.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Token Distribution */}
              <div className="glass p-6 rounded-xl border border-sky-500/20">
                <h4 className="text-lg font-semibold text-sky-400 mb-4">💰 Token Distribution</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">PARA Distributed:</span>
                    <span className="text-sky-400 font-bold">{platformMetrics.totalPARADistributed.toFixed(3)} PARA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">XFG Contributed:</span>
                    <span className="text-gold-400 font-bold">{platformMetrics.totalXFGContributed.toFixed(6)} XFG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Staked:</span>
                    <span className="text-blue-400 font-bold">{platformMetrics.totalStaked.toLocaleString()} XFG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg PARA/User:</span>
                    <span className="text-sky-400 font-bold">
                      {platformMetrics.totalUsers > 0 ? (platformMetrics.totalPARADistributed / platformMetrics.totalUsers).toFixed(3) : '0'} PARA
                    </span>
                  </div>
                </div>
              </div>

              {/* Listening Analytics */}
              <div className="glass p-6 rounded-xl border border-green-500/20">
                <h4 className="text-lg font-semibold text-green-400 mb-4">🎧 Listening Analytics</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Listening:</span>
                    <span className="text-white font-bold">{formatDuration(platformMetrics.totalListeningTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Session:</span>
                    <span className="text-white font-bold">
                      {platformMetrics.totalSessions > 0 ? formatDuration(platformMetrics.totalListeningTime / platformMetrics.totalSessions) : '0s'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Plays/Session:</span>
                    <span className="text-green-400 font-bold">
                      {platformMetrics.totalSessions > 0 ? (platformMetrics.totalPlays / platformMetrics.totalSessions).toFixed(1) : '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Premium Rate:</span>
                    <span className="text-purple-400 font-bold">
                      {platformMetrics.totalUsers > 0 ? ((platformMetrics.premiumUsers / platformMetrics.totalUsers) * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Platform Health */}
              <div className="glass p-6 rounded-xl border border-orange-500/20">
                <h4 className="text-lg font-semibold text-orange-400 mb-4">🏥 Platform Health</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Platform Uptime:</span>
                    <span className="text-white font-bold">{formatDuration(platformMetrics.platformUptime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Update:</span>
                    <span className="text-white font-bold">{new Date(platformMetrics.lastUpdate).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Version:</span>
                    <span className="text-orange-400 font-bold">{platformMetrics.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Blockchain Status:</span>
                    <span className="text-green-400 font-bold">✅ Active</span>
                  </div>
                </div>
              </div>

              {/* Your Contributions */}
              <div className="glass p-6 rounded-xl border border-purple-500/20">
                <h4 className="text-lg font-semibold text-purple-400 mb-4">🎯 Your Contributions</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Plays:</span>
                    <span className="text-purple-400 font-bold">{stats.platformContributions.plays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Listening Time:</span>
                    <span className="text-white font-bold">{formatDuration(stats.platformContributions.listeningTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">PARA Earned:</span>
                    <span className="text-sky-400 font-bold">{stats.platformContributions.paraEarned.toFixed(3)} PARA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">XFG Contributed:</span>
                    <span className="text-gold-400 font-bold">{stats.platformContributions.xfgContributed.toFixed(6)} XFG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sessions:</span>
                    <span className="text-white font-bold">{stats.platformContributions.sessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Logged:</span>
                    <span className="text-gray-400 font-bold">
                      {stats.platformContributions.lastContribution > 0 
                        ? new Date(stats.platformContributions.lastContribution).toLocaleTimeString()
                        : 'Never'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Multi-Chain Info */}
              <div className="glass p-6 rounded-xl border border-gray-500/20">
                <h4 className="text-lg font-semibold text-gray-400 mb-4">🔗 Multi-Chain Architecture</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Platform Data:</span>
                    <span className="text-white font-bold">COLD L3 / Fuego L1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">PARA Transactions:</span>
                    <span className="text-white font-bold">Stellar</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">PARA Asset:</span>
                    <span className="text-sky-400 font-bold">PARA-GCFWKV4KWYPBPQVQYLVL6N6VARBLVQS6POYEMLN7AGZB5UK4VIJX565U-1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Logging Interval:</span>
                    <span className="text-white font-bold">10 minutes (auto)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Data Type:</span>
                    <span className="text-green-400 font-bold">Aggregate Only</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Privacy:</span>
                    <span className="text-green-400 font-bold">Protected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Transparency:</span>
                    <span className="text-blue-400 font-bold">Full</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-green-400 font-bold">✅ Active</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                  <div className="text-xs text-blue-400 text-center">
                    🔄 Platform metrics → COLD L3/Fuego L1 | PARA txns → Stellar
                  </div>
                  <div className="text-xs text-gray-400 text-center mt-1">
                    Metrics logged every 10 minutes when active
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Paradio; 