import { PageHeader, Card, CardHeader, StatCard } from "@/components/app/ui";
import { Badge, EmptyState, Field, inputClass, selectClass } from "@/components/ui";
import { ActionForm, ActionButton } from "@/components/ui/action-form";
import { createHealthRecord, deleteHealthRecord } from "@/lib/data/actions";
import { healthRows } from "@/lib/data/queries";
import { getStore } from "@/lib/data/store";
import { requireViewer } from "@/lib/session";
import { formatDate, todayISO } from "@/lib/format";

export const metadata = { title: "Kesehatan" };

const typeLabel: Record<string, string> = {
  allergy: "Alergi",
  condition: "Kondisi",
  medication: "Obat",
  immunization: "Imunisasi",
  checkup: "Pemeriksaan",
  other: "Lainnya",
};

const typeTone: Record<string, "tomato" | "butter" | "mint" | "sky" | "plum" | "neutral"> = {
  allergy: "tomato",
  condition: "plum",
  medication: "sky",
  immunization: "mint",
  checkup: "butter",
  other: "neutral",
};

export default async function KesehatanPage() {
  const viewer = await requireViewer();
  const rows = healthRows(viewer);
  const members = getStore().members;

  const upcoming = rows
    .filter((r) => r.nextIn !== null && r.nextIn >= 0)
    .sort((a, b) => (a.nextIn ?? 9999) - (b.nextIn ?? 9999));
  const privateCount = rows.filter((r) => r.visibility === "private").length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catatan"
        title="Kesehatan keluarga"
        description="Alergi, kondisi, obat, imunisasi, dan jadwal kontrol. Catatan pribadi hanya terlihat oleh pemiliknya."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total catatan" value={String(rows.length)} tone="ink" />
        <StatCard label="Jadwal mendatang" value={String(upcoming.length)} tone="butter" />
        <StatCard
          label="Kontrol terdekat"
          value={
            upcoming[0]?.nextAt ? formatDate(upcoming[0].nextAt) : "—"
          }
          tone="mint"
          hint={upcoming[0]?.memberName}
        />
        <StatCard label="Catatan pribadi" value={String(privateCount)} tone="paper" hint="tidak terlihat anggota lain" />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader title="Catatan" hint="Terbaru di atas" />
          {rows.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyState
                title="Belum ada catatan"
                description="Mulai dari alergi dan imunisasi anak, lalu jadwal kontrol rutin."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((record) => (
                <li key={record.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{record.title}</p>
                      <Badge tone={typeTone[record.type]}>{typeLabel[record.type]}</Badge>
                      {record.visibility === "private" ? <Badge tone="plum">pribadi</Badge> : null}
                      {record.nextIn !== null && record.nextIn >= 0 && record.nextIn <= 30 ? (
                        <Badge tone="butter">
                          {record.nextIn === 0 ? "hari ini" : `${record.nextIn} hari lagi`}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {record.memberName} · dicatat {formatDate(record.recordedAt)}
                      {record.nextAt ? ` · berikutnya ${formatDate(record.nextAt)}` : ""}
                    </p>
                    {record.notes ? (
                      <p className="mt-1 text-xs text-muted">{record.notes}</p>
                    ) : null}
                  </div>
                  <ActionButton
                    action={deleteHealthRecord}
                    fields={{ id: record.id }}
                    label="Hapus"
                    variant="danger"
                    confirmText={`Hapus catatan ${record.title}?`}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Tambah catatan" />
          <div className="px-5 py-5">
            <ActionForm action={createHealthRecord} submitLabel="Simpan catatan" resetOnSuccess className="grid gap-4">
              <Field label="Anggota">
                <select name="memberId" className={selectClass} required defaultValue={members[0]?.id}>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Jenis">
                <select name="type" className={selectClass} defaultValue="checkup">
                  {Object.entries(typeLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Judul">
                <input name="title" required maxLength={160} className={inputClass} placeholder="Kontrol dokter gigi" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tanggal dicatat">
                  <input name="recordedAt" type="date" required defaultValue={todayISO()} className={inputClass} />
                </Field>
                <Field label="Jadwal berikutnya">
                  <input name="nextAt" type="date" className={inputClass} />
                </Field>
              </div>
              <Field label="Visibilitas">
                <select name="visibility" className={selectClass} defaultValue="private">
                  <option value="private">Pribadi</option>
                  <option value="household">Dewasa saja</option>
                </select>
              </Field>
              <Field label="Catatan">
                <input name="notes" maxLength={500} className={inputClass} placeholder="Kolesterol sedikit tinggi" />
              </Field>
            </ActionForm>
          </div>
        </Card>
      </div>
    </div>
  );
}
