import { PageHeader, Card, CardHeader, StatCard } from "@/components/app/ui";
import { Badge, EmptyState, Field, inputClass, selectClass } from "@/components/ui";
import { ActionForm, ActionButton } from "@/components/ui/action-form";
import { createDocument, deleteDocument } from "@/lib/data/actions";
import { documentRows } from "@/lib/data/queries";
import { getStore } from "@/lib/data/store";
import { requireViewer } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { DocumentUploader } from "@/components/app/document-uploader";

export const metadata = { title: "Dokumen" };

const categoryLabel: Record<string, string> = {
  identity: "Identitas",
  education: "Pendidikan",
  insurance: "Asuransi",
  property: "Properti",
  health: "Kesehatan",
  other: "Lainnya",
};

const visibilityLabel: Record<string, string> = {
  household: "Dewasa",
  shared: "Semua",
  private: "Pribadi",
};

export default async function DokumenPage() {
  const viewer = await requireViewer();
  const rows = documentRows(viewer);
  const members = getStore().members;

  const expired = rows.filter((r) => r.expired).length;
  const soon = rows.filter((r) => r.expiresSoon).length;
  const privateCount = rows.filter((r) => r.visibility === "private").length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catatan"
        title="Dokumen keluarga"
        description="Daftar dokumen penting beserta nomor, penerbit, dan masa berlaku. Berkas fisik tetap di tempat aman."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total dokumen" value={String(rows.length)} tone="ink" />
        <StatCard label="Kedaluwarsa" value={String(expired)} tone={expired > 0 ? "tomato" : "mint"} hint={expired > 0 ? "perlu diperbarui" : "tidak ada"} />
        <StatCard label="Segera habis" value={String(soon)} tone="butter" hint="≤ 60 hari" />
        <StatCard label="Bertanda pribadi" value={String(privateCount)} tone="paper" hint="hanya pemilik" />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader title="Daftar dokumen" hint="Yang kedaluwarsa muncul lebih dulu" />
          {rows.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyState
                title="Belum ada dokumen"
                description="Mulai dari yang paling sering dibutuhkan: kartu keluarga, akta, polis."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{doc.title}</p>
                      <Badge tone="neutral">{categoryLabel[doc.category]}</Badge>
                      {doc.visibility === "private" ? (
                        <Badge tone="plum">{visibilityLabel[doc.visibility]}</Badge>
                      ) : null}
                      {doc.expired ? (
                        <Badge tone="tomato">kedaluwarsa</Badge>
                      ) : doc.expiresSoon ? (
                        <Badge tone="butter">{doc.daysToExpiry} hari lagi</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {doc.documentNumber ? `No. ${doc.documentNumber}` : "Tanpa nomor"}
                      {doc.issuer ? ` · ${doc.issuer}` : ""}
                      {doc.memberName ? ` · ${doc.memberName}` : ""}
                      {doc.issuedAt ? ` · terbit ${formatDate(doc.issuedAt)}` : ""}
                      {doc.expiresAt ? ` · berlaku s/d ${formatDate(doc.expiresAt)}` : ""}
                    </p>
                    {doc.notes ? (
                      <p className="mt-1 text-xs text-muted">{doc.notes}</p>
                    ) : null}

                    {/* Lampiran berkas: unggah langsung ke Object Storage. */}
                    <div className="mt-2">
                      <DocumentUploader
                        documentId={doc.id}
                        fileName={doc.fileName}
                        fileSize={doc.fileSize}
                        hasFile={Boolean(doc.fileKey)}
                      />
                    </div>
                  </div>
                  <ActionButton
                    action={deleteDocument}
                    fields={{ id: doc.id }}
                    label="Hapus"
                    variant="danger"
                    confirmText={`Hapus catatan ${doc.title}?`}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Tambah dokumen" hint="Catatan metadata, bukan unggah berkas" />
          <div className="px-5 py-5">
            <ActionForm action={createDocument} submitLabel="Simpan dokumen" resetOnSuccess className="grid gap-4">
              <Field label="Judul">
                <input name="title" required maxLength={160} className={inputClass} placeholder="Kartu Keluarga" />
              </Field>
              <Field label="Kategori">
                <select name="category" className={selectClass} defaultValue="identity">
                  {Object.entries(categoryLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Untuk anggota">
                <select name="memberId" className={selectClass} defaultValue="">
                  <option value="">— seluruh keluarga —</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nomor dokumen">
                  <input name="documentNumber" maxLength={80} className={inputClass} />
                </Field>
                <Field label="Penerbit">
                  <input name="issuer" maxLength={120} className={inputClass} placeholder="Dukcapil" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tanggal terbit">
                  <input name="issuedAt" type="date" className={inputClass} />
                </Field>
                <Field label="Berlaku sampai">
                  <input name="expiresAt" type="date" className={inputClass} />
                </Field>
              </div>
              <Field label="Nama berkas (opsional)" hint="Catatan lokasi berkas fisik/digital">
                <input name="fileName" maxLength={160} className={inputClass} placeholder="kk-2019.pdf di Drive" />
              </Field>
              <Field label="Visibilitas">
                <select name="visibility" className={selectClass} defaultValue="household">
                  <option value="household">Dewasa saja</option>
                  <option value="shared">Semua anggota</option>
                  <option value="private">Pribadi (hanya saya)</option>
                </select>
              </Field>
              <Field label="Catatan">
                <input name="notes" maxLength={500} className={inputClass} />
              </Field>
            </ActionForm>
          </div>
        </Card>
      </div>

      <p className="text-xs text-muted">
        Unggah berkas (Vercel Blob, privat) masuk tahap berikutnya. Saat ini yang disimpan
        adalah metadata dan lokasi berkas.
      </p>
    </div>
  );
}
