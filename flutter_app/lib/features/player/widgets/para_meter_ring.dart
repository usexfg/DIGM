import 'dart:math';
import 'package:flutter/material.dart';
import '../../../core/theme/digm_theme.dart';

class ParaMeterRing extends CustomPainter {
  final double progress;
  final double earnings;

  ParaMeterRing({
    this.progress = 0.0,
    this.earnings = 0.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = min(size.width, size.height) / 2;
    final strokeWidth = 4.0;

    final bgPaint = Paint()
      ..color = DigmTheme.glassBorder
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    canvas.drawCircle(center, radius - strokeWidth, bgPaint);

    final arcPaint = Paint()
      ..shader = const LinearGradient(
        colors: [DigmTheme.fuchsia, DigmTheme.fuchsiaLight],
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    final sweepAngle = 2 * pi * progress.clamp(0.0, 1.0);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius - strokeWidth),
      -pi / 2,
      sweepAngle,
      false,
      arcPaint,
    );

    if (progress > 0) {
      final dotPaint = Paint()
        ..color = DigmTheme.fuchsiaLight
        ..style = PaintingStyle.fill;
      final dotAngle = -pi / 2 + sweepAngle;
      final dotX = center.dx + (radius - strokeWidth) * cos(dotAngle);
      final dotY = center.dy + (radius - strokeWidth) * sin(dotAngle);
      canvas.drawCircle(Offset(dotX, dotY), 3, dotPaint);
    }

    final glowPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          DigmTheme.fuchsia.withValues(alpha: 0.15 * progress),
          DigmTheme.fuchsia.withValues(alpha: 0),
        ],
      ).createShader(Rect.fromCircle(center: center, radius: radius + 20));
    canvas.drawCircle(center, radius + 20, glowPaint);
  }

  @override
  bool shouldRepaint(ParaMeterRing oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.earnings != earnings;
}
