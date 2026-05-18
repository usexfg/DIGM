import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';
import 'package:fuego_core/digm_core.dart';

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final digmCoreProvider = FutureProvider<DigmCore>((ref) async {
  final storage = ref.watch(secureStorageProvider);
  final mnemonic = await storage.read(key: 'digm_mnemonic') ?? '';
  final dir = await _getStoragePath();
  return DigmCore(mnemonic: mnemonic, storagePath: dir);
});

Future<String> _getStoragePath() async {
  final directory = await getApplicationDocumentsDirectory();
  return directory.path;
}
