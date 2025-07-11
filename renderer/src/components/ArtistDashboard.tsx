import { useState } from 'react';

interface UploadedTrack {
  id: string;
  title: string;
  duration: number;
  file: File | null;
}

interface Album {
  id: string;
  title: string;
  tracks: UploadedTrack[];
  coverArt: string;
  price: number;
  status: 'draft' | 'uploading' | 'published';
}

function ArtistDashboard() {
  const [digmBalance] = useState(100);
  const [albums, setAlbums] = useState<Album[]>([
    {
      id: '1',
      title: 'Digital Dreams',
      tracks: [
        { id: '1', title: 'Neon Lights', duration: 245, file: null },
        { id: '2', title: 'Cyber City', duration: 203, file: null },
      ],
      coverArt: '🌐',
      price: 0.005,
      status: 'published',
    },
  ]);
  const [newAlbum, setNewAlbum] = useState<Partial<Album>>({
    title: '',
    tracks: [],
    price: 0.001,
  });
  const [showUploadForm, setShowUploadForm] = useState(false);

  const addTrack = () => {
    const newTrack: UploadedTrack = {
      id: Date.now().toString(),
      title: '',
      duration: 0,
      file: null,
    };
    setNewAlbum(prev => ({
      ...prev,
      tracks: [...(prev.tracks || []), newTrack],
    }));
  };

  const updateTrack = (trackId: string, updates: Partial<UploadedTrack>) => {
    setNewAlbum(prev => ({
      ...prev,
      tracks: prev.tracks?.map(track =>
        track.id === trackId ? { ...track, ...updates } : track
      ),
    }));
  };

  const removeTrack = (trackId: string) => {
    setNewAlbum(prev => ({
      ...prev,
      tracks: prev.tracks?.filter(track => track.id !== trackId),
    }));
  };

  const publishAlbum = () => {
    if (!newAlbum.title || !newAlbum.tracks?.length) {
      alert('Please fill in album title and add at least one track');
      return;
    }

    const album: Album = {
      id: Date.now().toString(),
      title: newAlbum.title,
      tracks: newAlbum.tracks,
      coverArt: '🎵',
      price: newAlbum.price || 0.001,
      status: 'uploading',
    };

    setAlbums(prev => [...prev, album]);
    setNewAlbum({ title: '', tracks: [], price: 0.001 });
    setShowUploadForm(false);

    // Simulate upload process
    setTimeout(() => {
      setAlbums(prev => prev.map(a =>
        a.id === album.id ? { ...a, status: 'published' } : a
      ));
    }, 3000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Artist Dashboard</h2>

        {/* DIGM Status */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-lg">DIGM Hosting Rights</h3>
              <p className="text-purple-100">Required to host content on Elder Nodes</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{digmBalance}</p>
              <p className="text-purple-100 text-sm">DIGM tokens</p>
            </div>
          </div>
          <div className="mt-4 bg-white bg-opacity-20 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full"
              style={{ width: `${(digmBalance / 100000) * 100}%` }}
            ></div>
          </div>
          <p className="text-purple-100 text-sm mt-2">
            {digmBalance} / 100,000 maximum DIGM tokens
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400">Total Albums</h3>
            <p className="text-2xl font-bold">{albums.filter(a => a.status === 'published').length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400">Total Streams</h3>
            <p className="text-2xl font-bold">1,247</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400">Revenue</h3>
            <p className="text-2xl font-bold">0.234 XFG</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400">PARA Earned</h3>
            <p className="text-2xl font-bold">15,420</p>
          </div>
        </div>

        {/* Upload New Album */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Upload New Album</h3>
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium"
            >
              {showUploadForm ? 'Cancel' : 'New Album'}
            </button>
          </div>

          {showUploadForm && (
            <div className="space-y-4">
              {/* Album Title */}
              <div>
                <label className="block text-sm font-medium mb-2">Album Title</label>
                <input
                  type="text"
                  value={newAlbum.title || ''}
                  onChange={(e) => setNewAlbum(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Enter album title..."
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium mb-2">Price (XFG)</label>
                <input
                  type="number"
                  step="0.001"
                  value={newAlbum.price || 0.001}
                  onChange={(e) => setNewAlbum(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Tracks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium">Tracks</label>
                  <button
                    onClick={addTrack}
                    className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                  >
                    Add Track
                  </button>
                </div>

                <div className="space-y-3">
                  {newAlbum.tracks?.map((track, index) => (
                    <div key={track.id} className="bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-sm w-8">{index + 1}.</span>
                        <input
                          type="text"
                          placeholder="Track title"
                          value={track.title}
                          onChange={(e) => updateTrack(track.id, { title: e.target.value })}
                          className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                        />
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => updateTrack(track.id, { file: e.target.files?.[0] || null })}
                          className="text-sm text-gray-400"
                        />
                        <button
                          onClick={() => removeTrack(track.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Publish Button */}
              <button
                onClick={publishAlbum}
                className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-medium"
              >
                Publish Album (Requires 1 DIGM)
              </button>
            </div>
          )}
        </div>

        {/* My Albums */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">My Albums</h3>
          <div className="space-y-4">
            {albums.map((album) => (
              <div key={album.id} className="bg-gray-900 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                      {album.coverArt}
                    </div>
                    <div>
                      <h4 className="font-semibold">{album.title}</h4>
                      <p className="text-sm text-gray-400">{album.tracks.length} tracks</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-yellow-400">{album.price} XFG</p>
                    <span className={`text-xs px-2 py-1 rounded ${
                      album.status === 'published'
                        ? 'bg-green-600 text-green-100'
                        : album.status === 'uploading'
                        ? 'bg-yellow-600 text-yellow-100'
                        : 'bg-gray-600 text-gray-100'
                    }`}>
                      {album.status}
                    </span>
                  </div>
                </div>

                {/* Track List */}
                <div className="mt-3 space-y-1">
                  {album.tracks.map((track, index) => (
                    <div key={track.id} className="flex justify-between text-sm text-gray-400">
                      <span>{index + 1}. {track.title}</span>
                      <span>{formatDuration(track.duration)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ArtistDashboard; 