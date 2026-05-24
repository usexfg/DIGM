import 'package:flutter/material.dart';
import '../../../core/theme/digm_theme.dart';

class ParaMeterBar extends StatelessWidget {
  final double earnings;
  final double progress;

  const ParaMeterBar({
    super.key,
    required this.earnings,
    required this.progress,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: DigmTheme.fuchsia.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: DigmTheme.glassBorder),
      ),
      child: Column(
        children: [
          const Row(
            children: [
              Text(
                'Current Earnings',
                style: TextStyle(
                  fontFamily: 'Inter',
                  color: DigmTheme.textSecondary,
                  fontSize: 14,
                ),
              ),
              Spacer(),
              Text(
                'PARA',
                style: TextStyle(
                  fontFamily: 'Inter',
                  color: DigmTheme.textMuted,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '${earnings.toStringAsFixed(4)}',
            style: const TextStyle(
              fontFamily: 'SpaceGrotesk',
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: DigmTheme.fuchsiaLight,
            ),
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: Stack(
              children: [
                Container(
                  height: 6,
                  decoration: BoxDecoration(
                    color: DigmTheme.textMuted.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
                FractionallySizedBox(
                  widthFactor: progress.clamp(0.0, 1.0),
                  child: Container(
                    height: 6,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [DigmTheme.fuchsia, DigmTheme.fuchsiaLight],
                      ),
                      borderRadius: BorderRadius.circular(3),
                      boxShadow: [
                        BoxShadow(
                          color: DigmTheme.fuchsia.withValues(alpha: 0.4),
                          blurRadius: 8,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              '${(progress * 100).toStringAsFixed(1)}% toward next PARA',
              style: const TextStyle(
                fontFamily: 'Inter',
                color: DigmTheme.textMuted,
                fontSize: 11,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
