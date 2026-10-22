import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Aksi sisa yang belum tercakup berkas lain: pindah profil/ruang, keluar,
 * ubah rumah tangga, form kontak, dan reset data.
 *
 * Fokus di sini adalah **aturan akses**, bukan sekadar "fungsi bisa dipanggil":
 * pindah ruang harus menolak ruang yang bukan milik profil, dan reset data
 * hanya boleh dilakukan pemilik akun.
 */

const state = {
  userId: "u-irvan",
  profileId: "p-irvan",
  workspaceId: "ws-family",
  role: "owner" as const,
  stage: "active" as const,
};

const redirects: string[] = [];
const sessions: Array<Record<string, unknown>> = [];

vi.mock("@/lib/session", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/session")>("@/lib/session");

  const viewer = () =>
    state.workspaceId
      ? {
          userId: state.userId,
          profileId: state.profileId,
          workspaceId: state.workspaceId,
          role: state.role,
        }
      : null;

  return {
    ...actual,
    getViewer: async () => viewer(),
    /*
     * Setia pada perilaku asli: `requireViewer` melempar redirect saat tidak
     * ada sesi. Mock yang mengembalikan `null` membuat test otorisasi lulus
     * palsu — aksi tetap berjalan meski tanpa sesi.
     */
    requireViewer: async () => {
      const current = viewer();
      if (!current) throw new Error("NEXT_REDIRECT:/pilih-profil");
      return current;
    },
    getSession: async () =>
      state.userId
        ? {
            userId: state.userId,
            email: "irvan@airevo-digital.my.id",
            name: "Irvan",
            role: state.role,
            stage: state.stage,
            profileId: state.profileId,
            workspaceId: state.workspaceId,
          }
        : null,
    getAccountSession: async () => viewer(),
    requireActiveSession: async () => {
      if (!state.userId) throw new Error("NEXT_REDIRECT:/login");
      return {
        userId: state.userId,
        email: "irvan@airevo-digital.my.id",
        name: "Irvan",
        role: state.role,
        stage: state.stage,
        profileId: state.profileId,
        workspaceId: state.workspaceId,
      };
    },
    requireSession: async () => viewer(),
    requireAccountSession: async () => viewer(),
    createSession: async (payload: Record<string, unknown>) => {
      sessions.push(payload);
    },
    destroySession: async () => {
      sessions.push({ destroyed: true });
    },
  };
});

vi.mock("next/navigation", async () => {
  const actual =
    await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return {
    ...actual,
    redirect: (path: string) => {
      redirects.push(path);
      throw new Error(`NEXT_REDIRECT:${path}`);
    },
  };
});

const { getStore, resetStore, WS } = await import("@/lib/data/store");
const {
  switchProfileAction,
  switchWorkspaceAction,
  logoutAction,
  updateHousehold,
  resetDemoData,
  submitContact,
  attachDocumentFile,
  detachDocumentFile,
  deleteDocument,
} = await import("@/lib/data/actions");
const { resetAllRateLimits } = await import("@/lib/auth/rate-limit");

function form(fields: Record<string, string | number>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, String(value));
  return data;
}

/** Menjalankan aksi yang berakhir dengan redirect. */
async function catchRedirect(run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
  }
}

/** Menjalankan aksi yang mungkin redirect; mengembalikan hasilnya. */
async function runAction(
  routine: () => Promise<{ ok: boolean; message?: string }>,
): Promise<{ ok: boolean; message?: string; redirected?: boolean }> {
  try {
    return await routine();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT")) {
      return { ok: false, redirected: true };
    }
    throw error;
  }
}

beforeEach(() => {
  resetStore();
  resetAllRateLimits();
  redirects.length = 0;
  sessions.length = 0;
  Object.assign(state, {
    userId: "u-irvan",
    profileId: "p-irvan",
    workspaceId: WS.family,
    role: "owner",
    stage: "active",
  });
});

describe("switchProfileAction", () => {
  it("menurunkan sesi ke tahap pilih profil", async () => {
    await catchRedirect(() => switchProfileAction());

    const last = sessions.at(-1) as { stage?: string } | undefined;
    expect(last?.stage).toBe("profile");
    expect(redirects.at(-1)).toBe("/pilih-profil");
  });

  it("mengarahkan ke login bila tidak ada sesi", async () => {
    Object.assign(state, { userId: "", workspaceId: "" });

    await catchRedirect(() => switchProfileAction());

    expect(redirects.at(-1)).toBe("/login");
  });
});

