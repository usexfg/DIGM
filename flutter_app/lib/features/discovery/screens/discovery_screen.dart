import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/ffi/digm_core.dart';
import '../../../core/services/audio_player_service.dart';
import 'dart:convert';

class SinglePool {
  final String id;
  final String albumId;
  final int totalPara;
  final int votes;

  SinglePool({required this.id, required this.albumId, required this.totalPara, required this.votes});

  factory SinglePool.fromJson(Map<String, dynamic> json) {
    return SinglePool(
      id: json['track_id'] as String,
      albumId: json['album_id'] as String,
      totalPara: json['total_para'] as int,
      votes: json['votes'] as int,
    );
  }
}

class DiscoveryScreen extends ConsumerStatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  ConsumerState<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends ConsumerState<DiscoveryScreen> {
  List<SinglePool> _singlePools = [];

  @override
  void initState() {
    super.initState();
    _loadPools();
  }

  void _loadPools() {
    final core = ref.read(digmCoreProvider);
    final poolsJson = core.get_single_pools();
    final List<dynamic> decoded = jsonDecode(poolsJson);
    setState(() {
      _singlePools = decoded.map((e) => SinglePool.fromJson(e as Map<String, dynamic>)).toList();
    });
  }

  void _playTrack(String trackId, String albumId) {
    final audioPlayer = ref.read(audioPlayerProvider);
    audioPlayer.loadTrack([
      'hash_${albumId}_${trackId}_1',
      'hash_${albumId}_${trackId}_2',
      'hash_${albumId}_${trackId}_3',
    ]);
    audioPlayer.play();
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Streaming $trackId from $albumId on ParaDio...')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Discovery'),
      ),
      body: _singlePools.isEmpty 
        ? const Center(child: Text('No active single pools in the network'))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _singlePools.length,
            itemBuilder: (context, index) {
              final pool = _singlePools[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                child: ListTile(
                  title: Text('Single: ${pool.id}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text('From Album: ${pool.albumId}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('${pool.totalPara} PARA', style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
                      const SizedBox(width: 8),
                      Text('${pool.votes} Votes', style: const TextStyle(fontSize: 12)),
                      const SizedBox(width: 8),
                      IconButton(
                        icon: const Icon(Icons.play_arrow),
                        onPressed: () => _playTrack(pool.id, pool.albumId),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
    );
  }
}
