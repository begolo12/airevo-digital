import { PageHeader, Card, CardHeader, StatCard, ProgressBar } from "@/components/app/ui";
import { Badge, Field, inputClass, selectClass } from "@/components/ui";
import { ActionForm, ActionButton, InlineForm } from "@/components/ui/action-form";
import { createAsset, createInsurance, deleteAsset, deleteInsurance, updateAssetValue } from "@/lib/data/actions";
import { assetRows, assetTotals, insuranceRows, netWorth } from "@/lib/data/queries";
import { getStore } from "@/lib/data/store";
import { requireViewer } from "@/lib/session";
import { formatDate, formatIDR, todayISO } from "@/lib/format";

export const metadata = { title: "Aset" };

const typeOptions = [
  { value: "property", label: "Properti" },
  { value: "vehicle", label: "Kendaraan" },
  { value: "gold", label: "Emas" },
  { value: "investment", label: "Investasi" },
  { value: "cash", label: "Kas" },
  { value: "other", label: "Lainnya" },
];

const insuranceTypeLabel: Record<string, string> = {
  health: "Kesehatan",
  life: "Jiwa",
  vehicle: "Kendaraan",
  property: "Properti",
  other: "Lainnya",
};

const periodLabel: Record<string, string> = {
  monthly: "bulan",
  quarterly: "3 bulan",
  yearly: "tahun",
};

