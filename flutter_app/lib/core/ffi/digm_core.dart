import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';
import 'package:digm_core/digm_core.dart';
import '../services/api_client.dart';
import '../services/api_digm_core.dart';

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final digmCoreProvider = FutureProvider<DigmCore>((ref) async {
  final api = ref.watch(apiClientProvider);

  try {
    final core = await ApiDigmCore.create(api);
    final addr = core.get_address(0);
    if (addr.isNotEmpty) {
      debugPrint('DIGM: connected to API server ($addr)');
      return core;
    }
  } catch (e) {
    debugPrint('DIGM: API server not available ($e)');
    rethrow;
  }

  throw Exception('DIGM API server at http://localhost:8889 not reachable');
});

Future<String> _getStoragePath() async {
  final directory = await getApplicationDocumentsDirectory();
  return directory.path;
}
