class Track {
  final String id;
  final String title;
  final String artist;
  final String? albumTitle;
  final String? albumId;
  final String? albumArtUrl;
  final List<String> chunkHashes;
  final Duration duration;

  const Track({
    required this.id,
    required this.title,
    required this.artist,
    this.albumTitle,
    this.albumId,
    this.albumArtUrl,
    this.chunkHashes = const [],
    this.duration = Duration.zero,
  });
}
