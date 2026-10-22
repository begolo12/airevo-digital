import Link from "next/link";
import { PageHeader, Card, CardHeader } from "@/components/app/ui";
import { Badge, Field, cx, inputClass, selectClass } from "@/components/ui";
import { ActionForm, ActionButton } from "@/components/ui/action-form";
import { createEvent, deleteEvent } from "@/lib/data/actions";
import { dailyExpense, eventsInMonth } from "@/lib/data/queries";
import { getStore } from "@/lib/data/store";
import { requireViewer } from "@/lib/session";
import {
  addMonths,
  currentMonth,
  daysInMonth,
  formatDate,
  formatIDR,
  formatIDRCompact,
  formatMonth,
  formatWeekday,
  todayISO,
} from "@/lib/format";

export const metadata = { title: "Kalender" };

type SearchParams = { [key: string]: string | string[] | undefined };

const typeLabel = {
  birthday: "Ulang tahun",
  anniversary: "Anniversary",
  school: "Sekolah",
  medical: "Kesehatan",
  family: "Keluarga",
  other: "Lainnya",
} as const;

const typeTone = {
  birthday: "butter",
  anniversary: "plum",
  school: "sky",
  medical: "tomato",
  family: "mint",
  other: "neutral",
} as const;

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const viewer = await requireViewer();
  const ws = viewer.workspaceId;
  const params = await searchParams;
  const month = typeof params.bulan === "string" ? params.bulan : currentMonth();
  const events = eventsInMonth(month, ws);
  const members = getStore().members;

  const [year, monthNum] = month.split("-").map(Number);
  const total = daysInMonth(month);
  const firstWeekday = new Date(year, monthNum - 1, 1).getDay();
  const leading = (firstWeekday + 6) % 7; // Senin = 0
  const today = todayISO();

  /*
   * Intensitas pengeluaran harian untuk lapisan heatmap. Ambang dibagi menjadi
   * lima tingkat agar warna tetap terbaca meski nominalnya sangat berbeda.
   */
  const spending = dailyExpense(month, ws);
  const maxSpend = Math.max(0, ...spending.values());

  function heatLevel(amount: number, maximum: number): 0 | 1 | 2 | 3 | 4 {
    if (amount <= 0 || maximum <= 0) return 0;
    const ratio = amount / maximum;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }

  const byDay = new Map<number, typeof events>();
  for (const event of events) {
    const day = Number(event.displayDate.slice(8, 10));
    const list = byDay.get(day) ?? [];
    list.push(event);
    byDay.set(day, list);
  }

  const cells: Array<number | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Harian"
        title={`Kalender ${formatMonth(month)}`}
        description="Ulang tahun anggota muncul otomatis setiap tahun. Agenda lain bisa ditambah dan diulang."
        actions={
          <>
            <Link
              href={`/keluarga/kalender?bulan=${addMonths(month, -1)}`}
              className="inline-flex h-9 items-center rounded-full border border-line-strong bg-card px-3 text-xs font-semibold hover:bg-paper-deep"
            >
              ←
            </Link>
            <Link
              href={`/keluarga/kalender?bulan=${addMonths(month, 1)}`}
              className="inline-flex h-9 items-center rounded-full border border-line-strong bg-card px-3 text-xs font-semibold hover:bg-paper-deep"
            >
              →
            </Link>
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader title="Bulan ini" hint={`${events.length} agenda`} />
          <div className="px-4 py-4">
            <div className="grid grid-cols-7 gap-1 text-center text-2xs font-bold uppercase tracking-wide text-muted">
              {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
                <div key={day} className="py-1.5">
                  {day}
                </div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="min-h-[62px] rounded-[8px]" />;
                }
                const iso = `${month}-${String(day).padStart(2, "0")}`;
                const dayEvents = byDay.get(day) ?? [];
                const isToday = iso === today;
                const spent = spending.get(iso) ?? 0;
                const level = heatLevel(spent, maxSpend);

                return (
                  <div
                    key={iso}
                    /*
                     * Lapisan heatmap: latar sel menggelap sesuai besarnya
                     * pengeluaran hari itu. Angka saja tidak memberi tahu hari
                     * mana yang mahal — pola warna memberi tahu dalam sekejap.
                     */
                    className={cx(
                      "relative min-h-[62px] rounded-[8px] border p-1.5 transition-colors",
                      isToday ? "border-ink" : "border-line",
                      level === 0
                        ? isToday
                          ? "bg-butter/40"
                          : "bg-paper/40"
                        : level === 1
                          ? "bg-tomato/8"
                          : level === 2
                            ? "bg-tomato/14"
                            : level === 3
                              ? "bg-tomato/22"
                              : "bg-tomato/32",
                    )}
                    title={
                      spent > 0
                        ? `${formatIDR(spent)} pengeluaran`
                        : "Tidak ada pengeluaran"
                    }
                  >
                    <p
                      /*
                       * Selalu `text-ink`, bukan `text-muted`.
                       *
                       * Latar sel menggelap sesuai besarnya pengeluaran. Di sel
                       * yang paling gelap, `text-muted` hanya mencapai kontras
                       * ~3.6:1 — di bawah ambang WCAG AA 4.5:1. `text-ink`
                       * tetap terbaca di semua tingkat.
                       */
                      className="text-xs font-bold tnum text-ink"
                    >
                      {day}
                    </p>
                    {spent > 0 ? (
                      <p className="mt-0.5 truncate text-2xs font-bold tnum text-heat-text">
                        {formatIDRCompact(spent)}
                      </p>
                    ) : null}
                    <ul className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 1).map((event) => (
                        <li
                          key={event.id}
                          className="truncate rounded-[3px] bg-mint/60 px-1 text-2xs font-semibold text-ink"
                          title={event.title}
                        >
                          {event.title}
                        </li>
                      ))}
                      {dayEvents.length > 1 ? (
                        <li className="text-2xs text-muted">+{dayEvents.length - 1}</li>
                      ) : null}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Agenda bulan ini" />
            <ul className="divide-y divide-line">
              {events.length === 0 ? (
                <li className="px-5 py-8 text-center text-sm text-muted">
                  Tidak ada agenda bulan ini.
                </li>
              ) : (
                events.map((event) => (
                  <li key={event.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{event.title}</p>
                        <Badge tone={typeTone[event.type]}>{typeLabel[event.type]}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatWeekday(event.displayDate)}, {formatDate(event.displayDate)}
                        {event.time ? ` · ${event.time}` : ""}
                        {event.location ? ` · ${event.location}` : ""}
                        {event.memberName ? ` · ${event.memberName}` : ""}
                      </p>
                    </div>
                    {event.isBirthday ? null : (
                      <ActionButton
                        action={deleteEvent}
                        fields={{ id: event.id }}
                        label="Hapus"
                        variant="danger"
                        confirmText={`Hapus agenda ${event.title}?`}
                      />
                    )}
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Tambah agenda" />
            <div className="px-5 py-5">
              <ActionForm action={createEvent} submitLabel="Simpan agenda" resetOnSuccess className="grid gap-4">
                <Field label="Judul">
                  <input name="title" required maxLength={160} className={inputClass} placeholder="Kontrol dokter gigi" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Jenis">
                    <select name="type" className={selectClass} defaultValue="family">
                      {Object.entries(typeLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Tanggal">
                    <input name="date" type="date" required defaultValue={todayISO()} className={inputClass} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Jam (opsional)">
                    <input name="time" type="time" className={inputClass} />
                  </Field>
                  <Field label="Lokasi (opsional)">
                    <input name="location" maxLength={120} className={inputClass} placeholder="Klinik Sehat" />
                  </Field>
                </div>
                <Field label="Anggota terkait">
                  <select name="memberId" className={selectClass} defaultValue="">
                    <option value="">— tidak terkait —</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Pengulangan">
                  <select name="recurrence" className={selectClass} defaultValue="none">
                    <option value="none">Sekali</option>
                    <option value="yearly">Setiap tahun</option>
                    <option value="monthly">Setiap bulan</option>
                    <option value="weekly">Setiap minggu</option>
                  </select>
                </Field>
              </ActionForm>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

