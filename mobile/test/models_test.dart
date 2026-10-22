import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'package:airevo_keluarga/app/format.dart';
import 'package:airevo_keluarga/data/models.dart';

/// Test untuk logika yang tidak butuh server.
///
/// Yang diuji di sini adalah bagian yang paling mudah salah dan paling mahal
/// akibatnya: penerjemahan angka, dan ketahanan model terhadap data yang
/// bentuknya tidak terduga.
void main() {
  setUpAll(() async {
    await initializeDateFormatting('id_ID');
  });

  group('Fmt.money', () {
    test('memformat rupiah dengan pemisah ribuan', () {
      expect(Fmt.money(1234567), 'Rp1.234.567');
      expect(Fmt.money(0), 'Rp0');
      expect(Fmt.money(49000), 'Rp49.000');
    });

    test('menangani nominal negatif', () {
      expect(Fmt.money(-450000), contains('450.000'));
      expect(Fmt.money(-450000), startsWith('-'));
    });

    test('tidak pernah menghasilkan NaN', () {
      expect(Fmt.money(double.nan), isNot(contains('NaN')));
      expect(Fmt.money(double.infinity), isNot(contains('Infinity')));
    });
  });

  group('Fmt.compact', () {
    test('meringkas jutaan dan miliaran', () {
      expect(Fmt.compact(1500000), 'Rp1,5 jt');
      expect(Fmt.compact(2500000000), 'Rp2,5 M');
    });

    test('meringkas ribuan', () {
      expect(Fmt.compact(45000), 'Rp45 rb');
    });

    test('nominal kecil tetap utuh', () {
      expect(Fmt.compact(500), 'Rp500');
    });

    test('tanda negatif dipertahankan', () {
      expect(Fmt.compact(-1500000), contains('-'));
      expect(Fmt.compact(-1500000), contains('jt'));
    });
  });

  group('Fmt.date', () {
    test('mengubah ISO menjadi tanggal Indonesia', () {
      expect(Fmt.date('2026-10-22'), '22 Okt 2026');
    });

    test('mengembalikan masukan apa adanya bila tidak bisa diurai', () {
      expect(Fmt.date('bukan-tanggal'), 'bukan-tanggal');
      expect(Fmt.date(''), '');
    });
  });

  group('Fmt.month', () {
    test('mengubah kunci bulan menjadi nama bulan', () {
      expect(Fmt.month('2026-10'), 'Oktober 2026');
    });

    test('mengembalikan masukan apa adanya bila tidak sah', () {
      expect(Fmt.month('rusak'), 'rusak');
    });
  });

  group('Fmt.dueLabel', () {
    test('menjelaskan jatuh tempo dalam bahasa manusia', () {
      final today = DateTime.now();
      String iso(int offset) => today
          .add(Duration(days: offset))
          .toIso8601String()
          .substring(0, 10);

      expect(Fmt.dueLabel(iso(0)), 'hari ini');
      expect(Fmt.dueLabel(iso(1)), 'besok');
      expect(Fmt.dueLabel(iso(-1)), 'kemarin');
      expect(Fmt.dueLabel(iso(5)), '5 hari lagi');
      expect(Fmt.dueLabel(iso(-3)), '3 hari lewat');
    });
  });

  group('Summary', () {
    Summary build({int expense = 0, int previousExpense = 0}) => Summary(
          month: '2026-10',
          balance: 1000000,
          income: 5000000,
          expense: expense,
          net: 5000000 - expense,
          previousIncome: 5000000,
          previousExpense: previousExpense,
          budgetPlanned: 3000000,
          budgetUsed: 1200000,
          budgetRatio: 40,
          netWorth: 2000000,
          cash: 1000000,
          assets: 1500000,
          payable: 500000,
          receivable: 0,
          dueRecurringCount: 0,
          projection: const [],
        );

    test('menghitung perubahan pengeluaran', () {
      expect(build(expense: 1200000, previousExpense: 1000000).expenseDelta, 20);
      expect(build(expense: 800000, previousExpense: 1000000).expenseDelta, -20);
    });

    test('tidak menghitung perubahan bila bulan lalu nol', () {
      // Pembagian nol akan menghasilkan Infinity, bukan angka yang berguna.
      expect(build(expense: 500000, previousExpense: 0).expenseDelta, isNull);
    });

    test('sisa anggaran tidak pernah negatif', () {
      final summary = build();
      expect(summary.budgetRemaining, 1800000);
    });

    test('sisa anggaran dijepit di nol saat melebihi', () {
      final summary = Summary(
        month: '2026-10',
        balance: 0,
        income: 0,
        expense: 5000000,
        net: -5000000,
        previousIncome: 0,
        previousExpense: 0,
        budgetPlanned: 3000000,
        budgetUsed: 5000000,
        budgetRatio: 166,
        netWorth: 0,
        cash: 0,
        assets: 0,
        payable: 0,
        receivable: 0,
        dueRecurringCount: 0,
        projection: const [],
      );

      expect(summary.budgetRemaining, 0);
    });
  });

  group('ketahanan model', () {
    test('Summary.fromJson bertahan pada objek kosong', () {
      /*
       * Server versi lama atau lebih baru bisa mengirim bentuk yang berbeda.
       * Aplikasi yang sudah terpasang tidak bisa dipaksa memperbarui diri,
       * jadi model harus tetap menghasilkan objek yang bisa dipakai.
       */
      final summary = Summary.fromJson(const <String, dynamic>{});

      expect(summary.balance, 0);
      expect(summary.month, '');
      expect(summary.projection, isEmpty);
    });

    test('Transaction.fromJson bertahan pada tipe yang salah', () {
      final tx = Transaction.fromJson(const {
        'id': 123,
        'amount': '150000',
        'type': 'expense',
        'description': null,
        'voided': 'ya',
      });

      expect(tx.id, '');
      expect(tx.amount, 150000);
      expect(tx.description, '');
      expect(tx.voided, isFalse);
    });

    test('Bill.fromJson menerjemahkan status dan frekuensi', () {
      final bill = Bill.fromJson(const {
        'id': 'bill-1',
        'name': 'Listrik',
        'amount': 450000,
        'frequency': 'monthly',
        'nextDueDate': '2026-10-15',
        'state': 'overdue',
        'splitCount': 2,
      });

      expect(bill.stateLabel, 'Lewat jatuh tempo');
      expect(bill.frequencyLabel, 'bulanan');
      expect(bill.splitCount, 2);
    });

    test('CalendarData.amountOn mengembalikan nol untuk tanggal tanpa data', () {
      final calendar = CalendarData.fromJson(const {
        'month': '2026-10',
        'count': 2,
        'income': 0,
        'expense': 75000,
        'days': [
          {'date': '2026-10-05', 'amount': 50000},
          {'date': '2026-10-12', 'amount': 25000},
        ],
      });

      expect(calendar.amountOn('2026-10-05'), 50000);
      expect(calendar.amountOn('2026-10-06'), 0);
      expect(calendar.peak, 50000);
    });

    test('Reference.categoriesOf menyaring berdasarkan jenis', () {
      final reference = Reference.fromJson(const {
        'accounts': [],
        'categories': [
          {'id': 'c-1', 'name': 'Gaji', 'kind': 'income'},
          {'id': 'c-2', 'name': 'Belanja', 'kind': 'expense'},
          {'id': 'c-3', 'name': 'Makan', 'kind': 'expense'},
        ],
      });

      expect(reference.categoriesOf('income'), hasLength(1));
      expect(reference.categoriesOf('expense'), hasLength(2));
    });

    test('Profile menerjemahkan peran', () {
      final profile = Profile.fromJson(const {
        'id': 'p-irvan',
        'name': 'Irvan',
        'initial': 'I',
        'color': 'butter',
        'role': 'owner',
        'hasPin': true,
      });

      expect(profile.roleLabel, 'Pemilik');
      expect(profile.hasPin, isTrue);
    });
  });

  group('safeRatio', () {
    test('tidak membagi nol', () {
      expect(safeRatio(5, 0), 0);
      expect(safeRatio(5, -1), 0);
    });

    test('menghitung rasio biasa', () {
      expect(safeRatio(1, 4), 0.25);
    });
  });
}
