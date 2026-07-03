import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/ffi/digm_core.dart';
import '../../../core/services/api_client.dart';
import '../../../core/theme/digm_theme.dart';

/// DIGM pool purchase widget — shows two pools and handles buy+release flow.
class DigmPoolSheet extends ConsumerStatefulWidget {
  final String artistAddress;

  const DigmPoolSheet({super.key, required this.artistAddress});

  @override
  ConsumerState<DigmPoolSheet> createState() => _DigmPoolSheetState();
}

class _DigmPoolSheetState extends ConsumerState<DigmPoolSheet> {
  bool _loading = false;
  String? _error;
  int? _slotNumber;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  void _loadStats() async {
    final api = ref.read(apiClientProvider);
    try {
      final stats = await api.digmPoolStats();
      if (mounted) setState(() => _poolStats = stats);
    } catch (_) {}
  }

  Map<String, dynamic> _poolStats = {};

  Future<void> _buyHeatAndPublish() async {
    setState(() { _loading = true; _error = null; });
    try {
      final api = ref.read(apiClientProvider);
      final result = await api.acquireDigmHeat(widget.artistAddress);
      if (mounted) {
        setState(() {
          _slotNumber = (result['slot'] as num?)?.toInt();
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final heatRemaining = (_poolStats['heat_pool_remaining'] as num?)?.toInt() ?? 5000;
    final xfgRemaining = (_poolStats['xfg_pool_remaining'] as num?)?.toInt() ?? 5000;
    final xfgPrice = (_poolStats['xfg_current_price'] as num?)?.toInt() ?? 1000000;
    final singlesPosted = (_poolStats['singles_posted'] as num?)?.toInt() ?? 0;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: DigmTheme.glassWhite.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: DigmTheme.fuchsia.withValues(alpha: 0.2), width: 0.5),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('DIGM Single Release Pool', style: GoogleFonts.spaceGrotesk(
            fontSize: 16, fontWeight: FontWeight.bold, color: DigmTheme.fuchsia,
          )),
          const SizedBox(height: 4),
          Text('$singlesPosted / 10,000 singles posted', style: const TextStyle(
            fontFamily: 'SpaceGrotesk', fontSize: 11, color: DigmTheme.fuchsiaLight,
          )),
          const SizedBox(height: 16),

          // HEAT pool — buy now
          _PoolCard(
            title: 'HEAT Pool — Buy & Publish Now',
            subtitle: 'Fixed 0.1 HEAT. Immediate use only.\nMust have release data ready.',
            remaining: '$heatRemaining remaining',
            price: '0.1 HEAT',
            cta: 'Buy & Publish',
            onTap: _loading ? null : _buyHeatAndPublish,
          ),

          const SizedBox(height: 12),

          // XFG pool — speculators
          _PoolCard(
            title: 'XFG Pool — Hold for Later',
            subtitle: 'Bancor curve pricing. 90-day hold limit.',
            remaining: '$xfgRemaining remaining',
            price: '${(xfgPrice / 10000000).toStringAsFixed(4)} XFG',
            cta: 'Acquire (Coming Soon)',
            onTap: null,
          ),

          if (_loading) ...[
            const SizedBox(height: 12),
            const CircularProgressIndicator(color: DigmTheme.fuchsia),
          ],
          if (_slotNumber != null) ...[
            const SizedBox(height: 12),
            _SuccessBanner(slot: _slotNumber!),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
          ],
        ],
      ),
    );
  }
}

class _PoolCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String remaining;
  final String price;
  final String cta;
  final VoidCallback? onTap;

  const _PoolCard({
    required this.title, required this.subtitle, required this.remaining,
    required this.price, required this.cta, this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: DigmTheme.glassWhite.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: DigmTheme.fuchsia.withValues(alpha: 0.12), width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.spaceGrotesk(
            fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white,
          )),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(
            fontSize: 11, color: DigmTheme.fuchsiaLight, height: 1.4,
          )),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(remaining, style: const TextStyle(fontSize: 10, color: Colors.white54)),
                  Text(price, style: GoogleFonts.spaceGrotesk(
                    fontSize: 18, fontWeight: FontWeight.bold, color: DigmTheme.fuchsia,
                  )),
                ],
              ),
              ElevatedButton(
                onPressed: onTap,
                style: ElevatedButton.styleFrom(
                  backgroundColor: onTap != null ? DigmTheme.fuchsia : Colors.grey,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                ),
                child: Text(cta, style: const TextStyle(fontSize: 12, fontFamily: 'SpaceGrotesk')),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SuccessBanner extends StatelessWidget {
  final int slot;
  const _SuccessBanner({required this.slot});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.green.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.green.withValues(alpha: 0.3), width: 0.5),
      ),
      child: Column(
        children: [
          const Icon(Icons.check_circle, color: Colors.green, size: 32),
          const SizedBox(height: 4),
          Text('Single published!', style: GoogleFonts.spaceGrotesk(
            fontSize: 14, fontWeight: FontWeight.bold, color: Colors.green,
          )),
          Text('Slot #$slot / 10,000', style: const TextStyle(
            fontSize: 11, color: Colors.white54, fontFamily: 'SpaceGrotesk',
          )),
        ],
      ),
    );
  }
}
