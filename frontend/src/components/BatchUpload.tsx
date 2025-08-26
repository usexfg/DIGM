import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  validateFile, 
  uploadFile, 
  mockUploadFile, 
  formatFileSize, 
  formatDuration,
  UploadProgress,
  FileValidation,
  UploadedFile,
  cleanupBlobUrl
} from '../utils/fileUpload';

interface BatchUploadProps {
  type: 'audio' | 'image' | 'mixed';
  onBatchComplete: (files: UploadedFile[]) => void;
  onError: (error: string) => void;
  maxFiles?: number;
  maxConcurrent?: number;
  className?: string;
  disabled?: boolean;
}

interface QueuedFile {
  id: string;
  file: File;
  progress: UploadProgress | null;
  validation: FileValidation | null;
  status: 'queued' | 'uploading' | 'completed' | 'error' | 'paused' | 'cancelled';
  error?: string;
  uploadedFile?: UploadedFile;
  retryCount: number;
  priority: number;
}

const BatchUpload: React.FC<BatchUploadProps> = ({
  type,
  onBatchComplete,
  onError,
  maxFiles = 50,
  maxConcurrent = 3,
  className = '',
  disabled = false
}) => {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [uploadStats, setUploadStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: 0,
    queued: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadQueueRef = useRef<Set<string>>(new Set());

  // Update stats whenever files change
  useEffect(() => {
    const stats = {
      total: files.length,
      completed: files.filter(f => f.status === 'completed').length,
      failed: files.filter(f => f.status === 'error').length,
      inProgress: files.filter(f => f.status === 'uploading').length,
      queued: files.filter(f => f.status === 'queued').length
    };
    setUploadStats(stats);
  }, [files]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      files.forEach(queuedFile => {
        if (queuedFile.uploadedFile?.url) {
          cleanupBlobUrl(queuedFile.uploadedFile.url);
        }
      });
    };
  }, [files]);

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles: QueuedFile[] = [];
    const errors: string[] = [];

    newFiles.forEach((file, index) => {
      // Determine file type
      let fileType: 'audio' | 'image' = 'audio';
      if (type === 'image' || file.type.startsWith('image/')) {
        fileType = 'image';
      } else if (type === 'audio' || file.type.startsWith('audio/')) {
        fileType = 'audio';
      } else if (type === 'mixed') {
        if (file.type.startsWith('image/')) {
          fileType = 'image';
        } else if (file.type.startsWith('audio/')) {
          fileType = 'audio';
        } else {
          errors.push(`${file.name}: Unsupported file type`);
          return;
        }
      }

      const validation = validateFile(file, fileType);
      
      if (validation.isValid) {
        validFiles.push({
          id: `${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          file,
          progress: null,
          validation,
          status: 'queued',
          retryCount: 0,
          priority: 0
        });
      } else {
        errors.push(`${file.name}: ${validation.errors.join(', ')}`);
      }
    });

    if (errors.length > 0) {
      onError(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setFiles(prev => {
        const updated = [...prev, ...validFiles];
        if (updated.length > maxFiles) {
          onError(`Maximum ${maxFiles} files allowed. Only the first ${maxFiles} files will be processed.`);
          return updated.slice(0, maxFiles);
        }
        return updated;
      });
    }
  }, [type, maxFiles, onError]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(Array.from(selectedFiles));
    }
    if (e.target) {
      e.target.value = '';
    }
  }, [addFiles]);

  const uploadFileWithProgress = useCallback(async (queuedFile: QueuedFile): Promise<void> => {
    const { file } = queuedFile;
    let fileType: 'audio' | 'image' = 'audio';
    
    if (type === 'image' || file.type.startsWith('image/')) {
      fileType = 'image';
    } else if (type === 'audio' || file.type.startsWith('audio/')) {
      fileType = 'audio';
    }

    // Update status to uploading
    setFiles(prev => prev.map(f => 
      f.id === queuedFile.id ? { ...f, status: 'uploading' } : f
    ));

    try {
      const { simpleStorageUpload } = await import('../utils/fileUpload');
      const uploadedFile = await simpleStorageUpload(file, fileType, (progress) => {
        setFiles(prev => prev.map(f => 
          f.id === queuedFile.id ? { ...f, progress } : f
        ));
      });

      // Update status to completed
      setFiles(prev => prev.map(f => 
        f.id === queuedFile.id ? { 
          ...f, 
          status: 'completed', 
          progress: null, 
          uploadedFile 
        } : f
      ));
    } catch (error) {
      // Update status to error
      setFiles(prev => prev.map(f => 
        f.id === queuedFile.id ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ));
    } finally {
      // Remove from upload queue
      uploadQueueRef.current.delete(queuedFile.id);
    }
  }, [type]);

  const processQueue = useCallback(async () => {
    if (isPaused || !isUploading) return;

    const queuedFiles = files.filter(f => f.status === 'queued');
    const uploadingFiles = files.filter(f => f.status === 'uploading');
    
    // Check if we can start more uploads
    const availableSlots = maxConcurrent - uploadingFiles.length;
    
    if (availableSlots > 0 && queuedFiles.length > 0) {
      const filesToUpload = queuedFiles.slice(0, availableSlots);
      
      filesToUpload.forEach(queuedFile => {
        if (!uploadQueueRef.current.has(queuedFile.id)) {
          uploadQueueRef.current.add(queuedFile.id);
          uploadFileWithProgress(queuedFile);
        }
      });
    }

    // Continue processing if there are more files
    if (queuedFiles.length > 0 || uploadingFiles.length > 0) {
      setTimeout(() => processQueue(), 100);
    } else {
      // All uploads complete
      setIsUploading(false);
      const completedFiles = files.filter(f => f.status === 'completed' && f.uploadedFile);
      if (completedFiles.length > 0) {
        onBatchComplete(completedFiles.map(f => f.uploadedFile!));
      }
    }
  }, [files, isPaused, isUploading, maxConcurrent, uploadFileWithProgress, onBatchComplete]);

  // Start processing queue when upload starts
  useEffect(() => {
    if (isUploading && !isPaused) {
      processQueue();
    }
  }, [isUploading, isPaused, processQueue]);

  const startUpload = useCallback(() => {
    if (files.length === 0) return;
    setIsUploading(true);
    setIsPaused(false);
  }, [files.length]);

  const pauseUpload = useCallback(() => {
    setIsPaused(true);
    setFiles(prev => prev.map(f => 
      f.status === 'uploading' ? { ...f, status: 'paused' } : f
    ));
  }, []);

  const resumeUpload = useCallback(() => {
    setIsPaused(false);
    setFiles(prev => prev.map(f => 
      f.status === 'paused' ? { ...f, status: 'queued' } : f
    ));
  }, []);

  const cancelUpload = useCallback(() => {
    setIsUploading(false);
    setIsPaused(false);
    setFiles(prev => prev.map(f => 
      f.status === 'uploading' || f.status === 'paused' ? { ...f, status: 'cancelled' } : f
    ));
    uploadQueueRef.current.clear();
  }, []);

  const retryFile = useCallback((fileId: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { 
        ...f, 
        status: 'queued', 
        error: undefined, 
        retryCount: f.retryCount + 1 
      } : f
    ));
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.uploadedFile?.url) {
        cleanupBlobUrl(fileToRemove.uploadedFile.url);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setFiles(prev => {
      const filesToRemove = prev.filter(f => f.status === 'completed');
      filesToRemove.forEach(f => {
        if (f.uploadedFile?.url) {
          cleanupBlobUrl(f.uploadedFile.url);
        }
      });
      return prev.filter(f => f.status !== 'completed');
    });
  }, []);

  const clearFailed = useCallback(() => {
    setFiles(prev => prev.filter(f => f.status !== 'error'));
  }, []);

  const getAcceptTypes = () => {
    if (type === 'audio') {
      return 'audio/mpeg,audio/mp3,audio/wav,audio/flac,audio/aac,audio/ogg,audio/webm';
    } else if (type === 'image') {
      return 'image/jpeg,image/jpg,image/png,image/webp,image/gif';
    } else {
      return 'audio/mpeg,audio/mp3,audio/wav,audio/flac,audio/aac,audio/ogg,audio/webm,image/jpeg,image/jpg,image/png,image/webp,image/gif';
    }
  };

  const getProgressPercentage = () => {
    if (uploadStats.total === 0) return 0;
    return Math.round((uploadStats.completed / uploadStats.total) * 100);
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Upload Controls */}
      <div className="mb-6 space-y-4">
        {/* File Input */}
        <div className="flex space-x-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="btn-primary"
          >
            Select Files
          </button>
          
          {files.length > 0 && !isUploading && (
            <button
              onClick={startUpload}
              className="btn-secondary"
            >
              Start Upload ({files.length} files)
            </button>
          )}
          
          {isUploading && (
            <>
              {isPaused ? (
                <button onClick={resumeUpload} className="btn-secondary">
                  Resume
                </button>
              ) : (
                <button onClick={pauseUpload} className="btn-secondary">
                  Pause
                </button>
              )}
              <button onClick={cancelUpload} className="btn-danger">
                Cancel
              </button>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Overall Progress</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div 
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        {files.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="text-center p-2 bg-slate-800/50 rounded">
              <div className="text-slate-300 font-medium">{uploadStats.total}</div>
              <div className="text-slate-500">Total</div>
            </div>
            <div className="text-center p-2 bg-blue-900/20 rounded">
              <div className="text-blue-300 font-medium">{uploadStats.inProgress}</div>
              <div className="text-blue-500">In Progress</div>
            </div>
            <div className="text-center p-2 bg-green-900/20 rounded">
              <div className="text-green-300 font-medium">{uploadStats.completed}</div>
              <div className="text-green-500">Completed</div>
            </div>
            <div className="text-center p-2 bg-red-900/20 rounded">
              <div className="text-red-300 font-medium">{uploadStats.failed}</div>
              <div className="text-red-500">Failed</div>
            </div>
            <div className="text-center p-2 bg-yellow-900/20 rounded">
              <div className="text-yellow-300 font-medium">{uploadStats.queued}</div>
              <div className="text-yellow-500">Queued</div>
            </div>
          </div>
        )}

        {/* Batch Actions */}
        {files.length > 0 && (
          <div className="flex space-x-3">
            <button
              onClick={clearCompleted}
              disabled={uploadStats.completed === 0}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Clear Completed
            </button>
            <button
              onClick={clearFailed}
              disabled={uploadStats.failed === 0}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Clear Failed
            </button>
            <button
              onClick={() => setFiles([])}
              className="btn-danger text-sm"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {files.map((queuedFile) => (
            <div
              key={queuedFile.id}
              className="p-3 bg-slate-800/50 border border-slate-600 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {/* File Icon */}
                <div className="text-xl">
                  {queuedFile.file.type.startsWith('audio/') ? '🎵' : '🖼️'}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 font-medium truncate">
                    {queuedFile.file.name}
                  </p>
                  <p className="text-slate-500 text-sm">
                    {formatFileSize(queuedFile.file.size)}
                    {queuedFile.uploadedFile?.duration && 
                      ` • ${formatDuration(queuedFile.uploadedFile.duration)}`
                    }
                    {queuedFile.uploadedFile?.dimensions && 
                      ` • ${queuedFile.uploadedFile.dimensions.width}x${queuedFile.uploadedFile.dimensions.height}px`
                    }
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  {queuedFile.status === 'queued' && (
                    <span className="text-yellow-400 text-sm">⏳ Queued</span>
                  )}
                  
                  {queuedFile.status === 'uploading' && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="text-blue-400 text-sm">
                        {queuedFile.progress ? `${queuedFile.progress.percentage}%` : 'Uploading...'}
                      </span>
                    </div>
                  )}
                  
                  {queuedFile.status === 'paused' && (
                    <span className="text-orange-400 text-sm">⏸️ Paused</span>
                  )}
                  
                  {queuedFile.status === 'completed' && (
                    <span className="text-green-400 text-sm">✅ Complete</span>
                  )}
                  
                  {queuedFile.status === 'error' && (
                    <span className="text-red-400 text-sm">❌ Error</span>
                  )}
                  
                  {queuedFile.status === 'cancelled' && (
                    <span className="text-slate-400 text-sm">🚫 Cancelled</span>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-1">
                    {queuedFile.status === 'error' && (
                      <button
                        onClick={() => retryFile(queuedFile.id)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                        title={`Retry (${queuedFile.retryCount} attempts)`}
                      >
                        Retry
                      </button>
                    )}
                    
                    <button
                      onClick={() => removeFile(queuedFile.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {queuedFile.status === 'uploading' && queuedFile.progress && (
                <div className="mt-2">
                  <div className="w-full bg-slate-700 rounded-full h-1">
                    <div 
                      className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${queuedFile.progress.percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {queuedFile.status === 'error' && queuedFile.error && (
                <div className="mt-2 p-2 bg-red-900/20 border border-red-600/30 rounded">
                  <p className="text-red-400 text-sm">{queuedFile.error}</p>
                </div>
              )}

              {/* Validation Warnings */}
              {queuedFile.validation && queuedFile.validation.warnings.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ {queuedFile.validation.warnings.join(', ')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptTypes()}
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
};

export default BatchUpload;
