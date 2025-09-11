// File Upload Utilities for DIGM Platform

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  thumbnail?: string;
  duration?: number; // For audio files
  dimensions?: { width: number; height: number }; // For images
  uploadedAt: Date;
}

// File type validation
export const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/flac',
  'audio/aac',
  'audio/ogg',
  'audio/webm'
];

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

// File size limits (in bytes)
export const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_COVER_ART_SIZE = 5 * 1024 * 1024; // 5MB

// Validate file before upload
export const validateFile = (file: File, type: 'audio' | 'image'): FileValidation => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file type
  if (type === 'audio' && !ALLOWED_AUDIO_TYPES.includes(file.type)) {
    errors.push(`Audio file type ${file.type} is not supported. Please use MP3, WAV, FLAC, AAC, OGG, or WebM.`);
  }

  if (type === 'image' && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
    errors.push(`Image file type ${file.type} is not supported. Please use JPEG, PNG, WebP, or GIF.`);
  }

  // Check file size
  if (type === 'audio' && file.size > MAX_AUDIO_SIZE) {
    errors.push(`Audio file is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 100MB.`);
  }

  if (type === 'image' && file.size > MAX_IMAGE_SIZE) {
    errors.push(`Image file is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`);
  }

  // Check for empty files
  if (file.size === 0) {
    errors.push('File is empty.');
  }

  // Warnings for large files
  if (type === 'audio' && file.size > 50 * 1024 * 1024) {
    warnings.push('Large audio file detected. Upload may take longer than usual.');
  }

  if (type === 'image' && file.size > 5 * 1024 * 1024) {
    warnings.push('Large image file detected. Consider compressing for faster loading.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Get audio duration
export const getAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    });
    
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio file'));
    });
    
    audio.src = url;
  });
};

// Get image dimensions
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image file'));
    };
    
    img.src = url;
  });
};

// Create thumbnail for image
export const createThumbnail = (file: File, maxSize: number = 200): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Calculate thumbnail dimensions
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      const width = img.width * ratio;
      const height = img.height * ratio;
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw image on canvas
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to data URL
      const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
      resolve(thumbnail);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to create thumbnail'));
    };
    
    img.src = url;
  });
};

