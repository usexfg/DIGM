import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/digm_theme.dart';
import '../../core/ffi/digm_core.dart';
import '../marketplace/screens/create_album_screen.dart';

class ArtistDashboardScreen extends ConsumerWidget {
  const ArtistDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coreAsync = ref.watch(digmCoreProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: DigmTheme.bgGradient),
        child: SafeArea(
          child: coreAsync.when(
            data: (core) => _ArtistDashboardContent(core: core),
            loading: () => const Center(child: CircularProgressIndicator(color: DigmTheme.fuchsiaLight)),
            error: (e, _) => Center(child: Text('Error loading studio: $e', style: const TextStyle(color: Colors.white))),
          ),
        ),
      ),
    );
  }
}

class _ArtistDashboardContent extends ConsumerWidget {
  final DigmCore core;
  const _ArtistDashboardContent({required this.core});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FutureBuilder(
      future: Future.wait([
        core.get_current_earnings('Fuego:1A2b3C4d5E6f7G8h9I0j'), // Using default mock addr
        core.get_album_rankings(),
      ]),
      builder: (context, AsyncSnapshot<List<dynamic>> snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator(color: DigmTheme.fuchsiaLight));
        }

        final earnings = snapshot.data![0] as String;
        final rankingsJson = snapshot.data![1] as String;
        // In a real app, we would filter rankings for only the artist's albums
        final allRankings = (snapshot.data![1] as String); 

        return SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(earnings),
              const SizedBox(height: 32),
              _buildMetricGrid(),
              const SizedBox(height: 32),
              Text(
                'My Releases',
                style: GoogleFonts.spaceGrotesk(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: DigmTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 16),
              _buildReleaseList(allRankings),
              const SizedBox(height: 40),
              _buildReleaseButton(context),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHeader(String earnings) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: DigmTheme.glassBorder),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Artist Studio',
                style: GoogleFonts.orbitron(
                  fontSize: 14,
                  color: DigmTheme.fuchsiaLight,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Sovereign Creator',
                style: GoogleFonts.spaceGrotesk(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: DigmTheme.textPrimary,
                ),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'TOTAL EARNED',
                style: GoogleFonts.inter(
                  fontSize: 10,
                  color: DigmTheme.textSecondary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                '${(double.parse(earnings) / 1000000).toStringAsFixed(2)}M PARA',
                style: GoogleFonts.spaceGrotesk(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: DigmTheme.fuchsiaLight,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricGrid() {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.5,
      children: [
        _buildMetricCard('Global Rank', '#12', Icons.trending_up),
        _buildMetricCard('Listeners', '1.2k', Icons.people),
        _buildMetricCard('Staked PARA', '4.5M', Icons.lock),
        _buildMetricCard('Sovereignty', '98%', Icons.verified),
      ],
    );
  }

  Widget _buildMetricCard(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: DigmTheme.glassBorder),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: DigmTheme.fuchsiaLight, size: 20),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.spaceGrotesk(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: DigmTheme.textPrimary,
            ),
          ),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              color: DigmTheme.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReleaseList(String rankingsJson) {
    // In a real app, we'd parse the JSON and filter by artist ID.
    // For now, we show a sample list.
    final releases = [
      {"title": "Fuego Waves", "type": "Album", "para": "150M", "status": 0.7},
      {"title": "Midnight City", "type": "Single", "para": "5M", "status": 0.4},
      {"title": "Neon Nights", "type": "Album", "para": "42M", "status": 0.9},
    ];

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: releases.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final release = releases[index];
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: DigmTheme.glassBorder),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: DigmTheme.fuchsiaLight.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.music_note, color: DigmTheme.fuchsiaLight),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      release['title'] as String,
                      style: GoogleFonts.spaceGrotesk(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: DigmTheme.textPrimary,
                      ),
                    ),
                    Text(
                      release['type'] as String,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: DigmTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    release['para'] as String,
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: DigmTheme.fuchsiaLight,
                    ),
                  ),
                  const SizedBox(height: 4),
                  SizedBox(
                    width: 60,
                    child: LinearProgressIndicator(
                      value: release['status'] as double,
                      backgroundColor: Colors.white10,
                      valueColor: AlwaysStoppedAnimation<Color>(DigmTheme.fuchsiaLight),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildReleaseButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => const CreateAlbumScreen()),
          );
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: DigmTheme.fuchsiaLight,
          foregroundColor: Colors.black,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
        child: Text(
          'RELEASE NEW MUSIC',
          style: GoogleFonts.orbitron(
            fontWeight: FontWeight.bold,
            letterSpacing: 1,
          ),
        ),
      ),
    );
  }
}
