import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fuego_core/digm_core.dart';
import '../../../core/ffi/digm_core.dart';
import '../../../core/services/audio_player_service.dart';
import '../models/player_state.dart';
import '../models/track.dart';

class PlayerNotifier extends StateNotifier<PlayerState> {
  final AudioPlayerService _audioPlayer;
  final DigmCore _core;
  final String _address;
  Timer? _earningsTimer;
  Timer? _positionTimer;

  static const Track _paradioTrack = Track(
    id: 'paradio_live',
    title: 'Fuego Waves',
    artist: 'Anonymous',
    chunkHashes: [
      'hash_single-001_1',
      'hash_single-001_2',
      'hash_single-001_3',
    ],
  );

  PlayerNotifier(this._audioPlayer, this._core, this._address)
      : super(const PlayerState()) {
    _startEarningsPolling();
    _startPositionTracking();
  }

  void tuneInToParadio() {
    if (state.isPlaying && state.isParadio) return;
    _play(_paradioTrack, PlaybackSource.paradio);
  }

  void playTrack(Track track) {
    _play(track, PlaybackSource.preview);
  }

  void _play(Track track, PlaybackSource source) {
    _audioPlayer.loadTrack(track.chunkHashes);
    _audioPlayer.play();
    state = state.copyWith(
      currentTrack: track,
      isPlaying: true,
      position: Duration.zero,
      source: source,
    );
  }

  void pause() {
    _audioPlayer.pause();
    state = state.copyWith(isPlaying: false);
  }

  void resume() {
    _audioPlayer.play();
    state = state.copyWith(isPlaying: true);
  }

  void setVolume(double vol) {
    state = state.copyWith(volume: vol.clamp(0.0, 1.0));
  }

  void _startEarningsPolling() {
    _earningsTimer = Timer.periodic(const Duration(seconds: 3), (_) async {
      try {
        final raw = _core.get_current_earnings(_address);
        final para = raw.toDouble() / 10000000;
        if (state.earnings != para) {
          state = state.copyWith(earnings: para);
        }
      } catch (_) {}
    });
  }

  void _startPositionTracking() {
    _positionTimer = Timer.periodic(const Duration(milliseconds: 100), (_) {
      if (!state.isPlaying) return;
      final pos = _audioPlayer.position;
      state = state.copyWith(position: pos);
    });
  }

  @override
  void dispose() {
    _earningsTimer?.cancel();
    _positionTimer?.cancel();
    _audioPlayer.dispose();
    super.dispose();
  }
}

final playerProvider =
    StateNotifierProvider<PlayerNotifier, PlayerState>((ref) {
  final coreAsync = ref.watch(digmCoreProvider);
  final core = coreAsync.valueOrNull;
  if (core == null) throw StateError('DigmCore not initialized');
  final audioPlayer = ref.watch(audioPlayerProvider);
  final address = core.get_address(0);
  return PlayerNotifier(audioPlayer, core, address);
});
