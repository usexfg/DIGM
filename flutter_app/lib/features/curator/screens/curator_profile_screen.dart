import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/digm_theme.dart';
import '../../features/player/providers/player_provider.dart';

class CuratorProfileScreen extends ConsumerWidget {
  final String curatorId;
  const CuratorProfileScreen({super.key, required this.curatorId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: DigmTheme.bgGradient),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(),
                const SizedBox(height: 32),
                _buildStationVibe(),
                const SizedBox(height: 32),
                Text(
                  'Current Rotation',
                  style: GoogleFonts.spaceGrotesk(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: DigmTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 16),
                _buildTrackList(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Center(
          child: Stack(
            alignment: Alignment.bottomRight,
            children: [
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: DigmTheme.fuchsiaLight, width: 3),
                  image: const DecorationImage(
                    image: NetworkImage('https://images.unsplash.com/photo-1534528741775-539//q=80&w=500&auto=format&fit=crop'),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(4),
                decoration: const BoxDecoration(color: DigmTheme.fuchsiaLight, shape: BoxShape.circle),
                child: const Icon(Icons.verified, color: Colors.black, size: 16),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Center(
          child: Text(
            'Curator.exe',
            style: GoogleFonts.orbitron(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: DigmTheme.textPrimary,
              letterSpacing: 2,
            ),
          ),
        ),
        Center(
          child: Text(
            'CURA Verified Station',
            style: GoogleFonts.inter(
              fontSize: 14,
              color: DigmTheme.fuchsiaLight,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: () {
              // Logic to tune into this specific curator station
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: DigmTheme.fuchsiaLight,
              foregroundColor: Colors.black,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: Text(
              'TUNE IN TO STATION',
              style: GoogleFonts.orbitron(fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStationVibe() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: DigmTheme.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: DigmTheme.fuchsiaLight, size: 20),
              const SizedBox(width: 8),
              Text(
                'Current Vibe',
                style: GoogleFonts.spaceGrotesk(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: DigmTheme.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Deep space ambient mixed with neo-tokyo synthwave. Focused on high-frequency energy for sovereign coding sessions.',
            style: GoogleFonts.inter(
              fontSize: 14,
              color: DigmTheme.textSecondary,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrackList() {
    final tracks = [
      {"title": "Void Walker", "artist": "Symmetry", "duration": "5:12"},
      {"title": "Cyber Drift", "artist": "Neon Pulse", "duration": "3:45"},
      {"title": "Quantum Echo", "artist": "Lumina", "duration": "4:20"},
      {"title": "Solar Flare", "artist":, "duration": "6:02"},
    ];

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: tracks.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final track = tracks[index];
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: DigmTheme.glassBorder),
          ),
          child: Row(
            children: [
              const Icon(Icons.music_note, color: DigmTheme.fuchsiaLight, size: 20),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      track['title'] as String,
                      style: GoogleFonts.spaceGrotesk(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: DigmTheme.textPrimary,
                      ),
                    ),
                    Text(
                      track['artist'] as String,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: DigmTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                track['duration'] as String,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: DigmTheme.textSecondary,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
