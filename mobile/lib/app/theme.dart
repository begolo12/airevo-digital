import 'package:flutter/material.dart';

/// Warna aplikasi.
///
/// Nilainya **sama dengan token CSS di versi web** (`src/app/globals.css`,
/// arah desain "Meja Dapur"). Menyalinnya ke sini disengaja: aplikasi Android
/// dan web harus terasa seperti satu produk, bukan dua yang kebetulan mirip.
///
/// Bila palet di web berubah, berkas ini ikut berubah — dan sebaliknya.
abstract final class AppColors {
  // Kertas & tinta
  static const paper = Color(0xFFFBF6EC);
  static const paperDeep = Color(0xFFF3EAD9);
  static const card = Color(0xFFFFFDF8);
  static const ink = Color(0xFF23201D);
  static const inkSoft = Color(0xFF4A443D);
  static const muted = Color(0xFF6B6254);
  static const line = Color(0xFFE6DBC7);
  static const lineStrong = Color(0xFFD6C7AC);

  // Warna meja dapur
  static const butter = Color(0xFFF6E7B4);
  static const butterDeep = Color(0xFFECD58A);
  static const mint = Color(0xFFBFE3D0);
  static const mintDeep = Color(0xFF8FCFAE);
  static const tomato = Color(0xFFE2563C);
  static const tomatoDeep = Color(0xFFC2402A);
  static const sky = Color(0xFFBFD7EA);
  static const skyDeep = Color(0xFF93BCD9);
  static const plum = Color(0xFFCBB6D9);

  // Semantik — dipakai untuk teks, bukan latar, agar kontras cukup.
  static const positive = Color(0xFF266B4E);
  static const warning = Color(0xFF8A5210);
  static const danger = Color(0xFFA83520);

  /// Warna untuk inisial profil. Kunci sama dengan versi web.
  static Color profile(String? color) => switch (color) {
        'mint' => mint,
        'tomato' => tomato,
        'sky' => sky,
        'plum' => plum,
        'butter' => butter,
        _ => butter,
      };
}

/// Tema aplikasi.
///
/// Hanya mode terang. Aplikasi ini dipakai sambil berdiri di dapur dan di
/// kasir, sering di layar yang terkena cahaya — mode gelap bukan kebutuhan
/// utama, dan menambahkannya berarti dua palet yang harus dijaga selaras
/// dengan web. Bila nanti diperlukan, token di atas sudah siap.
ThemeData buildTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.butter,
      brightness: Brightness.light,
    ).copyWith(
      primary: AppColors.ink,
      onPrimary: AppColors.paper,
      secondary: AppColors.butterDeep,
      onSecondary: AppColors.ink,
      surface: AppColors.card,
      onSurface: AppColors.ink,
      error: AppColors.danger,
      outline: AppColors.lineStrong,
      outlineVariant: AppColors.line,
    ),
    scaffoldBackgroundColor: AppColors.paper,
  );

  return base.copyWith(
    textTheme: _textTheme(base.textTheme),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.paper,
      surfaceTintColor: Colors.transparent,
      foregroundColor: AppColors.ink,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: AppColors.ink,
        fontSize: 20,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.3,
      ),
    ),
    cardTheme: CardThemeData(
      color: AppColors.card,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.line),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.card,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.lineStrong),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.lineStrong),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.ink, width: 1.6),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.danger),
      ),
      labelStyle: const TextStyle(color: AppColors.inkSoft, fontSize: 14),
      hintStyle: const TextStyle(color: AppColors.muted, fontSize: 14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.ink,
        foregroundColor: AppColors.paper,
        minimumSize: const Size.fromHeight(50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.ink,
        side: const BorderSide(color: AppColors.lineStrong),
        minimumSize: const Size.fromHeight(50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: AppColors.ink),
    ),
    dividerTheme: const DividerThemeData(
      color: AppColors.line,
      thickness: 1,
      space: 1,
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: AppColors.ink,
      contentTextStyle: const TextStyle(color: AppColors.paper, fontSize: 14),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.card,
      surfaceTintColor: Colors.transparent,
      indicatorColor: AppColors.butter,
      elevation: 0,
      height: 68,
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontSize: 11,
          fontWeight:
              states.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500,
          color: states.contains(WidgetState.selected)
              ? AppColors.ink
              : AppColors.muted,
        ),
      ),
      iconTheme: WidgetStateProperty.resolveWith(
        (states) => IconThemeData(
          size: 22,
          color: states.contains(WidgetState.selected)
              ? AppColors.ink
              : AppColors.muted,
        ),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: AppColors.paperDeep,
      side: const BorderSide(color: AppColors.line),
      labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
    ),
  );
}

/// Skala tipografi.
///
/// Ukuran diambil dari skala yang sama dengan web (`--text-2xs` … `--text-3xl`)
/// agar hierarki terasa identik. Tidak ada ukuran ad-hoc di layar mana pun.
TextTheme _textTheme(TextTheme base) {
  return base.copyWith(
    // 2xs — label kecil, satuan
    labelSmall: const TextStyle(
      fontSize: 11,
      height: 1.3,
      fontWeight: FontWeight.w600,
      color: AppColors.muted,
      letterSpacing: 0.2,
    ),
    // xs — teks bantu
    bodySmall: const TextStyle(
      fontSize: 12,
      height: 1.45,
      color: AppColors.muted,
    ),
    // base — isi utama
    bodyMedium: const TextStyle(
      fontSize: 14,
      height: 1.5,
      color: AppColors.inkSoft,
    ),
    bodyLarge: const TextStyle(
      fontSize: 15,
      height: 1.5,
      color: AppColors.inkSoft,
    ),
    // sm — judul kartu
    titleMedium: const TextStyle(
      fontSize: 15,
      height: 1.35,
      fontWeight: FontWeight.w700,
      color: AppColors.ink,
    ),
    // lg — judul layar
    titleLarge: const TextStyle(
      fontSize: 21,
      height: 1.25,
      fontWeight: FontWeight.w800,
      color: AppColors.ink,
      letterSpacing: -0.4,
    ),
    // xl — angka besar
    headlineMedium: const TextStyle(
      fontSize: 26,
      height: 1.15,
      fontWeight: FontWeight.w800,
      color: AppColors.ink,
      letterSpacing: -0.8,
    ),
    // 3xl — angka utama
    displaySmall: const TextStyle(
      fontSize: 32,
      height: 1.1,
      fontWeight: FontWeight.w800,
      color: AppColors.ink,
      letterSpacing: -1,
    ),
  );
}