describe("switchWorkspaceAction", () => {
  it("menerima ruang yang memang milik profil", async () => {
    await catchRedirect(() =>
      switchWorkspaceAction(form({ workspaceId: WS.family })),
    );

    const last = sessions.at(-1) as { workspaceId?: string; stage?: string } | undefined;
    expect(last?.workspaceId).toBe(WS.family);
    expect(last?.stage).toBe("active");
    expect(redirects.at(-1)).toBe("/keluarga");
  });

  it("menolak ruang pribadi profil lain", async () => {
    // Ruang pribadi Sari tidak boleh bisa dibuka oleh Irvan.
    await catchRedirect(() =>
      switchWorkspaceAction(form({ workspaceId: WS.sari })),
    );

    const last = sessions.at(-1) as { workspaceId?: string } | undefined;
    // Sesi tidak diganti ke ruang terlarang.
    expect(last?.workspaceId).not.toBe(WS.sari);
    expect(redirects.at(-1)).toBe("/keluarga");
  });

  it("menolak workspace yang tidak ada", async () => {
    await catchRedirect(() =>
      switchWorkspaceAction(form({ workspaceId: "ws-tidak-ada" })),
    );

    const last = sessions.at(-1) as { workspaceId?: string } | undefined;
    expect(last?.workspaceId).not.toBe("ws-tidak-ada");
  });
});

describe("logoutAction", () => {
  it("menghapus sesi dan kembali ke beranda publik", async () => {
    await catchRedirect(() => logoutAction());

    expect(sessions.some((entry) => entry.destroyed === true)).toBe(true);
    expect(redirects.at(-1)).toBe("/");
  });
});

describe("updateHousehold", () => {
  it("menolak pengguna yang belum masuk", async () => {
    state.userId = "";
    state.workspaceId = "";

    const before = getStore().household.name;

    const result = await runAction(() =>
      updateHousehold(form({ name: "Nama Dari Penyerang" })),
    );

    expect(result.ok).toBe(false);
    expect(getStore().household.name).toBe(before);

    Object.assign(state, {
      userId: "u-irvan",
      profileId: "p-irvan",
      workspaceId: WS.family,
      role: "owner",
      stage: "active",
    });
  });

  it("mengubah nama rumah tangga", async () => {
    const result = await updateHousehold(form({ name: "Keluarga Baru" }));

    expect(result.ok).toBe(true);
    expect(getStore().household.name).toBe("Keluarga Baru");
  });

  it("menolak nama kosong", async () => {
    const sebelum = getStore().household.name;
    const result = await updateHousehold(form({ name: "   " }));

    expect(result.ok).toBe(false);
    expect(getStore().household.name).toBe(sebelum);
  });
});

describe("resetDemoData", () => {
  it("menolak pengguna yang belum masuk", async () => {
    /*
     * Reset menghapus SELURUH data. Tanpa pemeriksaan sesi, satu permintaan
     * tanpa login cukup untuk menghabiskan data semua pengguna.
     */
    state.userId = "";
    state.workspaceId = "";

    getStore().household.name = "Harus Tetap";

    const result = await runAction(() => resetDemoData());

    expect(result.ok).toBe(false);
    expect(getStore().household.name).toBe("Harus Tetap");

    Object.assign(state, {
      userId: "u-irvan",
      profileId: "p-irvan",
      workspaceId: WS.family,
      role: "owner",
      stage: "active",
    });
  });

  it("menolak pengguna yang bukan pemilik akun", async () => {
    state.role = "adult" as never;

    getStore().household.name = "Harus Tetap Juga";

    const result = await runAction(() => resetDemoData());

    expect(result.ok).toBe(false);
    expect(getStore().household.name).toBe("Harus Tetap Juga");

    state.role = "owner" as never;
  });

  it("mengembalikan data ke contoh awal", async () => {
    getStore().household.name = "Sudah Diubah";
    getStore().transactions.push({
      id: "t-sementara",
      workspaceId: WS.family,
      type: "expense",
      amount: 1_000,
      occurredAt: "2031-01-01",
      description: "Sementara",
      accountId: "acc-1",
      visibility: "household",
    });

    const result = await resetDemoData();

    expect(result.ok).toBe(true);
    expect(getStore().household.name).not.toBe("Sudah Diubah");
    expect(getStore().transactions.some((tx) => tx.id === "t-sementara")).toBe(false);
  });
});

