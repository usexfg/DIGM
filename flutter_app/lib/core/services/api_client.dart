import 'dart:convert';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ApiClient {
  final String baseUrl;
  final HttpClient _client;

  ApiClient({this.baseUrl = 'http://127.0.0.1:8889'}) : _client = HttpClient();

  Future<dynamic> _get(String path) async {
    final url = Uri.parse('$baseUrl/api/digm/$path');
    final request = await _client.getUrl(url);
    final response = await request.close();
    final body = await response.transform(utf8.decoder).join();
    return jsonDecode(body);
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
    if (result is Map<String, dynamic>) {
      return result['address'] as String? ?? '';
    }
    return '';
  }

  Future<Map<String, dynamic>> getBalance(String address) async {
    final result = await _get('balance/$address');
    if (result is Map<String, dynamic>) return result;
    return {};
  }

  Future<List<dynamic>> getSinglePools() async {
    final result = await _get('single-pools');
    if (result is List<dynamic>) return result;
    return [];
  }

  Future<List<dynamic>> getAlbumRankings() async {
    final result = await _get('album-rankings');
    if (result is List<dynamic>) return result;
    return [];
  }

  Future<Map<String, dynamic>> getGuardians() async {
    final result = await _get('guardians');
    if (result is Map<String, dynamic>) return result;
    return {};
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

  Future<Map<String, dynamic>> unstakeSingle({
    required String address,
    required String trackId,
  }) async {
    return _post('unstake-single', {
      'address': address,
      'track_id': trackId,
    });
  }

  Future<Map<String, dynamic>> unstakeAlbum({
    required String address,
    required String albumId,
  }) async {
    return _post('unstake-album', {
      'address': address,
      'album_id': albumId,
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

  Future<Map<String, dynamic>> earnPara({
    required String address,
    required int amount,
  }) async {
    return _post('earn-para', {
      'address': address,
      'amount': amount,
    });
  }

  Future<Map<String, dynamic>> streamPayment({
    required String from,
    required String to,
    required int amount,
  }) async {
    return _post('stream-payment', {
      'from': from,
      'to': to,
      'amount': amount,
    });
  }

  Future<Map<String, dynamic>> chargeBrowsing({
    required String address,
    required int trackDurationSecs,
    required int playedSecs,
  }) async {
    return _post('charge-browsing', {
      'address': address,
      'track_duration_secs': trackDurationSecs,
      'played_secs': playedSecs,
    });
  }

  Future<Map<String, dynamic>> voteSingle({
    required String address,
    required String trackId,
  }) async {
    return _post('vote-single', {
      'address': address,
      'track_id': trackId,
    });
  }

  Future<Map<String, dynamic>> closeEpoch() async {
    return _post('close-epoch', {});
  }

  void close() {
    _client.close();
  }
}

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});
