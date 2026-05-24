import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/ffi/digm_core.dart';
import '../../../core/theme/digm_theme.dart';
import '../../player/models/track.dart';
import '../../player/providers/player_provider.dart';

class SinglePool {
  final String id;
  final String albumId;
  final int totalPara;
  final int votes;

  SinglePool({required this.id, required this.albumId, required this.totalPara, required this.votes});

  factory SinglePool.fromJson(Map<String, dynamic> json) {
    return SinglePool(
      id: json['track_id'] as String,
      albumId: json['album_id'] as String,
      totalPara: json['total_para'] as int,
      votes: json['votes'] as int,
    );
  }
}

class DiscoveryScreen extends ConsumerStatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  ConsumerState<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends ConsumerState<DiscoveryScreen> {
  List<SinglePool> _singlePools = [];
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadPools());
  }

  Future<void> _loadPools() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final core = await ref.read(digmCoreProvider.future);
      final poolsJson = core.get_single_pools();
      final List<dynamic> decoded = jsonDecode(poolsJson);
      if (mounted) {
        setState(() {
          _singlePools = decoded.map((e) => SinglePool.fromJson(e as Map<String, dynamic>)).toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _playTrack(String trackId, String albumId) {
    final track = Track(
      id: trackId,
      title: trackId,
      artist: 'Artist',
      albumId: albumId,
      chunkHashes: [
        'hash_${albumId}_${trackId}_1',
        'hash_${albumId}_${trackId}_2',
        'hash_${albumId}_${trackId}_3',
      ],
    );
    ref.read(playerProvider.notifier).playTrack(track);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Streaming $trackId...'),
        backgroundColor: DigmTheme.fuchsia,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Row(
            children: [
              ShaderMask(
                shaderCallback: DigmTheme.gradientShader,
                child: const Text(
                  'Discover',
                  style: TextStyle(
                    fontFamily: 'SpaceGrotesk',
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.refresh, color: DigmTheme.textSecondary),
                onPressed: _isLoading ? null : _loadPools,
              ),
            ],
          ),
        ),
        Expanded(
          child: _buildContent(),
        ),
      ],
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: DigmTheme.fuchsiaLight),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: DigmTheme.error),
            const SizedBox(height: 16),
            Text(
              'Failed to load pools',
              style: TextStyle(color: DigmTheme.textSecondary, fontSize: 16),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _loadPools,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_singlePools.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.music_note, size: 64, color: DigmTheme.textMuted.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            const Text(
              'No active single pools',
              style: TextStyle(color: DigmTheme.textSecondary, fontSize: 16),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: _singlePools.length,
      itemBuilder: (context, index) {
        final pool = _singlePools[index];
        final paraDisplay = (pool.totalPara / 10000000).toStringAsFixed(1);
        return Container(
          key: ValueKey(pool.id),
          margin: const EdgeInsets.only(bottom: 12),
          decoration: DigmTheme.glassContainer(),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [DigmTheme.fuchsia, DigmTheme.darkPurple],
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.music_note, color: Colors.white70, size: 24),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        pool.id,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontWeight: FontWeight.w600,
                          color: DigmTheme.textPrimary,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Album: ${pool.albumId}',
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          color: DigmTheme.textSecondary,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '$paraDisplay PARA',
                      style: const TextStyle(
                        fontFamily: 'SpaceGrotesk',
                        color: DigmTheme.fuchsiaLight,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.favorite, size: 12, color: DigmTheme.textMuted),
                        const SizedBox(width: 4),
                        Text(
                          '${pool.votes}',
                          style: const TextStyle(
                            color: DigmTheme.textMuted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.play_circle_fill, size: 36),
                  color: DigmTheme.fuchsiaLight,
                  onPressed: () => _playTrack(pool.id, pool.albumId),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
