import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/ffi/digm_core.dart';
import '../../../core/theme/digm_theme.dart';

class RecoveryScreen extends ConsumerStatefulWidget {
  const RecoveryScreen({super.key});

  @override
  ConsumerState<RecoveryScreen> createState() => _RecoveryScreenState();
}

class _RecoveryScreenState extends ConsumerState<RecoveryScreen> {
  final _newPkController = TextEditingController();
  final _requestJsonController = TextEditingController();
  bool _isInitiating = false;
  bool _isFinalizing = false;

  @override
  void dispose() {
    _newPkController.dispose();
    _requestJsonController.dispose();
    super.dispose();
  }

  Future<void> _initiateRecovery() async {
    if (_newPkController.text.isEmpty) return;

    final confirmed = await _showConfirmDialog(
      'Initiate Recovery',
      'Are you sure you want to initiate identity recovery using the provided public key? This cannot be undone.',
    );
    if (!confirmed || !mounted) return;

    setState(() => _isInitiating = true);
    try {
      final pkBytes = _newPkController.text.trim().isNotEmpty
          ? _hexToBytes(_newPkController.text.trim())
          : List.filled(32, 0);

      final core = await ref.read(digmCoreProvider.future);
      final requestJson = await core.initiate_recovery(pkBytes);

      if (!mounted) return;
      _requestJsonController.text = requestJson;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Recovery request generated! Share this with your guardians.'),
          backgroundColor: DigmTheme.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Initiation failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _isInitiating = false);
    }
  }

  Future<void> _finalizeRecovery() async {
    if (_requestJsonController.text.isEmpty) return;

    final confirmed = await _showConfirmDialog(
      'Finalize Recovery',
      'WARNING: This will permanently restore your identity. Ensure you have received signed approvals from the required number of guardians.',
    );
    if (!confirmed || !mounted) return;

    setState(() => _isFinalizing = true);
    try {
      final core = await ref.read(digmCoreProvider.future);
      await core.finalize_recovery(_requestJsonController.text);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Identity successfully restored!'),
          backgroundColor: DigmTheme.success,
        ),
      );
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Finalization failed: $e')),
      );
    } finally {
      if (mounted) setState(() => _isFinalizing = false);
    }
  }

  Future<bool> _showConfirmDialog(String title, String body) async {
    return await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: DigmTheme.surfaceDark,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: DigmTheme.glassBorder),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w600,
            color: DigmTheme.textPrimary,
          ),
        ),
        content: Text(
          body,
          style: const TextStyle(
            fontFamily: 'Inter',
            color: DigmTheme.textSecondary,
            fontSize: 14,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: DigmTheme.error,
            ),
            child: const Text('Confirm'),
          ),
        ],
      ),
    ) ?? false;
  }

  List<int> _hexToBytes(String hex) {
    if (hex.length != 64) return List.filled(32, 0);
    final bytes = <int>[];
    for (var i = 0; i < hex.length; i += 2) {
      bytes.add(int.parse(hex.substring(i, i + 2), radix: 16));
    }
    return bytes;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Identity Recovery')),
      body: Container(
        decoration: const BoxDecoration(gradient: DigmTheme.bgGradient),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: DigmTheme.glassContainer(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Initiate Recovery',
                      style: TextStyle(
                        fontFamily: 'SpaceGrotesk',
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: DigmTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Provide your new public key to generate a recovery request.',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 14,
                        color: DigmTheme.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _newPkController,
                      decoration: const InputDecoration(
                        labelText: 'New Public Key (Hex)',
                        border: OutlineInputBorder(),
                      ),
                      style: const TextStyle(
                        fontFamily: 'SpaceGrotesk',
                        fontSize: 13,
                        color: DigmTheme.fuchsiaLight,
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isInitiating ? null : _initiateRecovery,
                        child: Text(_isInitiating ? 'Generating...' : 'Generate Request'),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: DigmTheme.glassContainer(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Finalize Recovery',
                      style: TextStyle(
                        fontFamily: 'SpaceGrotesk',
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: DigmTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Paste the signed recovery request JSON provided by your guardians.',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 14,
                        color: DigmTheme.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _requestJsonController,
                      maxLines: 5,
                      decoration: const InputDecoration(
                        labelText: 'Recovery Request JSON',
                        border: OutlineInputBorder(),
                      ),
                      style: const TextStyle(
                        fontFamily: 'SpaceGrotesk',
                        fontSize: 13,
                        color: DigmTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _isFinalizing ? null : _finalizeRecovery,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: DigmTheme.error.withValues(alpha: 0.8),
                        ),
                        child: Text(_isFinalizing ? 'Restoring...' : 'Finalize Restoration'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
