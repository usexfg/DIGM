import React from 'react';
import { usePlayer } from '../context/AudioContext';

const PlayerBar: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    source,
    earnings,
    togglePlay,
    position,
    duration,
  } = usePlayer();

  if (!currentTrack || (!isPlaying && source !== 'paradio')) {
    return null;
  }

  // Formatted time for the progress bar
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-black/60 backdrop-blur-md border-t border-fuchsia-500/20 px-4 py-2 flex items-center justify-between">
        
        {/* Left: Track Info */}
        <div className="flex items-center w-1/3">
          <div className="w-10 h-10 rounded-md overflow-hidden bg-gradient-to-br from-fuchsia-600 to-purple-900 flex items-center justify-center mr-3 shrink-0">
            {currentTrack.albumArtUrl ? (
              <img src={currentTrack.albumArtUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white/50 text-xs">♪</span>
            )}
          </div>
          <div className="overflow-hidden">
            <div className="text-white text-sm font-semibold truncate">
              {source === 'paradio' ? 'ParaDio Live' : currentTrack.title}
            </div>
            <div className="text-slate-400 text-xs truncate">
              {currentTrack.artist}
            </div>
          </div>
        </div>

        {/* Center: Controls / Progress */}
        <div className="flex flex-col items-center w-1/3">
          {source === 'paradio' ? (
            <div className="flex items-center gap-3">
               <div className="flex gap-0.5 items-end h-3">
                 {[0.2, 0.5, 0.8, 0.4, 0.6].map((h, i) => (
                   <div 
                     key={i} 
                     className="w-0.5 bg-fuchsia-500 rounded-full" 
                     style={{ 
                       height: isPlaying ? `${h * 100}%` : '20%',
                       transition: 'height 0.2s ease-in-out' 
                     }} 
                   />
                 ))}
               </div>
               <span className="text-fuchsia-500 text-xs font-bold uppercase tracking-wider">Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button 
                onClick={togglePlay}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-fuchsia-600 text-white hover:bg-fuchsia-500 transition-colors"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[10px] font-mono">{formatTime(position)}</span>
                <div className="w-24 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-fuchsia-500 transition-all duration-300" 
                    style={{ width: `${(position / (duration || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-slate-400 text-[10px] font-mono">{formatTime(duration)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Earnings / Volume */}
        <div className="flex items-center justify-end w-1/3 gap-4">
          {source === 'paradio' && (
            <div className="flex items-center gap-2">
              <span className="text-fuchsia-500 text-xs font-bold">
                {earnings.toFixed(3)}
              </span>
              <span className="text-slate-500 text-[10px] uppercase">PARA</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-xs">🔊</span>
            <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
               <div className="h-full bg-slate-400" style={{ width: '80%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;
