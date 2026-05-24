import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/audio_player_service.dart';
import '../../../core/theme/digm_theme.dart';
import 'waveform_painter.dart';

class LiveWaveform extends ConsumerStatefulWidget {
  final double height;
  final int barCount;

  const LiveWaveform({
    super.key,
    this.height = 48,
    this.barCount = 48,
  });

  @override
  ConsumerState<LiveWaveform> createState() => _LiveWaveformState();
}

class _LiveWaveformState extends ConsumerState<LiveWaveform> {
  final List<double> _bins = [];
  StreamSubscription<List<double>>? _sub;

  @override
  void initState() {
    super.initState();
    _bins.addAll(List.filled(widget.barCount, 0.05));
    _startListening();
  }

  void _startListening() {
    final service = ref.read(audioPlayerProvider);
    _sub = service.pcmStream.listen((frame) {
      if (!mounted) return;
      final binSize = max(1, frame.length ~/ widget.barCount);
      for (var i = 0; i < widget.barCount && i * binSize < frame.length; i++) {
        final start = i * binSize;
        final end = min(start + binSize, frame.length);
        var sum = 0.0;
        for (var j = start; j < end; j++) {
          sum += frame[j].abs();
        }
        final avg = sum / (end - start);
        _bins[i] = _bins[i] * 0.7 + avg.clamp(0.0, 1.0) * 0.3;
      }
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: widget.height,
      child: CustomPaint(
        size: Size.infinite,
        painter: WaveformPainter(amplitudes: List.from(_bins)),
      ),
    );
  }
}


