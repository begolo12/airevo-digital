import { Card, CardHeader } from "@/components/app/ui";
import { Badge, Field, inputClass, selectClass, cx } from "@/components/ui";
import { ActionForm, ActionButton } from "@/components/ui/action-form";
import {
  createMember,
  deleteMember,
  toggleMemberActive,
  updateMember,
} from "@/lib/data/actions";
import { getStore } from "@/lib/data/store";
import { colorOptions, swatch } from "@/lib/colors";
import { formatDate } from "@/lib/format";
import { Icon } from "@/components/ui/icon";

const roleLabel: Record<string, string> = {
  owner: "Pemilik",
  adult: "Dewasa",
  teen: "Remaja",
  child: "Anak",
  viewer: "Pengamat",
};

const roleTone: Record<string, "butter" | "sky" | "mint" | "neutral"> = {
  owner: "butter",
  adult: "sky",
  teen: "mint",
  child: "neutral",
  viewer: "neutral",
};

const relationshipLabel: Record<string, string> = {
  self: "Saya",
  spouse: "Pasangan",
  child: "Anak",
  parent: "Orang tua",
  sibling: "Saudara",
  other: "Lainnya",
};

/**
 * Kelola anggota keluarga.
 *
 * Memakai `<details>` supaya form edit tidak butuh JavaScript tambahan dan
 * tetap bisa dipakai tanpa hidrasi. Anggota yang punya riwayat tidak dihapus,
 * hanya dinonaktifkan — jejak "siapa melakukan apa" tetap utuh.
 */
