import 'dart:math';
import 'package:flutter/material.dart';
import '../../../core/theme/digm_theme.dart';

class WaveformPainter extends CustomPainter {
  final List<double> amplitudes;
  final Color color;

  WaveformPainter({
    this.amplitudes = const [],
    this.color = DigmTheme.fuchsiaLight,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (amplitudes.isEmpty) return;

    final paint = Paint()
      ..shader = const LinearGradient(
        colors: [DigmTheme.fuchsia, DigmTheme.fuchsiaLight],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height))
      ..strokeCap = StrokeCap.round;

    final barCount = amplitudes.length;
    final barWidth = size.width / (barCount * 1.5);
    final gap = barWidth * 0.5;
    final midY = size.height / 2;

    for (var i = 0; i < barCount; i++) {
      final x = i * (barWidth + gap) + gap;
      final amp = amplitudes[i].clamp(0.0, 1.0);
      final barHeight = max(2.0, amp * size.height * 0.8);
      paint.strokeWidth = barWidth;

      canvas.drawLine(
        Offset(x, midY - barHeight / 2),
        Offset(x, midY + barHeight / 2),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(WaveformPainter oldDelegate) =>
      oldDelegate.amplitudes != amplitudes;
}
