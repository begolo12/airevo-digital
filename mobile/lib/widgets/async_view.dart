import 'package:flutter/material.dart';

import '../app/theme.dart';
import '../data/api_exception.dart';
import 'common.dart';

/// Menjalankan permintaan dan menampilkan tiga keadaan: memuat, galat, siap.
///
/// Dikumpulkan di satu widget supaya setiap layar menangani kegagalan dengan
/// cara yang sama — termasuk **menarik untuk menyegarkan** dan **sesi
/// berakhir**. Kalau tiap layar menulis sendiri, cepat atau lambat ada satu
/// yang lupa memanggil `onExpired` dan pengguna terjebak di layar kosong.
class AsyncView<T> extends StatefulWidget {
  const AsyncView({
    super.key,
    required this.load,
    required this.builder,
    this.onExpired,
    this.refreshKey,
  });

  final Future<T> Function() load;
  final Widget Function(BuildContext context, T data, Future<void> Function() refresh) builder;

  /// Dipanggil bila server menyatakan sesi tidak berlaku lagi.
  final Future<void> Function()? onExpired;

  /// Mengubah nilai ini memicu pemuatan ulang.
  final Object? refreshKey;

  @override
  State<AsyncView<T>> createState() => _AsyncViewState<T>();
}

class _AsyncViewState<T> extends State<AsyncView<T>> {
  late Future<T> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.load();
  }

  @override
  void didUpdateWidget(covariant AsyncView<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshKey != widget.refreshKey) {
      setState(() => _future = widget.load());
    }
  }

  Future<void> _refresh() async {
    final next = widget.load();
    setState(() => _future = next);
    await next.catchError((Object _) => null as T);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(40),
              child: CircularProgressIndicator(strokeWidth: 2.4, color: AppColors.ink),
            ),
          );
        }

        if (snapshot.hasError) {
          final error = snapshot.error;

          /*
           * Sesi berakhir bukan kegagalan yang bisa dicoba ulang — tokennya
           * sudah tidak berlaku. Pengguna harus kembali ke layar masuk, dan
           * itu ditangani pemanggil lewat `onExpired`.
           */
          if (error is SessionExpiredException && widget.onExpired != null) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              widget.onExpired!();
            });
            return const SizedBox.shrink();
          }

          final message = error is ApiException
              ? error.message
              : 'Terjadi kesalahan. Coba lagi.';

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                SizedBox(
                  height: MediaQuery.sizeOf(context).height * 0.55,
                  child: ErrorView(message: message, onRetry: _refresh),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: _refresh,
          color: AppColors.ink,
          child: widget.builder(context, snapshot.data as T, _refresh),
        );
      },
    );
  }
}

/// Daftar dengan dukungan tarik-untuk-menyegarkan meski isinya sedikit.
///
/// Tanpa `AlwaysScrollableScrollPhysics`, daftar pendek tidak bisa ditarik dan
/// pengguna mengira aplikasi membeku.
class RefreshableList extends StatelessWidget {
  const RefreshableList({
    super.key,
    required this.onRefresh,
    required this.children,
    this.padding = const EdgeInsets.fromLTRB(16, 12, 16, 28),
  });

  final Future<void> Function() onRefresh;
  final List<Widget> children;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      color: AppColors.ink,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: padding,
        children: children,
      ),
    );
  }
}
