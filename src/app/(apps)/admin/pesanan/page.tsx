import Link from "next/link";
import { PageHeader, Card, CardHeader, StatCard } from "@/components/app/ui";
import { Badge } from "@/components/ui";
import { ActionButton } from "@/components/ui/action-form";
import {
  cancelOrder,
  markOrderPaid,
  revokeLicense,
} from "@/lib/data/order-actions";
import {
  buyerCount,
  orderRow,
  orderRows,
  orderStatusLabel,
  salesSummary,
} from "@/lib/data/orders";
import { formatDate, formatIDR } from "@/lib/format";
import { getStore } from "@/lib/data/store";

export const metadata = { title: "Pesanan" };

const statusTone = {
  pending: "butter",
  paid: "mint",
  cancelled: "neutral",
  expired: "neutral",
} as const;

export default function AdminOrdersPage() {
  const orders = orderRows().map(orderRow);
  const summary = salesSummary();
  const licenses = getStore().licenses;
  const pending = orders.filter((order) => order.status === "pending");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Penjualan"
        title="Pesanan"
        description="Verifikasi transfer manual di sini. Menandai lunas otomatis menerbitkan lisensi untuk email pembeli."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pendapatan" value={formatIDR(summary.revenue)} tone="ink" hint={`${summary.paid} pesanan lunas`} size="sm" />
        <StatCard label="Menunggu bayar" value={String(summary.pending)} tone={summary.pending > 0 ? "butter" : "paper"} size="sm" />
        <StatCard label="Lisensi aktif" value={String(summary.licenses)} tone="mint" hint={`${buyerCount()} pembeli`} size="sm" />
        <StatCard label="Konversi" value={`${summary.conversion}%`} tone="paper" hint="lunas / total pesanan" size="sm" />
      </section>

      {pending.length > 0 ? (
        <Card>
          <CardHeader title="Perlu diverifikasi" hint={`${pending.length} pesanan menunggu pembayaran`} />
          <ul className="divide-y divide-line">
            {pending.map((order) => (
              <li key={order.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-bold">{order.code}</p>
                    <Badge tone="butter">{orderStatusLabel[order.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {order.buyerName} · {order.email}
                    {order.whatsapp ? ` · ${order.whatsapp}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {order.productName} · {formatIDR(order.amount)} · dibuat{" "}
                    {order.createdLabel} · batas {order.expiresLabel}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton
                    action={markOrderPaid}
                    fields={{ code: order.code }}
                    label="Tandai lunas"
                    variant="primary"
                    confirmText={`Tandai ${order.code} lunas dan terbitkan lisensi untuk ${order.email}?`}
                  />
                  <ActionButton
                    action={cancelOrder}
                    fields={{ code: order.code }}
                    label="Batalkan"
                    variant="danger"
                    confirmText={`Batalkan pesanan ${order.code}?`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Semua pesanan" hint={`${orders.length} total`} />
        {orders.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            Belum ada pesanan. Pesanan akan muncul setelah ada yang checkout di{" "}
            <Link href="/aplikasi" className="font-semibold text-ink underline underline-offset-2">
              halaman aplikasi
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/pesanan/${order.code}`}
                      className="font-mono text-sm font-bold underline decoration-line-strong underline-offset-4 hover:decoration-tomato"
                    >
                      {order.code}
                    </Link>
                    <Badge tone={statusTone[order.status]}>
                      {orderStatusLabel[order.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {order.buyerName} · {order.email} · {order.productName} ·{" "}
                    {formatIDR(order.amount)}
                  </p>
                </div>
                <div className="text-right text-sm text-muted">
                  <p>Dibuat {order.createdLabel}</p>
                  {order.paidAt ? (
                    <p className="text-positive">
                      Lunas {formatDate(order.paidAt.slice(0, 10))}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Lisensi" hint={`${licenses.length} diterbitkan`} />
        <ul className="divide-y divide-line">
          {licenses.length === 0 ? (
            <li className="px-5 py-6 text-center text-sm text-muted">
              Belum ada lisensi.
            </li>
          ) : (
            licenses.map((license) => (
              <li key={license.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-base font-bold">{license.key}</p>
                    <Badge tone={license.status === "active" ? "mint" : "neutral"}>
                      {license.status === "active" ? "aktif" : "dicabut"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {license.email} · {license.productId} · terbit{" "}
                    {formatDate(license.issuedAt.slice(0, 10))}
                  </p>
                </div>
                {license.status === "active" ? (
                  <ActionButton
                    action={revokeLicense}
                    fields={{ id: license.id }}
                    label="Cabut"
                    variant="danger"
                    confirmText={`Cabut lisensi ${license.key}? Akses ${license.email} akan hilang.`}
                  />
                ) : null}
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}
