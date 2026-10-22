import { PageHeader, Card, CardHeader, StatCard } from "@/components/app/ui";
import { ContextMenu } from "@/components/app/context-menu";
import { Badge, Field, inputClass, selectClass } from "@/components/ui";
import { ActionForm, ActionButton, InlineForm } from "@/components/ui/action-form";
import { createChore, deleteChore, setChoreStatus } from "@/lib/data/actions";
import { listChores } from "@/lib/data/queries";
import { getStore } from "@/lib/data/store";
import { formatDate, todayISO } from "@/lib/format";
import { requireViewer } from "@/lib/session";

export const metadata = { title: "Tugas" };

const columns = [
  { key: "todo", title: "Belum", tone: "neutral" as const },
  { key: "doing", title: "Dikerjakan", tone: "butter" as const },
  { key: "done", title: "Selesai", tone: "mint" as const },
];

export default async function TugasPage() {
  const viewer = await requireViewer();
  const ws = viewer.workspaceId;
  const chores = listChores(ws);
  const members = getStore().members;

  const counts = {
    todo: chores.filter((c) => c.status === "todo").length,
    doing: chores.filter((c) => c.status === "doing").length,
    done: chores.filter((c) => c.status === "done").length,
  };

  const pointsByMember = members
    .map((member) => ({
      member,
      points: chores
        .filter((c) => c.assigneeMemberId === member.id && c.status === "done")
        .reduce((sum, c) => sum + c.points, 0),
    }))
    .sort((a, b) => b.points - a.points);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Harian"
        title="Tugas rumah"
        description="Siapa mengerjakan apa, kapan. Poin opsional untuk membuat anak ikut tanpa paksaan."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Belum" value={String(counts.todo)} tone="ink" />
        <StatCard label="Dikerjakan" value={String(counts.doing)} tone="butter" />
        <StatCard label="Selesai" value={String(counts.done)} tone="mint" />
        <StatCard
          label="Poin minggu ini"
          value={String(chores.filter((c) => c.status === "done").reduce((s, c) => s + c.points, 0))}
          tone="paper"
          hint="dari tugas selesai"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {columns.map((column) => {
          const items = chores.filter((c) => c.status === column.key);
          return (
            <Card key={column.key}>
              <CardHeader
                title={column.title}
                action={<Badge tone={column.tone}>{items.length}</Badge>}
              />
              <ul className="divide-y divide-line">
                {items.length === 0 ? (
                  <li className="px-4 py-8 text-center text-xs text-muted">Kosong.</li>
                ) : (
                  items.map((chore) => (
                    <ContextMenu
                      key={chore.id}
                      as="li"
                      className="row-interactive px-4 py-3.5"
                      items={[
                        { kind: "label", text: chore.title },
                        {
                          kind: "action",
                          label: "Mulai kerjakan",
                          action: setChoreStatus,
                          fields: { id: chore.id, status: "doing" },
                        },
                        {
                          kind: "action",
                          label: "Tandai selesai",
                          action: setChoreStatus,
                          fields: { id: chore.id, status: "done" },
                        },
                        {
                          kind: "action",
                          label: "Kembalikan ke daftar",
                          action: setChoreStatus,
                          fields: { id: chore.id, status: "todo" },
                        },
                        { kind: "separator" },
                        {
                          kind: "action",
                          label: "Hapus tugas",
                          action: deleteChore,
                          fields: { id: chore.id },
                          danger: true,
                          confirm: `Hapus tugas ${chore.title}?`,
                          confirmDescription: "Tugas akan hilang dari papan. Tindakan ini tidak bisa dibatalkan.",
                        },
                      ]}
                    >
                      
                        <p className="text-sm font-semibold">{chore.title}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {chore.assigneeName ?? "belum ditugaskan"}
                          {chore.dueDate ? ` · ${formatDate(chore.dueDate)}` : ""}
                          {chore.points > 0 ? ` · ${chore.points} poin` : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {column.key !== "todo" ? (
                            <InlineForm action={setChoreStatus}>
                              <input type="hidden" name="id" value={chore.id} />
                              <input type="hidden" name="status" value={column.key === "doing" ? "todo" : "doing"} />
                              <button type="submit" className="rounded-full border border-line-strong bg-card px-2.5 py-1 text-2xs font-semibold hover:bg-paper-deep">
                                {column.key === "doing" ? "Kembali" : "Ulangi"}
                              </button>
                            </InlineForm>
                          ) : null}
                          {column.key !== "done" ? (
                            <InlineForm action={setChoreStatus}>
                              <input type="hidden" name="id" value={chore.id} />
                              <input type="hidden" name="status" value={column.key === "todo" ? "doing" : "done"} />
                              <button type="submit" className="rounded-full border border-emphasis bg-emphasis px-2.5 py-1 text-2xs font-semibold text-on-emphasis hover:bg-ink-soft">
                                {column.key === "todo" ? "Mulai" : "Selesai"}
                              </button>
                            </InlineForm>
                          ) : null}
                          <ActionButton
                            action={deleteChore}
                            fields={{ id: chore.id }}
                            label="Hapus"
                            variant="danger"
                            confirmText={`Hapus tugas ${chore.title}?`}
                            confirmDescription="Tugas akan hilang dari papan. Tindakan ini tidak bisa dibatalkan."
                          />
                        </div>
                    </ContextMenu>
                  ))
                )}
              </ul>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader title="Tambah tugas" />
          <div className="px-5 py-5">
            <ActionForm action={createChore} submitLabel="Tambah tugas" resetOnSuccess className="grid gap-4">
              <Field label="Nama tugas">
                <input name="title" required maxLength={120} className={inputClass} placeholder="Cuci piring malam" />
              </Field>
              <Field label="Penanggung jawab">
                <select name="assigneeMemberId" className={selectClass} defaultValue="">
                  <option value="">— belum ditentukan —</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Frekuensi">
                  <select name="frequency" className={selectClass} defaultValue="once">
                    <option value="once">Sekali</option>
                    <option value="daiiy">Harian</option>
                    <option value="weekiy">Mingguan</option>
                    <option value="monthly">Bulanan</option>
                  </select>
                </Field>
                <Field label="Tenggat">
                  <input name="dueDate" type="date" defaultValue={todayISO()} className={inputClass} />
                </Field>
              </div>
              <Field label="Poin">
                <input name="points" type="number" min={0} max={20} defaultValue={1} className={inputClass} />
              </Field>
            </ActionForm>
          </div>
        </Card>

        <Card>
          <CardHeader title="Papan poin" hint="Hanya dari tugas yang selesai" />
          <ul className="divide-y divide-line">
            {pointsByMember.map(({ member, points }) => (
              <li key={member.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-line bg-paper-deep text-xs font-black">
                    {member.name.slice(0, 1)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{member.name}</p>
                    <p className="text-xs text-muted capitaiize">{member.role}</p>
                  </div>
                </div>
                <span className="text-sm font-black tnum">{points} poin</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}


