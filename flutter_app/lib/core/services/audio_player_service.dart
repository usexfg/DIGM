import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fuego_core/digm_core.dart';
import '../ffi/digm_core.dart';

class AudioPlayerService {
  final DigmCore _core;
  bool _isPlaying = false;
  Timer? _streamTimer;
  StreamController<List<double>>? _pcmController;
  int _frameCount = 0;

  AudioPlayerService(this._core);

  bool get isPlaying => _isPlaying;
  Duration get position => Duration(milliseconds: _frameCount * 20);
  int get frameCount => _frameCount;
  Stream<List<double>> get pcmStream =>
      _pcmController?.stream ?? const Stream.empty();

  void play() {
    if (_isPlaying) return;
    _isPlaying = true;
    _pcmController?.close();
    _pcmController = StreamController<List<double>>.broadcast();
    _startStreaming();
  }

  void loadTrack(List<String> hashes) {
    pause();
    _frameCount = 0;
    _core.play_track(hashes);
  }

  void pause() {
    _isPlaying = false;
    _streamTimer?.cancel();
    _streamTimer = null;
  }

  void stop() {
    pause();
    _pcmController?.close();
    _pcmController = null;
  }

  void _startStreaming() {
    _streamTimer = Timer.periodic(const Duration(milliseconds: 20), (timer) {
      if (!_isPlaying) {
        timer.cancel();
        return;
      }
      try {
        final frame = _core.next_pcm_frame();
        _pcmController?.add(frame);
        _frameCount++;
      } catch (_) {
        timer.cancel();
        _isPlaying = false;
      }
    });
  }

  void dispose() {
    stop();
  }
}

final audioPlayerProvider = Provider<AudioPlayerService>((ref) {
  final coreAsync = ref.watch(digmCoreProvider);
  final core = coreAsync.valueOrNull;
  if (core == null) throw StateError('DigmCore not initialized');
  final service = AudioPlayerService(core);
  ref.onDispose(() => service.dispose());
  return service;
});
