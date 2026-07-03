import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../ffi/digm_core.dart';
import 'pcm_audio_sink.dart';

class AudioPlayerService {
  final DigmCore _core;
  bool _isPlaying = false;
  Timer? _streamTimer;
  StreamController<List<double>>? _pcmController;
  PcmAudioSink? _pcmSink;
  int _frameCount = 0;

  // ParaPay state
  String? _parapayStreamId;
  int _lastTickSec = 0;

  AudioPlayerService(this._core);

  bool get isPlaying => _isPlaying;
  Duration get position => Duration(milliseconds: _frameCount * 20);
  int get frameCount => _frameCount;
  String? get parapayStreamId => _parapayStreamId;
  Stream<List<double>> get pcmStream =>
      _pcmController?.stream ?? const Stream.empty();

  void play() {
    if (_isPlaying) return;
    _isPlaying = true;
    _lastTickSec = 0;
    _pcmController?.close();
    _pcmController = StreamController<List<double>>.broadcast();
    _pcmSink = PcmAudioSink();
    _pcmSink!.start(pcmStream);
    _startStreaming();
  }

  void loadTrack(List<String> hashes, {int trackLengthSec = 180}) {
    pause();
    _frameCount = 0;
    _lastTickSec = 0;
    _core.load_track(hashes);

    // Begin ParaPay session for this track
    try {
      _parapayStreamId = _core.parapay_begin(trackLengthSec);
      debugPrint('ParaPay session: $_parapayStreamId');
    } catch (e) {
      debugPrint('ParaPay begin failed: $e');
      _parapayStreamId = null;
    }
  }

  void pause() {
    _isPlaying = false;
    _streamTimer?.cancel();
    _streamTimer = null;
    _pcmSink?.pause();
    _endParapay(skipped: true);
  }

  void stop() {
    pause();
    _pcmSink?.stop();
    _pcmSink = null;
    _pcmController?.close();
    _pcmController = null;
  }

  void _startStreaming() {
    _streamTimer = Timer.periodic(const Duration(milliseconds: 20), (timer) async {
      if (!_isPlaying) {
        timer.cancel();
        return;
      }
      try {
        final frame = await _core.next_pcm_frame();
        _pcmController?.add(frame);
        _frameCount++;

        // ParaPay per-second tick
        final posSec = (_frameCount * 20) ~/ 1000;
        if (posSec > _lastTickSec && _parapayStreamId != null) {
          _lastTickSec = posSec;
          _core.parapay_tick(_parapayStreamId!, posSec);
        }
      } catch (_) {
        timer.cancel();
        _isPlaying = false;
        _endParapay(skipped: false);
      }
    });
  }

  void _endParapay({bool skipped = false}) {
    if (_parapayStreamId != null) {
      _core.parapay_end(_parapayStreamId!, skipped: skipped);
      _parapayStreamId = null;
      _lastTickSec = 0;
    }
  }

  /// Apply a boost press. Returns presses used.
  int boost() {
    if (_parapayStreamId == null) return 0;
    return _core.parapay_boost(_parapayStreamId!);
  }

  void dispose() {
    _endParapay(skipped: true);
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
