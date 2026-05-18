import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'core/ffi/digm_core.dart';
import 'core/services/background_service.dart';
import 'core/theme/digm_theme.dart';
import 'features/player/screens/paradio_screen.dart';
import 'features/wallet/screens/wallet_screen.dart';
import 'features/discovery/screens/discovery_screen.dart';
import 'features/marketplace/screens/album_screen.dart';
import 'features/staking/screens/staking_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: DigmApp()));
}

class DigmApp extends StatelessWidget {
  const DigmApp({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = DigmTheme.darkTheme.textTheme;

    return MaterialApp(
      title: 'DIGM',
      debugShowCheckedModeBanner: false,
      theme: DigmTheme.darkTheme.copyWith(
        textTheme: GoogleFonts.interTextTheme(textTheme).copyWith(
          headlineLarge: GoogleFonts.spaceGrotesk(
            textStyle: textTheme.headlineLarge,
          ),
          headlineMedium: GoogleFonts.spaceGrotesk(
            textStyle: textTheme.headlineMedium,
          ),
          titleLarge: GoogleFonts.orbitron(
            textStyle: textTheme.titleLarge?.copyWith(
              letterSpacing: 2,
            ),
          ),
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

  final List<Widget> _screens = const [
    ParadioScreen(),
    DiscoveryScreen(),
    AlbumScreen(),
    StakingScreen(),
    WalletScreen(),
  ];

  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    final coreAsync = ref.watch(digmCoreProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: DigmTheme.bgGradient),
        child: SafeArea(
          child: coreAsync.when(
            data: (_) => _screens[_selectedIndex],
            loading: () => const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: DigmTheme.fuchsiaLight),
                  SizedBox(height: 16),
                  Text(
                    'Initializing DIGM node...',
                    style: TextStyle(color: DigmTheme.textSecondary),
                  ),
                ],
              ),
            ),
            error: (e, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline, size: 48, color: DigmTheme.error),
                    const SizedBox(height: 16),
                    const Text(
                      'Failed to initialize wallet',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: DigmTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Please create or import a wallet to continue.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: 'Inter',
                        color: DigmTheme.textSecondary,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.8),
          border: const Border(top: BorderSide(color: DigmTheme.glassBorder)),
        ),
        child: NavigationBar(
          selectedIndex: _selectedIndex,
          backgroundColor: Colors.transparent,
          elevation: 0,
          onDestinationSelected: (index) {
            setState(() => _selectedIndex = index);
          },
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.play_circle_outline),
              selectedIcon: Icon(Icons.play_circle),
              label: 'ParaDio',
            ),
            NavigationDestination(
              icon: Icon(Icons.search_outlined),
              selectedIcon: Icon(Icons.search),
              label: 'Discover',
            ),
            NavigationDestination(
              icon: Icon(Icons.album_outlined),
              selectedIcon: Icon(Icons.album),
              label: 'Market',
            ),
            NavigationDestination(
              icon: Icon(Icons.trending_up_outlined),
              selectedIcon: Icon(Icons.trending_up),
              label: 'Staking',
            ),
            NavigationDestination(
              icon: Icon(Icons.account_balance_wallet_outlined),
              selectedIcon: Icon(Icons.account_balance_wallet),
              label: 'Wallet',
            ),
          ],
        ),
      ),
    );
  }
}
