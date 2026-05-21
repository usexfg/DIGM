import 'dart:async';
import 'dart:convert';
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
    } catch (_) {}
  }

  Future<void> _refreshBalances() async {
    try {
      final addr = _address;
      if (addr.isEmpty) return;
      final balances = await _api.getBalance(addr);
      _paraBalance = (balances['para'] as num?)?.toInt() ?? _paraBalance;
      _voxBalance = (balances['vox'] as num?)?.toInt() ?? _voxBalance;
      _curaBalance = (balances['cura'] as num?)?.toInt() ?? _curaBalance;
    } catch (_) {}
  }

  void dispose() {
    _refreshTimer?.cancel();
  }

  // -- Wallet & Identity --

  @override
  String get_address(int index) => _address;

  @override
  int get_current_earnings(String address) => _paraBalance;

  @override
  int get_vox_balance(String address) => _voxBalance;

  @override
  int get_cura_balance(String address) => _curaBalance;

  // -- Node --

  @override
  Future<void> sync_node() async {
    await _api.sync();
  }

  @override
  Future<String> anchor_state() async {
    final result = await _api.anchor();
    return (result['tx_hash'] as String?) ?? '';
  }

  // -- Discovery & Pools --

  @override
  String get_single_pools() => _singlePools;

  @override
  String get_album_rankings() => _albumRankings;

  // -- Staking & Albums --

  @override
  void stake_album(String address, String albumId, int amount) {
    _api.stakeAlbum(address: address, albumId: albumId, amount: amount);
  }

  @override
  int unstake_single(String address, String trackId) {
    _api.unstakeSingle(address: address, trackId: trackId);
    return 0;
  }

  @override
  int unstake_album(String address, String albumId) {
    _api.unstakeAlbum(address: address, albumId: albumId);
    return 0;
  }

  @override
  void create_album(String albumId, String title, int price, List<String> previewSingles) {
    _api.stakeAlbum(address: _address, albumId: albumId, amount: price);
  }

  @override
  bool can_browse_album(String address, String albumId) => true;

  // -- Economy --

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

  @override
  int charge_browsing_play(String address, int trackDurationSecs, int playedSecs) {
    _api.chargeBrowsing(address: address, trackDurationSecs: trackDurationSecs, playedSecs: playedSecs);
    return 0;
  }

  // -- Guardians & Recovery --

  @override
  List<String> get_guardians() => _guardians;

  @override
  int get_recovery_threshold() => _recoveryThreshold;
}