export function MemberManager() {
  const { members } = getStore();
  const active = members.filter((member) => member.active);
  const inactive = members.filter((member) => !member.active);

  return (
    <Card>
      <CardHeader
        title="Anggota keluarga"
        hint={`${active.length} aktif${inactive.length > 0 ? ` · ${inactive.length} nonaktif` : ""}`}
      />

      <ul className="divide-y divide-line">
        {members.map((member) => (
          <li key={member.id} className="px-5 py-4">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={cx(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-sm font-black",
                  swatch(member.color),
                  !member.active && "opacity-45",
                )}
              >
                {member.name.slice(0, 1)}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p
                    className={cx(
                      "text-sm font-bold",
                      !member.active && "text-muted line-through",
                    )}
                  >
                    {member.name}
                  </p>
                  <Badge tone={roleTone[member.role] ?? "neutral"}>
                    {roleLabel[member.role]}
                  </Badge>
                  {/* Hindari label kembar, mis. peran "Anak" + hubungan "Anak". */}
                  {relationshipLabel[member.relationship] !== roleLabel[member.role] ? (
                    <Badge tone="neutral">
                      {relationshipLabel[member.relationship]}
                    </Badge>
                  ) : null}
                  {!member.active ? <Badge tone="neutral">nonaktif</Badge> : null}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {member.birthDate
                    ? `Lahir ${formatDate(member.birthDate)}`
                    : "Tanggal lahir belum diisi"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <ActionButton
                  action={toggleMemberActive}
                  fields={{ id: member.id }}
                  label={member.active ? "Nonaktifkan" : "Aktifkan"}
                  variant="soft"
                  className="!h-8 !px-3 !text-sm"
                />
                <ActionButton
                  action={deleteMember}
                  fields={{ id: member.id }}
                  label="Hapus"
                  variant="danger"
                  className="!h-8 !px-3 !text-sm"
                  confirmText={`Hapus ${member.name}?`}
                  confirmDescription="Hanya bisa dihapus bila belum punya catatan. Bila sudah, gunakan Nonaktifkan agar riwayat tetap utuh."
                  confirmLabel="Hapus"
                />
              </div>
            </div>

            <details className="group mt-2">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-ink">
                <Icon
                  name="chevron-right"
                  size={11}
                  strokeWidth={2.2}
                  className="transition-transform group-open:rotate-90"
                />
                Ubah data
              </summary>

              <div className="mt-3 rounded-[10px] border border-line bg-paper-deep/40 px-3 py-3">
                <ActionForm
                  action={updateMember}
                  submitLabel="Simpan perubahan"
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <input type="hidden" name="id" value={member.id} />
                  <Field label="Nama">
                    <input
                      name="name"
                      required
                      maxLength={100}
                      defaultValue={member.name}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Hubungan">
                    <select
                      name="relationship"
                      className={selectClass}
                      defaultValue={member.relationship}
                    >
                      {Object.entries(relationshipLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Peran">
                    <select
                      name="role"
                      className={selectClass}
                      defaultValue={member.role}
                    >
                      {Object.entries(roleLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Tanggal lahir">
                    <input
                      name="birthDate"
                      type="date"
                      defaultValue={member.birthDate}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Warna avatar">
                    <select
                      name="color"
                      className={selectClass}
                      defaultValue={member.color}
                    >
                      {colorOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </ActionForm>
              </div>
            </details>
          </li>
        ))}
      </ul>

      <div className="border-t border-line px-5 py-4">
        <p className="mb-3 text-base font-bold">Tambah anggota</p>
        <ActionForm
          action={createMember}
          submitLabel="Tambah anggota"
          resetOnSuccess
          className="grid gap-3 sm:grid-cols-2"
        >
          <Field label="Nama">
            <input
              name="name"
              required
              maxLength={100}
              className={inputClass}
              placeholder="Nama anggota"
              data-testid="member-add-name"
            />
          </Field>
          <Field label="Hubungan">
            <select name="relationship" className={selectClass} defaultValue="child">
              {Object.entries(relationshipLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Peran">
            <select name="role" className={selectClass} defaultValue="child">
              {Object.entries(roleLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tanggal lahir">
            <input name="birthDate" type="date" className={inputClass} />
          </Field>
          <Field label="Warna avatar">
            <select name="color" className={selectClass} defaultValue="mint">
              {colorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </ActionForm>
      </div>

      {/*
        Matriks peran diletakkan di sini karena pengguna membutuhkannya tepat
        saat memilih peran — bukan di halaman terpisah.
      */}
      <details className="group border-t border-line">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-5 py-3 text-base font-semibold text-ink-soft transition-colors hover:text-ink">
          <Icon
            name="chevron-right"
            size={11}
            strokeWidth={2.2}
            className="text-muted transition-transform group-open:rotate-90"
          />
          Apa yang bisa dilakukan tiap peran?
        </summary>

        <div className="overflow-x-auto px-5 pb-4">
          <table className="w-full text-sm">
            <caption className="sr-only">Matriks akses per peran</caption>
            <thead>
              <tr className="border-b border-line text-left text-2xs uppercase tracking-wide text-muted">
                <th scope="col" className="py-2 pr-3 font-semibold">Bagian</th>
                <th scope="col" className="px-2 py-2 text-center font-semibold">Dewasa</th>
                <th scope="col" className="px-2 py-2 text-center font-semibold">Remaja</th>
                <th scope="col" className="px-2 py-2 text-center font-semibold">Anak</th>
                <th scope="col" className="py-2 pl-2 text-center font-semibold">Pengamat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {[
                ["Transaksi", "penuh", "pribadi", "—", "lihat"],
                ["Anggaran", "penuh", "—", "—", "lihat"],
                ["Tagihan", "penuh", "—", "—", "lihat"],
                ["Tujuan", "penuh", "dibagikan", "dibagikan", "dibagikan"],
                ["Kalender & tugas", "penuh", "penuh", "penuh", "lihat"],
              ].map((row) => (
                <tr key={row[0]}>
                  <th scope="row" className="py-2 pr-3 text-left font-semibold">
                    {row[0]}
                  </th>
                  {row.slice(1).map((cell, index) => (
                    <td key={index} className="px-2 py-2 text-center text-muted">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}