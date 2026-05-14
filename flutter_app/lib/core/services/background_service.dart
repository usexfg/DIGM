import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class BackgroundService {
  static const _channel = MethodChannel('com.fuego.digm/background_service');

  Future<void> startService() async {
    try {
      await _channel.invokeMethod('startService');
    } on PlatformException catch (e) {
      print('Failed to start background service: ${e.message}');
    }
  }

  Future<void> stopService() async {
    try {
      await _channel.invokeMethod('stopService');
    } on PlatformException catch (e) {
      print('Failed to stop background service: ${e.message}');
    }
  }

  Future<bool> isRunning() async {
    try {
      return await _channel.invokeMethod('isRunning');
    } on PlatformException catch (e) {
      print('Failed to check background service status: ${e.message}');
      return false;
    }
  }
}

final backgroundServiceProvider = Provider<BackgroundService>((ref) {
  return BackgroundService();
});
