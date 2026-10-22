import 'package:flutter/foundation.dart';

import '../data/api_client.dart';
import '../data/api_exception.dart';
import '../data/models.dart';

/// Tahap sesi aplikasi.
enum SessionStage {
  /// Sedang memeriksa token yang tersimpan.
  loading,

  /// Belum masuk sama sekali.
  signedOut,

  /// Kata sandi benar, profil belum dipilih.
  chooseProfile,

  /// Sudah masuk penuh.
  active,
}

/// Pengelola sesi.
///
/// Satu sumber kebenaran untuk "siapa yang sedang masuk dan dengan token apa".
/// Layar tidak menyimpan token sendiri — kalau itu terjadi, ada dua salinan
/// yang bisa berbeda, dan salah satunya akan basi.
///
/// Alurnya mengikuti versi web: masuk dengan email + kata sandi, lalu buka
/// profil dengan PIN. Setelah tahap kedua, token berubah menjadi token aktif
/// yang boleh dipakai membaca data.
class SessionController extends ChangeNotifier {
  SessionController({TokenStore? store, ApiClient? client})
      : _store = store ?? TokenStore(),
        _overrideClient = client;

  final TokenStore _store;
  final ApiClient? _overrideClient;

  SessionStage stage = SessionStage.loading;

  String? _token;
  String baseUrl = ApiClient.defaultBaseUrl;

  Profile? profile;
  List<Profile> profiles = const [];
  List<WorkspaceRef> workspaces = const [];
  String? workspaceId;
  String? accountEmail;

  /// Galat terakhir yang perlu ditampilkan layar, bila ada.
  String? error;

  bool busy = false;

  ApiClient get client =>
      _overrideClient?.withToken(_token) ??
      ApiClient(baseUrl: baseUrl, token: _token);

  /// Dipanggil saat aplikasi dibuka.
  ///
  /// Memeriksa token yang tersimpan ke server. Token bisa saja sudah
  /// kedaluwarsa atau aksesnya dicabut, jadi keberadaannya di perangkat tidak
  /// cukup — harus dibuktikan ke server.
  Future<void> bootstrap() async {
    baseUrl = await _store.readBaseUrl() ?? ApiClient.defaultBaseUrl;
    final saved = await _store.readToken();

    if (saved == null || saved.isEmpty) {
      _setStage(SessionStage.signedOut);
      return;
    }

    _token = saved;

    try {
      final data = await client.get('/api/mobile/me');
      final map = data is Map<String, dynamic> ? data : const <String, dynamic>{};
      profile = Profile.fromJson(_asMap(map['profile']));
      workspaceId = map['workspaceId'] as String?;
      workspaces = _asList(map['workspaces'])
          .map(WorkspaceRef.fromJson)
          .toList(growable: false);
      _setStage(SessionStage.active);
    } on SessionExpiredException {
      await _clearToken();
      _setStage(SessionStage.signedOut);
    } on ApiException {
      /*
       * Server tidak terjangkau saat aplikasi dibuka bukan alasan mengeluarkan
       * pengguna. Token tetap disimpan; layar masuk akan menampilkan pesan
       * koneksi dan pengguna bisa mencoba lagi tanpa mengetik ulang sandi.
       */
      _setStage(SessionStage.signedOut);
    }
  }

  /// Tahap 1: email + kata sandi.
  Future<bool> login(String email, String password) async {
    busy = true;
    error = null;
    notifyListeners();

    try {
      final data = await client.post(
        '/api/mobile/auth/login',
        body: {'email': email.trim(), 'password': password},
      );
      final result = LoginResult.fromJson(_asMap(data));

      _token = result.token;
      accountEmail = result.email;
      profiles = result.profiles;

      if (profiles.isEmpty) {
        error = 'Akun ini belum punya profil. Buat profil dulu di versi web.';
        _setStage(SessionStage.signedOut);
        return false;
      }

      _setStage(SessionStage.chooseProfile);
      return true;
    } on ApiException catch (exception) {
      error = exception.message;
      _setStage(SessionStage.signedOut);
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  /// Tahap 2: buka profil dengan PIN.
  Future<bool> unlock(Profile target, String pin) async {
    busy = true;
    error = null;
    notifyListeners();

    try {
      final data = await client.post(
        '/api/mobile/auth/profile',
        body: {
          'token': _token,
          'profileId': target.id,
          'pin': pin,
        },
      );
      final result = ProfileSession.fromJson(_asMap(data));

      _token = result.token;
      profile = result.profile;
      workspaceId = result.workspaceId;
      workspaces = result.workspaces;

      await _store.writeToken(result.token);
      _setStage(SessionStage.active);
      return true;
    } on ApiException catch (exception) {
      error = exception.message;
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  /// Kembali ke pemilihan profil tanpa keluar akun.
  void backToProfiles() {
    error = null;
    profile = null;
    workspaceId = null;
    _setStage(SessionStage.chooseProfile);
  }

  /// Keluar sepenuhnya.
  Future<void> logout() async {
    await _clearToken();
    profile = null;
    profiles = const [];
    workspaces = const [];
    workspaceId = null;
    accountEmail = null;
    error = null;
    _setStage(SessionStage.signedOut);
  }

  /// Mengganti alamat server.
  ///
  /// Token lama dihapus: token yang diterbitkan server A tidak berlaku di
  /// server B, dan menyimpannya hanya akan menghasilkan galat 401 yang
  /// membingungkan.
  Future<void> setBaseUrl(String url) async {
    final trimmed = url.trim();
    if (trimmed.isEmpty) return;

    baseUrl = trimmed.endsWith('/')
        ? trimmed.substring(0, trimmed.length - 1)
        : trimmed;

    await _store.writeBaseUrl(baseUrl);
    await _clearToken();
    profile = null;
    _setStage(SessionStage.signedOut);
  }

  /// Dipanggil layar ketika sebuah permintaan menemukan sesi berakhir.
  Future<void> handleExpired() async {
    await _clearToken();
    error = 'Sesi sudah berakhir. Silakan masuk kembali.';
    _setStage(SessionStage.signedOut);
  }

  Future<void> _clearToken() async {
    _token = null;
    await _store.clearToken();
  }

  void _setStage(SessionStage next) {
    stage = next;
    notifyListeners();
  }

  Map<String, dynamic> _asMap(Object? value) =>
      value is Map<String, dynamic> ? value : const <String, dynamic>{};

  List<Map<String, dynamic>> _asList(Object? value) {
    if (value is! List) return const [];
    return value.whereType<Map<String, dynamic>>().toList(growable: false);
  }
}
