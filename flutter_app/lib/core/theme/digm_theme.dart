import 'package:flutter/material.dart';

class DigmTheme {
  // ── Web Brand Colors ────────────────────────────────────────
  static const Color fuchsia    = Color(0xFFC026D3); // fuchsia-600
  static const Color fuchsia500 = Color(0xFFD946EF); // fuchsia-500 (focus/border)
  static const Color fuchsia700 = Color(0xFFA21CAF); // fuchsia-700 (hover)
  static const Color fuchsia400 = Color(0xFFE879F9); // fuchsia-400 (accents)
  static const Color pink       = Color(0xFFEC4899); // pink-500 (gradient end)
  static const Color purple     = Color(0xFF9333EA); // purple-600
  static const Color darkPurple = Color(0xFF1A0033); // bg via-purple-900/20

  static const Color green     = Color(0xFF22C55E); // green-500
  static const Color green600  = Color(0xFF16A34A); // green-600 (hover)
  static const Color sky       = Color(0xFF0EA5E9); // sky-500
  static const Color sky600    = Color(0xFF0284C7); // sky-600
  static const Color red       = Color(0xFFEF4444); // red-500
  static const Color red600    = Color(0xFFDC2626); // red-600
  static const Color orange    = Color(0xFFF97316); // orange-500
  static const Color yellow    = Color(0xFFEAB308); // yellow-500

  // Backward-compat aliases (screens reference these old names)
  // Must be defined AFTER the constants above (Dart init order)
  // ignore: constant_identifier_names
  static const Color fuchsiaLight = pink;
  // ignore: constant_identifier_names
  static const Color success = green;
  // ignore: constant_identifier_names
  static const Color error = red;

  // ── Neutral / Surface ───────────────────────────────────────
  static const Color black       = Color(0xFF000000);
  static const Color surfaceDark = Color(0xFF0F172A); // slate-900
  static const Color surface800  = Color(0xFF1E293B); // slate-800 (card bg)
  static const Color surface700  = Color(0xFF334155); // slate-700 (stat boxes)
  static const Color surface600  = Color(0xFF475569); // slate-600 (borders)

