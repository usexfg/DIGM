import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fuego_core/digm_core.dart';
import '../ffi/digm_core.dart';

class AudioPlayerService {
  final DigmCore _core;
  bool _isPlaying = false;
  StreamController<List<double>>? _pcmController;

  AudioPlayerService(this._core);

  void play() {
    _isPlaying = true;
    _pcmController = StreamController<List<double>>.broadcast();
    _startStreaming();
  }

  void loadTrack(List<String> hashes) {
    _core.play_track(hashes);
  }

  void pause() {
    _isPlaying = false;
    _pcmController?.close();
    _pcmController = null;
  }

  Stream<List<double>> get pcmStream => _pcmController?.stream ?? Stream.empty();

  void _startStreaming() {
    Timer.periodic(const Duration(milliseconds: 20), (timer) {
      if (!_isPlaying) {
        timer.cancel();
        return;
      }
      final frame = _core.next_pcm_frame();
      _pcmController?.add(frame);
    });
  }
}

final audioPlayerProvider = Provider<AudioPlayerService>((ref) {
  final core = ref.watch(digmCoreProvider);
  return AudioPlayerService(core);
});
