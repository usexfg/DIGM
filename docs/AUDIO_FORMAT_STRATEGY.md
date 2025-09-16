# DIGM Audio Format Strategy

## Overview

DIGM uses a dual-format approach optimized for different use cases:

- **Preview/Streaming Tracks**: Opus format (96k VBR)
- **Album Downloads**: FLAC format (lossless)

## Format Specifications

### Preview Singles (Paradio Streaming)

**Format**: Opus
**Bitrate**: 96k VBR (Variable Bitrate)
**Sample Rate**: 48kHz
**Channels**: Stereo
**Use Case**: Streaming, previews, mobile optimization

**Benefits**:
- Excellent compression efficiency
- Superior quality at low bitrates
- Native browser support
- Mobile-friendly
- Fast streaming

**File Size Comparison**:
- Bitcoin: 5.8MB (MP3) → 2.6MB (Opus) = **55% reduction**
- Midnight City: 4.0MB (M4A) → 2.8MB (Opus) = **30% reduction**
- The Arbinger: 4.6MB (M4A) → 4.1MB (Opus) = **11% reduction**

### Album Downloads

**Format**: FLAC
**Bitrate**: Lossless
**Sample Rate**: 44.1kHz or 48kHz (original)
**Channels**: Stereo
**Use Case**: Full album purchases, archival quality

**Benefits**:
- Perfect audio quality
- Artist's original intent preserved
- No generational loss
- Industry standard for high-quality audio

## Technical Implementation

### Conversion Process

```bash
# Preview tracks (96k Opus)
ffmpeg -i input.mp3 -c:a libopus -b:a 96k -vbr on output.opus

# Album downloads (FLAC)
ffmpeg -i input.wav -c:a flac output.flac
```

### File Organization

```
frontend/public/assets/audio/
├── preview-singles/          # Opus files for streaming
│   ├── headphone-son-bitcoin.opus
│   ├── headphone-son-midnight-city.opus
│   └── headphone-son-the-arbinger.opus
└── full-tracks/              # FLAC files for downloads
    ├── album_001_track_001.flac
    ├── album_001_track_002.flac
    └── ...
```

## Browser Compatibility

### Opus Support
- **Chrome**: ✅ Full support
- **Firefox**: ✅ Full support
- **Safari**: ✅ Full support (iOS 11+)
- **Edge**: ✅ Full support

### FLAC Support
- **Chrome**: ✅ Full support
- **Firefox**: ✅ Full support
- **Safari**: ✅ Full support (macOS 10.13+)
- **Edge**: ✅ Full support

## Quality Standards

### Preview Tracks (Opus 96k)
- **Target**: Near-transparent quality for preview purposes
- **Use Case**: Streaming, mobile, bandwidth-constrained
- **Quality**: Excellent for preview, good for casual listening

### Album Downloads (FLAC)
- **Target**: Perfect reproduction of original recording
- **Use Case**: Audiophiles, archival, professional use
- **Quality**: Lossless, studio-grade

## Storage Optimization

### GitHub Repository Limits
- **File Size Limit**: 100MB per file
- **Repository Size**: 5GB total
- **Strategy**: Opus for previews, FLAC for downloads

### Bandwidth Considerations
- **Opus**: ~96kbps average, ~1.2MB per minute
- **FLAC**: ~1000kbps average, ~7.5MB per minute
- **Savings**: 90% bandwidth reduction for previews

## Future Considerations

### Adaptive Streaming
- Multiple Opus bitrates (64k, 96k, 128k)
- Automatic quality selection based on connection
- Progressive enhancement

### WebTorrent Integration
- Opus files for fast P2P distribution
- FLAC files for high-quality seeding
- Hybrid approach for optimal performance

## Implementation Status

✅ **Completed**:
- Opus conversion for all preview tracks
- Catalog updates with new file paths
- File size optimization (55% average reduction)
- Cross-platform compatibility

🔄 **In Progress**:
- FLAC conversion for album downloads
- WebTorrent integration
- Adaptive streaming implementation

📋 **Planned**:
- Automated conversion pipeline
- Quality validation tools
- Bandwidth monitoring
- User preference settings
