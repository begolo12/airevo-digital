/// Model data dari API.
///
/// Semua model dibuat **immutable** dan diurai lewat factory `fromJson` yang
/// tidak pernah melempar untuk field yang hilang. Server sudah menjamin bentuk
/// yang konsisten, tetapi aplikasi yang sudah terpasang di HP pengguna tidak
/// bisa dipaksa memperbarui diri — jadi sisi klien harus tahan terhadap versi
/// server yang lebih baru maupun lebih lama.
library;

/// Membaca nilai tanpa pernah melempar.
int _int(Object? value) {
  if (value is int) return value;
  if (value is num) return value.round();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}

double _double(Object? value) {
  if (value is double) return value;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0;
  return 0;
}

String _string(Object? value) => value is String ? value : '';

String? _stringOrNull(Object? value) => value is String && value.isNotEmpty ? value : null;

int? _intOrNull(Object? value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.round();
  return null;
}

bool _bool(Object? value) => value == true;

Map<String, dynamic> _map(Object? value) =>
    value is Map<String, dynamic> ? value : const <String, dynamic>{};

List<Map<String, dynamic>> _list(Object? value) {
  if (value is! List) return const <Map<String, dynamic>>[];
  return value.whereType<Map<String, dynamic>>().toList(growable: false);
}

/* --------------------------------- sesi ----------------------------------- */

class Profile {
  const Profile({
    required this.id,
    required this.name,
    required this.initial,
    required this.color,
    required this.role,
    required this.hasPin,
  });

  final String id;
  final String name;
  final String initial;
  final String color;
  final String role;
  final bool hasPin;

  factory Profile.fromJson(Map<String, dynamic> json) => Profile(
        id: _string(json['id']),
        name: _string(json['name']),
        initial: _string(json['initial']),
        color: _string(json['color']),
        role: _string(json['role']),
        hasPin: _bool(json['hasPin']),
      );

  String get roleLabel => switch (role) {
        'owner' => 'Pemilik',
        'adult' => 'Dewasa',
        'teen' => 'Remaja',
        'child' => 'Anak',
        _ => role,
      };
}

class WorkspaceRef {
  const WorkspaceRef({required this.id, required this.name, required this.type});

  final String id;
  final String name;
  final String type;

  factory WorkspaceRef.fromJson(Map<String, dynamic> json) => WorkspaceRef(
        id: _string(json['id']),
        name: _string(json['name']),
        type: _string(json['type']),
      );
}

/// Hasil tahap 1: kata sandi benar, profil belum dipilih.
class LoginResult {
  const LoginResult({
    required this.token,
    required this.email,
    required this.name,
    required this.profiles,
  });

  final String token;
  final String email;
  final String name;
  final List<Profile> profiles;

  factory LoginResult.fromJson(Map<String, dynamic> json) {
    final account = _map(json['account']);
    return LoginResult(
      token: _string(json['token']),
      email: _string(account['email']),
      name: _string(account['name']),
      profiles: _list(json['profiles']).map(Profile.fromJson).toList(growable: false),
    );
  }
}

/// Hasil tahap 2: profil terbuka, token aktif.
class ProfileSession {
  const ProfileSession({
    required this.token,
    required this.profile,
    required this.workspaceId,
    required this.workspaces,
  });

  final String token;
  final Profile profile;
  final String workspaceId;
  final List<WorkspaceRef> workspaces;

  factory ProfileSession.fromJson(Map<String, dynamic> json) => ProfileSession(
        token: _string(json['token']),
        profile: Profile.fromJson(_map(json['profile'])),
        workspaceId: _string(json['workspaceId']),
        workspaces:
            _list(json['workspaces']).map(WorkspaceRef.fromJson).toList(growable: false),
      );
}

/* -------------------------------- ringkasan -------------------------------- */

class ProjectionPoint {
  const ProjectionPoint({
    required this.month,
    required this.income,
    required this.expense,
    required this.net,
    required this.balance,
  });

  final String month;
  final int income;
  final int expense;
  final int net;
  final int balance;

  factory ProjectionPoint.fromJson(Map<String, dynamic> json) => ProjectionPoint(
        month: _string(json['month']),
        income: _int(json['income']),
        expense: _int(json['expense']),
        net: _int(json['net']),
        balance: _int(json['balance']),
      );
}

class Summary {
  const Summary({
    required this.month,
    required this.balance,
    required this.income,
    required this.expense,
    required this.net,
    required this.previousIncome,
    required this.previousExpense,
    required this.budgetPlanned,
    required this.budgetUsed,
    required this.budgetRatio,
    required this.netWorth,
    required this.cash,
    required this.assets,
    required this.payable,
    required this.receivable,
    required this.dueRecurringCount,
    required this.projection,
  });

