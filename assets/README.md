# DIGM Audio Assets Structure

This directory contains the audio assets and catalog for the DIGM platform.

## Folder Structure

```
assets/
├── audio/
│   ├── preview-singles/     # Full-length preview tracks (public access)
│   └── full-tracks/         # Complete album tracks (license required)
├── covers/                  # Album cover art images
└── catalog/
    └── albums.json         # Album metadata and track information
```

## Audio File Organization

### Preview Singles (`preview-singles/`)
- **Purpose**: Full-length singles that artists choose to make publicly available
- **Access**: Anyone can stream (no license required)
- **Format**: `album_{id}_track_{id}_preview.mp3`
- **Example**: `album_001_track_001_preview.mp3`

### Full Tracks (`full-tracks/`)
- **Purpose**: Complete album tracks that require license purchase
- **Access**: License holders only (0x0B transactions)
- **Format**: `album_{id}_track_{id}.mp3`
- **Example**: `album_001_track_003.mp3`

## Cover Art (`covers/`)
- **Purpose**: Album cover images
- **Format**: `album_{id}.jpg` or `album_{id}.png`
- **Example**: `album_001.jpg`

## Catalog (`catalog/albums.json`)
- **Purpose**: Album metadata and track information
- **Schema**: JSON file with album and track details
- **Updates**: Modified when albums are added or updated

## Usage

### Adding New Albums
1. Upload audio files to appropriate folders
2. Add cover art to `covers/` folder
3. Update `catalog/albums.json` with album metadata
4. Ensure preview tracks are marked with `isPreview: true`

### File Naming Convention
- **Preview Singles**: `album_{albumId}_track_{trackId}_preview.mp3`
- **Full Tracks**: `album_{albumId}_track_{trackId}.mp3`
- **Cover Art**: `album_{albumId}.jpg`

## Integration with Elderfiers

This local structure mirrors the GitHub vault structure:
- **Local**: `frontend/public/assets/audio/`
- **GitHub**: `github.com/digm/audio-vault/`
- **Elderfiers**: Serve encrypted versions from GitHub vault
