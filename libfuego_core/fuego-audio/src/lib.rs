use symphonia::core::audio::AudioBufferRef;
use symphonia::core::codecs::{DecoderOptions, Decoder};
use symphonia::core::formats::{FormatOptions, FormatReader};
use symphonia::core::io::{MediaSource, MediaSourceStream, MediaSourceStreamOptions};
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;
use std::sync::{Arc, Mutex};
use chunk_store::{ChunkStore, Quality};
use i2p_net::PrefetchManager;
use anyhow::{Result, Context};
use std::io::{Read, Seek, SeekFrom};
use std::borrow::Borrow;

pub struct AudioStreamer {
    store: Arc<Mutex<ChunkStore>>,
    prefetcher: Option<Arc<PrefetchManager>>,
    decoder_state: Option<DecoderState>,
    current_quality: Quality,
}

struct DecoderState {
    decoder: Box<dyn Decoder>,
    format_reader: Box<dyn FormatReader>,
    frame_count: usize,
}

impl AudioStreamer {
    pub fn new(store: Arc<Mutex<ChunkStore>>, prefetcher: Option<Arc<PrefetchManager>>) -> Self {
        Self {
            store,
            prefetcher,
            decoder_state: None,
            current_quality: Quality::Lofi,
        }
    }

    pub fn set_quality(&mut self, quality: Quality) {
        self.current_quality = quality;
    }

    pub fn load_track(&mut self, chunk_hashes: Vec<String>) -> Result<()> {
        if chunk_hashes.is_empty() {
            return Err(anyhow::anyhow!("No chunks provided"));
        }

        let source = ChunkReader::new(Arc::clone(&self.store), chunk_hashes, self.current_quality);
        let mss = MediaSourceStream::new(Box::new(source), MediaSourceStreamOptions::default());
        
        let probe = symphonia::default::get_probe();
        let fmt_opts = FormatOptions::default();
        let meta_opts = MetadataOptions::default();
        
        let probed = probe.format(
            &Hint::default(),
            mss,
            &fmt_opts,
            &meta_opts,
        ).map_err(|e| anyhow::anyhow!("Format probe failed: {:?}", e))?;
        
        let format_reader = probed.format;
        let track = format_reader.tracks().get(0)
            .context("No tracks found in audio source")?;
        
        let registry = symphonia::default::get_codecs();
        let decoder_opts = DecoderOptions::default();
        let decoder = registry.make(&track.codec_params, &decoder_opts)
            .map_err(|e| anyhow::anyhow!("Decoder creation failed: {:?}", e))?;
        
        self.decoder_state = Some(DecoderState {
            decoder,
            format_reader,
            frame_count: 0,
        });
        
        Ok(())
    }

    pub fn next_pcm_frame(&mut self) -> Result<Vec<f32>> {
        let state = self.decoder_state.as_mut().context("No track loaded")?;
        
        state.frame_count += 1;
        let pos = state.frame_count;
        if let Some(ref pf) = self.prefetcher {
            pf.update_position(pos / 100); // rough chunk estimate
        }

        let packet = match state.format_reader.next_packet() {
            Ok(p) => p,
            Err(e) => return Err(anyhow::anyhow!("Packet error: {:?}", e)),
        };

        let decoded = state.decoder.decode(&packet)
            .map_err(|e| anyhow::anyhow!("Decode error: {:?}", e))?;

        let buffer = decoded.borrow();
        
        match buffer {
            AudioBufferRef::F32(buf) => {
                let planes_wrapper = buf.planes();
                let planes = planes_wrapper.planes();
                if !planes.is_empty() {
                    Ok(planes[0].to_vec())
                } else {
                    Err(anyhow::anyhow!("No audio planes"))
                }
            }
            AudioBufferRef::S16(buf) => {
                let planes_wrapper = buf.planes();
                let planes = planes_wrapper.planes();
                if !planes.is_empty() {
                    Ok(planes[0].iter().map(|&s| s as f32 / 32768.0).collect())
                } else {
                    Err(anyhow::anyhow!("No audio planes"))
                }
            }
            _ => Err(anyhow::anyhow!("Unsupported sample format")),
        }
    }
}

struct ChunkReader {
    store: Arc<Mutex<ChunkStore>>,
    hashes: Vec<String>,
    pos: usize,
    chunk_offset: usize,
    quality: Quality,
}

impl ChunkReader {
    fn new(store: Arc<Mutex<ChunkStore>>, hashes: Vec<String>, quality: Quality) -> Self {
        Self { store, hashes, pos: 0, chunk_offset: 0, quality }
    }
}

impl Read for ChunkReader {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        if self.pos >= self.hashes.len() {
            return Ok(0);
        }

        let hash = &self.hashes[self.pos];
        let store = self.store.lock().unwrap();
        
        // Determine quality based on la-weighted access or ownership
        // In a real impl, we'd check the UserAccount's licenses
        let quality = self.quality;
        
        let chunk_data = store.get_chunk_by_original_hash(hash, quality)
            .map_err(|_| std::io::Error::new(std::io::ErrorKind::NotFound, "Chunk not found"))?;
        
        let remaining = chunk_data.len() - self.chunk_offset;
        let to_copy = std::cmp::min(remaining, buf.len());
        
        buf[..to_copy].copy_from_slice(&chunk_data[self.chunk_offset..self.chunk_offset + to_copy]);
        
        self.chunk_offset += to_copy;
        if self.chunk_offset >= chunk_data.len() {
            self.pos += 1;
            self.chunk_offset = 0;
        }
        
        Ok(to_copy)
    }
}

impl Seek for ChunkReader {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        match pos {
            SeekFrom::Start(offset) => {
                self.pos = (offset / (256 * 1024)) as usize;
                self.chunk_offset = (offset % (256 * 1024)) as usize;
                Ok(offset)
            }
            SeekFrom::Current(offset) => {
                let new_pos = (self.pos as u64 * 256 * 1024) + self.chunk_offset as u64 + offset as u64;
                self.pos = (new_pos / (256 * 1024)) as usize;
                self.chunk_offset = (new_pos % (256 * 1024)) as usize;
                Ok(new_pos)
            }
            SeekFrom::End(_offset) => {
                Err(std::io::Error::new(std::io::ErrorKind::Unsupported, "Seek from end not supported"))
            }
        }
    }
}

impl MediaSource for ChunkReader {
    fn is_seekable(&self) -> bool {
        true
    }

    fn byte_len(&self) -> Option<u64> {
        Some(self.hashes.len() as u64 * 256 * 1024)
    }
}
