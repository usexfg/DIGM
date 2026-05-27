import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/ffi/digm_core.dart';
import '../../../core/theme/digm_theme.dart';
import 'recovery_screen.dart';
import '../../features/artist/screens/artist_dashboard_screen.dart';
import '../../features/curator/screens/curator_dashboard_screen.dart';
import '../../features/marketplace/screens/create_album_screen.dart';
import '../../../core/widgets/access_locked_screen.dart';

final nodeModeProvider = StateProvider<String>((ref) => 'Client');

class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final coreAsync = ref.watch(digmCoreProvider);

    return coreAsync.when(
      data: (core) {
        final address = core.get_address(0);
        final paraBalance = core.get_current_earnings(address).toString();
        final voxBalance = core.get_vox_balance(address).toString();
        final curaBalance = core.get_cura_balance(address).toString();

        return Scaffold(
          appBar: AppBar(
            title: const Text('Wallet'),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _StudioButton(
                        label: 'Artist Studio',
                        icon: Icons.auto_graph,
                        onPressed: () {
                          if (int.parse(voxBalance) > 0) {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => const ArtistDashboardScreen()),
                            );
                          } else {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const AccessLockedScreen(
                                  title: 'ARTIST STUDIO LOCKED',
                                  requiredToken: 'VOX (DIGM) COIN',
                                  description: 'The Artist Studio is an exclusive domain for Sovereign Creators. You need to hold VOX (DIGM) coin in your wallet to unlock publishing tools and manage your catalog.',
                                  icon: Icons.auto_graph,
                                ),
                              ),
                            );
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _StudioButton(
                        label: 'Curator Studio',
                        icon: Icons.radio,
                        onPressed: () {
                          if (int.parse(curaBalance) > 0) {
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (context) => const CuratorDashboardScreen()),
                            );
                          } else {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const AccessLockedScreen(
                                  title: 'CURATOR STUDIO LOCKED',
                                  requiredToken: 'CURA TOKEN',
                                  description: 'Host your own Paradio station and earn a 30% cut of listener streams. Minting a CURA token by burning VOX is required to access the Curator Studio.',
                                  icon: Icons.radio,
                                ),
                              ),
                            );
                          }
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 32),
                _SectionHeader(title: 'Your Address'),
                const SizedBox(height: 8),
                _GlassCard(
                  child: SelectableText(
                    address,
                    style: const TextStyle(
                      fontFamily: 'SpaceGrotesk',
                      fontSize: 13,
                      color: DigmTheme.fuchsiaLight,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                _SectionHeader(title: 'Balances'),
                const SizedBox(height: 16),
                _BalanceTile(label: 'PARA', value: paraBalance),
                _BalanceTile(label: 'VOX', value: voxBalance),
                _BalanceTile(label: 'CURA', value: curaBalance),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      try {
                        final txHash = await core.anchor_state();
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('State anchored! Tx: $txHash')),
                        );
                      } catch (e) {
                        if (!context.mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Anchoring failed: $e')),
                        );
                      }
                    },
                    icon: const Icon(Icons.anchor),
                    label: const Text('Anchor State to L1'),
                  ),
                ),
                const SizedBox(height: 32),
                _SectionHeader(title: 'Staking Pools'),
                const SizedBox(height: 16),
                _StakingPoolTile(album: 'Fuego Waves', paraStaked: '1250.00', rank: '#3'),
                _StakingPoolTile(album: 'Deep Rust', paraStaked: '420.00', rank: '#12'),
                const SizedBox(height: 32),
                _SectionHeader(title: 'Node Settings'),
                const SizedBox(height: 16),
                const _SovereignSettingsTile(),
                const SizedBox(height: 32),
                _SectionHeader(title: 'Guardian Recovery'),
                const SizedBox(height: 16),
                const _GuardianManagementTile(),
              ],
            ),
          ),
        );
      },
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator(color: DigmTheme.fuchsiaLight)),
      ),
      error: (e, _) => Scaffold(
        body: Center(
          child: Text('Error: $e', style: const TextStyle(color: DigmTheme.error)),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontFamily: 'SpaceGrotesk',
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: DigmTheme.textPrimary,
      ),
    );
  }
}

class _GlassCard extends StatelessWidget {
  final Widget child;
  const _GlassCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: DigmTheme.glassContainer(),
      child: child,
    );
  }
}

class _SovereignSettingsTile extends ConsumerStatefulWidget {
  const _SovereignSettingsTile({super.key});

  @override
  ConsumerState<_SovereignSettingsTile> createState() => _SovereignSettingsTileState();
}

class _SovereignSettingsTileState extends ConsumerState<_SovereignSettingsTile> {
  bool _isSyncing = false;

