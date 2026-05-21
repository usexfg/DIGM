import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/ffi/digm_core.dart';
import '../../../core/theme/digm_theme.dart';

class LeaderboardScreen extends ConsumerStatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  ConsumerState<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends ConsumerState<LeaderboardScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  List<Map<String, dynamic>> _albums = [];
  List<Map<String, dynamic>> _singles = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final core = await ref.read(digmCoreProvider.future);
      final rankingsJson = core.get_album_rankings();
      final poolsJson = core.get_single_pools();
      if (mounted) {
        setState(() {
          _albums = List<Map<String, dynamic>>.from(jsonDecode(rankingsJson));
          _singles = List<Map<String, dynamic>>.from(jsonDecode(poolsJson));
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: Row(
            children: [
              ShaderMask(
                shaderCallback: DigmTheme.gradientShader,
                child: const Text(
                  'Charts',
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
                onPressed: _isLoading ? null : _loadData,
              ),
            ],
          ),
        ),
        TabBar(
          controller: _tabController,
          labelColor: DigmTheme.fuchsiaLight,
          unselectedLabelColor: DigmTheme.textSecondary,
          indicatorColor: DigmTheme.fuchsia,
          tabs: const [
            Tab(text: 'Albums'),
            Tab(text: 'Singles'),
          ],
        ),
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: DigmTheme.fuchsiaLight))
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildAlbumList(),
                    _buildSingleList(),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildAlbumList() {
    if (_albums.isEmpty) {
      return const Center(
        child: Text('No albums yet', style: TextStyle(color: DigmTheme.textSecondary)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _albums.length,
      itemBuilder: (context, index) {
        final album = _albums[index];
        return _ChartTile(
          rank: '#${album['rank']}',
          title: album['title'] as String? ?? '',
          subtitle: 'Sales: ${(album['total_sales'] as num?)?.toString() ?? '0'}',
          accent: DigmTheme.fuchsiaLight,
        );
      },
    );
  }

  Widget _buildSingleList() {
    if (_singles.isEmpty) {
      return const Center(
        child: Text('No singles yet', style: TextStyle(color: DigmTheme.textSecondary)),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _singles.length,
      itemBuilder: (context, index) {
        final single = _singles[index];
        final para = (single['total_para'] as num?) ?? 0;
        final votes = (single['votes'] as num?) ?? 0;
        return _ChartTile(
          rank: single['track_id'] as String? ?? '',
          title: single['track_id'] as String? ?? '',
          subtitle: '${(para.toInt() / 10000000).toStringAsFixed(1)} PARA · $votes votes',
          accent: DigmTheme.textSecondary,
        );
      },
    );
  }
}

class _ChartTile extends StatelessWidget {
  final String rank;
  final String title;
  final String subtitle;
  final Color accent;

  const _ChartTile({
    required this.rank,
    required this.title,
    required this.subtitle,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: DigmTheme.glassContainer(),
      child: Row(
        children: [
          SizedBox(
            width: 40,
            child: Text(
              rank,
              style: TextStyle(
                fontFamily: 'SpaceGrotesk',
                fontWeight: FontWeight.bold,
                color: accent,
                fontSize: 15,
              ),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w600,
                    color: DigmTheme.textPrimary,
                    fontSize: 15,
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    color: DigmTheme.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          const Icon(Icons.chevron_right, color: DigmTheme.textMuted, size: 20),
        ],
      ),
    );
  }
}
