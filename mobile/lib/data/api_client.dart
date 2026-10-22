import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import 'api_exception.dart';

/// Penyimpanan token sesi.
///
/// Token memberi akses penuh ke data keuangan keluarga, jadi disimpan di
/// Android Keystore lewat `flutter_secure_storage` — bukan di preferensi biasa
/// yang bisa dibaca aplikasi lain pada perangkat yang di-root.
///
/// Alamat server juga disimpan, karena pengguna mungkin perlu menggantinya
/// (mis. dari IP lokal ke domain setelah aplikasi di-deploy).
class TokenStore {
  TokenStore({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _tokenKey = 'airevo.token';
  static const _baseUrlKey = 'airevo.baseUrl';

  Future<String?> readToken() => _storage.read(key: _tokenKey);

  Future<void> writeToken(String token) =>
      _storage.write(key: _tokenKey, value: token);

  Future<void> clearToken() => _storage.delete(key: _tokenKey);

  Future<String?> readBaseUrl() => _storage.read(key: _baseUrlKey);

  Future<void> writeBaseUrl(String url) =>
      _storage.write(key: _baseUrlKey, value: url);
}

/// Klien HTTP untuk API mobile.
///
/// ## Kenapa satu kelas, bukan tersebar
///
/// Semua permintaan melewati sini supaya tiga hal tidak pernah terlewat:
/// token disisipkan, galat diterjemahkan ke `ApiException`, dan waktu tunggu
/// dibatasi. Kalau tiap layar memanggil `http` sendiri, cepat atau lambat ada
/// satu yang lupa menyisipkan token dan gagal dengan cara yang membingungkan.
class ApiClient {
  ApiClient({
    required this.baseUrl,
    this.token,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  final String baseUrl;
  final String? token;
  final http.Client _http;

  static const _timeout = Duration(seconds: 20);

  /// Alamat default saat pengguna belum pernah mengatur.
  ///
  /// Diambil dari `--dart-define=API_BASE_URL` bila ada (dipakai saat build
  /// untuk produksi), selain itu alamat jaringan lokal mesin pengembang.
  static const defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.0.154:3100',
  );

  ApiClient withToken(String? next) =>
      ApiClient(baseUrl: baseUrl, token: next, httpClient: _http);

  Uri _uri(String path, [Map<String, String>? query]) {
    final normalized = baseUrl.endsWith('/')
        ? baseUrl.substring(0, baseUrl.length - 1)
        : baseUrl;
    return Uri.parse('$normalized$path').replace(queryParameters: query);
  }

  Map<String, String> get _headers => {
        'accept': 'application/json',
        'content-type': 'application/json',
        if (token != null) 'authorization': 'Bearer $token',
      };

  Future<dynamic> get(String path, {Map<String, String>? query}) async {
    return _send(() => _http.get(_uri(path, query), headers: _headers));
  }

  Future<dynamic> post(String path, {Map<String, dynamic>? body}) async {
    return _send(
      () => _http.post(
        _uri(path),
        headers: _headers,
        body: jsonEncode(body ?? const <String, dynamic>{}),
      ),
    );
  }

  /// Menjalankan permintaan dan menerjemahkan semua kegagalan.
  Future<dynamic> _send(Future<http.Response> Function() run) async {
    late final http.Response response;

    try {
      response = await run().timeout(_timeout);
    } on TimeoutException {
      throw NetworkException(
        baseUrl: baseUrl,
        detail: 'Server tidak menjawab dalam 20 detik.\n\n'
            'Periksa koneksi dan alamat server di $baseUrl.',
      );
    } on SocketException {
      throw NetworkException(baseUrl: baseUrl);
    } on http.ClientException {
      throw NetworkException(baseUrl: baseUrl);
    }

    Map<String, dynamic> payload;
    try {
      payload = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      /*
       * Balasan bukan JSON berarti bukan API kita — paling sering karena
       * alamat server menunjuk ke situs lain, atau ada halaman login di
       * depannya. Pesannya menyebut kemungkinan itu.
       */
      throw ApiRequestException(
        'Balasan server tidak dikenali (${response.statusCode}).\n\n'
        'Pastikan alamat server menunjuk ke aplikasi Airevo, bukan situs lain.',
        statusCode: response.statusCode,
      );
    }

    if (payload['ok'] == true) return payload['data'];

    final message = (payload['message'] as String?) ??
        'Permintaan gagal (${response.statusCode}).';
    final reason = payload['reason'] as String?;

    if (response.statusCode == 401) {
      /*
       * 401 berarti token tidak berlaku. Kecuali saat login: di sana 401
       * berarti kata sandi atau PIN salah, dan pengguna harus melihat pesannya
       * — bukan dianggap sesinya habis.
       */
      if (reason == 'missing' || reason == 'expired' || reason == 'invalid') {
        throw SessionExpiredException(message);
      }
      throw ApiRequestException(message, statusCode: 401, reason: reason);
    }

    throw ApiRequestException(message, statusCode: response.statusCode, reason: reason);
  }

  void close() => _http.close();
}