// Upload file with progress tracking
export const uploadFile = async (
  file: File,
  type: 'audio' | 'image',
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedFile> => {
  // Validate file first
  const validation = validateFile(file, type);
  if (!validation.isValid) {
    throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
  }

  // Create FormData
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  formData.append('timestamp', Date.now().toString());

  // Generate unique ID
  const fileId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Upload to server (replace with your actual upload endpoint)
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type header for FormData
      }
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Process file metadata
    let duration: number | undefined;
    let dimensions: { width: number; height: number } | undefined;
    let thumbnail: string | undefined;

    if (type === 'audio') {
      try {
        duration = await getAudioDuration(file);
      } catch (error) {
        console.warn('Failed to get audio duration:', error);
      }
    }

    if (type === 'image') {
      try {
        dimensions = await getImageDimensions(file);
        thumbnail = await createThumbnail(file);
      } catch (error) {
        console.warn('Failed to process image:', error);
      }
    }

    const uploadedFile: UploadedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      url: result.url || URL.createObjectURL(file), // Fallback to blob URL
      thumbnail,
      duration,
      dimensions,
      uploadedAt: new Date()
    };

    return uploadedFile;
  } catch (error) {
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Mock upload function for development (when no server is available)
export const mockUploadFile = async (
  file: File,
  type: 'audio' | 'image',
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedFile> => {
  // Validate file first
  const validation = validateFile(file, type);
  if (!validation.isValid) {
    throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
  }

  // Simulate upload progress
  const total = file.size;
  let loaded = 0;
  
  const progressInterval = setInterval(() => {
    loaded += Math.random() * (total / 10);
    if (loaded >= total) {
      loaded = total;
      clearInterval(progressInterval);
    }
    
    onProgress?.({
      loaded: Math.floor(loaded),
      total,
      percentage: Math.floor((loaded / total) * 100)
    });
  }, 100);

  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
  clearInterval(progressInterval);

  // Process file metadata
  let duration: number | undefined;
  let dimensions: { width: number; height: number } | undefined;
  let thumbnail: string | undefined;

  if (type === 'audio') {
    try {
      duration = await getAudioDuration(file);
    } catch (error) {
      console.warn('Failed to get audio duration:', error);
    }
  }

  if (type === 'image') {
    try {
      dimensions = await getImageDimensions(file);
      thumbnail = await createThumbnail(file);
    } catch (error) {
      console.warn('Failed to process image:', error);
    }
  }

  const fileId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const uploadedFile: UploadedFile = {
    id: fileId,
    name: file.name,
    size: file.size,
    type: file.type,
    url: URL.createObjectURL(file), // Use blob URL for mock
    thumbnail,
    duration,
    dimensions,
    uploadedAt: new Date()
  };

  return uploadedFile;
};

// Simple storage upload function for phase 1/2
export const simpleStorageUpload = async (
  file: File,
  type: 'audio' | 'image',
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedFile> => {
  // Import simple storage dynamically to avoid circular dependencies
  const simpleStorage = (await import('./simpleStorage')).default;
  
  // Validate file first
  const validation = validateFile(file, type);
  if (!validation.isValid) {
    throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
  }

  // Simulate upload progress
  const total = file.size;
  let loaded = 0;
  
  const progressInterval = setInterval(() => {
    loaded += Math.random() * (total / 10);
    if (loaded >= total) {
      loaded = total;
      clearInterval(progressInterval);
    }
    
    onProgress?.({
      loaded: Math.floor(loaded),
      total,
      percentage: Math.floor((loaded / total) * 100)
    });
  }, 100);

  // Simulate upload delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  clearInterval(progressInterval);

  // Process file metadata
  let duration: number | undefined;
  let dimensions: { width: number; height: number } | undefined;
  let thumbnail: string | undefined;

  if (type === 'audio') {
    try {
      duration = await getAudioDuration(file);
    } catch (error) {
      console.warn('Failed to get audio duration:', error);
    }
  }

  if (type === 'image') {
    try {
      dimensions = await getImageDimensions(file);
      thumbnail = await createThumbnail(file);
    } catch (error) {
      console.warn('Failed to process image:', error);
    }
  }

  // Store in simple storage
  const fileId = await simpleStorage.storeFile(file, {
    duration,
    dimensions: dimensions ? { width: dimensions.width, height: dimensions.height } : undefined
  });

  const storedFile = simpleStorage.getFile(fileId);
  
  const uploadedFile: UploadedFile = {
    id: fileId,
    name: file.name,
    size: file.size,
    type: file.type,
    url: storedFile?.url || URL.createObjectURL(file),
    thumbnail,
    duration,
    dimensions,
    uploadedAt: new Date()
  };

  return uploadedFile;
};

// Temporary stub for simple storage upload (used by older UI during CI)
export const simpleStorageUpload = async (
  file: File,
  fileType: 'audio' | 'image',
  onProgress?: (p: UploadProgress) => void
): Promise<UploadedFile> => {
  return new Promise<UploadedFile>((resolve) => {
    const chunk = file.size / 10;
    let loaded = 0;
    const interval = setInterval(() => {
      loaded += chunk;
      if (onProgress) {
        onProgress({
          loaded: Math.min(loaded, file.size),
          total: file.size,
          percentage: Math.min((loaded / file.size) * 100, 100)
        });
      }
      if (loaded >= file.size) {
        clearInterval(interval);
        resolve({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          uploadedAt: new Date()
        });
      }
    }, 100);
  });
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format duration for display
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Clean up blob URLs to prevent memory leaks
export const cleanupBlobUrl = (url: string) => {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}; 