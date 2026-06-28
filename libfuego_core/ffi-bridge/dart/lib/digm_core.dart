import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class DigmCore {
  final String mnemonic;
  final String storagePath;
  final bool useMock;
  final String baseUrl;

  DigmCore({
    required this.mnemonic, 
    required this.storagePath, 
    this.useMock = true,
    this.baseUrl = 'http://localhost:8889',
  });

  // --- Internal API Helper ---
  Future<dynamic> _apiCall(String path, {String method = 'GET', dynamic body}) async {
    final url = Uri.parse('$baseUrl$path');
    try {
      final response = await http.request(
        method,
        url,
        body: body != null ? jsonEncode(body) : null,
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return jsonDecode(response.body);
      } else {
        throw Exception('API Error ${response.statusCode}: ${response.body}');
      }
    } catch (e) {
      debugPrint('API Call Failed: $e');
      rethrow;
    }
  }

  // --- Wallet & Identity (SYNC - cached/mock values) ---

  String get_address(int index) {
    return 'Fuego:1A2b3C4d5E6f7G8h9I0j';
  }

  String get_current_earnings(String address) {
    return '150000000';
  }

  int get_vox_balance(String address) {
    return 420000000;
  }

  int get_cura_balance(String address) {
    return 3;
  }

  // --- DIGM token / anti-spam gate (mock defaults) ---

  int acquire_digm_heat(String address) {
    debugPrint('Mock: acquire_digm_heat($address)');
    return 1;
  }

  int acquire_digm_xfg(String address) {
    debugPrint('Mock: acquire_digm_xfg($address)');
    return 1;
  }

  int consume_held_digm(String address) {
    debugPrint('Mock: consume_held_digm($address)');
    return 1;
  }

  String digm_pool_stats() {
    return '{"heat_pool_remaining":5000,"xfg_pool_remaining":5000,"heat_pool_sold":0,"xfg_pool_sold":0,"heat_fixed_price":10000000,"xfg_current_price":1000000,"deadline":1735689600,"singles_posted":0}';
  }

  int get_unspent_digm(String address) {
    return 0;
  }

  int singles_remaining() {
    return 10000;
  }

  bool is_single_catalogue_full() {
    return false;
  }


  // --- Node (ASYNC - real API calls) ---

  Future<void> sync_node() async {
    if (!useMock) {
      await _apiCall('/api/digm/sync', method: 'POST');
    } else {
      await Future.delayed(const Duration(seconds: 2));
    }
  }

  Future<String> anchor_state() async {
    if (!useMock) {
      final result = await _apiCall('/api/digm/anchor', method: 'POST');
      return result['tx_hash'];
    }
    return '0x${DateTime.now().millisecondsSinceEpoch.toRadixString(16)}';
  }

  // --- Discovery & Pools ---

  String get_single_pools() {
    return jsonEncode([
      {"track_id": "single-001", "album_id": "album-1", "total_para": 5000000, "votes": 120, "title": "Midnight City", "artist": "Headphone Son", "coverArt": "https://i1.sndcdn.com/artworks-000321337836-5zcudq-t500x500.jpg", "duration": "4:32", "audioUrl": "/assets/audio/preview-singles/headphone-son-midnight-city.opus"},
      {"track_id": "single-002", "album_id": "album-1", "total_para": 3200000, "votes": 89, "title": "Fuego Pulse", "artist": "Headphone Son", "coverArt": "https://images.unsplash.com/photo-1614613535308-eb5fbd33267c?q=80&w=500&auto=format&fit=crop", "duration": "3:45", "audioUrl": "/assets/audio/preview-singles/headphone-son-bitcoin.opus"},
      {"track_id": "single-003", "album_id": "album-2", "total_para": 7800000, "votes": 210, "title": "Deep State", "artist": "Symmetry", "coverArt": "https://images.unsplash.com/photo-1550684848-fac1c5b4e853", "duration": "5:15", "audioUrl": "/assets/audio/preview-singles/headphone-son-the-arbinger.opus"},
    ]);
  }

  String get_album_rankings() {
    return jsonEncode([
      {"album_id": "album-1", "title": "Fuego Waves", "total_sales": 150000000, "rank": 1, "artist": "Headphone Son", "coverArt": "https://i1.sndcdn.com/artworks-000321337836-5zcudq-t500x500.jpg", "genre": "Electronic", "description": "A high-energy journey through decentralized soundscapes.", "releaseDate": "2024-01-15"},
      {"album_id": "album-2", "title": "Deep Rust", "artist": "Symmetry", "total_sales": 98000000, "rank": 2, "coverArt": "https://images.unsplash.com/photo-1614613535308-eb5fbd33267c?q=80&w=500&auto=format&fit=crop", "genre": "Ambient", "description": "Low-fi beats for high-fidelity coding sessions.", "releaseDate": "2023-11-20"},
      {"album_id": "album-3", "title": "Neon Nights", "artist": "CyberPulse", "total_sales": 42000000, "rank": 3, "coverArt": "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=500&auto=format&fit=crop", "genre": "Synthwave", "description": "Retro-futuristic sounds for the digital nomad.", "releaseDate": "2024-03-05"},
    ]);
  }

  // -- Staking & Albums --

  void stake_album(String address, String albumId, int amount) {
    if (!useMock) {
      _apiCall('/api/digm/stake-album', method: 'POST', body: {
        'address': address, 'album_id': albumId, 'amount': amount,
      });
    }
  }

  void stake_single(String address, String trackId, String albumId, int amount) {
    if (!useMock) {
      _apiCall('/api/digm/stake-single', method: 'POST', body: {
        'address': address, 'track_id': trackId, 'album_id': albumId, 'amount': amount,
      });
    }
  }

  int unstake_single(String address, String trackId) {
    if (!useMock) {
      _apiCall('/api/digm/unstake-single', method: 'POST', body: {
        'address': address, 'track_id': trackId,
      });
    }
    return 0;
  }

  int unstake_album(String address, String albumId) {
    if (!useMock) {
      _apiCall('/api/digm/unstake-album', method: 'POST', body: {
        'address': address, 'album_id': albumId,
      });
    }
    return 0;
  }

  void create_album(String albumId, String title, int price, List<String> previewSingles) {
    if (!useMock) {
      _apiCall('/api/digm/create-album', method: 'POST', body: {
        'album_id': albumId, 'title': title, 'price': price, 'preview_singles': previewSingles,
      });
    }
  }

  bool can_browse_album(String address, String albumId) {
    return true;
  }

  int charge_browsing_play(String address, int trackDurationSecs, int playedSecs) {
    if (!useMock) {
      _apiCall('/api/digm/charge-browsing', method: 'POST', body: {
        'address': address, 'track_duration_secs': trackDurationSecs, 'played_secs': playedSecs,
      });
    }
    return 0;
  }

  // -- Economy --

  void earn_para(String address, int amount) {
    if (!useMock) {
      _apiCall('/api/digm/earn-para', method: 'POST', body: {
        'address': address, 'amount': amount,
      });
    }
  }

  void vote_for_single(String address, String trackId) {
    if (!useMock) {
      _apiCall('/api/digm/vote-single', method: 'POST', body: {
        'address': address, 'track_id': trackId,
      });
    }
  }

  void close_epoch() {
    if (!useMock) {
      _apiCall('/api/digm/close-epoch', method: 'POST');
    }
  }

  // -- Payments --

  void purchase_album(String address, String albumId, int amount) {
    if (!useMock) {
      _apiCall('/api/digm/purchase-album', method: 'POST', body: {
        'address': address, 'album_id': albumId, 'amount': amount,
      });
    }
  }

  void stream_payment(String from, String to, int amount) {
    if (!useMock) {
      _apiCall('/api/digm/stream-payment', method: 'POST', body: {
        'from': from, 'to': to, 'amount': amount,
      });
    }
  }

  // -- Audio (ASYNC - PCM streaming is inherently async) --

  Future<List<double>> next_pcm_frame() async {
    if (!useMock) {
      final result = await _apiCall('/api/digm/next-pcm-frame');
      if (result['status'] == 'eos') throw Exception('End of stream');
      final raw = result['frame'] as List<dynamic>;
      return raw.cast<double>();
    }
    return List.filled(480, 0.0);
  }

  void load_track(List<String> chunkHashes) {
    debugPrint('Mock: load_track(${chunkHashes.length} chunks)');
  }

  void set_node_mode(String mode) {
    debugPrint('Mock: set_node_mode($mode)');
  }

  // -- Stations & CURA (partially SYNC, partially fire-and-forget) --

  static const int maxStations = 10;

  void create_station(String curator, String stationId, String name, String description, List<String> tracks) {
    if (!useMock) {
      _apiCall('/api/digm/create-station', method: 'POST', body: {
        'curator': curator, 'station_id': stationId, 'name': name, 'description': description, 'tracks': tracks,
      });
    }
  }

  String get_curator_stations(String address) {
    return jsonEncode([
      {"station_id": "station-001", "name": "Fuego Waves Radio", "description": "Deep space ambient mixed with neo-tokyo synthwave.", "num_tracks": 4, "is_active": true},
    ]);
  }

  int curator_stations_remaining(String address) {
    return 9;
  }

  void update_curator_vibe(String address, String vibe) {
    if (!useMock) {
      _apiCall('/api/digm/curator-vibe', method: 'POST', body: {
        'address': address, 'vibe': vibe,
      });
    }
  }

  String get_curator_vibe(String address) {
    return 'Deep space ambient mixed with neo-tokyo synthwave. Focused on high-frequency energy for sovereign coding sessions.';
  }

  void set_curator_playlist(String address, List<String> tracks) {
    if (!useMock) {
      _apiCall('/api/digm/curator-playlist', method: 'POST', body: {
        'address': address, 'tracks': tracks,
      });
    }
  }

  String get_curator_playlist(String address) {
    return jsonEncode([
      {"title": "Curator's Pick 1", "artist": "Featured Artist", "duration": "3:30"},
    ]);
  }

  // -- Guardians & Recovery (SYNC - cached) --

  List<String> get_guardians() {
    return ['Fuego:Guardian1Abc...', 'Fuego:Guardian2Def...'];
  }

  int get_recovery_threshold() {
    return 2;
  }

  void add_guardian(String address) {
    debugPrint('Mock: add_guardian($address)');
  }

  void remove_guardian(String address) {
    debugPrint('Mock: remove_guardian($address)');
  }

  // -- Recovery (ASYNC) --

  Future<String> initiate_recovery(List<int> newPublicKey) async {
    await Future.delayed(const Duration(seconds: 1));
    return '{"old_root":"0xabc","new_public_key":"0xdef","threshold":2,"signatures":[]}';
  }

  Future<void> finalize_recovery(String requestJson) async {
    await Future.delayed(const Duration(seconds: 1));
  }

  bool verify_recovery(String requestJson) {
    return true;
  }

  // --- ParaPay (mock defaults) ---

  String parapay_begin(int trackLengthSec, {bool curatorPresent = false, String artist = 'artist', String listener = 'listener', String? curator}) {
    return '0000000000000000000000000000000000000000000000000000000000000001';
  }

  void parapay_tick(String streamId, int posSec) {
    debugPrint('Mock: parapay_tick($streamId, $posSec)');
  }

  int parapay_boost(String streamId) {
    debugPrint('Mock: parapay_boost($streamId)');
    return 0;
  }

  void parapay_end(String streamId, {bool skipped = false}) {
    debugPrint('Mock: parapay_end($streamId, skipped=$skipped)');
  }
}
