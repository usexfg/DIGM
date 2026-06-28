import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export type PlaybackSource = 'paradio' | 'preview' | 'curationStation';

export interface Track {
  id: string;
  title: string;
  artist: string;
  albumTitle?: string;
  albumId?: string;
  albumArtUrl?: string;
  url: string;
  duration?: number;
}

interface AudioContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  earnings: number;
  source: PlaybackSource;
  playTrack: (track: Track, source: PlaybackSource) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1.0);
  const [earnings, setEarnings] = useState(0.0);
  const [source, setSource] = useState<PlaybackSource>('paradio');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize the singleton audio element
    audioRef.current = new Audio();
    
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setPosition(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (source === 'preview') {
        setIsPlaying(false);
      } else {
        // For paradio, we just keep playing the same track or loop
        audio.play().catch(() => {});
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Polling for earnings (mimicking the Flutter implementation)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && source === 'paradio') {
        setEarnings(prev => prev + 0.0007); // Mock earning rate (0.042 / 60s)
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, source]);

  const playTrack = useCallback((track: Track, playbackSource: PlaybackSource) => {
    const audio = audioRef.current;
    if (!audio) return;

    setCurrentTrack(track);
    setSource(playbackSource);
    audio.src = track.url;
    audio.volume = volume;
    audio.play()
      .then(() => setIsPlaying(true))
      .catch(err => console.error('Playback failed', err));
  }, [volume]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Playback failed', err));
    }
  }, [isPlaying]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play()
      .then(() => setIsPlaying(true))
      .catch(err => console.error('Playback failed', err));
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  }, []);

  const value = {
    currentTrack,
    isPlaying,
    position,
    duration,
    volume,
    earnings,
    source,
    playTrack,
    togglePlay,
    pause,
    resume,
    seek,
    setVolume,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

export const usePlayer = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within an AudioProvider');
  }
  return context;
};
