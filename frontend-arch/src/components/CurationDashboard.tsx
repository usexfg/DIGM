import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { playlistStorage, DIGMPlaylist } from '../utils/playlistStorage';
import { formatDuration } from '../utils/fileUpload';

interface CuratorStats {
  totalReviewed: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  averageReviewTime: number;
  totalCurationHours: number;
}

interface CurationReview {
  playlistId: string;
  reviewer: string;
  status: 'approved' | 'rejected' | 'pending';
  feedback: string;
  reviewDate: number;
  curationHours?: number;
  scheduledSlots?: string[];
}

const CurationDashboard: React.FC = () => {
  const { evmAddress } = useWallet();
  const [playlists, setPlaylists] = useState<DIGMPlaylist[]>([]);
  const [pendingPlaylists, setPendingPlaylists] = useState<DIGMPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<DIGMPlaylist | null>(null);
  const [curatorStats, setCuratorStats] = useState<CuratorStats>({
    totalReviewed: 0,
    approvedCount: 0,
    rejectedCount: 0,
    pendingCount: 0,
    averageReviewTime: 0,
    totalCurationHours: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [scheduledHours, setScheduledHours] = useState(2);
  const [selectedDays, setSelectedDays] = useState<string[]>(['monday', 'wednesday', 'friday']);

  const daysOfWeek = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  // Load playlists and stats
  useEffect(() => {
    const loadCurationData = async () => {
      try {
        const allPlaylists = await playlistStorage.getAllPlaylists();
        const pending = allPlaylists.filter(p => p.status === 'submitted');
        
        setPlaylists(allPlaylists);
        setPendingPlaylists(pending);
        
        // Calculate curator stats
        const stats: CuratorStats = {
          totalReviewed: allPlaylists.filter(p => p.status !== 'submitted').length,
          approvedCount: allPlaylists.filter(p => p.status === 'approved').length,
          rejectedCount: allPlaylists.filter(p => p.status === 'rejected').length,
          pendingCount: pending.length,
          averageReviewTime: 24, // Mock data
          totalCurationHours: allPlaylists
            .filter(p => p.curationSchedule?.enabled)
            .reduce((sum, p) => sum + (p.curationSchedule?.totalHoursPerDay || 0), 0)
        };
        
        setCuratorStats(stats);
      } catch (error) {
        console.error('Error loading curation data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurationData();
  }, []);

  const handleApprovePlaylist = async () => {
    if (!selectedPlaylist || !evmAddress) return;

    try {
      const updatedPlaylist: DIGMPlaylist = {
        ...selectedPlaylist,
        status: 'approved',
        curationSchedule: {
          enabled: true,
          timeSlots: [],
          totalHoursPerDay: scheduledHours,
          daysActive: selectedDays
        },
        updatedAt: Date.now()
      };

      await playlistStorage.savePlaylist(updatedPlaylist);
      
      // Update local state
      setPlaylists(prev => prev.map(p => 
        p.id === selectedPlaylist.id ? updatedPlaylist : p
      ));
      setPendingPlaylists(prev => prev.filter(p => p.id !== selectedPlaylist.id));
      
      // Update stats
      setCuratorStats(prev => ({
        ...prev,
        totalReviewed: prev.totalReviewed + 1,
        approvedCount: prev.approvedCount + 1,
        pendingCount: prev.pendingCount - 1
      }));

      setSelectedPlaylist(null);
      setReviewFeedback('');
      alert('Playlist approved and scheduled for curation!');
    } catch (error) {
      console.error('Error approving playlist:', error);
      alert('Failed to approve playlist. Please try again.');
    }
  };

  const handleRejectPlaylist = async () => {
    if (!selectedPlaylist || !evmAddress) return;

    try {
      const updatedPlaylist: DIGMPlaylist = {
        ...selectedPlaylist,
        status: 'rejected',
        updatedAt: Date.now()
      };

      await playlistStorage.savePlaylist(updatedPlaylist);
      
      // Update local state
      setPlaylists(prev => prev.map(p => 
        p.id === selectedPlaylist.id ? updatedPlaylist : p
      ));
      setPendingPlaylists(prev => prev.filter(p => p.id !== selectedPlaylist.id));
      
      // Update stats
      setCuratorStats(prev => ({
        ...prev,
        totalReviewed: prev.totalReviewed + 1,
        rejectedCount: prev.rejectedCount + 1,
        pendingCount: prev.pendingCount - 1
      }));

      setSelectedPlaylist(null);
      setReviewFeedback('');
      alert('Playlist rejected.');
    } catch (error) {
      console.error('Error rejecting playlist:', error);
      alert('Failed to reject playlist. Please try again.');
    }
  };

  const toggleDaySelection = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const totalDuration = (tracks: any[]) => {
    return tracks.reduce((sum, track) => sum + track.duration, 0);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white">Loading curation dashboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Curation Dashboard</h1>
        <p className="text-gray-300">
          Review and manage playlists for Paradio curation stations
        </p>
      </div>

      {/* Curator Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Pending Review</h3>
          <p className="text-3xl font-bold text-yellow-400">{curatorStats.pendingCount}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Approved</h3>
          <p className="text-3xl font-bold text-green-400">{curatorStats.approvedCount}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Rejected</h3>
          <p className="text-3xl font-bold text-red-400">{curatorStats.rejectedCount}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Total Curation Hours</h3>
          <p className="text-3xl font-bold text-blue-400">{curatorStats.totalCurationHours}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Playlists */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Pending Review</h2>
            
            {pendingPlaylists.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No playlists pending review</p>
            ) : (
              <div className="space-y-4">
                {pendingPlaylists.map(playlist => (
                  <div
                    key={playlist.id}
                    className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer"
                    onClick={() => setSelectedPlaylist(playlist)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-white font-medium">{playlist.name}</h3>
                      <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                        Pending
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-3">{playlist.description}</p>
                    
                    <div className="flex gap-2 mb-3">
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                        {playlist.genre}
                      </span>
                      <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
                        {playlist.mood}
                      </span>
                      <span className="text-xs bg-gray-600 text-white px-2 py-1 rounded">
                        {playlist.tracks.length} tracks
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-300">
                      <span>Creator: {playlist.creatorType}</span>
                      <span className="mx-2">•</span>
                      <span>Duration: {formatDuration(totalDuration(playlist.tracks))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Review Panel */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Review Panel</h2>
            
            {!selectedPlaylist ? (
              <p className="text-gray-400 text-center py-8">Select a playlist to review</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{selectedPlaylist.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{selectedPlaylist.description}</p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Genre:</span>
                      <span className="text-white">{selectedPlaylist.genre}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Mood:</span>
                      <span className="text-white">{selectedPlaylist.mood}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Tracks:</span>
                      <span className="text-white">{selectedPlaylist.tracks.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Duration:</span>
                      <span className="text-white">{formatDuration(totalDuration(selectedPlaylist.tracks))}</span>
                    </div>
                  </div>
                </div>

                {selectedPlaylist.curationSchedule?.enabled && (
                  <div>
                    <h4 className="text-md font-semibold text-white mb-3">Curation Settings</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Hours per day
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={scheduledHours}
                          onChange={(e) => setScheduledHours(parseInt(e.target.value))}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Active days
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {daysOfWeek.map(day => (
                            <label key={day.key} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedDays.includes(day.key)}
                                onChange={() => toggleDaySelection(day.key)}
                                className="mr-2 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-300">{day.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Review feedback (optional)
                  </label>
                  <textarea
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                    rows={3}
                    placeholder="Add feedback for the creator..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleApprovePlaylist}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={handleRejectPlaylist}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approved Playlists */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Approved Curation Stations</h2>
        
        {playlists.filter(p => p.status === 'approved').length === 0 ? (
          <p className="text-gray-400 text-center py-8">No approved curation stations yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists
              .filter(p => p.status === 'approved')
              .map(playlist => (
                <div key={playlist.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-white font-medium">{playlist.name}</h3>
                    <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                      Active
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{playlist.description}</p>
                  
                  {playlist.curationSchedule?.enabled && (
                    <div className="text-sm text-gray-300">
                      <div>Scheduled: {playlist.curationSchedule.totalHoursPerDay}h/day</div>
                      <div>Days: {playlist.curationSchedule.daysActive.join(', ')}</div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CurationDashboard;
