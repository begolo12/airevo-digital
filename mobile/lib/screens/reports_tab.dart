import 'package:flutter/material.dart';

import '../app/format.dart';
import '../app/theme.dart';
import '../data/models.dart';
import '../state/session_controller.dart';
import '../widgets/async_view.dart';
import '../widgets/common.dart';

/// Laporan: ringkasan, kategori, tren 12 bulan, tujuan, dan kalender.
///
/// Digabung dalam satu tab karena semuanya menjawab pertanyaan yang sama —
/// "bagaimana keadaan saya sebenarnya" — dan masing-masing terlalu kecil untuk
/// mendapat tab sendiri.
class ReportsTab extends StatelessWidget {
  const ReportsTab({super.key, required this.session, required this.onExpired});

  final SessionController session;
  final Future<void> Function() onExpired;

  @override
  Widget build(BuildContext context) {
    return AsyncView<_ReportBundle>(
      load: () async {
        /*
         * Dua permintaan dijalankan bersamaan, bukan berurutan. Pada koneksi
         * seluler, menunggu satu per satu terasa dua kali lebih lambat.
         */
        final results = await Future.wait([
          session.client.get('/api/mobile/reports'),
          session.client.get('/api/mobile/goals'),
        ]);

        return _ReportBundle(
          report: Report.fromJson(results[0] as Map<String, dynamic>),
          goals: GoalsResult.fromJson(results[1] as Map<String, dynamic>),
        );
      },
      onExpired: onExpired,
      builder: (context, bundle, refresh) {
        final report = bundle.report;

        return RefreshableList(
          onRefresh: refresh,
          children: [
            Eyebrow(Fmt.month(report.month)),
            const SizedBox(height: 4),
            Text('Laporan', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 14),

            Row(
              children: [
                Expanded(
                  child: StatTile(
                    label: 'Pemasukan',
                    value: Fmt.money(report.income),
                    tone: StatTone.mint,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: StatTile(
                    label: 'Pengeluaran',
                    value: Fmt.money(report.expense),
                    tone: StatTone.butter,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 14),

            AppCard(
              title: 'Tren 12 bulan',
              subtitle: 'Pemasukan dan pengeluaran per bulan',
              child: report.series.isEmpty
                  ? Text('Belum ada data.',
                      style: Theme.of(context).textTheme.bodySmall)
                  : Column(
                      children: [
                        SizedBox(
                          height: 130,
                          child: _TrendChart(series: report.series),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _Dot(color: AppColors.mintDeep, label: 'masuk'),
                            const SizedBox(width: 16),
                            _Dot(color: AppColors.tomato, label: 'keluar'),
                          ],
                        ),
                      ],
                    ),
            ),

            const SizedBox(height: 14),

            AppCard(
              title: 'Pengeluaran per kategori',
              subtitle: Fmt.month(report.month),
              child: report.categories.isEmpty
                  ? Text('Belum ada pengeluaran bulan ini.',
                      style: Theme.of(context).textTheme.bodySmall)
                  : Column(
                      children: [
                        for (final slice in report.categories.take(8))
                          _CategoryRow(slice: slice),
                      ],
                    ),
            ),

            const SizedBox(height: 14),

            AppCard(
              title: 'Tujuan keuangan',
              subtitle: '${bundle.goals.items.length} tujuan aktif',
              child: bundle.goals.items.isEmpty
                  ? Text('Belum ada tujuan.',
                      style: Theme.of(context).textTheme.bodySmall)
                  : Column(
                      children: [
                        for (final goal in bundle.goals.items) _GoalRow(goal: goal),
                      ],
                    ),
            ),

            const SizedBox(height: 14),

            AppCard(
              title: 'Kekayaan bersih',
              subtitle: 'Aset + kas + piutang − utang',
              child: Column(
                children: [
                  _WorthLine(label: 'Saldo akun', value: report.worth.cash),
                  _WorthLine(label: 'Nilai aset', value: report.worth.assets),
                  _WorthLine(label: 'Piutang', value: report.worth.receivable),
                  _WorthLine(label: 'Utang', value: -report.worth.payable, negative: true),
                  const Divider(height: 20),
                  _WorthLine(label: 'Total', value: report.worth.total, bold: true),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ReportBundle {
  const _ReportBundle({required this.report, required this.goals});

  final Report report;
  final GoalsResult goals;
}

/// Grafik batang sederhana, digambar sendiri.
///
/// Tidak memakai pustaka grafik: yang dibutuhkan hanya batang berpasangan
/// dengan sumbu bulan. Menambah dependensi berarti menambah ukuran APK dan
/// satu lagi yang harus diperbarui — tidak sepadan untuk satu grafik.
class _TrendChart extends StatelessWidget {
  const _TrendChart({required this.series});

  final List<SeriesPoint> series;

  @override
  Widget build(BuildContext context) {
    var peak = 1;
    for (final point in series) {
      if (point.income > peak) peak = point.income;
      if (point.expense > peak) peak = point.expense;
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        return Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            for (final point in series)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 1.5),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Expanded(
                              child: _Bar(
                                ratio: point.income / peak,
                                color: AppColors.mintDeep,
                              ),
                            ),
                            const SizedBox(width: 1.5),
                            Expanded(
                              child: _Bar(
                                ratio: point.expense / peak,
                                color: AppColors.tomato,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        Fmt.monthShort(point.month),
                        style: const TextStyle(fontSize: 8.5, color: AppColors.muted),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _Bar extends StatelessWidget {
  const _Bar({required this.ratio, required this.color});

  final double ratio;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final height = ratio.isFinite ? ratio.clamp(0.0, 1.0) : 0.0;

    return FractionallySizedBox(
      heightFactor: height == 0 ? 0.02 : height,
      alignment: Alignment.bottomCenter,
      child: Container(
        decoration: BoxDecoration(
          color: color,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(2.5)),
        ),
      ),
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 5),
        Text(label, style: Theme.of(context).textTheme.labelSmall),
      ],
    );
  }
}

class _CategoryRow extends StatelessWidget {
  const _CategoryRow({required this.slice});

  final CategorySlice slice;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  slice.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                ),
              ),
              Text(
                '${Fmt.money(slice.amount)} · ${Fmt.percent(slice.percent)}',
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ],
          ),
          const SizedBox(height: 4),
          ThinProgress(ratio: slice.percent / 100, color: AppColors.butterDeep, height: 5),
        ],
      ),
    );
  }
}

class _GoalRow extends StatelessWidget {
  const _GoalRow({required this.goal});

  final Goal goal;

  @override
  Widget build(BuildContext context) {
    final onTrack = goal.onTrack;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  goal.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                ),
              ),
              Text(
                Fmt.percent(goal.progress),
                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800),
              ),
            ],
          ),
          const SizedBox(height: 5),
          ThinProgress(ratio: goal.progress / 100, color: AppColors.skyDeep, height: 6),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: Text(
                  '${Fmt.money(goal.saved)} dari ${Fmt.money(goal.target)}',
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ),
              if (onTrack != null)
                Text(
                  onTrack ? 'sesuai jalur' : 'perlu dikejar',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: onTrack ? AppColors.positive : AppColors.warning,
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _WorthLine extends StatelessWidget {
  const _WorthLine({
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
