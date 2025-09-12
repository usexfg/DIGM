import React, { useState } from 'react';
import FileUpload from './FileUpload';
import EnhancedUpload from './EnhancedUpload';
import BatchUpload from './BatchUpload';
import { UploadedFile } from '../utils/fileUpload';

interface UploadCenterProps {
  className?: string;
}

type UploadMode = 'single' | 'enhanced' | 'batch';

const UploadCenter: React.FC<UploadCenterProps> = ({ className = '' }) => {
  const [uploadMode, setUploadMode] = useState<UploadMode>('single');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadType, setUploadType] = useState<'audio' | 'image' | 'mixed'>('audio');

  const handleSingleFileUploaded = (file: UploadedFile) => {
    setUploadedFiles(prev => [...prev, file]);
    setUploadError('');
  };

  const handleEnhancedFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    setUploadError('');
  };

  const handleBatchComplete = (files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    setUploadError('');
  };

  const handleError = (error: string) => {
    setUploadError(error);
  };

  const clearUploadedFiles = () => {
    setUploadedFiles([]);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getModeDescription = (mode: UploadMode) => {
    switch (mode) {
      case 'single':
        return 'Simple single file upload with drag & drop support';
      case 'enhanced':
        return 'Multiple file upload with real-time progress and validation';
      case 'batch':
        return 'Advanced batch upload with queue management and pause/resume';
      default:
        return '';
    }
  };

  return (
    <div className={`w-full max-w-6xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">DIGM Upload Center</h1>
        <p className="text-slate-400">
          Upload your audio tracks and cover art to the decentralized marketplace
        </p>
      </div>

      {/* Upload Mode Selector */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-4 mb-4">
          {(['single', 'enhanced', 'batch'] as UploadMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setUploadMode(mode)}
              className={`
                px-6 py-3 rounded-lg font-medium transition-all duration-200
                ${uploadMode === mode
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }
              `}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)} Upload
            </button>
          ))}
        </div>
        
        <div className="p-4 bg-slate-800/50 border border-slate-600 rounded-lg">
          <p className="text-slate-300">{getModeDescription(uploadMode)}</p>
        </div>
      </div>

      {/* File Type Selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Upload Type
        </label>
        <div className="flex flex-wrap gap-4">
          {(['audio', 'image', 'mixed'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setUploadType(type)}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all duration-200
                ${uploadType === type
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }
              `}
            >
              {type === 'audio' && '🎵 Audio Files'}
              {type === 'image' && '🖼️ Image Files'}
              {type === 'mixed' && '📁 Mixed Files'}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Area */}
      <div className="mb-8">
        {uploadMode === 'single' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Single File Upload</h3>
              <FileUpload
                type={uploadType === 'mixed' ? 'audio' : uploadType as 'audio' | 'image'}
                onFileUploaded={handleSingleFileUploaded}
                onError={handleError}
                placeholder={`Upload your ${uploadType} file`}
                allowMultiple={false}
              />
            </div>
          </div>
        )}

        {uploadMode === 'enhanced' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Enhanced Multi-File Upload</h3>
              <EnhancedUpload
                type={uploadType}
                onFilesUploaded={handleEnhancedFilesUploaded}
                onError={handleError}
                maxFiles={10}
                allowMultiple={true}
                autoUpload={true}
                placeholder={`Upload multiple ${uploadType} files`}
              />
            </div>
          </div>
        )}

        {uploadMode === 'batch' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Batch Upload Manager</h3>
              <BatchUpload
                type={uploadType}
                onBatchComplete={handleBatchComplete}
                onError={handleError}
                maxFiles={50}
                maxConcurrent={3}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {uploadError && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-red-400">❌</span>
            <p className="text-red-400">{uploadError}</p>
          </div>
        </div>
      )}

      {/* Uploaded Files Display */}
      {uploadedFiles.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-200">
              Uploaded Files ({uploadedFiles.length})
            </h3>
            <button
              onClick={clearUploadedFiles}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Clear All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="p-4 bg-slate-800/50 border border-slate-600 rounded-lg"
              >
                <div className="flex items-start space-x-3">
                  {/* File Icon */}
                  <div className="text-2xl">
                    {file.type.startsWith('audio/') ? '🎵' : '🖼️'}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 font-medium truncate">
                      {file.name}
                    </p>
                    <p className="text-slate-500 text-sm">
                      {file.size} bytes
                      {file.duration && ` • ${Math.round(file.duration)}s`}
                      {file.dimensions && 
                        ` • ${file.dimensions.width}x${file.dimensions.height}px`
                      }
                    </p>
                    <p className="text-slate-500 text-xs">
                      {new Date(file.uploadedAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>

                {/* Thumbnail for images */}
                {file.thumbnail && (
                  <div className="mt-3">
                    <img
                      src={file.thumbnail}
                      alt={file.name}
                      className="w-full h-24 object-cover rounded"
                    />
                  </div>
                )}

                {/* Audio preview */}
                {file.type.startsWith('audio/') && file.url && (
                  <div className="mt-3">
                    <audio
                      controls
                      className="w-full"
                      src={file.url}
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Features Overview */}
      <div className="mt-12 p-6 bg-slate-800/30 border border-slate-600 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Upload Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h4 className="font-medium text-slate-300">File Validation</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• File type verification</li>
              <li>• Size limit enforcement</li>
              <li>• Format compatibility check</li>
              <li>• Real-time validation feedback</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-slate-300">Progress Tracking</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Real-time upload progress</li>
              <li>• Individual file status</li>
              <li>• Overall batch progress</li>
              <li>• Upload speed indicators</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-slate-300">Advanced Features</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Drag & drop support</li>
              <li>• Pause/resume uploads</li>
              <li>• Retry failed uploads</li>
              <li>• Queue management</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-slate-300">File Processing</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Audio duration extraction</li>
              <li>• Image thumbnail generation</li>
              <li>• Metadata preservation</li>
              <li>• Format optimization</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-slate-300">User Experience</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Intuitive interface</li>
              <li>• Error handling</li>
              <li>• File preview</li>
              <li>• Batch operations</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-slate-300">Supported Formats</h4>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Audio: MP3, WAV, FLAC, AAC, OGG, WebM</li>
              <li>• Images: JPEG, PNG, WebP, GIF</li>
              <li>• Max audio: 100MB per file</li>
              <li>• Max image: 10MB per file</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadCenter;


