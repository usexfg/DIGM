import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/ffi/digm_core.dart';
import 'recovery_screen.dart';

/// Provider for the current node mode to allow UI reactivity.
final nodeModeProvider = StateProvider<String>((ref) => 'Client');

class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final digmCore = ref.watch(digmCoreProvider);
    final address = digmCore.get_address(0);
    
    final paraBalance = digmCore.get_current_earnings(address).toString();
    final voxBalance = digmCore.get_vox_balance(address).toString();
    final curaBalance = digmCore.get_cura_balance(address).toString();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Wallet'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Your Address',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            SelectableText(
              address,
              style: const TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const SizedBox(height: 24),
            const Text(
              'Balances',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
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
                    final txHash = await ref.read(digmCoreProvider).anchor_state();
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
            const Text(
              'Staking Pools',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            _StakingPoolTile(album: 'Fuego Waves', paraStaked: '1250.00', rank: '#3'),
            _StakingPoolTile(album: 'Deep Rust', paraStaked: '420.00', rank: '#12'),
            const SizedBox(height: 32),
            const Text(
              'Node Settings',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const _SovereignSettingsTile(),
            const SizedBox(height: 32),
            const Text(
              'Guardian Recovery',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const _GuardianManagementTile(),
          ],
        ),
      ),
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
      await ref.read(digmCoreProvider).sync_node();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Node sync complete!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Sync failed: $e')),
      );
    } finally {
      setState(() => _isSyncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final digmCore = ref.watch(digmCoreProvider);
    final mode = ref.watch(nodeModeProvider);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8.0),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8.0),
        child: Column(
          children: [
            const ListTile(
              title: Text('Node Mode', style: TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text('Controls validation depth and P2P seeding'),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: SegmentedButton<String>(
                segments: const [
                  ButtonSegment(value: 'Client', label: Text('Client')),
                  ButtonSegment(value: 'Seeder', label: Text('Seeder')),
                  ButtonSegment(value: 'Sovereign', label: Text('Sovereign')),
                ],
                selected: {mode},
                onSelectionChanged: (Set<String> newSelection) {
                  final newMode = newSelection.first;
                  ref.read(nodeModeProvider.notifier).state = newMode;
                  digmCore.set_node_mode(newMode);
                },
              ),
            ),
            if (mode == 'Sovereign' || mode == 'Seeder')
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _isSyncing ? null : _syncNode,
                    icon: _isSyncing 
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.sync),
                    label: Text(_isSyncing ? 'Syncing...' : 'Sync Now'),
                  ),
                ),
              ),
          ],
        ),
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
  Widget build(BuildContext context) {
    final digmCore = ref.watch(digmCoreProvider);
    final guardians = digmCore.get_guardians();
    final threshold = digmCore.get_recovery_threshold();

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8.0),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Guardians', style: TextStyle(fontWeight: FontWeight.bold)),
                Text('Threshold: $threshold', style: const TextStyle(fontSize: 12)),
              ],
            ),
            const SizedBox(height: 8),
            ...guardians.map((addr) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(addr, style: const TextStyle(fontSize: 12)),
              trailing: IconButton(
                icon: const Icon(Icons.remove_circle_outline, size: 18),
                onPressed: () {
                  digmCore.remove_guardian(addr);
                  setState(() {});
                },
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
                      digmCore.add_guardian(_addressController.text);
                      _addressController.clear();
                      setState(() {});
                    }
                  },
                  child: const Text('Add'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 16),
            const Text(
              'Recovery',
              style: TextStyle(fontWeight: FontWeight.bold),
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
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 16)),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
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
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 8.0),
      child: ListTile(
        title: Text(album, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('Staked: $paraStaked PARA'),
        trailing: Chip(
          label: Text(rank),
          backgroundColor: Colors.blue.withValues(alpha: 0.2),
        ),
      ),
    );
  }
}

class constHBox extends StatelessWidget {
  final double height;
  const constHBox({required this.height});

  @override
  Widget build(BuildContext context) {
    return SizedBox(height: height);
  }
}
