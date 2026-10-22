import 'package:flutter/material.dart';

import '../app/theme.dart';
import '../data/models.dart';
import '../state/session_controller.dart';
import 'login_screen.dart' show ErrorBanner;

/// Layar pilih profil dan masukkan PIN.
///
/// Mengikuti versi web: kartu profil dulu, lalu keypad numerik. Keypad dipakai
/// karena PIN hanya 4–6 angka dan sering dimasukkan sambil berdiri — tombol
/// besar lebih mudah ditekan daripada keyboard kecil.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Profile? _selected;
  String _pin = '';

  void _select(Profile profile) {
    setState(() {
      _selected = profile;
      _pin = '';
    });
  }

  void _back() {
    setState(() {
      _selected = null;
      _pin = '';
    });
  }

  void _press(String digit) {
    if (_pin.length >= 6) return;
    setState(() => _pin += digit);
  }

  void _backspace() {
    if (_pin.isEmpty) return;
    setState(() => _pin = _pin.substring(0, _pin.length - 1));
  }

  Future<void> _unlock() async {
    final target = _selected;
    if (target == null) return;

    final ok = await widget.session.unlock(target, _pin);

    if (!ok && mounted) {
      // PIN salah: kosongkan agar pengguna bisa langsung mengetik ulang,
      // bukan menghapus satu per satu.
      setState(() => _pin = '');
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: _selected == null ? _buildPicker(context, session) : _buildPin(context, session),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPicker(BuildContext context, SessionController session) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Siapa yang memakai sekarang?',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontSize: 24),
        ),
        const SizedBox(height: 6),
        Text(
          session.accountEmail == null
              ? 'Setiap profil punya PIN dan ruang data sendiri.'
              : 'Masuk sebagai ${session.accountEmail}. Setiap profil punya PIN dan ruang data sendiri.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 24),

        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 0.95,
          children: session.profiles
              .map((profile) => _ProfileCard(
                    profile: profile,
                    onTap: () => _select(profile),
                  ))
              .toList(growable: false),
        ),

        const SizedBox(height: 20),

        TextButton(
          onPressed: () => session.logout(),
          child: const Text('Keluar dari akun ini'),
        ),
      ],
    );
  }

  Widget _buildPin(BuildContext context, SessionController session) {
    final profile = _selected!;
    final accent = AppColors.profile(profile.color);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: Container(
            width: 66,
            height: 66,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: accent,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.ink, width: 1.2),
            ),
            child: Text(
              profile.initial,
              style: const TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.w900,
                color: AppColors.ink,
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Center(
          child: Text(profile.name, style: Theme.of(context).textTheme.titleLarge),
        ),
        const SizedBox(height: 2),
        Center(
          child: Text(
            profile.hasPin ? 'Masukkan PIN' : 'Profil ini tanpa PIN',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),

        if (session.error != null) ...[
          const SizedBox(height: 14),
          ErrorBanner(message: session.error!),
        ],

        if (profile.hasPin) ...[
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              _pin.length > 4 ? _pin.length : 4,
              (index) => Container(
                margin: const EdgeInsets.symmetric(horizontal: 5),
                width: 11,
                height: 11,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: index < _pin.length ? AppColors.ink : AppColors.lineStrong,
                ),
              ),
            ),
          ),
          const SizedBox(height: 22),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 280),
            child: Column(
              children: [
                for (final row in const [
                  ['1', '2', '3'],
                  ['4', '5', '6'],
                  ['7', '8', '9'],
                ])
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: row
                          .map((digit) => Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 5),
                                  child: _KeypadButton(
                                    label: digit,
                                    onTap: () => _press(digit),
                                  ),
                                ),
                              ))
                          .toList(growable: false),
                    ),
                  ),
                Row(
                  children: [
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 5),
                        child: TextButton(
                          onPressed: _back,
                          style: TextButton.styleFrom(
                            minimumSize: const Size.fromHeight(52),
                          ),
                          child: const Text('Ganti', style: TextStyle(fontSize: 13)),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 5),
                        child: _KeypadButton(label: '0', onTap: () => _press('0')),
                      ),
                    ),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 5),
                        child: SizedBox(
                          height: 52,
                          child: IconButton(
                            onPressed: _backspace,
                            tooltip: 'Hapus satu angka',
                            icon: const Icon(Icons.backspace_outlined, size: 19),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],

        const SizedBox(height: 22),

        FilledButton(
          onPressed: session.busy || (profile.hasPin && _pin.length < 4) ? null : _unlock,
          child: session.busy
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.2,
                    color: AppColors.paper,
                  ),
                )
              : Text('Masuk sebagai ${profile.name}'),
        ),
      ],
    );
  }
}

class _ProfileCard extends StatelessWidget {
  const _ProfileCard({required this.profile, required this.onTap});

  final Profile profile;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.card,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.line),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 52,
                height: 52,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.profile(profile.color),
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(color: AppColors.ink, width: 1.1),
                ),
                child: Text(
                  profile.initial,
                  style: const TextStyle(
                    fontSize: 21,
                    fontWeight: FontWeight.w900,
                    color: AppColors.ink,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                profile.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 1),
              Text(
                profile.roleLabel,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    profile.hasPin ? Icons.lock_outline : Icons.lock_open_outlined,
                    size: 11,
                    color: AppColors.muted,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    profile.hasPin ? 'PIN' : 'tanpa PIN',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: AppColors.muted,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _KeypadButton extends StatelessWidget {
  const _KeypadButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      child: Material(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(11),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(11),
          child: Container(
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(11),
              border: Border.all(color: AppColors.lineStrong),
            ),
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w700,
                color: AppColors.ink,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
