import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'app/theme.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'screens/profile_screen.dart';
import 'state/session_controller.dart';

/// Titik masuk aplikasi Keluarga Airevo.
///
/// Alur layar mengikuti tahap sesi:
///
/// ```
/// loading → signedOut     → LoginScreen
///         → chooseProfile → ProfileScreen
///         → active        → HomeShell
/// ```
///
/// Semua perpindahan layar berasal dari satu sumber — `SessionController`.
/// Tidak ada `Navigator.push` antar-tahap, sehingga tidak mungkin ada keadaan
/// di mana dua layar menampilkan tahap yang berbeda.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  /*
   * Data locale dimuat sebelum aplikasi dijalankan.
   *
   * Tanpa ini, `DateFormat('d MMM yyyy', 'id_ID')` melempar galat saat dipakai
   * pertama kali — dan galat itu muncul di tengah layar, bukan saat mulai.
   */
  await initializeDateFormatting('id_ID');

  runApp(const AirevoApp());
}

class AirevoApp extends StatefulWidget {
  const AirevoApp({super.key});

  @override
  State<AirevoApp> createState() => _AirevoAppState();
}

class _AirevoAppState extends State<AirevoApp> {
  late final SessionController _session;

  @override
  void initState() {
    super.initState();
    _session = SessionController();
    _session.bootstrap();
  }

  @override
  void dispose() {
    _session.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Keluarga Airevo',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(),
      home: AnimatedBuilder(
        animation: _session,
        builder: (context, _) {
          return switch (_session.stage) {
            SessionStage.loading => const _SplashScreen(),
            SessionStage.signedOut => LoginScreen(session: _session),
            SessionStage.chooseProfile => ProfileScreen(session: _session),
            SessionStage.active => HomeShell(session: _session),
          };
        },
      ),
    );
  }
}

/// Layar tunggu singkat saat memeriksa token tersimpan.
///
/// Tanpa layar ini, aplikasi menampilkan layar masuk selama beberapa ratus
/// milidetik meski pengguna sudah pernah masuk — kedipan yang membuat aplikasi
/// terasa lebih lambat daripada sebenarnya.
class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 54,
              height: 54,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.butter,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.ink, width: 1.5),
              ),
              child: const Text(
                'A',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  color: AppColors.ink,
                ),
              ),
            ),
            const SizedBox(height: 18),
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2.2, color: AppColors.ink),
            ),
          ],
        ),
      ),
    );
  }
}
