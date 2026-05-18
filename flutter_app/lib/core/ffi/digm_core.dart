import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';
import 'package:fuego_core/digm_core.dart';
import '../services/api_client.dart';
import '../services/api_digm_core.dart';

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final useRealApiProvider = StateProvider<bool>((ref) => false);

final digmCoreProvider = FutureProvider<DigmCore>((ref) async {
  final api = ref.watch(apiClientProvider);

  try {
    final core = await ApiDigmCore.create(api);
    final addr = core.get_address(0);
    if (addr.isNotEmpty) {
      ref.read(useRealApiProvider.notifier).state = true;
      debugPrint('DIGM: connected to Rust API server ($addr)');
      return core;
    }
  } catch (e) {
    debugPrint('DIGM: Rust API not available ($e), using mock');
  }

  final storage = ref.watch(secureStorageProvider);
  final mnemonic = await storage.read(key: 'digm_mnemonic') ?? '';
  final dir = await _getStoragePath();
  return DigmCore(mnemonic: mnemonic, storagePath: dir);
});

Future<String> _getStoragePath() async {
  final directory = await getApplicationDocumentsDirectory();
  return directory.path;
}
