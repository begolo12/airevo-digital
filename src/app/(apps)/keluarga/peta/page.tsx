import Link from "next/link";
import { PageHeader, Card, CardHeader } from "@/components/app/ui";
import { Badge } from "@/components/ui";
import { Icon, type IconName } from "@/components/ui/icon";
import { appNav, ownerItems, navGroupsFor } from "@/config/app-nav";
import { requireOwner } from "@/lib/session";

export const metadata = { title: "Peta aplikasi" };

/**
 * Halaman bantuan: peta seluruh fitur + pintasan keyboard.
 *
 * Tujuan: pengguna baru tidak perlu menebak halaman mana yang harus dibuka.
 * Bisa diakses cepat lewat ⌘K → "Peta aplikasi" atau tautan dari pengaturan.
 */
export default async function PetaPage() {
  const session = await requireOwner();
  const groups = navGroupsFor(session.role);

  const shortcuts = [
    { keys: ["⌘", "K"], label: "Buka pencarian cepat" },
    { keys: ["Ctrl", "K"], label: "Sama, untuk Windows" },
    { keys: ["Esc"], label: "Tutup dialog atau menu" },
    { keys: ["↑", "↓"], label: "Pindah pilihan di pencarian" },
    { keys: ["Enter"], label: "Buka pilihan / setujui dialog" },
    { keys: ["Klik kanan"], label: "Menu konteks pada baris data" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Bantuan"
        title="Peta aplikasi"
        description="Semua yang bisa dilakukan di sini, beserta pintasan keyboard-nya."
      />

      <Card>
        <CardHeader title="Pintasan" hint="Bekerja di seluruh aplikasi" />
        <ul className="divide-y divide-line">
          {shortcuts.map((item) => (
            <li
              key={item.label}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              <span className="text-sm text-ink-soft">{item.label}</span>
              <span className="flex items-center gap-1">
                {item.keys.map((key) => (
                  <kbd
                    key={key}
                    className="rounded-[6px] border border-line-strong bg-paper-deep px-2 py-0.5 text-xs font-bold text-ink-soft"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader title={group.title} hint={`${group.items.length} halaman`} />
            <ul className="divide-y divide-line">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="row-interactive flex items-center gap-3 px-5 py-3"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-line-strong bg-paper-deep text-ink-soft">
                      <Icon name={item.icon as IconName} size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{item.label}</span>
                      {item.keywords && item.keywords.length > 0 ? (
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {item.keywords.slice(0, 4).join(" · ")}
                        </span>
                      ) : null}
                    </span>
                    <Icon name="chevron-right" size={13} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <div className="rounded-[14px] border border-line bg-paper-deep/50 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="butter">Tips</Badge>
          <p className="text-sm text-ink-soft">
            Tekan{" "}
            <kbd className="rounded border border-line-strong bg-card px-1.5 py-0.5 text-xs font-bold">
              ⌘K
            </kbd>{" "}
            lalu ketik nama halaman, atau kata sehari-hari seperti “listrik”, “spp”,
            atau “dokter”.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted">
        Total {appNav.length} grup navigasi
        {session.role === "owner"
          ? `, termasuk ${ownerItems.length} menu penjualan`
          : ""}
        .
      </p>
    </div>
  );
}
