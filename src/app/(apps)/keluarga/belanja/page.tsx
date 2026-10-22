import { PageHeader, Card, CardHeader, StatCard, ProgressBar } from "@/components/app/ui";
import { ContextMenu } from "@/components/app/context-menu";
import { Field, inputClass, selectClass } from "@/components/ui";
import { ActionForm, ActionButton, InlineForm } from "@/components/ui/action-form";
import {
  addShoppingItem,
  clearCheckedShopping,
  toggleShoppingItem,
} from "@/lib/data/actions";
import { shoppingTotals } from "@/lib/data/queries";
import { getStore } from "@/lib/data/store";
import { requireViewer } from "@/lib/session";
import { formatIDR } from "@/lib/format";

export const metadata = { title: "Belanja" };

export default async function BelanjaPage() {
  const viewer = await requireViewer();
  const ws = viewer.workspaceId;
  const items = getStore().shopping;
  const totals = shoppingTotals(ws);
  const ratio = totals.total > 0 ? Math.round((totals.checked / totals.total) * 100) : 0;

  const unchecked = items.filter((item) => !item.checked);
  const checked = items.filter((item) => item.checked);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Harian"
        title="Daftar belanja"
        description="Daftar yang bisa dicentang di pasar. Estimasi dan aktual dipisah supaya kelihatan selesainya."
        actions={
          checked.length > 0 ? (
            <ActionButton
              action={clearCheckedShopping}
              label="Bersihkan yang sudah dibeli"
              variant="soft"
              confirmText="Hapus semua barang yang sudah dicentang?"
            />
          ) : null
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total item" value={String(totals.total)} tone="ink" hint={`${totals.checked} sudah dibeli`} />
        <StatCard label="Estimasi" value={formatIDR(totals.estimated)} tone="butter" />
        <StatCard label="Aktual" value={formatIDR(totals.actual)} tone="mint" hint={`selesai ${formatIDR(totals.actual - totals.estimated)}`} />
        <StatCard label="Progres" value={`${ratio}%`} hint="barang tercentang" tone="paper" />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader title="Daftar" hint="Centang saat masuk keranjang" />
          <div className="px-5 pt-4">
            <ProgressBar ratio={ratio} tone="mint" label="Progres belanja" />
          </div>
          <ul className="mt-3 divide-y divide-line">
            {unchecked.length === 0 && checked.length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-muted">
                Daftar masih kosong.
              </li>
            ) : null}

            {unchecked.map((item) => (
              <ContextMenu
                key={item.id}
                as="li"
                className="row-interactive flex items-center justify-between gap-3 px-5 py-3"
                items={[
                  { kind: "label", text: item.name },
                  {
                    kind: "copy",
                    label: "Salin nama barang",
                    value: item.name,
                    message: "Nama barang disalin",
                  },
                  {
                    kind: "copy",
                    label: "Salin perkiraan harga",
                    value: formatIDR(item.estimatedPrice * item.qty),
                    message: "Harga disalin",
                  },
                  { kind: "separator" },
                  {
                    kind: "action",
                    label: "Tandai sudah dibeli",
                    action: toggleShoppingItem,
                    fields: { id: item.id },
                  },
                ]}
              >
                
                  <div className="flex items-center gap-3">
                    <InlineForm action={toggleShoppingItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        aria-label={`Tandai ${item.name} sudah dibeli`}
                        className="grid h-5 w-5 place-items-center rounded-[5px] border border-line-strong bg-card hover:border-ink"
                      />
                    </InlineForm>
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-muted">
                        {item.qty} {item.unit} · est. {formatIDR(item.estimatedPrice)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm tnum text-muted">
                    {formatIDR(item.estimatedPrice * item.qty)}
                  </span>
                </ContextMenu>
            ))}

            {checked.map((item) => (
              <ContextMenu
                key={item.id}
                as="li"
                className="row-interactive flex items-center justify-between gap-3 px-5 py-3"
                items={[
                  { kind: "label", text: item.name },
                  {
                    kind: "copy",
                    label: "Salin nama barang",
                    value: item.name,
                    message: "Nama barang disalin",
                  },
                  { kind: "separator" },
                  {
                    kind: "action",
                    label: "Batalkan tanda beli",
                    action: toggleShoppingItem,
                    fields: { id: item.id },
                  },
                ]}
              >
                
                  <div className="flex items-center gap-3">
                    <InlineForm action={toggleShoppingItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        aria-label={`Batalkan tanda ${item.name}`}
                        className="grid h-5 w-5 place-items-center rounded-[5px] border border-mint-deep bg-mint text-2xs font-black text-ink"
                      >
                        ✓
                      </button>
                    </InlineForm>
                    <div>
                      <p className="text-sm font-semibold line-through decoration-line-strong">{item.name}</p>
                      <p className="text-xs text-muted">
                        {item.qty} {item.unit} · aktual {formatIDR(item.actualPrice ?? item.estimatedPrice)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm tnum text-muted">
                    {formatIDR((item.actualPrice ?? item.estimatedPrice) * item.qty)}
                  </span>
                </ContextMenu>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Tambah barang" />
          <div className="px-5 py-5">
            <ActionForm action={addShoppingItem} submitLabel="Tambah ke daftar" resetOnSuccess className="grid gap-4">
              <Field label="Nama barang">
                <input name="name" required maxLength={120} className={inputClass} placeholder="Beras 5 kg" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Jumlah">
                  <input name="qty" type="number" min={1} defaultValue={1} className={inputClass} />
                </Field>
                <Field label="Satuan">
                  <select name="unit" className={selectClass} defaultValue="pch">
                    <option value="pch">pch</option>
                    <option value="kg">kg</option>
                    <option value="liter">liter</option>
                    <option value="karung">karung</option>
                    <option value="paket">paket</option>
                    <option value="ikat">ikat</option>
                  </select>
                </Field>
              </div>
              <Field label="Estimasi harga satuan (Rp)">
                <input name="estimatedPrice" type="number" min={0} step={500} defaultValue={0} className={inputClass} />
              </Field>
            </ActionForm>
          </div>
        </Card>
      </div>
    </div>
  );
}

