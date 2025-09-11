import React, { useState, useRef, useCallback } from 'react';
import { 
  validateFile, 
  uploadFile, 
  mockUploadFile, 
  formatFileSize, 
  formatDuration,
  UploadProgress,
  FileValidation,
  UploadedFile
} from '../utils/fileUpload';

interface FileUploadProps {
  type: 'audio' | 'image';
  onFileUploaded: (file: UploadedFile) => void;
  onError: (error: string) => void;
  maxSize?: number;
  accept?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowMultiple?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  type,
  onFileUploaded,
  onError,
  maxSize,
  accept,
  placeholder,
  className = '',
  disabled = false,
  allowMultiple = true
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [validation, setValidation] = useState<FileValidation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [disabled]);

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file
    const fileValidation = validateFile(file, type);
    setValidation(fileValidation);

    if (!fileValidation.isValid) {
      onError(fileValidation.errors.join(', '));
      return;
    }

    // Show warnings if any
    if (fileValidation.warnings.length > 0) {
      console.warn('File upload warnings:', fileValidation.warnings);
    }

    setIsUploading(true);
    setUploadProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      // Use simple storage upload for phase 1/2
      const { simpleStorageUpload } = await import('../utils/fileUpload');
      const uploadedFile = await simpleStorageUpload(file, type, (progress) => {
        setUploadProgress(progress);
      });

      onFileUploaded(uploadedFile);
      setValidation(null);
      setUploadProgress(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }, [type, onFileUploaded, onError]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const getAcceptTypes = () => {
    if (accept) return accept;
    return type === 'audio' 
      ? 'audio/mpeg,audio/mp3,audio/wav,audio/flac,audio/aac,audio/ogg,audio/webm'
      : 'image/jpeg,image/jpg,image/png,image/webp,image/gif';
  };

  const getPlaceholderText = () => {
    if (placeholder) return placeholder;
    return type === 'audio'
      ? 'Drag and drop your audio file here or click to browse'
      : 'Drag and drop your image file here or click to browse';
  };

  const getFileTypeText = () => {
    return type === 'audio'
      ? 'MP3, WAV, FLAC, AAC, OGG, WebM (max 100MB)'
      : 'JPEG, PNG, WebP, GIF (max 10MB)';
  };

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
          ) : (
            <div className="text-4xl text-slate-400">🖼️</div>
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
        </div>

        {/* Progress Bar */}
        {isUploading && uploadProgress && (
          <div className="mt-4">
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.percentage}%` }}
              />
            </div>
            <p className="text-slate-400 text-sm mt-2">
              {uploadProgress.percentage}% • {formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)}
            </p>
          </div>
        )}

        {/* Validation Warnings */}
        {validation && validation.warnings.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
            <p className="text-yellow-400 text-sm">
              ⚠️ {validation.warnings.join(', ')}
            </p>
          </div>
        )}

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

      {/* Upload Status */}
      {isUploading && (
        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-blue-400 text-sm">Processing {type} file...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 