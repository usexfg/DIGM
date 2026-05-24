import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/digm_theme.dart';
import '../providers/player_provider.dart';
import '../widgets/live_waveform.dart';
import '../widgets/para_meter_bar.dart';
import '../widgets/para_meter_ring.dart';

class ParadioScreen extends ConsumerStatefulWidget {
  const ParadioScreen({super.key});

  @override
  ConsumerState<ParadioScreen> createState() => _ParadioScreenState();
}

class _ParadioScreenState extends ConsumerState<ParadioScreen> {
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(playerProvider);
    final track = state.currentTrack;

    return Stack(
      children: [
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  DigmTheme.darkPurple,
                  DigmTheme.black,
                ],
              ),
            ),
          ),
        ),
        if (track?.albumArtUrl != null)
          Positioned.fill(
            child: ClipRRect(
              child: ImageFiltered(
                imageFilter: ImageFilter.blur(sigmaX: 40, sigmaY: 40),
                child: Image.network(
                  track!.albumArtUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            ),
          ),
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.6),
                ],
              ),
            ),
          ),
        ),
        SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    ShaderMask(
                      shaderCallback: DigmTheme.gradientShader,
                      child: const Text(
                        'ParaDio',
                        style: TextStyle(
                          fontFamily: 'SpaceGrotesk',
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    Row(
                      children: [
                        Text(
                          '${state.earnings.toStringAsFixed(4)}',
                          style: const TextStyle(
                            fontFamily: 'SpaceGrotesk',
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: DigmTheme.fuchsiaLight,
                          ),
                        ),
                        const SizedBox(width: 4),
                        const Text(
                          'PARA',
                          style: TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 10,
                            color: DigmTheme.textMuted,
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.sync, color: DigmTheme.textSecondary, size: 20),
                          onPressed: () {},
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'The Sovereign Radio Station',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      color: DigmTheme.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
              const Spacer(),
              SizedBox(
                width: 180,
                height: 180,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CustomPaint(
                      size: const Size(180, 180),
                      painter: ParaMeterRing(
                        progress: state.earningsProgress,
                        earnings: state.earnings,
                      ),
                    ),
                    Container(
                      width: 150,
                      height: 150,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        gradient: const LinearGradient(
                          colors: [DigmTheme.fuchsia, DigmTheme.darkPurple],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        border: Border.all(color: DigmTheme.glassBorder, width: 2),
                        image: track?.albumArtUrl != null
                            ? DecorationImage(
                                image: NetworkImage(track!.albumArtUrl!),
                                fit: BoxFit.cover,
                              )
                            : null,
                        boxShadow: [
                          BoxShadow(
                            color: DigmTheme.fuchsia.withValues(alpha: 0.3),
                            blurRadius: 30,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: track?.albumArtUrl == null
                          ? const Center(
                              child: Icon(Icons.wifi_tethering, size: 60, color: Colors.white54),
                            )
                          : null,
                    ),
                    if (state.isParadio)
                      Positioned(
                        top: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: DigmTheme.fuchsia.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: DigmTheme.glassBorder),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.wifi_tethering, size: 12, color: DigmTheme.fuchsiaLight),
                              SizedBox(width: 4),
                              Text(
                                'LIVE',
                                style: TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: DigmTheme.fuchsiaLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              Text(
                track?.title ?? 'Fuego Waves',
                style: const TextStyle(
                  fontFamily: 'SpaceGrotesk',
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: DigmTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                track?.artist ?? 'Anonymous',
                style: const TextStyle(
                  fontFamily: 'Inter',
                  color: DigmTheme.textSecondary,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 20),
              const SizedBox(
                height: 48,
                child: LiveWaveform(height: 48, barCount: 64),
              ),
              const SizedBox(height: 20),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: ParaMeterBar(
                  earnings: state.earnings,
                  progress: state.earningsProgress,
                ),
              ),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ],
    );
  }
}
