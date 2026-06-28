import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/digm_theme.dart';
import '../../core/ffi/digm_core.dart';

class CuratorProfileScreen extends ConsumerWidget {
  final String curatorId;
  const CuratorProfileScreen({super.key, required this.curatorId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coreAsync = ref.watch(digmCoreProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: DigmTheme.bgGradient),
        child: SafeArea(
          child: coreAsync.when(
            data: (core) => _CuratorProfileContent(core: core),
            loading: () => const Center(child: CircularProgressIndicator(color: DigmTheme.fuchsiaLight)),
            error: (e, _) => Center(child: Text('Error: $e', style: const TextStyle(color: Colors.white))),
          ),
        ),
      ),
    );
  }
}

class _CuratorProfileContent extends ConsumerStatefulWidget {
  final DigmCore core;
  const _CuratorProfileContent({required this.core});

  @override
  _CuratorProfileContentState createState() => _CuratorProfileContentState();
}

class _CuratorProfileContentState extends ConsumerState<_CuratorProfileContent>
    with SingleTickerProviderStateMixin {
  late AnimationController _entryCtrl;
  late List<Animation<double>> _staggered;
  final _playlistCtrl = TextEditingController();
  List<String> _playlist = [];

  @override
  void initState() {
    super.initState();
    _entryCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _staggered = List.generate(5, (i) {
      return Tween<double>(begin: 0.0, end: 1.0).animate(
        CurvedAnimation(
          parent: _entryCtrl,
          curve: Interval(i * 0.1, 0.5 + i * 0.08, curve: const Cubic(0.32, 0.72, 0.0, 1.0)),
        ),
      );
    });
    _loadPlaylist();
    _entryCtrl.forward();
  }

  void _loadPlaylist() {
    final address = widget.core.get_address(0);
    final raw = widget.core.get_curator_playlist(address);
    setState(() {
      final decoded = raw is String ? (jsonDecode(raw) as List<dynamic>) : <dynamic>[];
      _playlist = decoded.map((e) => e.toString()).toList();
    });
  }

  @override
  void dispose() {
    _entryCtrl.dispose();
    _playlistCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(),
          const SizedBox(height: 32),
          _buildStationVibe(),
          const SizedBox(height: 28),
          _buildRotationSection(),
          const SizedBox(height: 28),
          _buildCuratorPlaylist(),
        ],
      ),
    );
  }

  // ── Double-Bezel ────────────────────────────────────────────
  Widget _doubleBezel({
    required Widget child,
    double outerRadius = 28,
    double innerRadius = 24,
    double padding = 6,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0x0AFFFFFF),
        borderRadius: BorderRadius.circular(outerRadius),
        border: Border.all(color: const Color(0x1AFFFFFF), width: 0.5),
      ),
      padding: EdgeInsets.all(padding),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF0A0A0F),
          borderRadius: BorderRadius.circular(innerRadius),
          border: Border.all(color: const Color(0x0DFFFFFF), width: 0.5),
          boxShadow: const [
            BoxShadow(color: Color(0x08000000), blurRadius: 24, offset: Offset(0, 8)),
          ],
        ),
        child: child,
      ),
    );
  }

  // ── Staggered Entry ─────────────────────────────────────────
  Widget _fadeSlide(int index, Widget child) {
    return AnimatedBuilder(
      animation: _staggered[index],
      builder: (context, _) => Opacity(
        opacity: _staggered[index].value,
        child: Transform.translate(
          offset: Offset(0, 24 * (1 - _staggered[index].value)),
          child: child,
        ),
      ),
    );
  }

  // ── Header ──────────────────────────────────────────────────
  Widget _buildHeader() {
    return _fadeSlide(0, Column(
      children: [
        Center(
          child: Stack(
            alignment: Alignment.bottomRight,
            children: [
              Container(
                width: 110,
                height: 110,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: DigmTheme.fuchsia.withValues(alpha: 0.6), width: 2),
                  image: const DecorationImage(
                    image: NetworkImage('https://images.unsplash.com/photo-1534528741775-539//q=80&w=500&auto=format&fit=crop'),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: DigmTheme.fuchsia,
                  shape: BoxShape.circle,
                  boxShadow: [BoxShadow(color: DigmTheme.fuchsia.withValues(alpha: 0.4), blurRadius: 8)],
                ),
                child: const Icon(Icons.verified, color: Colors.black, size: 14),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: Text(
            'Curator.exe',
            style: GoogleFonts.orbitron(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: DigmTheme.textPrimary,
              letterSpacing: 2,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: DigmTheme.fuchsia.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: DigmTheme.fuchsia.withValues(alpha: 0.2), width: 0.5),
            ),
            child: Text(
              'CURA VERIFIED STATION',
              style: GoogleFonts.orbitron(fontSize: 9, letterSpacing: 2, color: DigmTheme.fuchsiaLight, fontWeight: FontWeight.w600),
            ),
          ),
        ),
        const SizedBox(height: 28),
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: DigmTheme.fuchsia,
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              elevation: 0,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('TUNE IN', style: GoogleFonts.orbitron(fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 2)),
                const SizedBox(width: 10),
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.play_arrow, size: 18, color: Colors.black),
                ),
              ],
            ),
          ),
        ),
      ],
    ));
  }

  // ── Station Vibe ────────────────────────────────────────────
  Widget _buildStationVibe() {
    return _fadeSlide(1, _doubleBezel(
      padding: 4,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 4,
                  height: 20,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [DigmTheme.fuchsia, DigmTheme.pink]),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  'Current Vibe',
                  style: GoogleFonts.spaceGrotesk(fontSize: 13, fontWeight: FontWeight.w600, color: DigmTheme.textSecondary, letterSpacing: 1),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'Deep space ambient mixed with neo-tokyo synthwave. Focused on high-frequency energy for sovereign coding sessions.',
              style: GoogleFonts.inter(fontSize: 14, color: DigmTheme.textSecondary, height: 1.6),
            ),
          ],
        ),
      ),
    ));
  }

  // ── Station Rotation (Immutable) ────────────────────────────
  Widget _buildRotationSection() {
    final tracks = [
      {"title": "Void Walker", "artist": "Symmetry", "duration": "5:12"},
      {"title": "Cyber Drift", "artist": "Neon Pulse", "duration": "3:45"},
      {"title": "Quantum Echo", "artist": "Lumina", "duration": "4:20"},
      {"title": "Solar Flare", "artist": "Nova", "duration": "6:02"},
    ];

    return _fadeSlide(2, _doubleBezel(
      padding: 4,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 4,
                  height: 20,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [DigmTheme.fuchsia, DigmTheme.pink]),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  'Station Rotation',
                  style: GoogleFonts.spaceGrotesk(fontSize: 13, fontWeight: FontWeight.w600, color: DigmTheme.textSecondary, letterSpacing: 1),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: DigmTheme.fuchsia.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: DigmTheme.fuchsia.withValues(alpha: 0.2), width: 0.5),
                  ),
                  child: Text(
                    'LOCKED',
                    style: GoogleFonts.orbitron(fontSize: 8, letterSpacing: 1.5, color: DigmTheme.fuchsiaLight),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.02),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Icon(Icons.lock_outline, color: DigmTheme.textMuted, size: 12),
                  const SizedBox(width: 6),
                  Text(
                    'Immutable once created — tracks cannot be changed',
                    style: GoogleFonts.inter(fontSize: 11, color: DigmTheme.textMuted, fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            ...tracks.map((t) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: _rotationTrack(t['title'] as String, t['artist'] as String, t['duration'] as String),
            )),
          ],
        ),
      ),
    ));
  }

  Widget _rotationTrack(String title, String artist, String duration) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.04)),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: DigmTheme.fuchsia.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.lock, color: DigmTheme.textMuted, size: 14),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500, color: DigmTheme.textPrimary)),
                Text(artist, style: GoogleFonts.inter(fontSize: 12, color: DigmTheme.textMuted)),
              ],
            ),
          ),
          Text(duration, style: GoogleFonts.inter(fontSize: 12, color: DigmTheme.textMuted)),
        ],
      ),
    );
  }

  // ── Curator's Pick Playlist (Mutable) ───────────────────────
  Widget _buildCuratorPlaylist() {
    return _fadeSlide(3, _doubleBezel(
      padding: 4,
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 4,
                  height: 20,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [DigmTheme.emerald, DigmTheme.green]),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  "Curator's Pick",
                  style: GoogleFonts.spaceGrotesk(fontSize: 13, fontWeight: FontWeight.w600, color: DigmTheme.textSecondary, letterSpacing: 1),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: DigmTheme.emerald.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: DigmTheme.emerald.withValues(alpha: 0.2), width: 0.5),
                  ),
                  child: Text(
                    'EDITABLE',
                    style: GoogleFonts.orbitron(fontSize: 8, letterSpacing: 1.5, color: DigmTheme.emerald),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Swap tracks anytime — this playlist reflects your current curation mood.',
              style: GoogleFonts.inter(fontSize: 12, color: DigmTheme.textMuted, height: 1.4),
            ),
            const SizedBox(height: 20),
            if (_playlist.isEmpty)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 32),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: Colors.white.withValues(alpha: 0.02),
                ),
                child: Center(
                  child: Column(
                    children: [
                      Icon(Icons.playlist_add, color: DigmTheme.textMuted, size: 28),
                      const SizedBox(height: 8),
                      Text('Add your first pick below', style: GoogleFonts.inter(fontSize: 13, color: DigmTheme.textMuted)),
                    ],
                  ),
                ),
              )
            else
              ...List.generate(_playlist.length, (i) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _playlistTrack(i),
              )),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _playlistCtrl,
                    style: GoogleFonts.inter(fontSize: 14, color: DigmTheme.textPrimary),
                    decoration: InputDecoration(
                      hintText: 'Add a track...',
                      hintStyle: TextStyle(color: DigmTheme.textMuted.withValues(alpha: 0.5)),
                      filled: true,
                      fillColor: Colors.white.withValues(alpha: 0.03),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                    onSubmitted: _addTrack,
                  ),
                ),
                const SizedBox(width: 12),
                SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () => _addTrack(_playlistCtrl.text),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: DigmTheme.emerald,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                      elevation: 0,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('Add', style: GoogleFonts.orbitron(fontSize: 11, letterSpacing: 1, fontWeight: FontWeight.w600)),
                        const SizedBox(width: 8),
                        Container(
                          width: 26,
                          height: 26,
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.add, size: 14, color: Colors.black),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ));
  }

  Widget _playlistTrack(int index) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.04)),
      ),
      child: Row(
        children: [
          Icon(Icons.play_circle_outline, color: DigmTheme.emerald.withValues(alpha: 0.7), size: 18),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _playlist[index],
              style: GoogleFonts.inter(fontSize: 14, color: DigmTheme.textPrimary),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          GestureDetector(
            onTap: () {
              setState(() => _playlist.removeAt(index));
              widget.core.set_curator_playlist(widget.core.get_address(0), _playlist);
            },
            child: Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.04),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.close, color: DigmTheme.textMuted, size: 14),
            ),
          ),
        ],
      ),
    );
  }

  void _addTrack(String text) {
    final trimmed = text.trim();
    if (trimmed.isNotEmpty) {
      setState(() => _playlist.add(trimmed));
      widget.core.set_curator_playlist(widget.core.get_address(0), _playlist);
      _playlistCtrl.clear();
    }
  }
}
