import 'package:flutter/material.dart';

import '../app/format.dart';
import '../app/theme.dart';
import '../data/models.dart';
import '../state/session_controller.dart';
import '../widgets/async_view.dart';
import '../widgets/common.dart';

/// Layar ringkasan.
///
/// Menjawab empat pertanyaan yang paling sering ditanyakan saat membuka
/// aplikasi keuangan: berapa saldonya, bulan ini masuk berapa, keluar berapa,
/// dan apakah uangnya cukup sampai akhir bulan.
class DashboardTab extends StatelessWidget {
  const DashboardTab({
    super.key,
    required this.session,
    required this.onExpired,
    required this.onOpenTransactions,
  });

  final SessionController session;
  final Future<void> Function() onExpired;
  final VoidCallback onOpenTransactions;

  @override
  Widget build(BuildContext context) {
    final profile = session.profile;

    return AsyncView<Summary>(
      load: () async {
        final data = await session.client.get('/api/mobile/summary');
        return Summary.fromJson(data as Map<String, dynamic>);
      },
      onExpired: onExpired,
      builder: (context, summary, refresh) {
        return RefreshableList(
          onRefresh: refresh,
          children: [
            Eyebrow(Fmt.month(summary.month)),
            const SizedBox(height: 4),
            Text(
              'Halo, ${profile?.name ?? ''}',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 16),

            // Saldo — angka terpenting, jadi paling besar.
            Container(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
              decoration: BoxDecoration(
                color: AppColors.ink,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'TOTAL SALDO',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                      color: AppColors.butter,
                    ),
                  ),
                  const SizedBox(height: 6),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Text(
                      Fmt.money(summary.balance),
                      style: const TextStyle(
                        fontSize: 31,
                        height: 1.1,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -1,
                        color: AppColors.paper,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.account_balance_wallet_outlined,
                          size: 12, color: AppColors.line),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          'Kekayaan bersih ${Fmt.money(summary.netWorth)}',
                          style: const TextStyle(
                            fontSize: 11.5,
                            color: AppColors.line,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Dua kolom: masuk dan keluar bulan ini.
            Row(
              children: [
                Expanded(
                  child: StatTile(
                    label: 'Pemasukan',
                    value: Fmt.money(summary.income),
                    tone: StatTone.mint,
                    icon: Icons.south_west,
                    hint: summary.previousIncome > 0
                        ? 'bulan lalu ${Fmt.compact(summary.previousIncome)}'
                        : null,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: StatTile(
                    label: 'Pengeluaran',
                    value: Fmt.money(summary.expense),
                    tone: StatTone.butter,
                    icon: Icons.north_east,
                    hint: summary.expenseDelta == null
                        ? null
                        : '${summary.expenseDelta! >= 0 ? 'naik' : 'turun'} '
                            '${summary.expenseDelta!.abs()}% dari bulan lalu',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 10),

            Row(
              children: [
                Expanded(
                  child: StatTile(
                    label: 'Arus kas bersih',
                    value: Fmt.money(summary.net),
                    tone: StatTone.neutral,
                    icon: Icons.swap_vert,
                    hint: 'bulan ini',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: StatTile(
                    label: 'Sisa anggaran',
                    value: Fmt.money(summary.budgetRemaining),
                    tone: summary.budgetRatio > 100 ? StatTone.tomato : StatTone.neutral,
                    icon: Icons.pie_chart_outline,
                    hint: summary.budgetPlanned > 0
                        ? '${summary.budgetRatio}% dari ${Fmt.compact(summary.budgetPlanned)} terpakai'
                        : 'belum ada anggaran',
                  ),
                ),
              ],
            ),

            if (summary.dueRecurringCount > 0) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.butter,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.butterDeep),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.repeat, size: 17, color: AppColors.ink),
                    const SizedBox(width: 9),
                    Expanded(
                      child: Text(
                        '${summary.dueRecurringCount} transaksi berulang menunggu dicatat',
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: AppColors.ink,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 16),

            // Proyeksi: menjawab "apakah bulan depan cukup?".
            AppCard(
              title: 'Proyeksi 6 bulan',
              subtitle: 'Perkiraan saldo bila pola sekarang berlanjut',
              child: summary.projection.isEmpty
                  ? Text(
                      'Belum cukup data untuk membuat proyeksi.',
                      style: Theme.of(context).textTheme.bodySmall,
                    )
                  : Column(
                      children: [
                        for (final point in summary.projection)
                          _ProjectionRow(point: point),
                        const SizedBox(height: 8),
                        Text(
                          'Dihitung dari transaksi berulang, tagihan aktif, dan '
                          'rata-rata pengeluaran harian tiga bulan terakhir.',
                          style: Theme.of(context).textTheme.labelSmall,
                        ),
                      ],
                    ),
            ),

            const SizedBox(height: 14),

            AppCard(
              title: 'Kekayaan bersih',
              subtitle: 'Aset + kas + piutang − utang',
              child: Column(
                children: [
                  _WorthRow(label: 'Saldo akun', value: summary.cash),
                  _WorthRow(label: 'Nilai aset', value: summary.assets),
                  _WorthRow(label: 'Piutang', value: summary.receivable),
                  _WorthRow(label: 'Utang', value: -summary.payable, negative: true),
                  const Divider(height: 20),
                  _WorthRow(label: 'Total', value: summary.netWorth, bold: true),
                ],
              ),
            ),

            const SizedBox(height: 14),

            OutlinedButton.icon(
              onPressed: onOpenTransactions,
              icon: const Icon(Icons.receipt_long_outlined, size: 18),
              label: const Text('Lihat semua transaksi'),
            ),
          ],
        );
      },
    );
  }
}

class _ProjectionRow extends StatelessWidget {
  const _ProjectionRow({required this.point});

  final ProjectionPoint point;

  @override
  Widget build(BuildContext context) {
    final negative = point.balance < 0;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: negative ? AppColors.tomato.withValues(alpha: 0.5) : AppColors.line,
          ),
          color: negative ? AppColors.tomato.withValues(alpha: 0.06) : null,
        ),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    Fmt.month(point.month),
                    style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                  ),
                ),
                Text(
                  Fmt.money(point.balance),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: negative ? AppColors.danger : AppColors.ink,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 3),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'masuk ${Fmt.compact(point.income)} · keluar ${Fmt.compact(point.expense)}',
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ),
                Text(
                  '${point.net >= 0 ? '+' : ''}${Fmt.compact(point.net)}',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: point.net >= 0 ? AppColors.positive : AppColors.danger,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _WorthRow extends StatelessWidget {
  const _WorthRow({
    required this.label,
    required this.value,
    this.negative = false,
    this.bold = false,
  });

  final String label;
  final int value;
  final bool negative;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: bold ? 13.5 : 12.5,
                fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
                color: bold ? AppColors.ink : AppColors.inkSoft,
              ),
            ),
          ),
          Text(
            Fmt.money(value),
            style: TextStyle(
              fontSize: bold ? 14.5 : 12.5,
              fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
              color: negative ? AppColors.danger : AppColors.ink,
            ),
          ),
        ],
      ),
    );
  }
}
