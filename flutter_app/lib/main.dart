import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/ffi/digm_core.dart';
import 'core/services/background_service.dart';
import 'features/player/screens/paradio_screen.dart';
import 'features/wallet/screens/wallet_screen.dart';
import 'features/discovery/screens/discovery_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: DigmApp()));
}

class DigmApp extends StatelessWidget {
  const DigmApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DIGM',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.dark,
        ),
      ),
      home: const MainNavigationScreen(),
    );
  }
}

class MainNavigationScreen extends ConsumerStatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  ConsumerState<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends ConsumerState<MainNavigationScreen> {
  int _selectedIndex = 0;

  final List<Widget> _screens = [
    const ParadioScreen(),
    const DiscoveryScreen(),
    const WalletScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _initServices();
  }

  Future<void> _initServices() async {
    final bgService = ref.read(backgroundServiceProvider);
    await bgService.startService();
    
    final core = ref.read(digmCoreProvider);
    await core.sync_node();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_selectedIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
         destinations: const [
           NavigationDestination(icon: Icon(Icons.play_circle), label: 'ParaDio'),
           NavigationDestination(icon: Icon(Icons.search), label: 'Discover'),
           NavigationDestination(icon: Icon(Icons.account_balance_wallet), label: 'Wallet'),
         ],

      ),
    );
  }
}
