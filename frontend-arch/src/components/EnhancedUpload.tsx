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

interface EnhancedUploadProps {
  type: 'audio' | 'image' | 'mixed';
  onFilesUploaded: (files: UploadedFile[]) => void;
  onError: (error: string) => void;
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowMultiple?: boolean;
  showPreview?: boolean;
  autoUpload?: boolean;
}

interface FileWithProgress {
  file: File;
  progress: UploadProgress | null;
  validation: FileValidation | null;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  uploadedFile?: UploadedFile;
}

const EnhancedUpload: React.FC<EnhancedUploadProps> = ({
  type,
  onFilesUploaded,
  onError,
  maxFiles = 10,
  maxSize,
  accept,
  placeholder,
  className = '',
  disabled = false,
  allowMultiple = true,
  showPreview = true,
  autoUpload = true
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach(fileWithProgress => {
        if (fileWithProgress.uploadedFile?.url) {
          cleanupBlobUrl(fileWithProgress.uploadedFile.url);
        }
      });
    };
  }, [files]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFilesAdded(droppedFiles);
  }, [disabled]);

  const validateAndAddFiles = useCallback((newFiles: File[]) => {
    const validFiles: FileWithProgress[] = [];
    const errors: string[] = [];

    newFiles.forEach(file => {
      // Check if file type is appropriate
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
          file,
          progress: null,
          validation,
          status: 'pending'
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

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    if (!allowMultiple && newFiles.length > 1) {
      onError('Multiple files not allowed. Only the first file will be processed.');
      newFiles = [newFiles[0]];
    }
    validateAndAddFiles(newFiles);
  }, [allowMultiple, validateAndAddFiles, onError]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFilesAdded(Array.from(selectedFiles));
    }
    // Reset input value to allow selecting the same file again
    if (e.target) {
      e.target.value = '';
    }
  }, [handleFilesAdded]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const uploadFileWithProgress = useCallback(async (fileWithProgress: FileWithProgress, index: number) => {
    const { file } = fileWithProgress;
    let fileType: 'audio' | 'image' = 'audio';
    
    if (type === 'image' || file.type.startsWith('image/')) {
      fileType = 'image';
    } else if (type === 'audio' || file.type.startsWith('audio/')) {
      fileType = 'audio';
    }

    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, status: 'uploading' } : f
    ));

    try {
      const { simpleStorageUpload } = await import('../utils/fileUpload');
      const uploadedFile = await simpleStorageUpload(file, fileType, (progress) => {
        setFiles(prev => prev.map((f, i) => 
          i === index ? { ...f, progress } : f
        ));
      });

      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'completed', 
          progress: null, 
          uploadedFile 
        } : f
      ));
    } catch (error) {
      setFiles(prev => prev.map((f, i) => 
        i === index ? { 
          ...f, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ));
    }
  }, [type]);

  const startUploads = useCallback(async () => {
    setIsUploading(true);
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (let i = 0; i < pendingFiles.length; i++) {
      const index = files.findIndex(f => f.file === pendingFiles[i].file);
      await uploadFileWithProgress(pendingFiles[i], index);
    }
    
    setIsUploading(false);
    
    // Notify parent of completed uploads
    const completedFiles = files.filter(f => f.status === 'completed' && f.uploadedFile);
    if (completedFiles.length > 0) {
      onFilesUploaded(completedFiles.map(f => f.uploadedFile!));
    }
  }, [files, uploadFileWithProgress, onFilesUploaded]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const fileToRemove = prev[index];
      if (fileToRemove.uploadedFile?.url) {
        cleanupBlobUrl(fileToRemove.uploadedFile.url);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const retryUpload = useCallback((index: number) => {
    const fileWithProgress = files[index];
    if (fileWithProgress.status === 'error') {
      uploadFileWithProgress(fileWithProgress, index);
    }
  }, [files, uploadFileWithProgress]);

  const getAcceptTypes = () => {
    if (accept) return accept;
    if (type === 'audio') {
      return 'audio/mpeg,audio/mp3,audio/wav,audio/flac,audio/aac,audio/ogg,audio/webm';
    } else if (type === 'image') {
      return 'image/jpeg,image/jpg,image/png,image/webp,image/gif';
    } else {
      return 'audio/mpeg,audio/mp3,audio/wav,audio/flac,audio/aac,audio/ogg,audio/webm,image/jpeg,image/jpg,image/png,image/webp,image/gif';
    }
  };

  const getPlaceholderText = () => {
    if (placeholder) return placeholder;
    if (type === 'audio') {
      return allowMultiple 
        ? 'Drag and drop audio files here or click to browse'
        : 'Drag and drop an audio file here or click to browse';
    } else if (type === 'image') {
      return allowMultiple 
        ? 'Drag and drop image files here or click to browse'
        : 'Drag and drop an image file here or click to browse';
    } else {
      return allowMultiple 
        ? 'Drag and drop audio or image files here or click to browse'
        : 'Drag and drop an audio or image file here or click to browse';
    }
  };

  const getFileTypeText = () => {
    if (type === 'audio') {
      return 'MP3, WAV, FLAC, AAC, OGG, WebM (max 100MB each)';
    } else if (type === 'image') {
      return 'JPEG, PNG, WebP, GIF (max 10MB each)';
    } else {
      return 'Audio: MP3, WAV, FLAC, AAC, OGG, WebM (max 100MB) | Images: JPEG, PNG, WebP, GIF (max 10MB)';
    }
  };

  const pendingFiles = files.filter(f => f.status === 'pending');
  const uploadingFiles = files.filter(f => f.status === 'uploading');
  const completedFiles = files.filter(f => f.status === 'completed');
  const errorFiles = files.filter(f => f.status === 'error');

  return (
    <div className={`w-full ${className}`}>
      {/* File Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer
          ${isDragOver 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-slate-600 hover:border-slate-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isUploading ? 'pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* Upload Icon */}
        <div className="mb-4">
          {type === 'audio' ? (
            <div className="text-4xl text-slate-400">🎵</div>
          ) : type === 'image' ? (
            <div className="text-4xl text-slate-400">🖼️</div>
          ) : (
            <div className="text-4xl text-slate-400">📁</div>
          )}
        </div>

        {/* Upload Text */}
        <div className="space-y-2">
          <p className="text-slate-300 font-medium">
            {isUploading ? 'Uploading...' : getPlaceholderText()}
          </p>
          <p className="text-slate-500 text-sm">
            {getFileTypeText()}
          </p>
          {allowMultiple && (
            <p className="text-slate-500 text-xs">
              Max {maxFiles} files • {files.length}/{maxFiles} selected
            </p>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={getAcceptTypes()}
          multiple={allowMultiple}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-3">
          {files.map((fileWithProgress, index) => (
            <div
              key={`${fileWithProgress.file.name}-${index}`}
              className="p-3 bg-slate-800/50 border border-slate-600 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {/* File Icon */}
                <div className="text-2xl">
                  {fileWithProgress.file.type.startsWith('audio/') ? '🎵' : '🖼️'}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 font-medium truncate">
                    {fileWithProgress.file.name}
                  </p>
                  <p className="text-slate-500 text-sm">
                    {formatFileSize(fileWithProgress.file.size)}
                    {fileWithProgress.uploadedFile?.duration && 
                      ` • ${formatDuration(fileWithProgress.uploadedFile.duration)}`
                    }
                    {fileWithProgress.uploadedFile?.dimensions && 
                      ` • ${fileWithProgress.uploadedFile.dimensions.width}x${fileWithProgress.uploadedFile.dimensions.height}px`
                    }
                  </p>
                </div>

                {/* Status and Actions */}
                <div className="flex items-center space-x-2">
                  {fileWithProgress.status === 'pending' && (
                    <span className="text-yellow-400 text-sm">⏳ Pending</span>
                  )}
                  
                  {fileWithProgress.status === 'uploading' && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="text-blue-400 text-sm">
                        {fileWithProgress.progress ? `${fileWithProgress.progress.percentage}%` : 'Uploading...'}
                      </span>
                    </div>
                  )}
                  
                  {fileWithProgress.status === 'completed' && (
                    <span className="text-green-400 text-sm">✅ Complete</span>
                  )}
                  
                  {fileWithProgress.status === 'error' && (
                    <div className="flex items-center space-x-2">
                      <span className="text-red-400 text-sm">❌ Error</span>
                      <button
                        onClick={() => retryUpload(index)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {fileWithProgress.status === 'uploading' && fileWithProgress.progress && (
                <div className="mt-2">
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${fileWithProgress.progress.percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {fileWithProgress.status === 'error' && fileWithProgress.error && (
                <div className="mt-2 p-2 bg-red-900/20 border border-red-600/30 rounded">
                  <p className="text-red-400 text-sm">{fileWithProgress.error}</p>
                </div>
              )}

              {/* Validation Warnings */}
              {fileWithProgress.validation && fileWithProgress.validation.warnings.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded">
                  <p className="text-yellow-400 text-sm">
                    ⚠️ {fileWithProgress.validation.warnings.join(', ')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Controls */}
      {files.length > 0 && !autoUpload && (
        <div className="mt-4 flex space-x-3">
          <button
            onClick={startUploads}
            disabled={isUploading || pendingFiles.length === 0}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : `Upload ${pendingFiles.length} File${pendingFiles.length !== 1 ? 's' : ''}`}
          </button>
          
          <button
            onClick={() => setFiles([])}
            disabled={isUploading}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Summary */}
      {files.length > 0 && (
        <div className="mt-4 p-3 bg-slate-800/30 border border-slate-600 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Total:</span>
              <span className="text-slate-300 ml-2">{files.length}</span>
            </div>
            <div>
              <span className="text-slate-400">Pending:</span>
              <span className="text-yellow-400 ml-2">{pendingFiles.length}</span>
            </div>
            <div>
              <span className="text-slate-400">Uploading:</span>
              <span className="text-blue-400 ml-2">{uploadingFiles.length}</span>
            </div>
            <div>
              <span className="text-slate-400">Completed:</span>
              <span className="text-green-400 ml-2">{completedFiles.length}</span>
            </div>
          </div>
          {errorFiles.length > 0 && (
            <div className="mt-2">
              <span className="text-slate-400">Errors:</span>
              <span className="text-red-400 ml-2">{errorFiles.length}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedUpload;
