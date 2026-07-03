import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/digm_theme.dart';
import '../../../core/ffi/digm_core.dart';
import 'package:digm_core/digm_core.dart';

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

class _CuratorDashboardContent extends ConsumerStatefulWidget {
  final DigmCore core;
  const _CuratorDashboardContent({required this.core});

  @override
  _CuratorDashboardContentState createState() => _CuratorDashboardContentState();
}

class _CuratorDashboardContentState extends ConsumerState<_CuratorDashboardContent>
    with SingleTickerProviderStateMixin {
  late AnimationController _entryCtrl;
  late List<Animation<double>> _staggeredEntries;

  @override
  void initState() {
    super.initState();
    _entryCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    _staggeredEntries = List.generate(6, (i) {
      return Tween<double>(begin: 0.0, end: 1.0).animate(
        CurvedAnimation(
          parent: _entryCtrl,
          curve: Interval(i * 0.08, 0.6 + i * 0.06, curve: const Cubic(0.32, 0.72, 0.0, 1.0)),
        ),
      );
    });
    _entryCtrl.forward();
  }

  @override
  void dispose() {
    _entryCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final address = widget.core.get_address(0);

    return FutureBuilder(
      future: Future.wait([
        Future.value(widget.core.get_current_earnings(address)),
        Future.value(widget.core.curator_stations_remaining(address)),
      ]),
      builder: (context, AsyncSnapshot<List<dynamic>> snapshot) {
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator(color: DigmTheme.fuchsiaLight));
        }

        final totalEarnings = double.parse(snapshot.data![0] as String);
        final stationRemaining = snapshot.data![1] as int;
        final curatorCut = totalEarnings * 0.33;
        final artistCut = totalEarnings * 0.335;
        final listenerCut = totalEarnings * 0.335;

        return SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildEyebrow('CURATOR DASHBOARD'),
              const SizedBox(height: 32),
              _buildRevenueBento(curatorCut, artistCut, listenerCut),
              const SizedBox(height: 28),
              _buildStationsAndControls(stationRemaining, address),
              const SizedBox(height: 28),
              _buildPerformanceBento(),
              const SizedBox(height: 28),
              _buildProfileEditor(),
            ],
          ),
        );
      },
    );
  }

  // ── Eyebrow Tag ──────────────────────────────────────────────
  Widget _buildEyebrow(String label) {
    return AnimatedBuilder(
      animation: _staggeredEntries[0],
      builder: (context, child) => Opacity(
        opacity: _staggeredEntries[0].value,
        child: Transform.translate(
          offset: Offset(0, 16 * (1 - _staggeredEntries[0].value)),
          child: child,
        ),
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: DigmTheme.fuchsia.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: DigmTheme.fuchsia.withValues(alpha: 0.3), width: 0.5),
        ),
        child: Text(
          label,
          style: GoogleFonts.orbitron(
            fontSize: 10,
            letterSpacing: 3,
            color: DigmTheme.fuchsiaLight,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  // ── Double-Bezel Wrapper (reusable) ──────────────────────────
  Widget _doubleBezel({
    required Widget child,
    double outerRadius = 28,
    double innerRadius = 24,
    double padding = 6,
    Color? innerBg,
    Color? borderColor,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0x0AFFFFFF),
        borderRadius: BorderRadius.circular(outerRadius),
        border: Border.all(color: borderColor ?? const Color(0x1AFFFFFF), width: 0.5),
      ),
      padding: EdgeInsets.all(padding),
      child: Container(
        decoration: BoxDecoration(
          color: innerBg ?? const Color(0xFF0A0A0F),
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

  // ── Revenue Bento (Asymmetrical) ─────────────────────────────
  Widget _buildRevenueBento(double curatorCut, double artistCut, double listenerCut) {
    return AnimatedBuilder(
      animation: _staggeredEntries[1],
      builder: (context, child) => Opacity(
        opacity: _staggeredEntries[1].value,
        child: Transform.translate(
          offset: Offset(0, 24 * (1 - _staggeredEntries[1].value)),
          child: child,
        ),
      ),
      child: _doubleBezel(
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
                    'Revenue Split',
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: DigmTheme.textSecondary,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                '${(curatorCut / 1000000).toStringAsFixed(2)}M',
                style: GoogleFonts.spaceGrotesk(
                  fontSize: 40,
                  fontWeight: FontWeight.w700,
                  color: DigmTheme.textPrimary,
                  height: 1.0,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'PARA earned',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: DigmTheme.textMuted,
                ),
              ),
              const SizedBox(height: 24),
              // Split bars
              _splitBar('Curator', curatorCut, 0.33, DigmTheme.fuchsiaLight),
              const SizedBox(height: 12),
              _splitBar('Artist Payout', artistCut, 0.335, DigmTheme.emerald),
              const SizedBox(height: 12),
              _splitBar('Listener Reward', listenerCut, 0.335, DigmTheme.orange),
            ],
          ),
        ),
      ),
    );
  }

  Widget _splitBar(String label, double value, double share, Color color) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            boxShadow: [BoxShadow(color: color.withValues(alpha: 0.4), blurRadius: 6)],
          ),
        ),
        const SizedBox(width: 10),
        Text(
          label,
          style: GoogleFonts.inter(fontSize: 13, color: DigmTheme.textSecondary),
        ),
        const Spacer(),
        Text(
          '${(share * 100).toStringAsFixed(1)}%',
          style: GoogleFonts.spaceGrotesk(fontSize: 13, fontWeight: FontWeight.w600, color: DigmTheme.textPrimary),
        ),
        const SizedBox(width: 16),
        SizedBox(
          width: 80,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: share,
              backgroundColor: Colors.white.withValues(alpha: 0.06),
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 4,
            ),
          ),
        ),
      ],
    );
  }

  // ── Stations & Controls (Asymmetrical Bento pair) ────────────
  Widget _buildStationsAndControls(int remaining, String address) {
    final created = widget.core.get_cura_balance(address) - remaining;
    final total = remaining + created;
    final pct = total > 0 ? created / total : 0.0;

    return AnimatedBuilder(
      animation: _staggeredEntries[2],
      builder: (context, child) => Opacity(
        opacity: _staggeredEntries[2].value,
        child: Transform.translate(
          offset: Offset(0, 20 * (1 - _staggeredEntries[2].value)),
          child: child,
        ),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth > 500;
          if (isWide) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(flex: 3, child: _buildStationCounter(remaining, created, pct, total, address)),
                const SizedBox(width: 16),
                Expanded(flex: 4, child: _buildStationControls(address)),
              ],
            );
          }
          return Column(
            children: [
              _buildStationCounter(remaining, created, pct, total, address),
              const SizedBox(height: 16),
              _buildStationControls(address),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStationCounter(int remaining, int created, double pct, int total, String address) {
    return _doubleBezel(
      padding: 4,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.radio, color: DigmTheme.fuchsiaLight, size: 18),
                const SizedBox(width: 8),
                Text(
                  'CURA STATIONS',
                  style: GoogleFonts.orbitron(
                    fontSize: 10,
                    letterSpacing: 2,
                    color: DigmTheme.fuchsiaLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Text(
              '$created',
              style: GoogleFonts.spaceGrotesk(
                fontSize: 48,
                fontWeight: FontWeight.w700,
                color: DigmTheme.textPrimary,
                height: 0.9,
              ),
            ),
            Text(
              'of $total stations',
              style: GoogleFonts.inter(fontSize: 14, color: DigmTheme.textMuted),
            ),
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: LinearProgressIndicator(
                value: pct,
                backgroundColor: Colors.white.withValues(alpha: 0.06),
                valueColor: AlwaysStoppedAnimation<Color>(
                  pct >= 1.0 ? DigmTheme.red : DigmTheme.fuchsiaLight,
                ),
                minHeight: 6,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              remaining > 0 ? '$remaining creation slots left' : 'LIMIT REACHED',
              style: GoogleFonts.inter(
                fontSize: 12,
                color: remaining > 0 ? DigmTheme.textSecondary : DigmTheme.red,
              ),
            ),
            if (remaining > 0) ...[
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: _magneticButton(
                  label: 'Create Station',
                  icon: Icons.add,
                  onPressed: () => _showCreateStationDialog(address),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStationControls(String address) {
    return _doubleBezel(
      padding: 4,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.queue_music, color: DigmTheme.textPrimary, size: 18),
                const SizedBox(width: 8),
                Text(
                  'ACTIVE ROTATION',
                  style: GoogleFonts.orbitron(
                    fontSize: 10,
                    letterSpacing: 2,
                    color: DigmTheme.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: DigmTheme.fuchsia.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    'IMMUTABLE',
                    style: GoogleFonts.orbitron(
                      fontSize: 8,
                      letterSpacing: 1.5,
                      color: DigmTheme.fuchsiaLight,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            _rotationTrack('Deep Space Mix', 'Symmetry', true),
            const SizedBox(height: 8),
            _rotationTrack('Neon Nights', 'CyberPulse', true),
            const SizedBox(height: 8),
            _rotationTrack('Void Walker', 'Lumina', false),
            const SizedBox(height: 8),
            _rotationTrack('Quantum Echo', 'Nova', false),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.02),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withValues(alpha: 0.04)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.lock_outline, color: DigmTheme.textMuted, size: 14),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Station rotation is locked after creation. Choose wisely.',
                      style: GoogleFonts.inter(fontSize: 11, color: DigmTheme.textMuted, height: 1.4),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _rotationTrack(String title, String artist, bool active) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: active ? 0.03 : 0.0),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(
            active ? Icons.music_note : Icons.lock,
            color: active ? DigmTheme.fuchsiaLight : DigmTheme.textMuted,
            size: 16,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500, color: DigmTheme.textPrimary),
                ),
                Text(artist, style: GoogleFonts.inter(fontSize: 12, color: DigmTheme.textMuted)),
              ],
            ),
          ),
          const Icon(Icons.lock, color: DigmTheme.textMuted, size: 14),
        ],
      ),
    );
  }

  // ── Performance Bento ────────────────────────────────────────
  Widget _buildPerformanceBento() {
    return AnimatedBuilder(
      animation: _staggeredEntries[3],
      builder: (context, child) => Opacity(
        opacity: _staggeredEntries[3].value,
        child: Transform.translate(
          offset: Offset(0, 16 * (1 - _staggeredEntries[3].value)),
          child: child,
        ),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth > 500;
          return _doubleBezel(
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
                        'Station Performance',
                        style: GoogleFonts.spaceGrotesk(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: DigmTheme.textSecondary,
                          letterSpacing: 1,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  if (isWide)
                    Row(
                      children: [
                        Expanded(child: _statCard('Live Listeners', '412', Icons.radio_outlined)),
                        const SizedBox(width: 12),
                        Expanded(child: _statCard('Avg. Retention', '84%', Icons.timer_outlined)),
                        const SizedBox(width: 12),
                        Expanded(child: _statCard('CURA Level', '4', Icons.star_outline)),
                        const SizedBox(width: 12),
                        Expanded(child: _statCard('Reach', 'Global', Icons.public)),
                      ],
                    )
                  else
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        SizedBox(width: (constraints.maxWidth - 10) / 2, child: _statCard('Live Listeners', '412', Icons.radio_outlined)),
                        SizedBox(width: (constraints.maxWidth - 10) / 2, child: _statCard('Avg. Retention', '84%', Icons.timer_outlined)),
                        SizedBox(width: (constraints.maxWidth - 10) / 2, child: _statCard('CURA Level', '4', Icons.star_outline)),
                        SizedBox(width: (constraints.maxWidth - 10) / 2, child: _statCard('Reach', 'Global', Icons.public)),
                      ],
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: DigmTheme.fuchsiaLight.withValues(alpha: 0.7), size: 20),
          const SizedBox(height: 10),
          Text(
            value,
            style: GoogleFonts.spaceGrotesk(fontSize: 22, fontWeight: FontWeight.w700, color: DigmTheme.textPrimary, height: 1.0),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.inter(fontSize: 12, color: DigmTheme.textMuted),
          ),
        ],
      ),
    );
  }

  // ── Profile Editor ──────────────────────────────────────────
  Widget _buildProfileEditor() {
    return AnimatedBuilder(
      animation: _staggeredEntries[4],
      builder: (context, child) => Opacity(
        opacity: _staggeredEntries[4].value,
        child: Transform.translate(
          offset: Offset(0, 12 * (1 - _staggeredEntries[4].value)),
          child: child,
        ),
      ),
      child: _doubleBezel(
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
                    'Public Profile',
                    style: GoogleFonts.spaceGrotesk(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: DigmTheme.textSecondary,
                      letterSpacing: 1,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              TextField(
                decoration: InputDecoration(
                  hintText: 'Describe your station vibe...',
                  hintStyle: TextStyle(color: DigmTheme.textMuted.withValues(alpha: 0.5)),
                  filled: true,
                  fillColor: Colors.white.withValues(alpha: 0.03),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.all(16),
                ),
                style: GoogleFonts.inter(fontSize: 14, color: DigmTheme.textPrimary),
                maxLines: 3,
              ),
              const SizedBox(height: 16),
              Align(
                alignment: Alignment.centerRight,
                child: _magneticButton(
                  label: 'Save Changes',
                  icon: Icons.arrow_forward,
                  onPressed: () {},
                  compact: true,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Button-in-Button CTA ────────────────────────────────────
  Widget _magneticButton({
    required String label,
    required IconData icon,
    required VoidCallback onPressed,
    bool compact = false,
  }) {
    return SizedBox(
      height: compact ? 48 : 56,
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: DigmTheme.fuchsia,
          foregroundColor: DigmTheme.textPrimary,
          padding: EdgeInsets.symmetric(horizontal: compact ? 20 : 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
          elevation: 0,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: GoogleFonts.orbitron(
                fontSize: compact ? 11 : 12,
                letterSpacing: 1,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 10),
            Container(
              width: compact ? 28 : 32,
              height: compact ? 28 : 32,
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: compact ? 14 : 16, color: DigmTheme.textPrimary),
            ),
          ],
        ),
      ),
    );
  }

  void _showCreateStationDialog(String address) {}
}
