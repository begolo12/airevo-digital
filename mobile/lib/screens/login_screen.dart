import 'package:flutter/material.dart';

import '../app/theme.dart';
import '../state/session_controller.dart';

/// Layar masuk.
///
/// Satu-satunya layar yang boleh diakses tanpa token. Karena itu ia juga
/// tempat mengatur **alamat server** — kalau alamatnya salah, tidak ada layar
/// lain yang bisa dipakai untuk memperbaikinya.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.session});

  final SessionController session;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _obscure = true;
  String? _localError;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _localError = null);

    final ok = await widget.session.login(
      _emailController.text,
      _passwordController.text,
    );

    if (!ok && mounted) {
      setState(() => _localError = widget.session.error);
    }
  }

  Future<void> _openServerSettings() async {
    final controller = TextEditingController(text: widget.session.baseUrl);

    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Alamat server'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Alamat aplikasi web Airevo yang menyimpan data keluarga Anda.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              keyboardType: TextInputType.url,
              autocorrect: false,
              decoration: const InputDecoration(
                labelText: 'Alamat',
                hintText: 'http://192.168.0.154:3100',
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Bila server berjalan di komputer yang sama dengan Wi-Fi Anda, '
              'pakai alamat IP komputer itu (bukan localhost).',
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Simpan'),
          ),
        ],
      ),
    );

    controller.dispose();

    if (result != null && result.isNotEmpty && mounted) {
      await widget.session.setBaseUrl(result);
      if (mounted) setState(() => _localError = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = widget.session;
    final error = _localError ?? session.error;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Merek
                    Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: AppColors.butter,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.ink, width: 1.4),
                          ),
                          child: const Text(
                            'A',
                            style: TextStyle(
                              fontSize: 19,
                              fontWeight: FontWeight.w900,
                              color: AppColors.ink,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        const Text(
                          'airevo digital',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.ink,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 36),

                    Text(
                      'Masuk ke\nKeluarga Anda',
                      style: Theme.of(context).textTheme.displaySmall?.copyWith(
                            fontSize: 30,
                            height: 1.15,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Uang, rencana, dan ritme rumah dalam satu tempat.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),

                    const SizedBox(height: 28),

                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        hintText: 'nama@contoh.id',
                        prefixIcon: Icon(Icons.alternate_email, size: 19),
                      ),
                      validator: (value) {
                        final text = value?.trim() ?? '';
                        if (text.isEmpty) return 'Email wajib diisi.';
                        if (!text.contains('@')) return 'Email belum lengkap.';
                        return null;
                      },
                    ),

                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscure,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _submit(),
                      decoration: InputDecoration(
                        labelText: 'Kata sandi',
                        prefixIcon: const Icon(Icons.lock_outline, size: 19),
                        suffixIcon: IconButton(
                          onPressed: () => setState(() => _obscure = !_obscure),
                          icon: Icon(
                            _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                            size: 19,
                          ),
                          tooltip: _obscure ? 'Tampilkan sandi' : 'Sembunyikan sandi',
                        ),
                      ),
                      validator: (value) =>
                          (value == null || value.isEmpty) ? 'Kata sandi wajib diisi.' : null,
                    ),

                    if (error != null) ...[
                      const SizedBox(height: 14),
                      _ErrorBanner(message: error),
                    ],

                    const SizedBox(height: 20),

                    FilledButton(
                      onPressed: session.busy ? null : _submit,
                      child: session.busy
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.2,
                                color: AppColors.paper,
                              ),
                            )
                          : const Text('Masuk'),
                    ),

                    const SizedBox(height: 18),

                    TextButton.icon(
                      onPressed: session.busy ? null : _openServerSettings,
                      icon: const Icon(Icons.dns_outlined, size: 17),
                      label: Text(
                        session.baseUrl.replaceFirst(RegExp(r'^https?://'), ''),
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Kotak pesan galat yang tidak menggeser tata letak saat muncul.
class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.tomato.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.tomato.withValues(alpha: 0.45)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline, size: 17, color: AppColors.danger),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12.5,
                height: 1.45,
                color: AppColors.danger,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Dipakai juga oleh layar profil saat menampilkan galat.
class ErrorBanner extends StatelessWidget {
  const ErrorBanner({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => _ErrorBanner(message: message);
}
