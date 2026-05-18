import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:async';
import '../../../core/ffi/digm_core.dart';
import '../../../core/services/audio_player_service.dart';
import '../../../core/theme/digm_theme.dart';

class ParadioScreen extends ConsumerStatefulWidget {
  const ParadioScreen({super.key});

  @override
  ConsumerState<ParadioScreen> createState() => _ParadioScreenState();
}

class _ParadioScreenState extends ConsumerState<ParadioScreen> {
  double _earnings = 0.0;
  Timer? _earningsTimer;
  bool _isPlaying = false;
  String? _address;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _startEarningsPolling();
    });
  }

  void _startEarningsPolling() {
    _earningsTimer = Timer.periodic(const Duration(seconds: 3), (timer) async {
      try {
        final core = await ref.read(digmCoreProvider.future);
        final addr = _address ??= core.get_address(0);
        final earnings = core.get_current_earnings(addr);
        if (mounted) {
          setState(() {
            _earnings = earnings.toDouble() / 10000000;
          });
        }
      } catch (_) {}
    });
  }

  @override
  void dispose() {
    _earningsTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final audioPlayer = ref.watch(audioPlayerProvider);

    return Column(
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
              IconButton(
                icon: const Icon(Icons.sync, color: DigmTheme.textSecondary),
                onPressed: () => ref.read(digmCoreProvider.future).then((core) => core.sync_node()),
              ),
            ],
          ),
        ),

        const SizedBox(height: 8),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'The Sovereign Radio Station',
            style: TextStyle(
              fontFamily: 'Inter',
              color: DigmTheme.textSecondary,
              fontSize: 14,
            ),
          ),
        ),

        Expanded(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 200,
                  height: 200,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [DigmTheme.fuchsia, DigmTheme.darkPurple],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: DigmTheme.glassBorder, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: DigmTheme.fuchsia.withValues(alpha: 0.3),
                        blurRadius: 30,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.music_note, size: 80, color: Colors.white70),
                ),
                const SizedBox(height: 24),

                const Text(
                  'Fuego Waves',
                  style: TextStyle(
                    fontFamily: 'SpaceGrotesk',
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: DigmTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Anonymous',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    color: DigmTheme.textSecondary,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 48),

                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.replay_10, size: 32),
                      color: DigmTheme.textSecondary,
                      onPressed: () {},
                    ),
                    const SizedBox(width: 24),
                    Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(
                          colors: [DigmTheme.fuchsia, DigmTheme.fuchsiaLight],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: DigmTheme.fuchsia.withValues(alpha: 0.4),
                            blurRadius: 20,
                            offset: const Offset(0, 5),
                          ),
                        ],
                      ),
                      child: IconButton(
                        icon: Icon(
                          _isPlaying ? Icons.pause : Icons.play_arrow,
                          size: 48,
                        ),
                        color: Colors.white,
                        onPressed: () {
                          setState(() => _isPlaying = !_isPlaying);
                          if (_isPlaying) {
                            audioPlayer.loadTrack([
                              'hash_single-001_1', 'hash_single-001_2', 'hash_single-001_3',
                            ]);
                            audioPlayer.play();
                          } else {
                            audioPlayer.pause();
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 24),
                    IconButton(
                      icon: const Icon(Icons.forward_10, size: 32),
                      color: DigmTheme.textSecondary,
                      onPressed: () {},
                    ),
                  ],
                ),
                const SizedBox(height: 48),

                _EarningsCard(earnings: _earnings),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _EarningsCard extends StatelessWidget {
  final double earnings;
  const _EarningsCard({required this.earnings});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 20),
      decoration: BoxDecoration(
        color: DigmTheme.fuchsia.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: DigmTheme.glassBorder),
      ),
      child: Column(
        children: [
          const Text(
            'Current Earnings',
            style: TextStyle(
              fontFamily: 'Inter',
              color: DigmTheme.textSecondary,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${earnings.toStringAsFixed(4)} PARA',
            style: const TextStyle(
              fontFamily: 'SpaceGrotesk',
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: DigmTheme.fuchsiaLight,
            ),
          ),
        ],
      ),
    );
  }
}