  void _syncNode() async {
    setState(() => _isSyncing = true);
    try {
      final core = await ref.read(digmCoreProvider.future);
      await core.sync_node();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Node sync complete!')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Sync failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _isSyncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final digmCore = ref.watch(digmCoreProvider).valueOrNull;
    final mode = ref.watch(nodeModeProvider);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: DigmTheme.glassContainer(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Node Mode',
            style: TextStyle(
              fontFamily: 'Inter',
              fontWeight: FontWeight.w600,
              color: DigmTheme.textPrimary,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Controls validation depth and P2P seeding',
            style: TextStyle(
              fontFamily: 'Inter',
              color: DigmTheme.textSecondary,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 12),
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'Client', label: Text('Client')),
              ButtonSegment(value: 'Seeder', label: Text('Seeder')),
              ButtonSegment(value: 'Sovereign', label: Text('Sovereign')),
            ],
            selected: {mode},
            onSelectionChanged: (Set<String> newSelection) {
              final newMode = newSelection.first;
              ref.read(nodeModeProvider.notifier).state = newMode;
              digmCore?.set_node_mode(newMode);
            },
          ),
          if (mode == 'Sovereign' || mode == 'Seeder') ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isSyncing ? null : _syncNode,
                icon: _isSyncing
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.sync),
                label: Text(_isSyncing ? 'Syncing...' : 'Sync Now'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _GuardianManagementTile extends ConsumerStatefulWidget {
  const _GuardianManagementTile({super.key});

  @override
  ConsumerState<_GuardianManagementTile> createState() => _GuardianManagementTileState();
}

class _GuardianManagementTileState extends ConsumerState<_GuardianManagementTile> {
  final TextEditingController _addressController = TextEditingController();

  @override
  void dispose() {
    _addressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final core = ref.watch(digmCoreProvider).valueOrNull;
    final guardians = core?.get_guardians() ?? [];
    final threshold = core?.get_recovery_threshold() ?? 0;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: DigmTheme.glassContainer(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Guardians',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontWeight: FontWeight.w600,
                  color: DigmTheme.textPrimary,
                  fontSize: 16,
                ),
              ),
              Text(
                'Threshold: $threshold',
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 12,
                  color: DigmTheme.textSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...guardians.map((addr) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    addr,
                    style: const TextStyle(
                      fontFamily: 'SpaceGrotesk',
                      fontSize: 12,
                      color: DigmTheme.fuchsiaLight,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.remove_circle_outline, size: 18),
                  color: DigmTheme.error,
                  onPressed: () {
                    core?.remove_guardian(addr);
                    setState(() {});
                  },
                ),
              ],
            ),
          )),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _addressController,
                  decoration: const InputDecoration(
                    hintText: 'Guardian Address',
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () {
                  if (_addressController.text.isNotEmpty) {
                    core?.add_guardian(_addressController.text);
                    _addressController.clear();
                    setState(() {});
                  }
                },
                child: const Text('Add'),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Divider(color: DigmTheme.glassBorder),
          const SizedBox(height: 16),
          const Text(
            'Recovery',
            style: TextStyle(
              fontFamily: 'Inter',
              fontWeight: FontWeight.w600,
              color: DigmTheme.textPrimary,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const RecoveryScreen()),
                );
              },
              child: const Text('Manage Identity Recovery'),
            ),
          ),
        ],
      ),
    );
  }
}

class _BalanceTile extends StatelessWidget {
  final String label;
  final String value;

  const _BalanceTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: DigmTheme.glassContainer(),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 16,
              color: DigmTheme.textPrimary,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontFamily: 'SpaceGrotesk',
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: DigmTheme.fuchsiaLight,
            ),
          ),
        ],
      ),
    );
  }
}

class _StakingPoolTile extends StatelessWidget {
  final String album;
  final String paraStaked;
  final String rank;
  const _StakingPoolTile({required this.album, required this.paraStaked, required this.rank});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(16),
      decoration: DigmTheme.glassContainer(),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  album,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w600,
                    color: DigmTheme.textPrimary,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Staked: $paraStaked PARA',
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    color: DigmTheme.textSecondary,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: DigmTheme.fuchsia.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              rank,
              style: const TextStyle(
                fontFamily: 'SpaceGrotesk',
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: DigmTheme.fuchsiaLight,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StudioButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onPressed;
  const _StudioButton({super.key, required this.label, required this.icon, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, color: DigmTheme.fuchsiaLight),
      label: Text(
        label,
        style: GoogleFonts.spaceGrotesk(
          fontWeight: FontWeight.bold,
          color: DigmTheme.textPrimary,
          fontSize: 12,
        ),
      ),
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.white.withOpacity(0.1),
        foregroundColor: DigmTheme.textPrimary,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: DigmTheme.glassBorder),
        ),
        elevation: 0,
      ),
    );
  }
}

