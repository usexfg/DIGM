import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/ffi/digm_core.dart';
import '../../../core/theme/digm_theme.dart';

class AlbumInfo {
  final String albumId;
  final String title;
  final int totalSales;
  final int rank;

  AlbumInfo({
    required this.albumId,
    required this.title,
    required this.totalSales,
    required this.rank,
  });

  factory AlbumInfo.fromJson(Map<String, dynamic> json) {
    return AlbumInfo(
      albumId: json['album_id'] as String,
      title: json['title'] as String,
      totalSales: json['total_sales'] as int,
      rank: json['rank'] as int,
    );
  }
}

class AlbumScreen extends ConsumerStatefulWidget {
  const AlbumScreen({super.key});

  @override
  ConsumerState<AlbumScreen> createState() => _AlbumScreenState();
}

class _AlbumScreenState extends ConsumerState<AlbumScreen> {
  List<AlbumInfo> _albums = [];
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadAlbums());
  }

  Future<void> _loadAlbums() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final core = await ref.read(digmCoreProvider.future);
      final rankingsJson = core.get_album_rankings();
      final List<dynamic> decoded = jsonDecode(rankingsJson);
      if (mounted) {
        setState(() {
          _albums = decoded.map((e) => AlbumInfo.fromJson(e as Map<String, dynamic>)).toList();
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

  Future<void> _purchaseAlbum(AlbumInfo album) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: DigmTheme.surfaceDark,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: DigmTheme.glassBorder),
        ),
        title: const Text(
          'Purchase Album',
          style: TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w600,
            color: DigmTheme.textPrimary,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              album.title,
              style: const TextStyle(
                fontFamily: 'SpaceGrotesk',
                fontSize: 18,
                color: DigmTheme.fuchsiaLight,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Price: ${(album.totalSales / 10000000).toStringAsFixed(2)} XFG/HEAT',
              style: const TextStyle(
                fontFamily: 'Inter',
                color: DigmTheme.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Purchase'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    try {
      final core = await ref.read(digmCoreProvider.future);
      final address = core.get_address(0);
      core.purchase_album(address, album.albumId, album.totalSales);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Purchased ${album.title}!'),
          backgroundColor: DigmTheme.success,
        ),
      );
      _loadAlbums();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Purchase failed: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _buildHeader(),
        Expanded(child: _buildContent()),
      ],
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Row(
        children: [
          ShaderMask(
            shaderCallback: DigmTheme.gradientShader,
            child: const Text(
              'Market',
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
            onPressed: _isLoading ? null : _loadAlbums,
          ),
        ],
      ),
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
            const Icon(Icons.cloud_off, size: 48, color: DigmTheme.textMuted),
            const SizedBox(height: 16),
            Text(
              'Failed to load albums',
              style: TextStyle(color: DigmTheme.textSecondary),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _loadAlbums,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_albums.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.album, size: 64, color: DigmTheme.textMuted.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            const Text(
              'No albums available',
              style: TextStyle(color: DigmTheme.textSecondary, fontSize: 16),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: _albums.length,
      itemBuilder: (context, index) {
        final album = _albums[index];
        return _AlbumCard(
          album: album,
          onPurchase: () => _purchaseAlbum(album),
        );
      },
    );
  }
}

class _AlbumCard extends StatelessWidget {
  final AlbumInfo album;
  final VoidCallback onPurchase;

  const _AlbumCard({required this.album, required this.onPurchase});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: DigmTheme.glassContainer(),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [DigmTheme.fuchsia, DigmTheme.darkPurple],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Center(
                child: Text(
                  '#${album.rank}',
                  style: const TextStyle(
                    fontFamily: 'SpaceGrotesk',
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    album.title,
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontWeight: FontWeight.w600,
                      color: DigmTheme.textPrimary,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Sales: ${(album.totalSales / 10000000).toStringAsFixed(2)} XFG',
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      color: DigmTheme.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: onPurchase,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
              child: const Text('Buy'),
            ),
          ],
        ),
      ),
    );
  }
}
