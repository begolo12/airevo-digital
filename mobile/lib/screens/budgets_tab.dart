import 'package:flutter/material.dart';

import '../app/format.dart';
import '../app/theme.dart';
import '../data/models.dart';
import '../state/session_controller.dart';
import '../widgets/async_view.dart';
import '../widgets/common.dart';

/// Anggaran bulan berjalan.
///
/// Menampilkan pemakaian per kategori dengan urutan dari yang paling kritis.
/// Urutan itu disengaja: yang perlu ditindaklanjuti harus muncul lebih dulu,
/// bukan yang kebetulan diinput lebih awal.
class BudgetsTab extends StatelessWidget {
  const BudgetsTab({super.key, required this.session, required this.onExpired});

  final SessionController session;
  final Future<void> Function() onExpired;

  @override
  Widget build(BuildContext context) {
    return AsyncView<BudgetsResult>(
      load: () async {
        final data = await session.client.get('/api/mobile/budgets');
        return BudgetsResult.fromJson(data as Map<String, dynamic>);
      },
      onExpired: onExpired,
      builder: (context, result, refresh) {
        final sorted = [...result.items]..sort((a, b) => b.ratio.compareTo(a.ratio));
        final over = result.items.where((item) => item.status == 'over').length;

        return RefreshableList(
          onRefresh: refresh,
          children: [
            Eyebrow(Fmt.month(result.month)),
            const SizedBox(height: 4),
            Text('Anggaran', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 14),

            AppCard(
              title: 'Pemakaian bulan ini',
              subtitle: result.planned > 0
                  ? '${Fmt.percent(result.ratio)} dari rencana terpakai'
                  : 'Belum ada anggaran bulan ini',
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              Fmt.money(result.used),
                              style: const TextStyle(
                                fontSize: 23,
                                height: 1.15,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -0.7,
                              ),
                            ),
                            Text(
                              'dari ${Fmt.money(result.planned)}',
                              style: Theme.of(context).textTheme.labelSmall,
                            ),
                          ],
                        ),
                      ),
                      Text(
                        'sisa ${Fmt.money(result.remaining)}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: result.remaining <= 0 ? AppColors.danger : AppColors.positive,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ThinProgress(
                    ratio: result.planned > 0 ? result.used / result.planned : 0,
                    color: result.ratio > 100
                        ? AppColors.tomato
                        : result.ratio > 80
                            ? AppColors.butterDeep
                            : AppColors.mintDeep,
                    height: 8,
                  ),
                  if (over > 0) ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const Icon(Icons.warning_amber_rounded,
                            size: 15, color: AppColors.danger),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            '$over kategori sudah melewati anggaran',
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.danger,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 14),

            if (sorted.isEmpty)
              const EmptyState(
                title: 'Belum ada anggaran',
                message: 'Atur anggaran per kategori lewat versi web agar pengeluaran terkendali.',
                icon: Icons.pie_chart_outline,
              )
            else
              AppCard(
                title: 'Per kategori',
                subtitle: 'Paling kritis lebih dulu',
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
                child: Column(
                  children: [
                    for (final budget in sorted) _BudgetRow(budget: budget),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }
}

class _BudgetRow extends StatelessWidget {
  const _BudgetRow({required this.budget});

  final Budget budget;

  @override
  Widget build(BuildContext context) {
    final color = switch (budget.status) {
      'over' => AppColors.tomato,
      'warning' => AppColors.butterDeep,
      _ => AppColors.mintDeep,
    };

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  budget.categoryName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
                ),
              ),
              Text(
                Fmt.percent(budget.ratio),
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w800,
                  color: budget.status == 'over' ? AppColors.danger : AppColors.inkSoft,
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          ThinProgress(
            ratio: budget.budgeted > 0 ? budget.used / budget.budgeted : 0,
            color: color,
            height: 5,
          ),
          const SizedBox(height: 4),
          Text(
            '${Fmt.money(budget.used)} / ${Fmt.money(budget.budgeted)}',
            style: Theme.of(context).textTheme.labelSmall,
          ),
        ],
      ),
    );
  }
}
