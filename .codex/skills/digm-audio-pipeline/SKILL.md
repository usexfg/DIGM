# Skill: digm-audio-pipeline

## Purpose
This skill provides a specialized workflow for debugging, profiling, and optimizing the end-to-end audio data pipeline in DIGM, from I2P retrieval to PCM output.

## When to Use
Use this skill when:
- Implementing or fixing audio playback logic in `fuego-audio`.
- Optimizing the `PrefetchManager` in `i2p-net` to reduce buffering.
- Debugging chunk retrieval errors in `chunk-store`.
- Resolving audio glitches, pops, or synchronization issues in the Flutter app.

## Workflow

### 1. I2P Retrieval Trace
Verify that chunks are being requested in the correct order and that the `I2pStream` is providing data without excessive latency. Check the `i2p-net` logs for garlic routing delays.

### 2. Chunk Store Offset Validation
Ensure that the `ChunkReader` is correctly calculating offsets and lengths when reading from the SQLite-backed `ChunkStore`. Validate that the seek operations match the expected audio frame boundaries.

### 3. Decoder State Analysis
Monitor the `Symphonia` decoder state transitions. Ensure that the `AudioStreamer` is correctly handling format probes and that the sample rate conversion (if any) is stable.

### 4. PCM Output Verification
Validate that the PCM frames being passed through the FFI bridge to the Flutter `AudioPlayerService` are well-formed and correctly normalized.

## Guardrails
- **Buffer Underruns**: Always prioritize predictive pre-fetching for the next 3-5 chunks to mitigate I2P's inherent latency.
- **Memory Leaks**: Monitor the `ChunkStore` LRU cache to ensure audio chunks are evicted correctly and not bloating the mobile device's storage.
- **Symphonia API**: Always verify the latest `symphonia` crate version to avoid API mismatches during decoding loop implementation.
