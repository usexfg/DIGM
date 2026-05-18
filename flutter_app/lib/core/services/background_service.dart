import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class BackgroundService {
  static const _channel = MethodChannel('com.fuego.digm/background_service');

  Future<void> startService() async {
    try {
      await _channel.invokeMethod('startService');
    } on PlatformException catch (e) {
      debugPrint('BackgroundService: start failed - ${e.message}');
    } on MissingPluginException {
      debugPrint('BackgroundService: not yet implemented on this platform');
    }
  }

  Future<void> stopService() async {
    try {
      await _channel.invokeMethod('stopService');
    } on PlatformException catch (e) {
      debugPrint('BackgroundService: stop failed - ${e.message}');
    } on MissingPluginException {
      debugPrint('BackgroundService: not yet implemented on this platform');
    }
  }

  Future<bool> isRunning() async {
    try {
      final result = await _channel.invokeMethod<bool>('isRunning');
      return result ?? false;
    } on PlatformException catch (e) {
      debugPrint('BackgroundService: status check failed - ${e.message}');
      return false;
    } on MissingPluginException {
      return false;
    }
  }
}

final backgroundServiceProvider = Provider<BackgroundService>((ref) {
  return BackgroundService();
});
