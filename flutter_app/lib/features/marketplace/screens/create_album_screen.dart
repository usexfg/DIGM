import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/ffi/digm_core.dart';
import '../../../core/theme/digm_theme.dart';

class CreateAlbumScreen extends ConsumerStatefulWidget {
  const CreateAlbumScreen({super.key});

  @override
  ConsumerState<CreateAlbumScreen> createState() => _CreateAlbumScreenState();
}

class _CreateAlbumScreenState extends ConsumerState<CreateAlbumScreen> {
  final _albumIdController = TextEditingController();
  final _titleController = TextEditingController();
  final _priceController = TextEditingController();
  final _singlesController = TextEditingController();
  bool _isSubmitting = false;
  String? _result;

  @override
  void dispose() {
    _albumIdController.dispose();
    _titleController.dispose();
    _priceController.dispose();
    _singlesController.dispose();
    super.dispose();
  }

  Future<void> _publish() async {
    final albumId = _albumIdController.text.trim();
    final title = _titleController.text.trim();
    final priceText = _priceController.text.trim;
    final singlesText = _singlesController.text.trim;

    if (albumId.isEmpty || title.isEmpty || priceText.isEmpty) return;

    final price = (double.parse(priceText) * 10000000).toInt();
    final singles = singlesText
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    setState(() => _isSubmitting = true);

    try {
      final core = await ref.read(digmCoreProvider.future);
      core.create_album(albumId, title, price, singles);
      setState(() {
        _result = 'Album "$title" published!';
        _isSubmitting = false;
      });
      _albumIdController.clear();
      _titleController.clear();
      _priceController.clear();
      _singlesController.clear();
    } catch (e) {
      setState(() {
        _result = 'Failed to publish: $e';
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ShaderMask(
            shaderCallback: DigmTheme.gradientShader,
            child: const Text(
              'Publish Album',
              style: TextStyle(
                fontFamily: 'SpaceGrotesk',
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Share your music with the world. 1-3 preview singles for ParaDio airplay.',
            style: TextStyle(color: DigmTheme.textSecondary, fontSize: 14),
          ),
          const SizedBox(height: 24),

          if (_result != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: DigmTheme.success.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: DigmTheme.success.withValues(alpha: 0.3)),
              ),
              child: Text(
                _result!,
                style: const TextStyle(color: DigmTheme.success),
              ),
            ),
          ],

          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: DigmTheme.glassContainer(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextField(
                  controller: _albumIdController,
                  decoration: const InputDecoration(
                    labelText: 'Album ID',
                    hintText: 'e.g. my-album-1',
                  ),
                  style: const TextStyle(color: DigmTheme.fuchsiaLight, fontFamily: 'SpaceGrotesk'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    labelText: 'Album Title',
                    hintText: 'e.g. Neon Nights',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _priceController,
                  decoration: const InputDecoration(
                    labelText: 'Price (XFG)',
                    hintText: 'e.g. 1.5',
                  ),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _singlesController,
                  decoration: const InputDecoration(
                    labelText: 'Preview Singles',
                    hintText: 'e.g. track-1, track-2',
                    helperText: 'Comma-separated track IDs (1-3)',
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: _isSubmitting ? null : _publish,
                    icon: _isSubmitting
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.publish),
                    label: Text(_isSubmitting ? 'Publishing...' : 'Publish Album'),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Requires DIGM colored coin (0x0B license)',
                  style: TextStyle(color: DigmTheme.textMuted, fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
