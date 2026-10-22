import 'package:intl/intl.dart';

/// Pemformatan angka dan tanggal.
///
/// Dikumpulkan di satu tempat supaya seluruh aplikasi menulis rupiah dan
/// tanggal dengan cara yang sama. Server mengirim **integer rupiah** dan
/// **tanggal ISO**, jadi semua penerjemahan ke bentuk yang dibaca manusia
/// terjadi di sini — bukan tersebar di tiap layar.
abstract final class Fmt {
  static final _rupiah = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp',
    decimalDigits: 0,
  );

  static final _ribuan = NumberFormat.decimalPattern('id_ID');

  /// `1234567` → `Rp1.234.567`
  ///
  /// Nilai yang bukan angka berhingga dikembalikan sebagai `Rp0`, bukan
  /// `NaN`. Angka `NaN` di layar keuangan merusak kepercayaan pada seluruh
  /// halaman — satu sel yang salah membuat orang meragukan sisanya.
  static String money(num value) {
    if (!value.isFinite) return 'Rp0';
    return _rupiah.format(value);
  }

  /// Tanpa awalan `Rp`, untuk tempat yang sudah jelas konteksnya.
  static String number(num value) => _ribuan.format(value);

  /// Bentuk ringkas untuk ruang sempit: `Rp1,2 jt`.
  ///
  /// Dipakai hanya di grafik dan label sumbu. Di kartu angka utama selalu
  /// dipakai nominal penuh — pengguna perlu angka yang bisa dicocokkan dengan
  /// mutasi rekening, bukan perkiraan.
  static String compact(num value) {
    if (!value.isFinite) return 'Rp0';

    final absolute = value.abs();
    // Tanda ditulis menempel, tanpa spasi — "Rp" dan angkanya satu kesatuan.
    final sign = value < 0 ? '-' : '';

    if (absolute >= 1000000000) {
      return '${sign}Rp${(absolute / 1000000000).toStringAsFixed(1).replaceAll('.', ',')} M';
    }
    if (absolute >= 1000000) {
      return '${sign}Rp${(absolute / 1000000).toStringAsFixed(1).replaceAll('.', ',')} jt';
    }
    if (absolute >= 1000) {
      return '${sign}Rp${(absolute / 1000).toStringAsFixed(0)} rb';
    }
    return '${sign}Rp${absolute.toStringAsFixed(0)}';
  }

  /// `2026-10-22` → `22 Okt 2026`
  static String date(String iso) {
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return iso;
    return DateFormat('d MMM yyyy', 'id_ID').format(parsed);
  }

  /// `2026-10-22` → `22 Okt`
  static String dayMonth(String iso) {
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return iso;
    return DateFormat('d MMM', 'id_ID').format(parsed);
  }

  /// `2026-10` → `Oktober 2026`
  static String month(String key) {
    final parsed = DateTime.tryParse('$key-01');
    if (parsed == null) return key;
    return DateFormat('MMMM yyyy', 'id_ID').format(parsed);
  }

  /// `2026-10` → `Okt`
  static String monthShort(String key) {
    final parsed = DateTime.tryParse('$key-01');
    if (parsed == null) return key;
    return DateFormat('MMM', 'id_ID').format(parsed);
  }

  /// Selisih hari dari hari ini, dalam bahasa manusia.
  ///
  /// Dipakai untuk jatuh tempo — "3 hari lagi" lebih mudah ditindaklanjuti
  /// daripada tanggal yang harus dihitung sendiri.
  static String dueLabel(String iso) {
    final target = DateTime.tryParse(iso);
    if (target == null) return iso;

    final today = DateTime.now();
    final startOfToday = DateTime(today.year, today.month, today.day);
    final startOfTarget = DateTime(target.year, target.month, target.day);
    final days = startOfTarget.difference(startOfToday).inDays;

    if (days == 0) return 'hari ini';
    if (days == 1) return 'besok';
    if (days == -1) return 'kemarin';
    if (days < 0) return '${days.abs()} hari lewat';
    if (days <= 30) return '$days hari lagi';
    return date(iso);
  }

  /// Persentase dengan pembulatan aman.
  static String percent(num value) {
    if (!value.isFinite) return '0%';
    return '${value.round()}%';
  }
}
