import { PageHeader, Card, CardHeader, StatCard } from "@/components/app/ui";
import { RecurringManager } from "@/components/app/recurring-manager";
import { ActionButton } from "@/components/ui/action-form";
import { runDueRecurring } from "@/lib/data/actions";
import { listAccounts, listCategories } from "@/lib/data/queries";
import { getStore } from "@/lib/data/store";
import { dueOccurrences } from "@/lib/data/recurring";
import { formatIDR, todayISO } from "@/lib/format";
import { requireViewer } from "@/lib/session";

export const metadata = { title: "Transaksi berulang" };

/**
 * Halaman pengelola aturan transaksi berulang.
 *
 * Menjelaskan beda antara "aturan" dan "transaksi": aturan adalah cetakan,
 * transaksi baru dibuat saat tanggalnya tiba. Ini hal yang paling mudah
 * disalahpahami pengguna — mereka mengira transaksi langsung muncul.
 */
export default async function BerulangPage() {
  const viewer = await requireViewer();
  const ws = viewer.workspaceId;

  const store = getStore();
  const rules = store.recurringRules.filter((rule) => rule.workspaceId === ws);
  const today = todayISO();

  const due = dueOccurrences(
    rules.filter((rule) => rule.active),
    today,
  );

  const active = rules.filter((rule) => rule.active);
  const monthlyIncome = active
    .filter((rule) => rule.type === "income" && rule.frequency === "monthly")
    .reduce((sum, rule) => sum + rule.amount, 0);
  const monthlyExpense = active
    .filter((rule) => rule.type === "expense" && rule.frequency === "monthly")
    .reduce((sum, rule) => sum + rule.amount, 0);

  const accounts = listAccounts(ws).map((account) => ({
    id: account.id,
    name: account.name,
  }));
  const categories = listCategories(ws).map((category) => ({
    id: category.id,
    name: category.name,
    kind: category.kind,
  }));

  const views = rules.map((rule) => ({
    id: rule.id,
    type: rule.type,
    amount: rule.amount,
    description: rule.description,
    accountName:
      accounts.find((account) => account.id === rule.accountId)?.name ?? "—",
    categoryName: categories.find((category) => category.id === rule.categoryId)?.name,
    frequency: rule.frequency,
    nextAt: rule.nextAt,
    endAt: rule.endAt,
    active: rule.active,
    overdue: rule.active && rule.nextAt <= today,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Uang"
        title="Transaksi berulang"
        description="Gaji, langganan, dan cicilan yang datang setiap periode. Aturan tidak langsung membuat transaksi — transaksi dibuat saat tanggalnya tiba."
        actions={
          due.length > 0 ? (
            <ActionButton
              action={runDueRecurring}
              label={`Catat ${due.length} yang jatuh tempo`}
              variant="primary"
            />
          ) : undefined
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Aturan aktif"
          value={String(active.length)}
          tone="ink"
          hint={`dari ${rules.length} aturan`}
        />
        <StatCard
          label="Jatuh tempo"
          value={String(due.length)}
          tone={due.length > 0 ? "butter" : "mint"}
          hint={due.length > 0 ? "menunggu dicatat" : "tidak ada"}
        />
        <StatCard
          label="Pemasukan rutin"
          value={formatIDR(monthlyIncome)}
          tone="mint"
          hint="per bulan"
        />
        <StatCard
          label="Pengeluaran rutin"
          value={formatIDR(monthlyExpense)}
          tone="butter"
          hint="per bulan"
        />
      </section>

      <Card>
        <CardHeader
          title="Aturan berulang"
          hint="Cetakan transaksi — bukan transaksi itu sendiri"
        />
        <div className="px-5 py-4">
          <RecurringManager
            rules={views}
            accounts={accounts}
            categories={categories}
            today={today}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Cara kerjanya" />
        <div className="space-y-2 px-5 py-4 text-xs text-ink-soft">
          <p>
            <strong className="text-ink">Aturan tidak mengubah saldo.</strong> Ia
            hanya menyimpan cetakan: jumlah, akun, kategori, dan jadwal. Saldo
            tetap mencerminkan uang yang benar-benar sudah keluar.
          </p>
          <p>
            <strong className="text-ink">Transaksi dibuat saat tanggalnya tiba.</strong>{" "}
            Ketika tiba, dashboard menampilkan tawaran untuk mencatatnya. Anda
            tetap yang memutuskan — nominal yang muncul tiba-tiba di saldo lebih
            membingungkan daripada satu klik tambahan.
          </p>
          <p>
            <strong className="text-ink">Tidak akan dobel.</strong> Setelah
            dicatat, jadwal maju satu periode. Membuka dashboard berkali-kali
            tidak membuat transaksi berulang.
          </p>
        </div>
      </Card>
    </div>
  );
}
