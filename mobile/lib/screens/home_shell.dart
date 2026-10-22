import 'package:flutter/material.dart';

import '../app/theme.dart';
import '../state/session_controller.dart';
import 'bills_tab.dart';
import 'budgets_tab.dart';
import 'dashboard_tab.dart';
import 'reports_tab.dart';
import 'transactions_tab.dart';

/// Kerangka utama setelah masuk.
///
/// Lima tab, dipilih karena itulah yang dipakai harian: melihat ringkasan,
/// memeriksa transaksi, dan memantau tagihan. Sisanya — mengatur anggaran,
/// menambah transaksi, mengelola anggota — tetap di versi web. Aplikasi ini
/// sengaja **tidak** mencoba menjadi versi web yang lengkap: aplikasi yang
/// mencoba melakukan segalanya biasanya tidak melakukan satu pun dengan baik.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.session});

  final SessionController session;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  Future<void> _handleExpired() async {
    await widget.session.handleExpired();
  }

  void _openTransactions() => setState(() => _index = 1);

  @override
  Widget build(BuildContext context) {
    final session = widget.session;

    final tabs = [
      DashboardTab(
        session: session,
        onExpired: _handleExpired,
        onOpenTransactions: _openTransactions,
      ),
      TransactionsTab(session: session, onExpired: _handleExpired),
      BillsTab(session: session, onExpired: _handleExpired),
      BudgetsTab(session: session, onExpired: _handleExpired),
      ReportsTab(session: session, onExpired: _handleExpired),
    ];

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            Container(
              width: 30,
              height: 30,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.profile(session.profile?.color),
                borderRadius: BorderRadius.circular(9),
                border: Border.all(color: AppColors.ink, width: 1.1),
              ),
              child: Text(
                session.profile?.initial ?? '?',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: AppColors.ink,
                ),
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    session.profile?.name ?? '',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800),
                  ),
                  Text(
                    session.workspaces
                        .where((workspace) => workspace.id == session.workspaceId)
                        .map((workspace) => workspace.name)
                        .firstOrNull ??
                        'Ruang keluarga',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w500,
                      color: AppColors.muted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () => _showAccountSheet(context, session),
            icon: const Icon(Icons.more_horiz),
            tooltip: 'Akun',
          ),
        ],
      ),
      body: IndexedStack(index: _index, children: tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (next) => setState(() => _index = next),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Ringkasan',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Transaksi',
          ),
          NavigationDestination(
            icon: Icon(Icons.event_note_outlined),
            selectedIcon: Icon(Icons.event_note),
            label: 'Tagihan',
          ),
          NavigationDestination(
            icon: Icon(Icons.pie_chart_outline),
            selectedIcon: Icon(Icons.pie_chart),
            label: 'Anggaran',
          ),
          NavigationDestination(
            icon: Icon(Icons.insights_outlined),
            selectedIcon: Icon(Icons.insights),
            label: 'Laporan',
          ),
        ],
      ),
    );
  }

  void _showAccountSheet(BuildContext context, SessionController session) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.lineStrong,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Text(
                session.profile?.name ?? 'Akun',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Text(
                session.accountEmail ?? '',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 8),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.dns_outlined, size: 20),
                title: const Text('Alamat server', style: TextStyle(fontSize: 14)),
                subtitle: Text(
                  session.baseUrl.replaceFirst(RegExp(r'^https?://'), ''),
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.logout, size: 20, color: AppColors.danger),
                title: const Text(
                  'Keluar',
                  style: TextStyle(fontSize: 14, color: AppColors.danger),
                ),
                onTap: () {
                  Navigator.pop(sheetContext);
                  session.logout();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