describe("submitContact", () => {
  it("menyimpan pesan yang valid", async () => {
    const sebelum = getStore().messages.length;

    const result = await submitContact(
      form({
        name: "Uji Pengirim",
        email: "uji@contoh.id",
        need: "Aplikasi keluarga",
        message: "Saya ingin bertanya soal aplikasi keluarga.",
      }),
    );

    expect(result.ok).toBe(true);
    expect(getStore().messages.length).toBe(sebelum + 1);
  });

  it("menolak pesan yang terlalu pendek", async () => {
    const sebelum = getStore().messages.length;
    const result = await submitContact(
      form({
        name: "Uji",
        email: "uji@contoh.id",
        need: "Aplikasi keluarga",
        message: "pendek",
      }),
    );

    expect(result.ok).toBe(false);
    expect(getStore().messages.length).toBe(sebelum);
  });

  it("menolak email yang tidak valid", async () => {
    const result = await submitContact(
      form({
        name: "Uji",
        email: "bukan-email",
        need: "Aplikasi keluarga",
        message: "Pesan yang cukup panjang untuk lolos validasi.",
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("membatasi jumlah pesan per jendela waktu", async () => {
    const payload = {
      name: "Spam",
      email: "spam@contoh.id",
      need: "Aplikasi keluarga",
      message: "Pesan berulang untuk menguji pembatas laju.",
    };

    // Batas kontak adalah 5 per jam.
    for (let index = 0; index < 5; index += 1) {
      await submitContact(form(payload));
    }

    const blocked = await submitContact(form(payload));
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toMatch(/terlalu banyak/i);
  });
});

describe("berkas dokumen", () => {
  /** Dokumen milik ruang keluarga pada data contoh. */
  function familyDocument() {
    const store = getStore();
    const document = store.documents.find(
      (item) => item.workspaceId === WS.family,
    );
    if (!document) throw new Error("Data contoh tidak punya dokumen di ws-family");
    return document;
  }

  it("menolak kunci berkas milik ruang lain", async () => {
    const document = familyDocument();

    /*
     * Tanpa pemeriksaan ini, permintaan yang dibuat tangan bisa menautkan
     * dokumen ke berkas ruang lain lalu mengunduhnya lewat endpoint.
     */
    const result = await attachDocumentFile(
      form({
        id: document.id,
        key: "ws-sari/rahasia.pdf",
        fileName: "rahasia.pdf",
        fileSize: 1000,
      }),
    );

    expect(result.ok).toBe(false);
    expect(document.fileKey).toBeUndefined();
  });

  it("menolak kunci yang mencoba keluar dari ruang", async () => {
    const document = familyDocument();

    const result = await attachDocumentFile(
      form({
        id: document.id,
        key: `${WS.family}/../ws-sari/rahasia.pdf`,
        fileName: "rahasia.pdf",
        fileSize: 1000,
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("menerima kunci yang memang milik ruang ini", async () => {
    const document = familyDocument();

    const result = await attachDocumentFile(
      form({
        id: document.id,
        key: `${WS.family}/${document.id}.pdf`,
        fileName: "kartu-keluarga.pdf",
        fileSize: 2048,
      }),
    );

    expect(result.ok).toBe(true);
    expect(document.fileKey).toBe(`${WS.family}/${document.id}.pdf`);
    expect(document.fileSize).toBe(2048);
  });

  it("menolak berkas melebihi 10 MB", async () => {
    const document = familyDocument();

    const result = await attachDocumentFile(
      form({
        id: document.id,
        key: `${WS.family}/${document.id}.pdf`,
        fileName: "besar.pdf",
        fileSize: 11 * 1024 * 1024,
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/10 MB/i);
  });

  it("menolak dokumen milik ruang lain", async () => {
    const store = getStore();
    const other = store.documents.find((item) => item.workspaceId !== WS.family);
    if (!other) return; // data contoh tidak punya dokumen ruang lain

    const result = await attachDocumentFile(
      form({
        id: other.id,
        key: `${WS.family}/${other.id}.pdf`,
        fileName: "x.pdf",
        fileSize: 100,
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("melepas lampiran dan menghapus penanda berkas", async () => {
    const document = familyDocument();

    await attachDocumentFile(
      form({
        id: document.id,
        key: `${WS.family}/${document.id}.pdf`,
        fileName: "kartu.pdf",
        fileSize: 100,
      }),
    );

    const result = await detachDocumentFile(form({ id: document.id }));

    expect(result.ok).toBe(true);
    expect(document.fileKey).toBeUndefined();
    expect(document.fileSize).toBeUndefined();
  });

  it("menolak melepas dokumen yang tidak punya berkas", async () => {
    const document = familyDocument();
    document.fileKey = undefined;

    const result = await detachDocumentFile(form({ id: document.id }));
    expect(result.ok).toBe(false);
  });

  it("menghapus dokumen ikut membersihkan penanda berkasnya", async () => {
    const document = familyDocument();
    const id = document.id;

    await attachDocumentFile(
      form({
        id,
        key: `${WS.family}/${id}.pdf`,
        fileName: "kartu.pdf",
        fileSize: 100,
      }),
    );

    const result = await deleteDocument(form({ id }));

    expect(result.ok).toBe(true);
    expect(getStore().documents.some((item) => item.id === id)).toBe(false);
  });
});