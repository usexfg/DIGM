import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:fuego_core/digm_core.dart';
import 'api_client.dart';

class ApiDigmCore extends DigmCore {
  final ApiClient _api;
  Timer? _refreshTimer;

  String _address = '';
  int _paraBalance = 0;
  int _voxBalance = 0;
  int _curaBalance = 0;
  String _singlePools = '[]';
  String _albumRankings = '[]';
  List<String> _guardians = [];
  int _recoveryThreshold = 0;

  ApiDigmCore._(this._api) : super(mnemonic: '', storagePath: '');

  static Future<ApiDigmCore> create(ApiClient api) async {
    final core = ApiDigmCore._(api);
    await core._fetchInitialData();
    core._startPeriodicRefresh();
    return core;
  }

  void _startPeriodicRefresh() {
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _refreshBalances();
    });
  }

  Future<void> _fetchInitialData() async {
    try {
      _address = await _api.getAddress();
      final balances = await _api.getBalance(_address);
      _paraBalance = (balances['para'] as num?)?.toInt() ?? 0;
      _voxBalance = (balances['vox'] as num?)?.toInt() ?? 0;
      _curaBalance = (balances['cura'] as num?)?.toInt() ?? 0;
      _singlePools = jsonEncode(await _api.getSinglePools());
      _albumRankings = jsonEncode(await _api.getAlbumRankings());
      final guardians = await _api.getGuardians();
      _guardians = (guardians['guardians'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList() ?? [];
      _recoveryThreshold = (guardians['threshold'] as num?)?.toInt() ?? 0;
    } catch (e) {
      debugPrint('ApiDigmCore init error: $e');
    }
  }

  Future<void> _refreshBalances() async {
    try {
      final addr = _address;
      if (addr.isEmpty) return;
      final balances = await _api.getBalance(addr);
      _paraBalance = (balances['para'] as num?)?.toInt() ?? _paraBalance;
      _voxBalance = (balances['vox'] as num?)?.toInt() ?? _voxBalance;
      _curaBalance = (balances['cura'] as num?)?.toInt() ?? _curaBalance;
    } catch (e) {
      debugPrint('Balances refresh error: $e');
    }
  }

  void dispose() {
    _refreshTimer?.cancel();
  }

  // --- SYNC methods (cached values) ---

  @override
  String get_address(int index) => _address;

  @override
  String get_current_earnings(String address) => _paraBalance.toString();

  @override
  int get_vox_balance(String address) => _voxBalance;

  @override
  int get_cura_balance(String address) => _curaBalance;

  @override
  String get_single_pools() => _singlePools;

  @override
  String get_album_rankings() => _albumRankings;

  @override
  List<String> get_guardians() => _guardians;

  @override
  int get_recovery_threshold() => _recoveryThreshold;

  // --- ASYNC methods (real API calls) ---

  @override
  Future<void> sync_node() async {
    await _api.sync();
  }

  @override
  Future<String> anchor_state() async {
    final result = await _api.anchor();
    return result['tx_hash'] as String? ?? '';
  }

  @override
  Future<List<double>> next_pcm_frame() async {
    try {
      final result = await _api.get('next-pcm-frame');
      if (result['status'] == 'eos') throw Exception('End of stream');
      final raw = result['frame'] as List<dynamic>;
      return raw.cast<double>();
    } catch (e) {
      debugPrint('PCM fetch error: $e');
      rethrow;
    }
  }

  // --- Fire-and-forget methods ---

  @override
  void stake_album(String address, String albumId, int amount) {
    _api.stakeAlbum(address: address, albumId: albumId, amount: amount);
  }

  @override
  void earn_para(String address, int amount) {
    _api.earnPara(address: address, amount: amount);
  }

  @override
  void vote_for_single(String address, String trackId) {
    _api.voteSingle(address: address, trackId: trackId);
  }

  @override
  void close_epoch() {
    _api.closeEpoch();
  }

  @override
  void stream_payment(String from, String to, int amount) {
    _api.streamPayment(from: from, to: to, amount: amount);
  }

  // -- Recovery --

  @override
  Future<String> initiate_recovery(List<int> newPublicKey) async {
    debugPrint('ApiDigmCore: initiate_recovery not implemented via API yet');
    await Future.delayed(const Duration(seconds: 1));
    return '{"old_root":"0xabc","new_public_key":"0xdef","threshold":2,"signatures":[]}';
  }

  @override
  Future<void> finalize_recovery(String requestJson) async {
    debugPrint('ApiDigmCore: finalize_recovery not implemented via API yet');
    await Future.delayed(const Duration(seconds: 1));
  }
}
