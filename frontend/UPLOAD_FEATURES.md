# DIGM Platform - File Upload Features

## Overview

The DIGM platform now supports comprehensive file upload functionality for artists to upload their tracks and cover art. This system includes drag-and-drop interfaces, file validation, progress tracking, and mock API services for development.

## Features

### 🎵 Audio File Upload
- **Supported Formats**: MP3, WAV, FLAC, AAC, OGG, WebM
- **File Size Limit**: 100MB maximum
- **Features**:
  - Drag-and-drop interface
  - File validation and error handling
  - Progress tracking with percentage display
  - Automatic duration detection
  - File size formatting

### 🖼️ Image File Upload (Cover Art)
- **Supported Formats**: JPEG, PNG, WebP, GIF
- **File Size Limit**: 10MB maximum (5MB recommended for cover art)
- **Features**:
  - Drag-and-drop interface
  - Automatic thumbnail generation
  - Image dimension detection
  - File size formatting
  - Preview display

### 🔧 Technical Features
- **File Validation**: Type checking, size limits, format validation
- **Progress Tracking**: Real-time upload progress with visual feedback
- **Error Handling**: Comprehensive error messages and validation warnings
- **Mock API**: Development-ready mock services that can be easily replaced
- **Memory Management**: Automatic cleanup of blob URLs to prevent memory leaks

## File Structure

```
frontend/src/
├── components/
│   ├── FileUpload.tsx          # Reusable drag-and-drop upload component
│   └── ArtistDashboard.tsx     # Updated with upload functionality
├── utils/
│   ├── fileUpload.ts           # File upload utilities and validation
│   └── api.ts                  # Mock API services
```

## Components

### FileUpload Component

A reusable drag-and-drop file upload component that handles:
- File selection via click or drag-and-drop
- Real-time validation
- Progress tracking
- Error display
- Success feedback

**Props:**
```typescript
interface FileUploadProps {
  type: 'audio' | 'image';
  onFileUploaded: (file: UploadedFile) => void;
  onError: (error: string) => void;
  maxSize?: number;
  accept?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}
```

### ArtistDashboard Integration

The ArtistDashboard now includes:
- Audio file upload for tracks
- Cover art upload (optional)
- File validation and error display
- Upload progress tracking
- File preview with metadata
- Remove file functionality

## API Services

### Mock API Structure

The platform includes a complete mock API service that simulates:
- File uploads with progress tracking
- Track management (upload, update, delete)
- Sales analytics
- Artist data management

**Key API Methods:**
```typescript
// Track Management
api.tracks.uploadTrack(data: TrackUploadData): Promise<Track>
api.tracks.getArtistTracks(artistAddress: string): Promise<Track[]>
api.tracks.updateTrackStatus(trackId: string, status: string): Promise<void>

// Sales Analytics
api.sales.getArtistSales(artistAddress: string): Promise<SalesData>
api.sales.recordSale(trackId: string, amount: number): Promise<void>

// File Upload
api.upload.uploadFile(file: File, type: string): Promise<UploadedFile>
api.upload.deleteFile(fileId: string): Promise<void>
```

## File Validation

### Audio Files
- **Size Limit**: 100MB
- **Formats**: MP3, WAV, FLAC, AAC, OGG, WebM
- **Validation**: File type, size, empty file check
- **Metadata**: Duration extraction

### Image Files
- **Size Limit**: 10MB (5MB recommended for cover art)
- **Formats**: JPEG, PNG, WebP, GIF
- **Validation**: File type, size, empty file check
- **Metadata**: Dimensions, thumbnail generation

## Usage Example

### Basic File Upload
```typescript
import FileUpload from './components/FileUpload';
import { UploadedFile } from './utils/fileUpload';

const handleAudioUploaded = (file: UploadedFile) => {
  console.log('Audio uploaded:', file);
  // Handle the uploaded file
};

const handleError = (error: string) => {
  console.error('Upload error:', error);
  // Handle the error
};

<FileUpload
  type="audio"
  onFileUploaded={handleAudioUploaded}
  onError={handleError}
  placeholder="Upload your audio track"
/>
```

### Artist Dashboard Integration
```typescript
// In ArtistDashboard component
const [uploadedAudio, setUploadedAudio] = useState<UploadedFile | null>(null);
const [uploadedCoverArt, setUploadedCoverArt] = useState<UploadedFile | null>(null);

const handleUpload = async () => {
  const newTrack = await api.tracks.uploadTrack({
    artistAddress: evmAddress,
    title: uploadForm.title,
    price: parseFloat(uploadForm.price),
    genre: uploadForm.genre,
    description: uploadForm.description,
    audioFile: uploadedAudio,
    coverArt: uploadedCoverArt || undefined
  });
};
```

## Development vs Production

### Development Mode
- Uses mock API services with simulated delays
- Files stored as blob URLs in memory
- In-memory track and sales data
- Simulated upload progress

### Production Mode
To switch to production, replace the mock API calls with real endpoints:

1. **File Storage**: Replace blob URLs with IPFS, S3, or similar
2. **API Endpoints**: Replace mock API with real backend calls
3. **Database**: Replace in-memory storage with persistent database
4. **Authentication**: Add proper authentication and authorization

## Error Handling

The system provides comprehensive error handling:
- **File Type Errors**: Unsupported format messages
- **Size Limit Errors**: File too large warnings
- **Upload Errors**: Network and server error handling
- **Validation Errors**: Real-time validation feedback

## Performance Considerations

- **Memory Management**: Automatic cleanup of blob URLs
- **File Size Limits**: Configurable limits to prevent performance issues
- **Progress Tracking**: Real-time feedback for large uploads
- **Thumbnail Generation**: Optimized image processing

## Future Enhancements

### Planned Features
- **Batch Upload**: Multiple file upload support
- **File Compression**: Automatic audio/image compression
- **Cloud Storage**: Integration with IPFS, S3, or similar
- **Advanced Metadata**: ID3 tags, EXIF data extraction
- **Upload Resume**: Resume interrupted uploads
- **Chunked Upload**: Large file upload in chunks

### Integration Points
- **Blockchain**: File hashes on-chain for verification
- **P2P Network**: Distributed file storage
- **CDN**: Global content delivery
- **Analytics**: Upload and usage analytics

## Testing

The upload system includes:
- **File Validation Tests**: Type and size validation
- **Upload Flow Tests**: Complete upload process
- **Error Handling Tests**: Various error scenarios
- **UI Tests**: Drag-and-drop and progress tracking

## Security Considerations

- **File Type Validation**: Server-side validation required
- **Size Limits**: Enforced on both client and server
- **Content Scanning**: Virus/malware scanning for uploads
- **Access Control**: Proper authentication and authorization
- **Data Privacy**: Secure handling of user uploads

## Contributing

When adding new upload features:
1. Follow the existing file structure
2. Add proper TypeScript types
3. Include error handling
4. Add validation for new file types
5. Update documentation
6. Test thoroughly

## Support

For issues with file uploads:
1. Check file format and size requirements
2. Verify network connectivity
3. Check browser console for errors
4. Ensure proper file permissions
5. Contact development team for technical issues

---

**Note**: This is a development implementation with mock services. For production deployment, replace mock APIs with real backend services and implement proper file storage solutions. 