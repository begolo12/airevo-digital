import Link from "next/link";
import { PageHeader, Card, CardHeader } from "@/components/app/ui";
import { MemberManager } from "@/components/app/member-manager";
import { AppearanceSettings } from "@/components/app/appearance";
import { WorkspaceManager } from "@/components/app/workspace-manager";
import { Badge, Field, inputClass } from "@/components/ui";
import { ActionForm, ActionButton } from "@/components/ui/action-form";
import { logoutAction, resetDemoData, updateHousehold } from "@/lib/data/actions";
import { licenseRows } from "@/lib/data/orders";
import { listPaymentProviders } from "@/lib/payments";
import { getStore } from "@/lib/data/store";
import {
  canCreateSharedWorkspace,
  sharedWorkspacesOf,
  workspaceCompanions,
  workspaceInviteCode,
} from "@/lib/data/workspace";
import { MAX_SHARED_WORKSPACES } from "@/lib/data/types";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Pengaturan" };

export default async function PengaturanPage() {
  const session = await requireSession();
  const { household, members, accounts, transactions, messages, users } = getStore();
  const outbox = [...messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const licenses = licenseRows(session.email);
  const providers = listPaymentProviders();
  const activeProvider = providers.find((p) => p.configured);

  /*
   * Ruang bersama milik profil yang sedang aktif.
   *
   * `canCreateSharedWorkspace` dipakai apa adanya — aturan batas tinggal di
   * satu tempat (`workspace.ts`), bukan diduplikasi di sini.
   */
  const profileId = session.profileId ?? "";
  const sharedWorkspaces = profileId ? sharedWorkspacesOf(profileId) : [];
  const workspaceViews = sharedWorkspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    ownerName:
      getStore().profiles.find((profile) => profile.id === workspace.ownerProfileId)
        ?.name ?? "—",
    isOwner: workspace.ownerProfileId === profileId,
    memberCount: workspaceCompanions(workspace.id).length + 1,
    inviteCode: workspaceInviteCode(workspace),
    isActive: workspace.id === session.workspaceId,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Pengaturan"
        title="Pengaturan keluarga"
        description="Anggota keluarga, nama rumah tangga, lisensi, dan akun yang sedang masuk."
      />

      <Card>
        <CardHeader
          title="Lisensi aplikasi"
          hint="Sekali bayar, akses seumur hidup"
          action={
            session.role === "owner" ? (
              <Link
                href="/admin/pesanan"
                className="text-xs font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-tomato"
              >
                Kelola pesanan
              </Link>
            ) : null
          }
        />
        {licenses.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">
            Belum ada lisensi terdaftar untuk {session.email}.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {licenses.map((license) => (
              <li
                key={license.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{license.productName}</p>
                    <Badge tone={license.status === "active" ? "mint" : "neutral"}>
                      {license.status === "active" ? "aktif" : "dicabut"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 font-mono text-sm text-muted">
                    {license.key}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    Terbit {license.issuedLabel} · tanpa masa berlaku
                  </p>
                </div>
                <p className="text-sm text-muted">{license.email}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-line px-5 py-3 text-sm text-muted">
          Pembayaran aktif: <strong>{activeProvider?.label ?? "Transfer bank"}</strong>
          {providers.some((p) => !p.configured)
            ? ` · ${providers
                .filter((p) => !p.configured)
                .map((p) => p.label)
                .join(", ")} belum dikonfigurasi`
            : ""}
        </div>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profil keluarga" />
          <div className="px-5 py-5">
            <ActionForm action={updateHousehold} submitLabel="Simpan" className="grid gap-4">
              <Field label="Nama keluarga" hint="Tampil di sidebar dan laporan">
                <input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={household.name}
                  className={inputClass}
                />
              </Field>
              <Field label="Mata uang">
                <input value="IDR — Rupiah" readOnly className={`${inputClass} bg-paper-deep/50`} />
              </Field>
              <Field label="Zona waktu">
                <input value={household.timezone} readOnly className={`${inputClass} bg-paper-deep/50`} />
              </Field>
            </ActionForm>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Sesi" />
            <div className="px-5 py-5">
              <p className="text-sm text-ink-soft">
                Masuk sebagai <span className="font-semibold text-ink">{session.name}</span>{" "}
                <span className="text-muted">({session.email})</span>
              </p>
              <p className="mt-1 text-xs text-muted">
                Peran: <span className="font-semibold text-ink">{session.role}</span>
              </p>
              <form action={logoutAction} className="mt-4">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-full border border-tomato/40 bg-tomato/10 px-4 text-sm font-semibold text-tomato-ink hover:bg-tomato/20"
                >
                  Keluar
                </button>
              </form>
            </div>
          </Card>

          <Card>
            <CardHeader title="Akun terdaftar" hint="Tidak ada pendaftaran publik" />
            <ul className="divide-y divide-line">
              {users.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-muted">{user.email}</p>
                  </div>
                  <Badge tone={user.role === "owner" ? "butter" : "sky"}>{user.role}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Ruang bersama"
          hint="Satu data untuk dua profil atau lebih"
        />
        <div className="px-5 py-4">
          <WorkspaceManager
            workspaces={workspaceViews}
            used={workspaceViews.length}
            limit={MAX_SHARED_WORKSPACES}
            canCreate={profileId ? canCreateSharedWorkspace(profileId) : false}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Tampilan"
          hint="Berlaku di perangkat ini, langsung terlihat"
        />
        <div className="px-5 py-4">
          <AppearanceSettings />
        </div>
      </Card>

      <MemberManager />

      <Card>
        <CardHeader
          title="Pesan dari form kontak"
          hint={
            outbox.length > 0
              ? `${outbox.length} pesan · terkirim ${outbox.filter((m) => m.delivered).length}`
              : "Belum ada pesan"
          }
        />
        {outbox.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted">
            Pesan dari halaman{" "}
            <Link href="/contact" className="font-semibold text-ink underline underline-offset-2">
              kontak
            </Link>{" "}
            akan muncul di sini.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {outbox.slice(0, 10).map((msg) => (
              <li key={msg.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{msg.name}</p>
                  <Badge tone={msg.delivered ? "mint" : "butter"}>
                    {msg.delivered ? "terkirim" : "outbox lokal"}
                  </Badge>
                  <span className="text-xs text-muted">{msg.need}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{msg.email}</p>
                <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{msg.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Ringkasan data" />
        <ul className="divide-y divide-line text-sm">
          {[
            ["Anggota", `${members.length} orang`],
            ["Akun", `${accounts.length} akun`],
            ["Transaksi", `${transactions.length} catatan`],
            ["Penyimpanan", "Berkas lokal (.data/store.json)"],
            ["Email", process.env.RESEND_API_KEY ? "Resend aktif" : "Belum dikonfigurasi"],
          ].map(([label, value]) => (
            <li key={label} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="text-ink-soft">{label}</span>
              <span className="font-semibold">{value}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
          <p className="text-sm text-muted">
            Kembalikan seluruh data ke contoh awal.
          </p>
          <ActionButton
            action={resetDemoData}
            label="Reset data"
            variant="danger"
            confirmText="Kembalikan semua data ke contoh awal?"
            confirmDescription="Semua perubahan yang Anda buat akan hilang dan diganti data contoh."
            confirmLabel="Reset"
          />
        </div>
      </Card>
    </div>
  );
}