  final String month;
  final int balance;
  final int income;
  final int expense;
  final int net;
  final int previousIncome;
  final int previousExpense;
  final int budgetPlanned;
  final int budgetUsed;
  final int budgetRatio;
  final int netWorth;
  final int cash;
  final int assets;
  final int payable;
  final int receivable;
  final int dueRecurringCount;
  final List<ProjectionPoint> projection;

  factory Summary.fromJson(Map<String, dynamic> json) => Summary(
        month: _string(json['month']),
        balance: _int(json['balance']),
        income: _int(json['income']),
        expense: _int(json['expense']),
        net: _int(json['net']),
        previousIncome: _int(json['previousIncome']),
        previousExpense: _int(json['previousExpense']),
        budgetPlanned: _int(json['budgetPlanned']),
        budgetUsed: _int(json['budgetUsed']),
        budgetRatio: _int(json['budgetRatio']),
        netWorth: _int(json['netWorth']),
        cash: _int(json['cash']),
        assets: _int(json['assets']),
        payable: _int(json['payable']),
        receivable: _int(json['receivable']),
        dueRecurringCount: _int(json['dueRecurringCount']),
        projection: _list(json['projection'])
            .map(ProjectionPoint.fromJson)
            .toList(growable: false),
      );

  /// Perubahan pengeluaran dibanding bulan lalu, dalam persen.
  int? get expenseDelta {
    if (previousExpense <= 0) return null;
    return ((expense - previousExpense) / previousExpense * 100).round();
  }

  int get budgetRemaining => (budgetPlanned - budgetUsed).clamp(0, 1 << 62);
}

/* -------------------------------- transaksi -------------------------------- */

class Transaction {
  const Transaction({
    required this.id,
    required this.type,
    required this.amount,
    required this.occurredAt,
    required this.description,
    required this.accountName,
    required this.categoryName,
    required this.visibility,
    required this.voided,
    required this.hasAttachment,
  });

  final String id;
  final String type;
  final int amount;
  final String occurredAt;
  final String description;
  final String accountName;
  final String? categoryName;
  final String visibility;
  final bool voided;
  final bool hasAttachment;

  factory Transaction.fromJson(Map<String, dynamic> json) => Transaction(
        id: _string(json['id']),
        type: _string(json['type']),
        amount: _int(json['amount']),
        occurredAt: _string(json['occurredAt']),
        description: _string(json['description']),
        accountName: _string(json['accountName']),
        categoryName: _stringOrNull(json['categoryName']),
        visibility: _string(json['visibility']),
        voided: _bool(json['voided']),
        hasAttachment: _bool(json['hasAttachment']),
      );

  bool get isIncome => type == 'income';
  bool get isTransfer => type == 'transfer';

  /// Tanda nominal untuk tampilan: pemasukan `+`, pengeluaran `-`.
  ///
  /// Transfer tidak diberi tanda karena tidak mengubah total kekayaan —
  /// hanya berpindah antar akun sendiri.
  String get signedAmount {
    final sign = isIncome ? '+' : '-';
    return isTransfer ? 'Rp$amount' : '$sign Rp$amount';
  }
}

class TransactionPage {
  const TransactionPage({
    required this.total,
    required this.limit,
    required this.offset,
    required this.hasMore,
    required this.items,
  });

  final int total;
  final int limit;
  final int offset;
  final bool hasMore;
  final List<Transaction> items;

  factory TransactionPage.fromJson(Map<String, dynamic> json) => TransactionPage(
        total: _int(json['total']),
        limit: _int(json['limit']),
        offset: _int(json['offset']),
        hasMore: _bool(json['hasMore']),
        items: _list(json['items']).map(Transaction.fromJson).toList(growable: false),
      );
}

/* --------------------------------- tagihan --------------------------------- */

class Bill {
  const Bill({
    required this.id,
    required this.name,
    required this.amount,
    required this.frequency,
    required this.nextDueDate,
    required this.state,
    required this.categoryName,
    required this.splitCount,
  });

  final String id;
  final String name;
  final int amount;
  final String frequency;
  final String nextDueDate;
  final String state;
  final String? categoryName;
  final int splitCount;

  factory Bill.fromJson(Map<String, dynamic> json) => Bill(
        id: _string(json['id']),
        name: _string(json['name']),
        amount: _int(json['amount']),
        frequency: _string(json['frequency']),
        nextDueDate: _string(json['nextDueDate']),
        state: _string(json['state']),
        categoryName: _stringOrNull(json['categoryName']),
        splitCount: _int(json['splitCount']),
      );

