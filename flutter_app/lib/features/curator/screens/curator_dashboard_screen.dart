import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/digm_theme.dart';
import '../../core/ffi/digm_core.dart';

class CuratorDashboardScreen extends ConsumerWidget {
  const CuratorDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coreAsync = ref.watch(digmCoreProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: DigmTheme.bgGradient),
        child: SafeArea(
          child: coreAsync.when(
            data: (core) => _CuratorDashboardContent(core: core),
            loading: () => const Center(child: CircularProgressIndicator(color: DigmTheme.fuchsiaLight)),
            error: (e, _) => Center(child: Text('Error loading dashboard: $e', style: const TextStyle(color: Colors.white))),
          ),
        ),
      ),
    );
  }
}

class _CuratorDashboardContent extends ConsumerWidget {
  final DigmCore core;
  const _CuratorDashboardContent({required this.core});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FutureBuilder(
      future: Future.wait([
        core.get_current_earnings('Fuego:1A2b3C4d5E6f7G8h9I0j'),
      ]),
      builder: (context, AsyncSnapshot<List<dynamic>> snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator(color: DigmTheme.fuchsiaLight));
        }

        final totalEarnings = double.parse(snapshot.data![0] as String);
        // Curator earns 30% of the pool for their station
        final curatorCut = totalEarnings * 0.3;

        return SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildEarningsHeader(curatorCut),
              const SizedBox(height: 32),
              _buildStationControls(),
              const SizedBox(height: 32),
              Text(
                'Station Performance',
                style: GoogleFonts.spaceGrotesk(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: DigmHTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 16),
              _buildStatsGrid(),
              const SizedBox(height: 32),
              _buildProfileEditor(),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEarningsHeader(double earnings) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: DigmTheme.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'CURATOR REVENUE',
            style: GoogleFonts.orbitron(
              fontSize: 12,
              color: DigmTheme.fuchsiaLight,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '${(earnings / 1000000).toStringAsFixed(4)}M PARA',
            style: GoogleFonts.spaceGrotesk(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: DigmTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Estimated 30% cut from active stations',
            style: GoogleFonts.inter(
              fontSize: 13,
              color: DigmTheme.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStationControls() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: DigmTheme.glassBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Active Station',
                style: GoogleFonts.spaceGrotesk(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: DigmTheme.textPrimary,
                ),
              ),
              Switch(
                value: true,
                onChanged: (val) {},
                activeColor: DigmTheme.fuchsiaLight,
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildTrackEntry('Deep Space Mix', 'Symmetry', true),
          _buildTrackEntry('Neon Nights', 'CyberPulse', true),
          _buildTrackEntry('Void Walker', 'Lumina', false),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Add Track to Rotation'),
              style: OutlinedButton.styleFrom(
                foregroundColor: DigmTheme.textPrimary,
                side: const BorderSide(color: DigmTheme.glassBorder),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrackEntry(String title, String artist, bool isActive) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Checkbox(
            value: isActive,
            onChanged: (val) {},
            activeColor: DigmTheme.fuchsiaLight,
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.inter(fontSize: 14, color: DigmTheme.textPrimary)),
                Text(artist, style: GoogleFonts.inter(fontSize: 12, color: DigmTheme.textSecondary)),
              ],
            ),
          ),
          const Icon(Icons.drag_handle, color: DigmTheme.textSecondary, size: 16),
        ],
      ),
    );
  }

  Widget _buildStatsGrid() {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard('Live Listeners', '412', Icons.radio),
        _buildStatCard('Avg. Retention', '84%', Icons.timer),
        _buildStatCard('CURA Influence', 'Lvl 4', Icons.star),
        _buildStatCard('Station Reach', 'Global', Icons.public),
      ],
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: DigmTheme.glassBorder),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: DigmTheme.fuchsiaLight, size: 20),
          const SizedBox(height: 8),
          Text(
            value,
            style: GoogleFonts.spaceGrotesk(fontSize: 18, fontWeight: FontWeight.bold, color: DigmTheme.textPrimary),
          ),
          Text(
            label,
            style: GoogleFonts.inter(fontSize: 12, color: DigmTheme.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileEditor() {
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
          Text(
            'Public Profile',
            style: GoogleFonts.spaceGrotesk(fontSize: 18, fontWeight: FontWeight.bold, color: DigmTheme.textPrimary),
          ),
          const SizedBox(height: 16),
          TextField(
            decoration: InputDecoration(
              labelText: 'Station Vibe Description',
              labelStyle: const TextStyle(color: DigmTheme.textSecondary),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: DigmTheme.glassBorder),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: DigmTheme.fuchsiaLight),
              ),
            ),
            style: const TextStyle(color: DigmHTheme.textPrimary),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white10,
                foregroundColor: DigmTheme.textPrimary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Update Profile'),
            ),
          ),
        ],
      ),
    );
  }
}