  static const Color textPrimary   = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFF94A3B8); // slate-400
  static const Color textMuted     = Color(0xFF64748B); // slate-500
  static const Color textDisabled  = Color(0xFF475569); // slate-600

  // ── Glass-morphism (matching web .glass) ────────────────────
  // Web: background: rgba(0,0,0,0.3); backdrop-filter: blur(10px);
  //      border: 1px solid rgba(192,38,211,0.2);
  static const Color  glassBg       = Color(0x4D000000); // black 30%
  static const Color  glassBorder   = Color(0x33C026D3); // fuchsia 20%
  static const Color  cardBg        = Color(0x66000000); // black 40% (.card)
  static const Color  inputBg       = Color(0x99000000); // black 60% (.input-field)
  static const double glassBlur     = 10.0;
  static const double cardBlur      = 4.0;  // backdrop-blur-sm
  static const double borderRadius  = 12.0; // rounded-xl (web)
  static const double inputRadius   = 8.0;  // rounded-lg (web)

  // ── Gradients ───────────────────────────────────────────────
  static const LinearGradient bgGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [black, darkPurple, black],
    stops: [0.0, 0.5, 1.0],
  );

  static const LinearGradient textGradient = LinearGradient(
    colors: [fuchsia, pink],
  );

  static const LinearGradient textGradientQueen = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFD9D9D9), fuchsia],
  );

  static const LinearGradient textGradientSky = LinearGradient(
    colors: [sky, sky600],
  );

  static const LinearGradient textGradientMixed = LinearGradient(
    colors: [fuchsia, green, pink],
  );

  static const LinearGradient textGradientGold = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFF5310B), Color(0xFFFFDF5F), textPrimary],
    stops: [0.0, 0.655, 1.0],
  );

  static const LinearGradient textGradientCover = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0x80701A75), Color(0x80581C87)],
  );

  // ── Button Styles (matching web .btn-primary) ───────────────
  static ButtonStyle get primaryButton => ElevatedButton.styleFrom(
    backgroundColor: fuchsia,
    foregroundColor: textPrimary,
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
    shape: const StadiumBorder(),
    elevation: 0,
  );

  static ButtonStyle get successButton => ElevatedButton.styleFrom(
    backgroundColor: green,
    foregroundColor: textPrimary,
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
    shape: const StadiumBorder(),
    elevation: 0,
  );

  static ButtonStyle get secondaryButton => ElevatedButton.styleFrom(
    backgroundColor: surfaceDark,
    foregroundColor: textPrimary,
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(borderRadius),
      side: const BorderSide(color: surface600),
    ),
    elevation: 0,
  );

  // ── Border color variants (web pattern) ─────────────────────
  static Color borderFuchsia([double opacity = 0.2]) =>
      fuchsia.withValues(alpha: opacity);
  static Color borderGreen([double opacity = 0.2]) =>
      green.withValues(alpha: opacity);
  static Color borderRed([double opacity = 0.2]) =>
      red.withValues(alpha: opacity);
  static Color borderSky([double opacity = 0.2]) =>
      sky.withValues(alpha: opacity);
  static Color borderOrange([double opacity = 0.2]) =>
      orange.withValues(alpha: opacity);
  static Color borderYellow([double opacity = 0.2]) =>
      yellow.withValues(alpha: opacity);
  static Color borderGray([double opacity = 0.4]) =>
      surface600.withValues(alpha: opacity);

  // ── Glass Container Decoration ──────────────────────────────
  static BoxDecoration glassContainer({Color? borderColor}) {
    return BoxDecoration(
      color: glassBg,
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: borderColor ?? glassBorder,
        width: 1,
      ),
    );
  }

  static BoxDecoration cardDecoration({Color? borderColor}) {
    return BoxDecoration(
      color: cardBg,
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: borderColor ?? glassBorder,
        width: 1,
      ),
    );
  }

  // ── Gradient Shader Helpers ─────────────────────────────────
  static Shader gradientShader(Rect bounds,
      [LinearGradient gradient = textGradient]) {
    return gradient.createShader(bounds);
  }

  // ── Full ThemeData ──────────────────────────────────────────
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: Colors.transparent,

      colorScheme: const ColorScheme.dark(
        primary: fuchsia,
        secondary: pink,
        surface: surfaceDark,
        onPrimary: textPrimary,
        onSecondary: textPrimary,
        onSurface: textPrimary,
        error: red,
      ),

      // AppBar (matching web header)
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

      // Card (matching web .card)
      cardTheme: CardThemeData(
        color: cardBg,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius),
          side: const BorderSide(color: glassBorder, width: 1),
        ),
      ),

      // Input (matching web .input-field)
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: inputBg,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(inputRadius),
          borderSide: BorderSide(color: borderFuchsia(0.3)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(inputRadius),
          borderSide: BorderSide(color: borderFuchsia(0.3)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(inputRadius),
          borderSide: const BorderSide(color: fuchsia500, width: 1.5),
        ),
        labelStyle: const TextStyle(color: textSecondary),
        hintStyle: const TextStyle(color: textMuted),
        helperStyle: const TextStyle(color: textMuted, fontSize: 12),
      ),

      // Buttons (matching web .btn-primary)
      elevatedButtonTheme: ElevatedButtonThemeData(style: primaryButton),
      filledButtonTheme: FilledButtonThemeData(style: primaryButton),

      segmentedButtonTheme: SegmentedButtonThemeData(
        style: SegmentedButton.styleFrom(
          backgroundColor: surfaceDark,
          foregroundColor: textSecondary,
          selectedBackgroundColor: fuchsia.withValues(alpha: 0.2),
          selectedForegroundColor: pink,
          side: const BorderSide(color: glassBorder),
        ),
      ),

      // Bottom Nav (matching web mobile nav)
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.black.withValues(alpha: 0.8),
        indicatorColor: fuchsia.withValues(alpha: 0.2),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: pink);
          }
          return const IconThemeData(color: textSecondary);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(
                color: pink, fontSize: 12, fontWeight: FontWeight.w500);
          }
          return const TextStyle(color: textSecondary, fontSize: 12);
        }),
      ),

      // Tab bar (web TabBar)
      tabBarTheme: const TabBarThemeData(
        labelColor: pink,
        unselectedLabelColor: textSecondary,
        indicatorColor: fuchsia,
      ),

      // Chip / badge (web rounded-full tags)
      chipTheme: ChipThemeData(
        backgroundColor: fuchsia.withValues(alpha: 0.2),
        labelStyle: const TextStyle(color: pink, fontSize: 13),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
          side: const BorderSide(color: glassBorder),
        ),
      ),

      // Dialog (matches web modal)
      dialogTheme: DialogThemeData(
        backgroundColor: surfaceDark,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius),
          side: const BorderSide(color: glassBorder),
        ),
      ),

      // Text theme with web font stacks
      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontFamily: 'SpaceGrotesk',
          fontWeight: FontWeight.bold,
          color: textPrimary,
          fontSize: 32,
        ),
        headlineMedium: TextStyle(
          fontFamily: 'SpaceGrotesk',
          fontWeight: FontWeight.bold,
          color: textPrimary,
          fontSize: 24,
        ),
        titleLarge: TextStyle(
          fontFamily: 'SpaceGrotesk',
          fontWeight: FontWeight.w600,
          color: textPrimary,
          fontSize: 18,
        ),
        titleMedium: TextStyle(
          fontFamily: 'Inter',
          fontWeight: FontWeight.w600,
          color: textPrimary,
          fontSize: 16,
        ),
        bodyLarge: TextStyle(
          fontFamily: 'Inter',
          color: textSecondary,
          fontSize: 16,
        ),
        bodyMedium: TextStyle(
          fontFamily: 'Inter',
          color: textSecondary,
          fontSize: 14,
        ),
        bodySmall: TextStyle(
          fontFamily: 'Inter',
          color: textMuted,
          fontSize: 12,
        ),
        labelLarge: TextStyle(
          fontFamily: 'Inter',
          fontWeight: FontWeight.w600,
          color: textPrimary,
          fontSize: 14,
        ),
        labelMedium: TextStyle(
          fontFamily: 'Inter',
          fontWeight: FontWeight.w500,
          color: textSecondary,
          fontSize: 12,
        ),
      ),
    );
  }
}
