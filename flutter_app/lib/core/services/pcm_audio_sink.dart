import 'dart:async';
import 'dart:typed_data';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

const int _sampleRate = 48000;
const int _channels = 1;
const int _bitsPerSample = 16;
const int _samplesPerFrame = 480;
const int _framesPerSegment = 100;

class PcmAudioSink {
  final AudioPlayer _player = AudioPlayer();
  final List<double> _buffer = [];
  bool _isPlaying = false;
  StreamSubscription<List<double>>? _subscription;
  Timer? _flushTimer;

  void start(Stream<List<double>> pcmStream) {
    _subscription = pcmStream.listen(_onPcmFrame, onDone: _onStreamDone);
    _flushTimer = Timer.periodic(
      const Duration(milliseconds: 100),
      (_) => _flushBuffer(),
    );
  }

  void _onPcmFrame(List<double> frame) {
    _buffer.addAll(frame);
  }

  void _onStreamDone() {
    _flushBuffer();
    _flushTimer?.cancel();
  }

  void _flushBuffer() {
    if (_buffer.length < _samplesPerFrame) return;

    final segment = _buffer.take(_framesPerSegment * _samplesPerFrame).toList();
    _buffer.removeRange(0, segment.length);

    final wavBytes = _encodeWav(segment);
    _playWav(wavBytes);
  }

  Uint8List _encodeWav(List<double> samples) {
    final pcm = Int16List(samples.length);
    for (int i = 0; i < samples.length; i++) {
      pcm[i] = (samples[i].clamp(-1.0, 1.0) * 32767).toInt();
    }

    final dataSize = pcm.length * 2;
    final totalSize = 44 + dataSize;
    final output = DataWriter(totalSize);

    output.writeString('RIFF');
    output.writeInt32(totalSize - 8);
    output.writeString('WAVE');
    output.writeString('fmt ');
    output.writeInt32(16);
    output.writeInt16(1);
    output.writeInt16(_channels);
    output.writeInt32(_sampleRate);
    output.writeInt32(_sampleRate * _channels * _bitsPerSample ~/ 8);
    output.writeInt16(_channels * _bitsPerSample ~/ 8);
    output.writeInt16(_bitsPerSample);
    output.writeString('data');
    output.writeInt32(dataSize);

    for (final s in pcm) {
      output.writeInt16(s);
    }

    return output.bytes;
  }

  void _playWav(Uint8List wavBytes) async {
    try {
      final source = BytesSource(wavBytes);
      if (!_isPlaying) {
        await _player.play(source);
        _isPlaying = true;
      } else {
        await _player.play(source);
      }
    } catch (e) {
      debugPrint('PCM playback error: $e');
    }
  }

  void pause() {
    _player.pause();
    _isPlaying = false;
  }

  void resume() {
    _player.resume();
    _isPlaying = true;
  }

  void stop() {
    _subscription?.cancel();
    _flushTimer?.cancel();
    _player.stop();
    _player.dispose();
    _buffer.clear();
    _isPlaying = false;
  }
}

class DataWriter {
  final Uint8List bytes;
  int offset = 0;

  DataWriter(int size) : bytes = Uint8List(size);

  void writeString(String s) {
    for (int i = 0; i < s.length; i++) {
      bytes[offset++] = s.codeUnitAt(i);
    }
  }

  void writeInt32(int value) {
    bytes[offset++] = value & 0xff;
    bytes[offset++] = (value >> 8) & 0xff;
    bytes[offset++] = (value >> 16) & 0xff;
    bytes[offset++] = (value >> 24) & 0xff;
  }

  void writeInt16(int value) {
    bytes[offset++] = value & 0xff;
    bytes[offset++] = (value >> 8) & 0xff;
  }
}
