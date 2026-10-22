"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { cx } from "@/components/ui";
import {
  createSharedWorkspace,
  joinSharedWorkspace,
  leaveSharedWorkspace,
  switchWorkspaceAction,
} from "@/lib/data/actions";
import { MAX_SHARED_WORKSPACES } from "@/lib/data/types";

/**
 * Kelola ruang bersama.
 *
 * Ruang bersama memungkinkan dua profil (mis. suami dan istri) bekerja di satu
 * data, dengan setiap transaksi tetap tercatat siapa yang mencatatnya.
 *
 * ## Kenapa batas ditampilkan, bukan disembunyikan
 *
 * Tombol "Buat ruang" yang hilang tanpa penjelasan membuat pengguna mengira
 * aplikasinya rusak. Menampilkan "1 dari 2 terpakai" menjelaskan batasnya
 * sebelum pengguna mencoba dan gagal.
 */

export type SharedWorkspaceView = {
  id: string;
  name: string;
  ownerName: string;
  isOwner: boolean;
  memberCount: number;
  inviteCode?: string;
  isActive: boolean;
};

export function WorkspaceManager({
  workspaces,
  used,
  limit = MAX_SHARED_WORKSPACES,
  canCreate,
}: {
  workspaces: SharedWorkspaceView[];
  used: number;
  limit?: number;
  canCreate: boolean;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  function submitCreate() {
    const formData = new FormData();
    formData.set("name", name);

    startTransition(async () => {
      const result = await createSharedWorkspace(formData);
      if (result.ok) {
        toast.success(result.message ?? "Ruang dibuat");
        setName("");
        setMode("none");
      } else {
        toast.error(result.message ?? "Gagal membuat ruang");
      }
    });
  }

  function submitJoin() {
    const formData = new FormData();
    formData.set("code", code);

    startTransition(async () => {
      const result = await joinSharedWorkspace(formData);
      if (result.ok) {
        toast.success(result.message ?? "Bergabung");
        setCode("");
        setMode("none");
      } else {
        toast.error(result.message ?? "Gagal bergabung");
      }
    });
  }

  function leave(id: string, label: string) {
    const formData = new FormData();
    formData.set("workspaceId", id);

    startTransition(async () => {
      const result = await leaveSharedWorkspace(formData);
      if (result.ok) {
        toast.success(result.message ?? `Keluar dari ${label}`);
      } else {
        toast.error(result.message ?? "Gagal keluar");
      }
    });
  }

  function open(id: string) {
    const formData = new FormData();
    formData.set("workspaceId", id);
    startTransition(async () => {
      await switchWorkspaceAction(formData);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {used} dari {limit} ruang bersama terpakai
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !canCreate}
            onClick={() => setMode(mode === "create" ? "none" : "create")}
            className={cx(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
              canCreate
                ? "border-emphasis bg-emphasis text-on-emphasis hover:bg-emphasis-hover"
                : "cursor-not-allowed border-line-strong bg-card text-muted",
            )}
            title={canCreate ? undefined : `Maksimal ${limit} ruang bersama`}
          >
            <Icon name="plus" size={12} />
            Buat ruang
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setMode(mode === "join" ? "none" : "join")}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-card px-3 text-xs font-semibold text-ink transition-colors hover:bg-paper-deep"
          >
            <Icon name="users" size={12} />
            Gabung
          </button>
        </div>
      </div>

      {mode === "create" ? (
        <div className="animate-rise rounded-[10px] border border-line bg-paper-deep/40 p-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">
              Nama ruang
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              placeholder="Rumah Tangga"
              className="h-9 w-full rounded-[8px] border border-line-strong bg-card px-2.5 text-base focus:border-ink focus:outline-none"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitCreate();
                }
              }}
            />
          </label>
          <p className="mt-1.5 text-2xs text-muted">
            Kode undangan dibuat otomatis setelah ruang dibuat.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={pending || !name.trim()}
              onClick={submitCreate}
              className="h-8 rounded-full border border-emphasis bg-emphasis px-3 text-xs font-semibold text-on-emphasis hover:bg-emphasis-hover disabled:opacity-50"
            >
              {pending ? "Membuat…" : "Buat"}
            </button>
            <button
              type="button"
              onClick={() => setMode("none")}
              className="h-8 rounded-full border border-line-strong px-3 text-xs font-semibold text-ink hover:bg-paper-deep"
            >
              Batal
            </button>
          </div>
        </div>
      ) : null}

      {mode === "join" ? (
        <div className="animate-rise rounded-[10px] border border-line bg-paper-deep/40 p-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink-soft">
              Kode undangan
            </span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              maxLength={8}
              placeholder="ABC123"
              className="h-9 w-full rounded-[8px] border border-line-strong bg-card px-2.5 font-mono text-base tracking-widest focus:border-ink focus:outline-none"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitJoin();
                }
              }}
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={pending || !code.trim()}
              onClick={submitJoin}
              className="h-8 rounded-full border border-emphasis bg-emphasis px-3 text-xs font-semibold text-on-emphasis hover:bg-emphasis-hover disabled:opacity-50"
            >
              {pending ? "Bergabung…" : "Gabung"}
            </button>
            <button
              type="button"
              onClick={() => setMode("none")}
              className="h-8 rounded-full border border-line-strong px-3 text-xs font-semibold text-ink hover:bg-paper-deep"
            >
              Batal
            </button>
          </div>
        </div>
      ) : null}

      {workspaces.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-line-strong px-3 py-6 text-center text-xs text-muted">
          Belum ada ruang bersama. Buat satu, lalu bagikan kodenya ke anggota
          keluarga.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-[10px] border border-line">
          {workspaces.map((workspace) => (
            <li
              key={workspace.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 text-base font-semibold">
                  {workspace.name}
                  {workspace.isActive ? (
                    <span className="rounded-full bg-mint/50 px-1.5 py-0.5 text-2xs font-bold text-positive">
                      aktif
                    </span>
                  ) : null}
                  {workspace.isOwner ? (
                    <span className="rounded-full bg-butter/60 px-1.5 py-0.5 text-2xs font-bold text-warning">
                      pemilik
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {workspace.memberCount} anggota · pemilik {workspace.ownerName}
                  {workspace.inviteCode ? (
                    <>
                      {" · kode "}
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard?.writeText(workspace.inviteCode ?? "");
                          toast.success("Kode disalin", workspace.inviteCode);
                        }}
                        className="font-mono font-bold tracking-wider text-ink underline decoration-line-strong underline-offset-2 hover:text-tomato-text"
                        title="Klik untuk menyalin"
                      >
                        {workspace.inviteCode}
                      </button>
                    </>
                  ) : null}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {!workspace.isActive ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => open(workspace.id)}
                    className="rounded-full border border-line-strong px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:bg-paper-deep"
                  >
                    Buka
                  </button>
                ) : null}
                {!workspace.isOwner ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => leave(workspace.id, workspace.name)}
                    className="rounded-full border border-transparent px-2.5 py-1 text-xs font-semibold text-danger transition-colors hover:bg-tomato/10"
                  >
                    Keluar
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
