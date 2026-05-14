import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/ffi/digm_core.dart';


class RecoveryScreen extends ConsumerStatefulWidget {
  const RecoveryScreen({super.key});

  @override
  ConsumerState<RecoveryScreen> createState() => _RecoveryScreenState();
}

class _RecoveryScreenState extends ConsumerState<RecoveryScreen> {
  final TextEditingController _newPkController = TextEditingController();
  final TextEditingController _requestJsonController = TextEditingController();
  bool _isInitiating = false;
  bool _isFinalizing = false;

  void _initiateRecovery() async {
    if (_newPkController.text.isEmpty) return;
    
    setState(() => _isInitiating = true);
    try {
      // For the demo, we treat the input as a hex string and convert to bytes
      final pkBytes = _newPkController.text.trim().isNotEmpty 
          ? _hexToBytes(_newPkController.text.trim()) 
          : List.filled(32, 0);
          
      final requestJson = await ref.read(digmCoreProvider).initiate_recovery(pkBytes);
      
      if (!mounted) return;
      _requestJsonController.text = requestJson;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Recovery request generated! Share this with your guardians.')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Initiation failed: $e')),
      );
    } finally {
      setState(() => _isInitiating = false);
    }
  }

  void _finalizeRecovery() async {
    if (_requestJsonController.text.isEmpty) return;
    
    setState(() => _isFinalizing = true);
    try {
      await ref.read(digmCoreProvider).finalize_recovery(_requestJsonController.text);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Identity successfully restored!')),
      );
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Finalization failed: $e')),
      );
    } finally {
      setState(() => _isFinalizing = false);
    }
  }

  List<int> _hexToBytes(String hex) {
    if (hex.length != 64) return List.filled(32, 0);
    List<int> bytes = [];
    for (var i = 0; i < hex.length; i += 2) {
      bytes.add(int.parse(hex.substring(i, i + 2), radix: 16));
    }
    return bytes;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Identity Recovery')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Initiate Recovery',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Provide your new public key to generate a recovery request.',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _newPkController,
              decoration: const InputDecoration(
                labelText: 'New Public Key (Hex)',
                border: OutlineInputBorder(),
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
            const SizedBox(height: 32),
            const Divider(),
            const SizedBox(height: 32),
            const Text(
              'Finalize Recovery',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Paste the signed recovery request JSON provided by your guardians.',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _requestJsonController,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: 'Recovery Request JSON',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isFinalizing ? null : _finalizeRecovery,
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green.shade50),
                child: Text(_isFinalizing ? 'Restoring...' : 'Finalize Restoration'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
