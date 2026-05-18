import 'package:flutter/material.dart';

class DigmTheme {
  // Brand colors from the React frontend
  static const Color fuchsia = Color(0xFFC026D3);
  static const Color fuchsiaLight = Color(0xFFEC4899);
  static const Color black = Color(0xFF000000);
  static const Color darkPurple = Color(0xFF1A0033);
  static const Color surfaceDark = Color(0xFF0F172A);
  static const Color glassBg = Color(0x0D000000); // black at ~5% opacity
  static const Color glassBorder = Color(0x33C026D3); // fuchsia at 20%
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);
  static const Color success = Color(0xFF22C55E);
  static const Color error = Color(0xFFEF4444);

  static const Color cardBg = Color(0x1A000000); // black at 10%
  static const Color inputBg = Color(0x99000000); // black at 60%

  static const LinearGradient bgGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [black, darkPurple, black],
    stops: [0.0, 0.5, 1.0],
  );

  static const LinearGradient textGradient = LinearGradient(
    colors: [fuchsia, fuchsiaLight],
  );

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: Colors.transparent,

      colorScheme: const ColorScheme.dark(
        primary: fuchsia,
        secondary: fuchsiaLight,
        surface: surfaceDark,
        onPrimary: textPrimary,
        onSecondary: textPrimary,
        onSurface: textPrimary,
      ),

      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontFamily: 'Orbitron',
          fontSize: 24,
          fontWeight: FontWeight.bold,
          color: textPrimary,
        ),
      ),

      cardTheme: CardThemeData(
        color: glassBg,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: glassBorder, width: 1),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: inputBg,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: glassBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: glassBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: fuchsia, width: 2),
        ),
        labelStyle: const TextStyle(color: textSecondary),
        hintStyle: const TextStyle(color: textMuted),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: fuchsia,
          foregroundColor: textPrimary,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          elevation: 4,
        ),
      ),

      segmentedButtonTheme: SegmentedButtonThemeData(
        style: SegmentedButton.styleFrom(
          backgroundColor: surfaceDark,
          foregroundColor: textSecondary,
          selectedBackgroundColor: fuchsia.withValues(alpha: 0.2),
          selectedForegroundColor: fuchsiaLight,
          side: const BorderSide(color: glassBorder),
        ),
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.black.withValues(alpha: 0.8),
        indicatorColor: fuchsia.withValues(alpha: 0.2),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: fuchsiaLight);
          }
          return const IconThemeData(color: textSecondary);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(color: fuchsiaLight, fontSize: 12, fontWeight: FontWeight.w500);
          }
          return const TextStyle(color: textSecondary, fontSize: 12);
        }),
      ),

      textTheme: const TextTheme(
        headlineLarge: TextStyle(fontFamily: 'SpaceGrotesk', fontWeight: FontWeight.bold, color: textPrimary, fontSize: 32),
        headlineMedium: TextStyle(fontFamily: 'SpaceGrotesk', fontWeight: FontWeight.bold, color: textPrimary, fontSize: 24),
        titleLarge: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600, color: textPrimary, fontSize: 18),
        titleMedium: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w500, color: textPrimary, fontSize: 16),
        bodyLarge: TextStyle(fontFamily: 'Inter', color: textSecondary, fontSize: 16),
        bodyMedium: TextStyle(fontFamily: 'Inter', color: textSecondary, fontSize: 14),
        labelLarge: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w600, color: textPrimary, fontSize: 14),
        labelMedium: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.w500, color: textSecondary, fontSize: 12),
      ),
    );
  }

  /// Glass container decoration matching the React .glass class
  static BoxDecoration glassContainer({Color? borderColor}) {
    return BoxDecoration(
      color: Colors.black.withValues(alpha: 0.3),
      borderRadius: BorderRadius.circular(16),
      border: Border.all(
        color: borderColor ?? glassBorder,
        width: 1,
      ),
    );
  }

  /// Gradient text style matching .gradient-text
  static Shader gradientShader(Rect bounds) {
    return const LinearGradient(
      colors: [fuchsia, fuchsiaLight],
    ).createShader(bounds);
  }
}
