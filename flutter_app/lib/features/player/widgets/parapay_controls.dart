import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/digm_theme.dart';

/// 5-segment boost meter for the ParaPay player.
/// Each segment lights up on boost press. Full meter = full redirect.
class ParaPayBoostMeter extends StatelessWidget {
  final int pressesUsed;
  final int maxPresses;
  final VoidCallback? onBoost;
  final bool disabled;

  const ParaPayBoostMeter({
    super.key,
    this.pressesUsed = 0,
    this.maxPresses = 5,
    this.onBoost,
    this.disabled = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(maxPresses, (i) {
            final active = i < pressesUsed;
            return Container(
              width: 28,
              height: 6,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                color: active ? DigmTheme.fuchsia : DigmTheme.fuchsia.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(3),
              ),
            );
          }),
        ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: disabled ? null : onBoost,
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: disabled
                  ? null
                  : const RadialGradient(
                      colors: [Color(0xFFE040FB), Color(0xFF7B1FA2)],
                    ),
              color: disabled ? DigmTheme.fuchsia.withValues(alpha: 0.2) : null,
            ),
            child: Icon(
              Icons.bolt,
              color: disabled ? Colors.white24 : Colors.white,
              size: 24,
            ),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          '$pressesUsed / $maxPresses',
          style: const TextStyle(fontSize: 10, fontFamily: 'SpaceGrotesk', color: DigmTheme.fuchsiaLight),
        ),
      ],
    );
  }
}

/// Position display — shows current playback time without scrubber.
/// ParaPay disables seeking during streaming sessions.
class ParaPayPositionDisplay extends StatelessWidget {
  final Duration position;
  final Duration duration;
  final bool isParadio;

  const ParaPayPositionDisplay({
    super.key,
    required this.position,
    required this.duration,
    this.isParadio = false,
  });

  String _fmt(Duration d) {
    final mins = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final secs = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(_fmt(position), style: GoogleFonts.spaceGrotesk(
          fontSize: 12, color: Colors.white,
        )),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Container(
            width: 120,
            height: 2,
            decoration: BoxDecoration(
              color: DigmTheme.fuchsia.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(1),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: duration.inMilliseconds > 0
                  ? (position.inMilliseconds / duration.inMilliseconds).clamp(0.0, 1.0)
                  : 0.0,
              child: Container(
                decoration: BoxDecoration(
                  color: isParadio ? DigmTheme.fuchsia : DigmTheme.fuchsiaLight,
                  borderRadius: BorderRadius.circular(1),
                ),
              ),
            ),
          ),
        ),
        Text(_fmt(duration), style: GoogleFonts.spaceGrotesk(
          fontSize: 12, color: Colors.white54,
        )),
      ],
    );
  }
}
