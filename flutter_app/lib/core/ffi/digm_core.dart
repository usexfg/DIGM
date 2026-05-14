import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fuego_core/digm_core.dart';

/// Provider for the DIGM Rust Core.
/// This singleton manages the connection to the Fuego node, I2P router, and vault.
final digmCoreProvider = Provider<DigmCore>((ref) {
  // In a real app, these would be loaded from secure storage
  return DigmCore(
    mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon',
    storagePath: '/tmp/digm_data',
  );
});
