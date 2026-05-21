import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/ffi/digm_core.dart';
import '../../../core/theme/digm_theme.dart';

class StakingScreen extends ConsumerStatefulWidget {
  const StakingScreen({super.key});

  @override
  ConsumerState<StakingScreen> createState() => _StakingScreenState();
}

class _StakingScreenState extends ConsumerState<StakingScreen> {
  final _trackIdController = TextEditingController();
  final _albumIdController = TextEditingController();
  final _amountController = TextEditingController();
  String? _status;

  @override
  void dispose() {
    _trackIdController.dispose();
    _albumIdController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _stakeSingle() async {
    final trackId = _trackIdController.text.trim();
    final albumId = _albumIdController.text.trim();
    final amountText = _amountController.text.trim;

    if (trackId.isEmpty || albumId.isEmpty || amountText.isEmpty) return;

    final amount = (double.parse(amountText) * 10000000).toInt();
    try {
      final core = await ref.read(digmCoreProvider.future);
      final address = core.get_address(0);
      core.stake_single(address, trackId, albumId, amount);
      setState(() => _status = 'PARA staked on $trackId');
      _amountController.clear();
    } catch (e) {
      setState(() => _status = 'Staking failed: $e');
    }
  }

  Future<void> _stakeAlbum() async {
    final albumId = _albumIdController.text.trim();
    final amountText = _amountController.text.trim;

    if (albumId.isEmpty || amountText.isEmpty) return;

    final amount = (double.parse(amountText) * 10000000).toInt();
    try {
      final core = await ref.read(digmCoreProvider.future);
      final address = core.get_address(0);
      core.stake_album(address, albumId, amount);
      setState(() => _status = 'PARA staked on $albumId');
      _amountController.clear();
    } catch (e) {
      setState(() => _status = 'Staking failed: $e');
    }
  }

  Future<void> _voteSingle() async {
    final trackId = _trackIdController.text.trim();
    if (trackId.isEmpty) return;
    try {
      final core = await ref.read(digmCoreProvider.future);
      final address = core.get_address(0);
      core.vote_for_single(address, trackId);
      setState(() => _status = 'Voted for $trackId');
    } catch (e) {
      setState(() => _status = 'Vote failed: $e');
    }
  }

  Future<void> _closeEpoch() async {
    try {
      final core = await ref.read(digmCoreProvider.future);
      core.close_epoch();
      setState(() => _status = 'Epoch closed! VOX distributed.');
    } catch (e) {
      setState(() => _status = 'Epoch close failed: $e');
    }
  }

  Future<void> _unstakeSingle() async {
    final trackId = _trackIdController.text.trim();
    if (trackId.isEmpty) return;
    try {
      final core = await ref.read(digmCoreProvider.future);
      final address = core.get_address(0);
      final returned = core.unstake_single(address, trackId);
      setState(() => _status = 'Unstaked ${(returned / 10000000).toStringAsFixed(2)} PARA from $trackId');
    } catch (e) {
      setState(() => _status = 'Unstake failed: $e');
    }
  }

  Future<void> _unstakeAlbum() async {
    final albumId = _albumIdController.text.trim();
    if (albumId.isEmpty) return;
    try {
      final core = await ref.read(digmCoreProvider.future);
      final address = core.get_address(0);
      final returned = core.unstake_album(address, albumId);
      setState(() => _status = 'Unstaked ${(returned / 10000000).toStringAsFixed(2)} PARA from $albumId');
    } catch (e) {
      setState(() => _status = 'Unstake failed: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ShaderMask(
                shaderCallback: DigmTheme.gradientShader,
                child: const Text(
                  'Staking',
                  style: TextStyle(
                    fontFamily: 'SpaceGrotesk',
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Stake PARA on singles and albums to earn VOX',
            style: TextStyle(color: DigmTheme.textSecondary, fontSize: 14),
          ),
          const SizedBox(height: 24),

          if (_status != null) ...[
            _StatusBanner(message: _status!),
            const SizedBox(height: 16),
          ],

          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: DigmTheme.glassContainer(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Stake on a Single',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w600,
                    color: DigmTheme.textPrimary,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _trackIdController,
                  decoration: const InputDecoration(
                    labelText: 'Track ID',
                    hintText: 'e.g. single-001',
                    isDense: true,
                  ),
                  style: const TextStyle(color: DigmTheme.fuchsiaLight),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _albumIdController,
                  decoration: const InputDecoration(
                    labelText: 'Album ID',
                    hintText: 'e.g. album-1',
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _amountController,
                  decoration: const InputDecoration(
                    labelText: 'PARA Amount',
                    hintText: 'e.g. 1.5',
                    isDense: true,
                  ),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _stakeSingle,
                        child: const Text('Stake Single'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _stakeAlbum,
                        icon: const Icon(Icons.album, size: 18),
                        label: const Text('Stake Album'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: DigmTheme.glassContainer(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Actions',
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontWeight: FontWeight.w600,
                    color: DigmTheme.textPrimary,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _voteSingle,
                    icon: const Icon(Icons.favorite_border, size: 18),
                    label: const Text('Vote on Single'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: DigmTheme.fuchsia.withValues(alpha: 0.3),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _unstakeSingle,
                        icon: const Icon(Icons.undo, size: 14),
                        label: const Text('Unstake'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange.withValues(alpha: 0.2),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _unstakeAlbum,
                        icon: const Icon(Icons.undo, size: 14),
                        label: const Text('Unstake Album'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orange.withValues(alpha: 0.2),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _closeEpoch,
                    icon: const Icon(Icons.auto_awesome, size: 18),
                    label: const Text('Close Epoch (Trigger VOX Rewards)'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: DigmTheme.success.withValues(alpha: 0.2),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBanner extends StatelessWidget {
  final String message;
  const _StatusBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: DigmTheme.success.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: DigmTheme.success.withValues(alpha: 0.3)),
      ),
      child: Text(
        message,
        style: const TextStyle(color: DigmTheme.success, fontSize: 14),
      ),
    );
  }
}
