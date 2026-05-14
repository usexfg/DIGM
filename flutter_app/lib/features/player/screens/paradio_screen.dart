import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/ffi/digm_core.dart';
import '../../../core/services/audio_player_service.dart';
import 'dart:async';

class ParadioScreen extends ConsumerStatefulWidget {
  const ParadioScreen({super.key});

  @override
  ConsumerState<ParadioScreen> createState() => _ParadioScreenState();
}

class _ParadioScreenState extends ConsumerState<ParadioScreen> {
  double _earnings = 0.0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startRewardTicker();
  }

  void _startRewardTicker() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      final core = ref.read(digmCoreProvider);
      // Correctly call the FFI method
      setState(() {
        _earnings = core.get_current_earnings('dummy_address').toDouble();
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final audioPlayer = ref.watch(audioPlayerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('ParaDio'),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: () {
              ref.read(digmCoreProvider).sync_node();
            },
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.music_note, size: 100, color: Colors.blue),
            const SizedBox(height: 24),
            Text(
              'Now Playing: Fuego Waves',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const Text('Artist: Anonymous'),
            const SizedBox(height: 48),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(icon: const Icon(Icons.replay_10), onPressed: () {}),
                 IconButton(
                   icon: const Icon(Icons.play_arrow, size: 64),
                   onPressed: () {
                     // Load dummy chunks for the a demo track
                     audioPlayer.loadTrack([
                       'hash1', 'hash2', 'hash3', 'hash4', 'hash5'
                     ]);
                     audioPlayer.play();
                   },
                 ),

                IconButton(icon: const Icon(Icons.forward_10), onPressed: () {}),
              ],
            ),
            const SizedBox(height: 48),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  const Text('Current Earnings', style: TextStyle(fontSize: 14)),
                  Text(
                    '${_earnings.toStringAsFixed(4)} PARA',
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.blue),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
