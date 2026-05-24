import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/audio_player_service.dart';
import '../../../core/theme/digm_theme.dart';
import '../providers/player_provider.dart';
import 'waveform_painter.dart';

class PlayerBar extends ConsumerWidget {
  final VoidCallback? onTap;

  const PlayerBar({super.key, this.onTap});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(playerProvider);
    if (state.currentTrack == null || !state.isPlaying) {
      return const SizedBox.shrink();
    }

    return GestureDetector(
      onTap: onTap,
      child: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.6),
              border: const Border(
                top: BorderSide(color: DigmTheme.glassBorder),
                bottom: BorderSide(color: DigmTheme.glassBorder),
              ),
            ),
            child: state.isParadio
                ? _ParadioMode(state: state)
                : _PreviewMode(state: state),
          ),
        ),
      ),
    );
  }
}

class _ParadioMode extends ConsumerWidget {
  final dynamic state; // PlayerState

  const _ParadioMode({required this.state});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [DigmTheme.fuchsia, DigmTheme.darkPurple],
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.wifi_tethering, size: 20, color: Colors.white70),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'ParaDio',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: DigmTheme.fuchsiaLight,
                ),
              ),
              Text(
                state.currentTrack?.title ?? '',
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 11,
                  color: DigmTheme.textMuted,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        const PlayerBarWaveform(),
        const SizedBox(width: 8),
        const Text(
          '►',
          style: TextStyle(
            color: DigmTheme.fuchsiaLight,
            fontSize: 10,
          ),
        ),
        Text(
          '${state.earnings.toStringAsFixed(3)}',
          style: const TextStyle(
            fontFamily: 'SpaceGrotesk',
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: DigmTheme.fuchsiaLight,
          ),
        ),
        const SizedBox(width: 4),
        const Text(
          'PARA',
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 9,
            color: DigmTheme.textMuted,
          ),
        ),
      ],
    );
  }
}

class _PreviewMode extends ConsumerWidget {
  final dynamic state;

  const _PreviewMode({required this.state});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(playerProvider.notifier);
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [DigmTheme.fuchsia, DigmTheme.darkPurple],
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.music_note, size: 20, color: Colors.white70),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                state.currentTrack?.title ?? '',
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: DigmTheme.textPrimary,
                ),
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                state.currentTrack?.artist ?? '',
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 11,
                  color: DigmTheme.textMuted,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        IconButton(
          icon: Icon(
            state.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
            size: 28,
          ),
          color: DigmTheme.fuchsiaLight,
          onPressed: () {
            if (state.isPlaying) {
              notifier.pause();
            } else {
              notifier.resume();
            }
          },
        ),
      ],
    );
  }
}

class PlayerBarWaveform extends ConsumerStatefulWidget {
  const PlayerBarWaveform({super.key});

  @override
  ConsumerState<PlayerBarWaveform> createState() => _PlayerBarWaveformState();
}

class _PlayerBarWaveformState extends ConsumerState<PlayerBarWaveform> {
  final List<double> _bins = [0.1, 0.05, 0.15, 0.05, 0.1];
  StreamSubscription<List<double>>? _sub;

  @override
  void initState() {
    super.initState();
    _startListening();
  }

  void _startListening() {
    try {
      final service = ref.read(audioPlayerProvider);
      _sub = service.pcmStream.listen((frame) {
        if (!mounted) return;
        for (var i = 0; i < _bins.length; i++) {
          final idx = (frame.length ~/ _bins.length * i).clamp(0, frame.length - 1);
          final val = frame[idx].abs();
          _bins[i] = _bins[i] * 0.6 + val.clamp(0.0, 1.0) * 0.4;
        }
        if (mounted) setState(() {});
      });
    } catch (_) {}
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 32,
      height: 16,
      child: CustomPaint(
        painter: WaveformPainter(
          amplitudes: List.from(_bins),
          color: DigmTheme.fuchsiaLight,
        ),
      ),
    );
  }
}
