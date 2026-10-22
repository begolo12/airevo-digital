import { PageHeader, Card, CardHeader } from "@/components/app/ui";
import { Badge, Field, inputClass, selectClass } from "@/components/ui";
import { ActionForm, ActionButton } from "@/components/ui/action-form";
import { createCategory, archiveCategory } from "@/lib/data/actions";
import { listCategories } from "@/lib/data/queries";
import { colorOptions, swatch } from "@/lib/colors";
import { requireViewer } from "@/lib/session";

export const metadata = { title: "Kategori" };

export default async function KategoriPage() {
  const viewer = await requireViewer();
  const ws = viewer.workspaceId;
  const income = listCategories(ws, "income");
  const expense = listCategories(ws, "expense");

  const groups = [
    { title: "Pemasukan", items: income, kind: "income" as const, tone: "mint" as const },
    { title: "Pengeluaran", items: expense, kind: "expense" as const, tone: "butter" as const },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Uang"
        title="Kategori"
        description="Kategori dipakai untuk anggaran dan laporan. Kategori yang diarsipkan tidak hilang dari transaksi lama."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader title="Tambah kategori" />
          <div className="px-5 py-5">
            <ActionForm action={createCategory} submitLabel="Tambah kategori" resetOnSuccess className="grid gap-4">
              <Field label="Nama kategori">
                <input name="name" required maxLength={80} className={inputClass} placeholder="Belanja Dapur" />
              </Field>
              <Field label="Jenis">
                <select name="kind" className={selectClass} defaultValue="expense">
                  <option value="expense">Pengeluaran</option>
                  <option value="income">Pemasukan</option>
                </select>
              </Field>
              <Field label="Warna">
                <select name="color" className={selectClass} defaultValue="butter">
                  {colorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </ActionForm>
          </div>
        </Card>

        <div className="space-y-5">
          {groups.map((group) => (
            <Card key={group.kind}>
              <CardHeader title={group.title} hint={`${group.items.length} kategori`} />
              <ul className="divide-y divide-line">
                {group.items.length === 0 ? (
                  <li className="px-5 py-6 text-center text-sm text-muted">
                    Belum ada kategori.
                  </li>
                ) : (
                  group.items.map((category) => (
                    <li key={category.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className={`h-6 w-6 rounded-[7px] border border-line ${swatch(category.color)}`}
                        />
                        <span className="text-sm font-semibold">{category.name}</span>
                      </div>
                      <ActionButton
                        action={archiveCategory}
                        fields={{ id: category.id }}
                        label="Arsip"
                        variant="danger"
                        confirmText={`Arsipkan kategori ${category.name}?`}
                      />
                    </li>
                  ))
                )}
              </ul>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone="neutral">Nama kategori unik per jenis</Badge>
        <Badge tone="neutral">Arsip menjaga riwayat</Badge>
      </div>
    </div>
  );
}