  String get stateLabel => switch (state) {
        'overdue' => 'Lewat jatuh tempo',
        'due' => 'Jatuh tempo hari ini',
        'upcoming' => 'Terjadwal',
        'paid' => 'Sudah dibayar',
        _ => state,
      };

  String get frequencyLabel => switch (frequency) {
        'weekly' => 'mingguan',
        'monthly' => 'bulanan',
        'quarterly' => '3 bulanan',
        'semiannual' => '6 bulanan',
        'yearly' => 'tahunan',
        _ => frequency,
      };
}

class BillsResult {
  const BillsResult({
    required this.total,
    required this.upcomingCount,
    required this.items,
  });

  final int total;
  final int upcomingCount;
  final List<Bill> items;

  factory BillsResult.fromJson(Map<String, dynamic> json) => BillsResult(
        total: _int(json['total']),
        upcomingCount: _int(json['upcomingCount']),
        items: _list(json['items']).map(Bill.fromJson).toList(growable: false),
      );
}

/* -------------------------------- anggaran --------------------------------- */

class Budget {
  const Budget({
    required this.id,
    required this.categoryName,
    required this.budgeted,
    required this.used,
    required this.remaining,
    required this.ratio,
    required this.status,
  });

  final String id;
  final String categoryName;
  final int budgeted;
  final int used;
  final int remaining;
  final int ratio;
  final String status;

  factory Budget.fromJson(Map<String, dynamic> json) => Budget(
        id: _string(json['id']),
        categoryName: _string(json['categoryName']),
        budgeted: _int(json['budgeted']),
        used: _int(json['used']),
        remaining: _int(json['remaining']),
        ratio: _int(json['ratio']),
        status: _string(json['status']),
      );
}

class BudgetsResult {
  const BudgetsResult({
    required this.month,
    required this.planned,
    required this.used,
    required this.remaining,
    required this.ratio,
    required this.items,
  });

  final String month;
  final int planned;
  final int used;
  final int remaining;
  final int ratio;
  final List<Budget> items;

  factory BudgetsResult.fromJson(Map<String, dynamic> json) => BudgetsResult(
        month: _string(json['month']),
        planned: _int(json['planned']),
        used: _int(json['used']),
        remaining: _int(json['remaining']),
        ratio: _int(json['ratio']),
        items: _list(json['items']).map(Budget.fromJson).toList(growable: false),
      );
}

/* --------------------------------- tujuan ---------------------------------- */

class Goal {
  const Goal({
    required this.id,
    required this.name,
    required this.target,
    required this.saved,
    required this.remaining,
    required this.progress,
    required this.targetDate,
    required this.monthsLeft,
    required this.monthlyTarget,
    required this.onTrack,
  });

  final String id;
  final String name;
  final int target;
  final int saved;
  final int remaining;
  final int progress;
  final String? targetDate;
  final int? monthsLeft;
  final int? monthlyTarget;
  final bool? onTrack;

  factory Goal.fromJson(Map<String, dynamic> json) => Goal(
        id: _string(json['id']),
        name: _string(json['name']),
        target: _int(json['target']),
        saved: _int(json['saved']),
        remaining: _int(json['remaining']),
        progress: _int(json['progress']),
        targetDate: _stringOrNull(json['targetDate']),
        monthsLeft: _intOrNull(json['monthsLeft']),
        monthlyTarget: _intOrNull(json['monthlyTarget']),
        onTrack: json['onTrack'] is bool ? json['onTrack'] as bool : null,
      );
}

class GoalsResult {
  const GoalsResult({required this.items});

  final List<Goal> items;

  factory GoalsResult.fromJson(Map<String, dynamic> json) => GoalsResult(
        items: _list(json['items']).map(Goal.fromJson).toList(growable: false),
      );
}

/* --------------------------------- laporan --------------------------------- */

class CategorySlice {
  const CategorySlice({required this.name, required this.amount, required this.percent});

  final String name;
  final int amount;
  final int percent;

  factory CategorySlice.fromJson(Map<String, dynamic> json) => CategorySlice(
        name: _string(json['name']),
        amount: _int(json['amount']),
        percent: _int(json['percent']),
      );
}

class SeriesPoint {
  const SeriesPoint({
    required this.month,
    required this.income,
    required this.expense,
    required this.net,
  });

  final String month;
  final int income;
  final int expense;
  final int net;

  factory SeriesPoint.fromJson(Map<String, dynamic> json) => SeriesPoint(
        month: _string(json['month']),
        income: _int(json['income']),
        expense: _int(json['expense']),
        net: _int(json['net']),
      );
}

class TrendRow {
  const TrendRow({required this.name, required this.values});

