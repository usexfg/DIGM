import 'track.dart';

enum PlaybackSource { paradio, preview, curationStation }
enum RepeatMode { none, one, all }

class PlayerState {
  final Track? currentTrack;
  final bool isPlaying;
  final Duration position;
  final Duration duration;
  final double volume;
  final double earnings;
  final RepeatMode repeatMode;
  final bool isShuffled;
  final PlaybackSource source;

  const PlayerState({
    this.currentTrack,
    this.isPlaying = false,
    this.position = Duration.zero,
    this.duration = Duration.zero,
    this.volume = 1.0,
    this.earnings = 0.0,
    this.repeatMode = RepeatMode.none,
    this.isShuffled = false,
    this.source = PlaybackSource.paradio,
  });

  bool get isParadio => source == PlaybackSource.paradio;

  double get earningsPerMinute => 0.042;

  double get earningsProgress {
    final goal = 1.0;
    return (earnings / goal).clamp(0.0, 1.0);
  }

  bool get volumeValid => volume >= 0.4;

  PlayerState copyWith({
    Track? currentTrack,
    bool? isPlaying,
    Duration? position,
    Duration? duration,
    double? volume,
    double? earnings,
    RepeatMode? repeatMode,
    bool? isShuffled,
    PlaybackSource? source,
    bool clearTrack = false,
  }) {
    return PlayerState(
      currentTrack: clearTrack ? null : currentTrack ?? this.currentTrack,
      isPlaying: isPlaying ?? this.isPlaying,
      position: position ?? this.position,
      duration: duration ?? this.duration,
      volume: volume ?? this.volume,
      earnings: earnings ?? this.earnings,
      repeatMode: repeatMode ?? this.repeatMode,
      isShuffled: isShuffled ?? this.isShuffled,
      source: source ?? this.source,
    );
  }
}
