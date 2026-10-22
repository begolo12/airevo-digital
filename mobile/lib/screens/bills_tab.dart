import 'package:flutter/material.dart';

import '../app/format.dart';
import '../app/theme.dart';
import '../data/models.dart';
import '../state/session_controller.dart';
import '../widgets/async_view.dart';
import '../widgets/common.dart';

/// Tagihan aktif beserta status jatuh temponya.
///
/// Diurutkan dari yang paling mendesak. Yang lewat jatuh tempo diberi warna
/// tegas karena itulah satu-satunya hal di layar ini yang perlu ditindaklanjuti
/// hari ini.
class BillsTab extends StatelessWidget {
  const BillsTab({super.key, required this.session, required this.onExpired});

  final SessionController session;
  final Future<void> Function() onExpired;

  @override
  Widget build(BuildContext context) {
    return AsyncView<BillsResult>(
      load: () async {
        final data = await session.client.get('/api/mobile/bills');
        return BillsResult.fromJson(data as Map<String, dynamic>);
      },
      onExpired: onExpired,
      builder: (context, result, refresh) {
        final overdue = result.items.where((bill) => bill.state == 'overdue').toList();

        return RefreshableList(
          onRefresh: refresh,
          children: [
            Eyebrow('Tagihan'),
            const SizedBox(height: 4),
            Text('Tagihan', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 14),

            Row(
              children: [
                Expanded(
                  child: StatTile(
                    label: 'Total per periode',
                    value: Fmt.money(result.total),
                    tone: StatTone.ink,
                    hint: '${result.items.length} tagihan aktif',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: StatTile(
                    label: 'Lewat jatuh tempo',
                    value: '${overdue.length}',
                    tone: overdue.isEmpty ? StatTone.mint : StatTone.tomato,
                    hint: overdue.isEmpty ? 'semua terkendali' : 'segera dibayar',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            if (result.items.isEmpty)
              const EmptyState(
                title: 'Belum ada tagihan',
                message: 'Tambahkan tagihan listrik, air, atau internet lewat versi web.',
                icon: Icons.event_note_outlined,
              )
            else
              AppCard(
                title: 'Daftar tagihan',
                subtitle: 'Diurutkan dari yang paling dekat',
                padding: const EdgeInsets.fromLTRB(0, 8, 0, 6),
                child: Column(
                  children: [
                    for (final bill in result.items) _BillRow(bill: bill),
                  ],
                ),
              ),

            const SizedBox(height: 14),

            AppCard(
              title: 'Cara membaca status',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Legend(
                    color: AppColors.tomato,
                    label: 'Lewat jatuh tempo',
                    detail: 'Tanggalnya sudah lewat dan belum ditandai dibayar.',
                  ),
                  _Legend(
                    color: AppColors.butterDeep,
                    label: 'Jatuh tempo hari ini',
                    detail: 'Perlu dibayar hari ini agar tidak menumpuk.',
                  ),
                  _Legend(
                    color: AppColors.lineStrong,
                    label: 'Terjadwal',
                    detail: 'Masih ada waktu; pengingat muncul di dashboard.',
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class _BillRow extends StatelessWidget {
  const _BillRow({required this.bill});

  final Bill bill;

  @override
  Widget build(BuildContext context) {
    final (accent, tone) = switch (bill.state) {
      'overdue' => (AppColors.tomato, AppColors.tomatoDeep),
      'due' => (AppColors.butterDeep, AppColors.warning),
      'paid' => (AppColors.mintDeep, AppColors.positive),
      _ => (AppColors.lineStrong, AppColors.inkSoft),
    };

    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 9, 14, 9),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 3,
                height: 30,
                decoration: BoxDecoration(
                  color: accent,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      bill.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${Fmt.money(bill.amount)} · ${bill.frequencyLabel} · '
                      '${Fmt.dueLabel(bill.nextDueDate)}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelSmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              StatusChip(label: bill.stateLabel, color: tone),
            ],
          ),
          if (bill.splitCount > 0)
            Padding(
              padding: const EdgeInsets.only(left: 13, top: 4),
              child: Row(
                children: [
                  const Icon(Icons.groups_outlined, size: 11, color: AppColors.muted),
                  const SizedBox(width: 4),
                  Text(
                    'dibagi ke $bill.splitCount anggota',
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.label, required this.detail});

  final Color color;
  final String label;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: 4),
            width: 9,
            height: 9,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                ),
                Text(detail, style: Theme.of(context).textTheme.labelSmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