  final String name;
  final List<int> values;

  factory TrendRow.fromJson(Map<String, dynamic> json) => TrendRow(
        name: _string(json['name']),
        values: (json['values'] is List)
            ? (json['values'] as List).map(_int).toList(growable: false)
            : const <int>[],
      );
}

class Worth {
  const Worth({
    required this.cash,
    required this.assets,
    required this.receivable,
    required this.payable,
    required this.total,
  });

  final int cash;
  final int assets;
  final int receivable;
  final int payable;
  final int total;

  factory Worth.fromJson(Map<String, dynamic> json) => Worth(
        cash: _int(json['cash']),
        assets: _int(json['assets']),
        receivable: _int(json['receivable']),
        payable: _int(json['payable']),
        total: _int(json['total']),
      );
}

class Report {
  const Report({
    required this.month,
    required this.income,
    required this.expense,
    required this.net,
    required this.worth,
    required this.categories,
    required this.series,
    required this.trend,
  });

  final String month;
  final int income;
  final int expense;
  final int net;
  final Worth worth;
  final List<CategorySlice> categories;
  final List<SeriesPoint> series;
  final List<TrendRow> trend;

  factory Report.fromJson(Map<String, dynamic> json) {
    final summary = _map(json['summary']);
    return Report(
      month: _string(json['month']),
      income: _int(summary['income']),
      expense: _int(summary['expense']),
      net: _int(summary['net']),
      worth: Worth.fromJson(_map(json['worth'])),
      categories:
          _list(json['categories']).map(CategorySlice.fromJson).toList(growable: false),
      series: _list(json['series']).map(SeriesPoint.fromJson).toList(growable: false),
      trend: _list(json['trend']).map(TrendRow.fromJson).toList(growable: false),
    );
  }
}

/* -------------------------------- kalender --------------------------------- */

class CalendarDay {
  const CalendarDay({required this.date, required this.amount});

  final String date;
  final int amount;

  factory CalendarDay.fromJson(Map<String, dynamic> json) => CalendarDay(
        date: _string(json['date']),
        amount: _int(json['amount']),
      );
}

class CalendarData {
  const CalendarData({
    required this.month,
    required this.count,
    required this.income,
    required this.expense,
    required this.days,
  });

  final String month;
  final int count;
  final int income;
  final int expense;
  final List<CalendarDay> days;

  factory CalendarData.fromJson(Map<String, dynamic> json) => CalendarData(
        month: _string(json['month']),
        count: _int(json['count']),
        income: _int(json['income']),
        expense: _int(json['expense']),
        days: _list(json['days']).map(CalendarDay.fromJson).toList(growable: false),
      );

  /// Pengeluaran pada tanggal tertentu (`YYYY-MM-DD`), atau 0.
  int amountOn(String date) {
    for (final day in days) {
      if (day.date == date) return day.amount;
    }
    return 0;
  }

  /// Nilai tertinggi, untuk menentukan intensitas warna heatmap.
  int get peak {
    var highest = 0;
    for (final day in days) {
      if (day.amount > highest) highest = day.amount;
    }
    return highest;
  }
}

/* -------------------------------- referensi -------------------------------- */

class AccountRef {
  const AccountRef({
    required this.id,
    required this.name,
    required this.type,
    required this.balance,
  });

  final String id;
  final String name;
  final String type;
  final int balance;

  factory AccountRef.fromJson(Map<String, dynamic> json) => AccountRef(
        id: _string(json['id']),
        name: _string(json['name']),
        type: _string(json['type']),
        balance: _int(json['balance']),
      );
}

class CategoryRef {
  const CategoryRef({required this.id, required this.name, required this.kind});

  final String id;
  final String name;
  final String kind;

  factory CategoryRef.fromJson(Map<String, dynamic> json) => CategoryRef(
        id: _string(json['id']),
        name: _string(json['name']),
        kind: _string(json['kind']),
      );
}

class Reference {
  const Reference({required this.accounts, required this.categories});

  final List<AccountRef> accounts;
  final List<CategoryRef> categories;

  factory Reference.fromJson(Map<String, dynamic> json) => Reference(
        accounts: _list(json['accounts']).map(AccountRef.fromJson).toList(growable: false),
        categories:
            _list(json['categories']).map(CategoryRef.fromJson).toList(growable: false),
      );

  List<CategoryRef> categoriesOf(String kind) =>
      categories.where((category) => category.kind == kind).toList(growable: false);
}

/// Dipakai untuk menghitung selisih tanpa risiko pembagian nol.
double safeRatio(num part, num whole) {
  if (whole <= 0) return 0;
  return _double(part) / _double(whole);
}