export default async function AsetPage() {
  const viewer = await requireViewer();
  const ws = viewer.workspaceId;
  const rows = assetRows(ws);
  const totals = assetTotals(ws);
  const worth = netWorth(ws);
  const insurances = insuranceRows(ws);
  const maxValue = Math.max(...rows.map((r) => r.currentValue), 1);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Uang"
        title="Aset & asuransi"
        description="Nilai aset menambah kekayaan bersih. Asuransi bukan aset, tetapi perlu dipantau agar tidak lewat jatuh tempo."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Nilai aset" value={formatIDR(totals.total)} tone="ink" hint={`${totals.count} aset`} />
        <StatCard label="Harga perolehan" value={formatIDR(totals.cost)} tone="paper" />
        <StatCard
          label="Selisih nilai"
          value={formatIDR(totals.gain)}
          tone={totals.gain >= 0 ? "mint" : "tomato"}
          hint={totals.gain >= 0 ? "naik" : "turun"}
        />
        <StatCard label="Kekayaan bersih" value={formatIDR(worth.total)} tone="butter" hint="aset + kas − utang" />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Daftar aset" hint="Diurutkan dari nilai terbesar" />
            <ul className="divide-y divide-line">
              {rows.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-muted">
                  Belum ada aset tercatat.
                </li>
              ) : (
                rows.map((asset) => (
                  <li key={asset.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{asset.name}</p>
                          <Badge tone="neutral">{asset.typeLabel}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {asset.acquisitionValue
                            ? `Beli ${formatIDR(asset.acquisitionValue)}`
                            : "Harga perolehan belum diisi"}
                          {asset.acquiredAt ? ` · ${formatDate(asset.acquiredAt)}` : ""}
                          {asset.notes ? ` · ${asset.notes}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm tnum font-semibold">
                          {formatIDR(asset.currentValue)}
                        </p>
                        <p
                          className={`text-xs tnum font-semibold ${
                            asset.gain >= 0 ? "text-positive" : "text-danger"
                          }`}
                        >
                          {asset.gain >= 0 ? "▲" : "▼"} {formatIDR(Math.abs(asset.gain))} (
                          {Math.abs(asset.gainRatio)}%)
                        </p>
                      </div>
                    </div>

                    <div className="mt-2">
                      <ProgressBar
                        ratio={Math.round((asset.currentValue / maxValue) * 100)}
                        tone="sky"
                        label={`Porsi ${asset.name}`}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-end gap-2">
                      <InlineForm action={updateAssetValue} className="flex items-end gap-2">
                        <input type="hidden" name="id" value={asset.id} />
                        <label className="flex flex-col gap-1">
                          <span className="text-2xs font-semibold uppercase tracking-wide text-muted">
                            Nilai kini
                          </span>
                          <input
                            name="currentValue"
                            type="number"
                            min={0}
                            step={100000}
                            defaultValue={asset.currentValue}
                            className="h-8 w-36 rounded-[8px] border border-line-strong bg-card px-2 text-xs"
                          />
                        </label>
                        <button
                          type="submit"
                          className="h-8 rounded-full border border-line-strong bg-card px-3 text-xs font-semibold hover:bg-paper-deep"
                        >
                          Perbarui
                        </button>
                      </InlineForm>
                      <ActionButton
                        action={deleteAsset}
                        fields={{ id: asset.id }}
                        label="Hapus"
                        variant="danger"
                        confirmText={`Hapus aset ${asset.name}?`}
                      />
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Asuransi" hint="Premi dan tanggal jatuh tempo" />
            <ul className="divide-y divide-line">
              {insurances.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-muted">
                  Belum ada polis tercatat.
                </li>
              ) : (
                insurances.map((policy) => (
                  <li key={policy.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{policy.provider}</p>
                        <Badge tone="sky">{insuranceTypeLabel[policy.type]}</Badge>
                        {policy.daysLeft !== null && policy.daysLeft <= 30 ? (
                          <Badge tone="butter">
                            {policy.daysLeft < 0
                              ? "lewat"
                              : policy.daysLeft === 0
                                ? "hari ini"
                                : `${policy.daysLeft} hari`}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {formatIDR(policy.premium)}/{periodLabel[policy.period]}
                        {policy.memberName ? ` · ${policy.memberName}` : ""}
                        {policy.coverage ? ` · ${policy.coverage}` : ""}
                        {policy.nextDueDate ? ` · jatuh tempo ${formatDate(policy.nextDueDate)}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <ActionButton
                        action={deleteInsurance}
                        fields={{ id: policy.id }}
                        label="Hapus"
                        variant="danger"
                        confirmText={`Hapus polis ${policy.provider}?`}
                      />
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
        <Card>
          <CardHeader title="Tambah aset" hint="Nilai kini menentukan kekayaan bersih" />
          <div className="px-5 py-5">
            <ActionForm action={createAsset} submitLabel="Tambah aset" resetOnSuccess className="grid gap-4">
              <Field label="Nama aset">
                <input name="name" required maxLength={120} className={inputClass} placeholder="Rumah KPR" />
              </Field>
              <Field label="Jenis">
                <select name="type" className={selectClass} defaultValue="property">
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Harga perolehan (Rp)">
                <input name="acquisitionValue" type="number" min={0} step={100000} className={inputClass} placeholder="650000000" />
              </Field>
              <Field label="Nilai sekarang (Rp)">
                <input name="currentValue" type="number" min={0} step={100000} required className={inputClass} placeholder="780000000" />
              </Field>
              <Field label="Tanggal perolehan">
                <input name="acquiredAt" type="date" defaultValue={todayISO()} className={inputClass} />
              </Field>
              <Field label="Catatan">
                <input name="notes" maxLength={500} className={inputClass} />
              </Field>
            </ActionForm>
          </div>
        </Card>

        <Card>
          <CardHeader title="Tambah asuransi" hint="Premi dan masa berlaku" />
          <div className="px-5 py-5">
            <ActionForm action={createInsurance} submitLabel="Tambah polis" resetOnSuccess className="grid gap-4">
              <Field label="Jenis">
                <select name="type" className={selectClass} defaultValue="health">
                  <option value="health">Kesehatan</option>
                  <option value="life">Jiwa</option>
                  <option value="vehicle">Kendaraan</option>
                  <option value="property">Properti</option>
                  <option value="other">Lainnya</option>
                </select>
              </Field>
              <Field label="Penyedia">
                <input name="provider" required maxLength={120} className={inputClass} placeholder="Prudential" />
              </Field>
              <Field label="Untuk anggota">
                <select name="memberId" className={selectClass} defaultValue="">
                  <option value="">— seluruh keluarga —</option>
                  {getStore().members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Premi (Rp)">
                  <input name="premium" type="number" min={0} step={50000} required className={inputClass} placeholder="1450000" />
                </Field>
                <Field label="Periode">
                  <select name="period" className={selectClass} defaultValue="quarterly">
                    <option value="monthly">Bulanan</option>
                    <option value="quarterly">3 bulan</option>
                    <option value="yearly">Tahunan</option>
                  </select>
                </Field>
              </div>
              <Field label="Jatuh tempo berikutnya">
                <input name="nextDueDate" type="date" defaultValue={todayISO()} className={inputClass} />
              </Field>
              <Field label="Nomor polis">
                <input name="policyNumber" maxLength={80} className={inputClass} placeholder="PRU-889231" />
              </Field>
              <Field label="Manfaat">
                <input name="coverage" maxLength={300} className={inputClass} placeholder="Rawat inap Rp500 juta/tahun" />
              </Field>
            </ActionForm>
          </div>
        </Card>
        </div>
      </div>
    </div>
  );
}
