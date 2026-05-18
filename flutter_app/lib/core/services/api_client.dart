import 'dart:convert';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ApiClient {
  final String baseUrl;
  final HttpClient _client;

  ApiClient({this.baseUrl = 'http://127.0.0.1:8889'}) : _client = HttpClient();

  Future<Map<String, dynamic>> _get(String path) async {
    final url = Uri.parse('$baseUrl/api/digm/$path');
    final request = await _client.getUrl(url);
    final response = await request.close();
    final body = await response.transform(utf8.decoder).join();
    return jsonDecode(body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body) async {
    final url = Uri.parse('$baseUrl/api/digm/$path');
    final request = await _client.postUrl(url);
    request.headers.contentType = ContentType.json;
    request.write(jsonEncode(body));
    final response = await request.close();
    final responseBody = await response.transform(utf8.decoder).join();
    return jsonDecode(responseBody) as Map<String, dynamic>;
  }

  Future<String> getAddress() async {
    final result = await _get('address');
    return result['address'] as String;
  }

  Future<Map<String, dynamic>> getBalance(String address) async {
    return _get('balance/$address');
  }

  Future<List<dynamic>> getSinglePools() async {
    final result = await _get('single-pools');
    return result as List<dynamic>;
  }

  Future<List<dynamic>> getAlbumRankings() async {
    final result = await _get('album-rankings');
    return result as List<dynamic>;
  }

  Future<Map<String, dynamic>> stakeAlbum({
    required String address,
    required String albumId,
    required int amount,
  }) async {
    return _post('stake-album', {
      'address': address,
      'album_id': albumId,
      'amount': amount,
    });
  }

  Future<Map<String, dynamic>> stakeSingle({
    required String address,
    required String trackId,
    required String albumId,
    required int amount,
  }) async {
    return _post('stake-single', {
      'address': address,
      'track_id': trackId,
      'album_id': albumId,
      'amount': amount,
    });
  }

  Future<Map<String, dynamic>> purchaseAlbum({
    required String address,
    required String albumId,
    required int amount,
  }) async {
    return _post('purchase-album', {
      'address': address,
      'album_id': albumId,
      'amount': amount,
    });
  }

  Future<Map<String, dynamic>> sync() async {
    return _post('sync', {});
  }

  Future<Map<String, dynamic>> anchor() async {
    return _post('anchor', {});
  }

  void close() {
    _client.close();
  }
}

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});
