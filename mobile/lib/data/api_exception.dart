/// Galat yang bisa ditampilkan ke pengguna.
///
/// Setiap galat membawa pesan bahasa Indonesia yang sudah siap ditampilkan.
/// Layar tidak perlu menebak apa yang salah — cukup menampilkan `message`.
sealed class ApiException implements Exception {
  const ApiException(this.message);

  /// Pesan siap tampil. Selalu berbahasa Indonesia dan tidak memuat detail
  /// teknis seperti nama tabel atau stack trace.
  final String message;

  @override
  String toString() => message;
}

/// Server tidak bisa dihubungi.
///
/// Paling sering karena alamat server salah, HP tidak berada di jaringan yang
/// sama, atau server sedang mati. Pesannya menyebutkan hal-hal itu karena
/// itulah yang bisa diperiksa pengguna.
class NetworkException extends ApiException {
  const NetworkException({
    required this.baseUrl,
    String? detail,
  }) : super(
          detail ??
              'Tidak bisa menghubungi server di $baseUrl.\n\n'
                  'Periksa apakah HP dan server berada di jaringan yang sama, '
                  'dan apakah alamat server sudah benar.',
        );

  final String baseUrl;
}

/// Sesi tidak berlaku lagi — token kedaluwarsa atau dicabut.
///
/// Dibedakan dari galat lain karena penanganannya berbeda: aplikasi harus
/// mengembalikan pengguna ke layar masuk, bukan menampilkan tombol "coba lagi".
class SessionExpiredException extends ApiException {
  const SessionExpiredException([super.message = 'Sesi sudah berakhir. Silakan masuk kembali.']);
}

/// Server menjawab, tetapi menolak permintaan.
class ApiRequestException extends ApiException {
  const ApiRequestException(super.message, {this.statusCode, this.reason});

  final int? statusCode;

  /// Alasan mesin, mis. `not_member`. Berguna untuk membedakan penanganan
  /// tanpa mencocokkan teks pesan.
  final String? reason;
}

/// Alamat server belum diatur atau tidak sah.
class ConfigException extends ApiException {
  const ConfigException(super.message);
}
