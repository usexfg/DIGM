import React, { useState, useEffect } from 'react';
import simpleStorage, { SimpleFile } from '../utils/simpleStorage';
import { formatFileSize, formatDuration } from '../utils/fileUpload';

const StorageManager: React.FC = () => {
  const [files, setFiles] = useState<SimpleFile[]>([]);
  const [stats, setStats] = useState(simpleStorage.getStats());
  const [selectedFile, setSelectedFile] = useState<SimpleFile | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = () => {
    setFiles(simpleStorage.listFiles());
    setStats(simpleStorage.getStats());
  };

  const handleDeleteFile = (id: string) => {
    if (simpleStorage.deleteFile(id)) {
      loadFiles();
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all files? This cannot be undone.')) {
      simpleStorage.clearAll();
      loadFiles();
    }
  };

  const handlePlayFile = (file: SimpleFile) => {
    setSelectedFile(file);
  };

  const handleClosePlayer = () => {
    setSelectedFile(null);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('audio/')) return '🎵';
    if (type.startsWith('image/')) return '🖼️';
    return '📄';
  };

  const getProgressPercentage = () => {
    return Math.round((stats.totalSize / stats.maxSize) * 100);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Storage Manager</h1>
        <p className="text-slate-400">Phase 1/2 Temporary Storage</p>
      </div>

      {/* Storage Stats */}
      <div className="mb-6 p-4 bg-slate-800/50 border border-slate-600 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-300">{stats.totalFiles}</div>
            <div className="text-sm text-slate-500">Files</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-300">{formatFileSize(stats.totalSize)}</div>
            <div className="text-sm text-slate-500">Used</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-300">{formatFileSize(stats.availableSpace)}</div>
            <div className="text-sm text-slate-500">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-300">{stats.maxFiles}</div>
            <div className="text-sm text-slate-500">Max Files</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Storage Usage</span>
            <span>{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                getProgressPercentage() > 80 ? 'bg-red-500' : 
                getProgressPercentage() > 60 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex space-x-3">
          <button
            onClick={loadFiles}
            className="btn-secondary text-sm"
          >
            Refresh
          </button>
          <button
            onClick={handleClearAll}
            disabled={files.length === 0}
            className="btn-danger text-sm disabled:opacity-50"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Files List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-200">Stored Files</h2>
        
        {files.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 border border-slate-600 rounded-lg">
            <div className="text-4xl mb-4">📁</div>
            <p className="text-slate-400">No files stored yet</p>
            <p className="text-slate-500 text-sm">Upload files to see them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="p-4 bg-slate-800/50 border border-slate-600 rounded-lg hover:border-slate-500 transition-all duration-200"
              >
                <div className="flex items-start space-x-3">
                  {/* File Icon */}
                  <div className="text-2xl">
                    {getFileIcon(file.type)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 font-medium truncate">
                      {file.name}
                    </p>
                    <p className="text-slate-500 text-sm">
                      {formatFileSize(file.size)}
                      {file.metadata?.duration && 
                        ` • ${formatDuration(file.metadata.duration)}`
                      }
                    </p>
                    <p className="text-slate-500 text-xs">
                      {new Date(file.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 flex space-x-2">
                  {file.type.startsWith('audio/') && (
                    <button
                      onClick={() => handlePlayFile(file)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Play
                    </button>
                  )}
                  
                  {file.type.startsWith('image/') && (
                    <button
                      onClick={() => handlePlayFile(file)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      View
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Player/Viewer Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-600">
              <h3 className="text-lg font-semibold text-slate-200">
                {selectedFile.name}
              </h3>
              <button
                onClick={handleClosePlayer}
                className="text-slate-400 hover:text-slate-300 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {selectedFile.type.startsWith('audio/') ? (
                <div className="space-y-4">
                  <audio
                    controls
                    className="w-full"
                    src={selectedFile.url}
                  >
                    Your browser does not support the audio element.
                  </audio>
                  <div className="text-sm text-slate-400">
                    <p>Size: {formatFileSize(selectedFile.size)}</p>
                    {selectedFile.metadata?.duration && (
                      <p>Duration: {formatDuration(selectedFile.metadata.duration)}</p>
                    )}
                    <p>Uploaded: {new Date(selectedFile.uploadedAt).toLocaleString()}</p>
                  </div>
                </div>
              ) : selectedFile.type.startsWith('image/') ? (
                <div className="space-y-4">
                  <img
                    src={selectedFile.url}
                    alt={selectedFile.name}
                    className="w-full h-auto max-h-96 object-contain rounded"
                  />
                  <div className="text-sm text-slate-400">
                    <p>Size: {formatFileSize(selectedFile.size)}</p>
                    {selectedFile.metadata?.dimensions && (
                      <p>Dimensions: {selectedFile.metadata.dimensions.width}x{selectedFile.metadata.dimensions.height}px</p>
                    )}
                    <p>Uploaded: {new Date(selectedFile.uploadedAt).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">Preview not available for this file type</p>
                  <a
                    href={selectedFile.url}
                    download={selectedFile.name}
                    className="btn-primary mt-4 inline-block"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageManager;


