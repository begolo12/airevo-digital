import 'package:flutter/material.dart';

import '../app/format.dart';
import '../app/theme.dart';
import '../data/api_exception.dart';
import '../data/models.dart';
import '../state/session_controller.dart';
import '../widgets/common.dart';

/// Daftar transaksi dengan pemuatan bertahap.
///
/// Memuat 30 baris pertama, lalu menambah saat pengguna menggulir ke bawah.
/// Mengunduh seluruh riwayat sekaligus akan memakan kuota data dan membuat
/// layar terasa berat setelah beberapa bulan pemakaian.
class TransactionsTab extends StatefulWidget {
  const TransactionsTab({super.key, required this.session, required this.onExpired});

  final SessionController session;
  final Future<void> Function() onExpired;

  @override
  State<TransactionsTab> createState() => _TransactionsTabState();
}

class _TransactionsTabState extends State<TransactionsTab> {
  final _scrollController = ScrollController();
  final List<Transaction> _items = [];

  bool _loading = true;
  bool _loadingMore = false;
  bool _hasMore = true;
  String? _error;
  int _total = 0;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadFirstPage();
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_hasMore || _loadingMore || _loading) return;
    final position = _scrollController.position;
    if (position.pixels >= position.maxScrollExtent - 320) {
      _loadMore();
    }
  }

  Future<void> _loadFirstPage() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await widget.session.client.get('/api/mobile/transactions', query: {
        'limit': '30',
        'offset': '0',
      });
      final page = TransactionPage.fromJson(data as Map<String, dynamic>);

      if (!mounted) return;
      setState(() {
        _items
          ..clear()
          ..addAll(page.items);
        _total = page.total;
        _hasMore = page.hasMore;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;

      /*
       * Sesi berakhir ditangani berbeda: tokennya sudah tidak berlaku, jadi
       * tombol "coba lagi" tidak akan menolong. Pengguna dikembalikan ke layar
       * masuk.
       */
      if (error is SessionExpiredException) {
        await widget.onExpired();
        return;
      }

      setState(() {
        _error = error is ApiException ? error.message : 'Gagal memuat transaksi.';
        _loading = false;
      });
    }
  }

  Future<void> _loadMore() async {
    setState(() => _loadingMore = true);

    try {
      final data = await widget.session.client.get('/api/mobile/transactions', query: {
        'limit': '30',
        'offset': '${_items.length}',
      });
      final page = TransactionPage.fromJson(data as Map<String, dynamic>);

      if (!mounted) return;
      setState(() {
        _items.addAll(page.items);
        _hasMore = page.hasMore;
        _loadingMore = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(strokeWidth: 2.4, color: AppColors.ink),
      );
    }

    if (_error != null) {
      return ErrorView(message: _error!, onRetry: _loadFirstPage);
    }

    if (_items.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadFirstPage,
        color: AppColors.ink,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          children: const [
            SizedBox(height: 60),
            EmptyState(
              title: 'Belum ada transaksi',
              message: 'Transaksi yang dicatat di web maupun di aplikasi akan muncul di sini.',
              icon: Icons.receipt_long_outlined,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadFirstPage,
      color: AppColors.ink,
      child: ListView.separated(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        itemCount: _items.length + 2,
        separatorBuilder: (context, index) => const SizedBox(height: 8),
        itemBuilder: (context, index) {
          if (index == 0) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '${Fmt.number(_total)} transaksi',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  Text(
                    'terbaru dulu',
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ],
              ),
            );
          }

          if (index == _items.length + 1) {
            if (_loadingMore) {
              return const Padding(
                padding: EdgeInsets.symmetric(vertical: 18),
                child: Center(
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2.2),
                  ),
                ),
              );
            }
            if (!_hasMore) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 18),
                child: Center(
                  child: Text(
                    'Semua transaksi sudah ditampilkan',
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
              );
            }
            return const SizedBox(height: 18);
          }

          return _TransactionRow(transaction: _items[index - 1]);
        },
      ),
    );
  }
}

class _TransactionRow extends StatelessWidget {
  const _TransactionRow({required this.transaction});

  final Transaction transaction;

  @override
  Widget build(BuildContext context) {
    final isIncome = transaction.isIncome;
    final isTransfer = transaction.isTransfer;

    final accent = transaction.voided
        ? AppColors.muted
        : isIncome
            ? AppColors.mintDeep
            : isTransfer
                ? AppColors.skyDeep
                : AppColors.butterDeep;

    final icon = transaction.voided
        ? Icons.block
        : isIncome
            ? Icons.south_west
            : isTransfer
                ? Icons.swap_horiz
                : Icons.north_east;

    final amountColor = transaction.voided
        ? AppColors.muted
        : isIncome
            ? AppColors.positive
            : isTransfer
                ? AppColors.inkSoft
                : AppColors.danger;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.22),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 16, color: AppColors.inkSoft),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        transaction.description,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: transaction.voided ? AppColors.muted : AppColors.ink,
                          decoration:
                              transaction.voided ? TextDecoration.lineThrough : null,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      Fmt.money(transaction.amount),
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: amountColor,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        [
                          Fmt.dayMonth(transaction.occurredAt),
                          transaction.categoryName ?? 'tanpa kategori',
                          transaction.accountName,
                        ].where((part) => part.isNotEmpty).join(' · '),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.labelSmall,
                      ),
                    ),
                    if (transaction.hasAttachment)
                      const Padding(
                        padding: EdgeInsets.only(left: 6),
                        child: Icon(Icons.attach_file, size: 12, color: AppColors.muted),
                      ),
                    if (transaction.voided)
                      const Padding(
                        padding: EdgeInsets.only(left: 6),
                        child: Text(
                          'dibatalkan',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: AppColors.muted,
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

